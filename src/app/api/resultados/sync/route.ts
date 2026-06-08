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

    const sofascoreIds = jogos
      .filter((j) => j.sofascoreId)
      .map((j) => j.sofascoreId!)

    if (sofascoreIds.length === 0) {
      return NextResponse.json({
        success: true,
        atualizados: 0,
        resultados: [],
      })
    }

    const resultados = await syncResultados(sofascoreIds)

    const validResultados = resultados.filter((r) => {
      if (typeof r.sofascoreId !== 'string' || r.sofascoreId.length === 0) return false
      if (!Number.isInteger(r.resultadoA) || r.resultadoA < 0) return false
      if (!Number.isInteger(r.resultadoB) || r.resultadoB < 0) return false
      return true
    })

    const jogosBySofascoreId = new Map(
      jogos
        .filter((j) => j.sofascoreId)
        .map((j) => [j.sofascoreId, j])
    )

    const updates: Array<{ id: string; resultadoA: number; resultadoB: number }> = []
    const atualizadosList: Array<{
      sofascoreId: string
      timeA: string
      timeB: string
      resultadoA: number
      resultadoB: number
    }> = []

    for (const resultado of validResultados) {
      const jogo = jogosBySofascoreId.get(resultado.sofascoreId)
      if (!jogo) continue

      updates.push({
        id: jogo.id,
        resultadoA: resultado.resultadoA,
        resultadoB: resultado.resultadoB,
      })
      atualizadosList.push({
        sofascoreId: resultado.sofascoreId,
        timeA: jogo.timeA,
        timeB: jogo.timeB,
        resultadoA: resultado.resultadoA,
        resultadoB: resultado.resultadoB,
      })
    }

    await prisma.$transaction(
      updates.map((u) =>
        prisma.jogo.update({
          where: { id: u.id },
          data: {
            resultadoA: u.resultadoA,
            resultadoB: u.resultadoB,
            status: 'finalizado',
          },
        })
      )
    )

    return NextResponse.json({
      success: true,
      atualizados: updates.length,
      resultados: atualizadosList,
    })
  } catch (error) {
    console.error('POST resultados/sync error:', error)
    const message = error instanceof Error ? error.message : 'Erro ao sincronizar resultados'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
