import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { getTodosJogos } from '@/lib/db/queries/jogos'
import { syncResultados } from '@/lib/services/resultados/client'
import { prisma } from '@/lib/db/client'

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const jogos = await getTodosJogos()

    const jogosPayload = jogos
      .filter((j) => j.sofascoreId)
      .map((j) => ({
        sofascoreId: j.sofascoreId!,
        timeA: j.timeA,
        timeB: j.timeB,
        dataHora: j.dataHora.toISOString(),
        grupo: j.grupo ?? '',
      }))

    if (jogosPayload.length === 0) {
      return NextResponse.json({
        success: true,
        atualizados: 0,
        resultados: [],
      })
    }

    const resultados = await syncResultados(jogosPayload)

    const comDados = resultados.filter((r) => {
      if (typeof r.sofascoreId !== 'string' || r.sofascoreId.length === 0) return false
      if (r.status === 'not_found') return false
      return true
    })

    const finalizados = comDados.filter((r) => {
      if (r.status !== 'finished') return false
      if (!Number.isInteger(r.resultadoA) || r.resultadoA < 0) return false
      if (!Number.isInteger(r.resultadoB) || r.resultadoB < 0) return false
      return true
    })

    const updates: Array<{
      id: string
      data: Record<string, unknown>
    }> = []
    const atualizadosList: Array<{
      sofascoreId: string
      timeA: string
      timeB: string
      resultadoA: number | null
      resultadoB: number | null
    }> = []

    for (const resultado of comDados) {
      const jogo = jogos.find((j) => j.sofascoreId === resultado.sofascoreId)
      if (!jogo) continue

      const isFinalizado = finalizados.some((f) => f.sofascoreId === resultado.sofascoreId)

      const data: Record<string, unknown> = {
        local: resultado.local ?? null,
        cidade: resultado.cidade ?? jogo.cidade ?? null,
        rankingTimeA: null,
        rankingTimeB: null,
      }

      if (isFinalizado) {
        data.resultadoA = resultado.resultadoA
        data.resultadoB = resultado.resultadoB
        data.vencedor = resultado.vencedor ?? null
        data.placarPenaltisA = resultado.placarPenaltisA ?? null
        data.placarPenaltisB = resultado.placarPenaltisB ?? null
        data.status = 'finalizado'
      }

      updates.push({ id: jogo.id, data })
      atualizadosList.push({
        sofascoreId: resultado.sofascoreId,
        timeA: jogo.timeA,
        timeB: jogo.timeB,
        resultadoA: isFinalizado ? resultado.resultadoA : null,
        resultadoB: isFinalizado ? resultado.resultadoB : null,
      })
    }

    await prisma.$transaction(
      updates.map((u) =>
        prisma.jogo.update({
          where: { id: u.id },
          data: u.data,
        })
      ),
      { timeout: 30000 }
    )

    return NextResponse.json({
      success: true,
      atualizados: updates.length,
      finalizados: finalizados.length,
      resultados: atualizadosList,
    })
  } catch (error) {
    console.error('POST resultados/sync error:', error)
    const message = error instanceof Error ? error.message : 'Erro ao sincronizar resultados'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
