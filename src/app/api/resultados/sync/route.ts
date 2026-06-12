import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { getTodosJogos } from '@/lib/db/queries/jogos'
import { syncResultados } from '@/lib/services/resultados/client'
import { prisma } from '@/lib/db/client'

interface MudancaJogo {
  sofascoreId: string
  timeA: string
  timeB: string
  grupo: string | null
  fase: string
  mudouPlacar: boolean
  mudouStatus: boolean
  mudouLocal: boolean
  mudouCidade: boolean
  antes: {
    status: string
    resultadoA: number | null
    resultadoB: number | null
    local: string | null
    cidade: string | null
  }
  depois: {
    status: string
    resultadoA: number | null
    resultadoB: number | null
    local: string | null
    cidade: string | null
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    console.log('=== INÍCIO SYNC RESULTADOS ===')
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
      console.log('Nenhum jogo com sofascoreId encontrado')
      return NextResponse.json({
        success: true,
        atualizados: 0,
        resultados: [],
        mudancas: [],
      })
    }

    console.log(`Sincronizando ${jogosPayload.length} jogos...`)
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
    const mudancas: MudancaJogo[] = []

    for (const resultado of comDados) {
      const jogo = jogos.find((j) => j.sofascoreId === resultado.sofascoreId)
      if (!jogo) continue

      const isFinalizado = finalizados.some((f) => f.sofascoreId === resultado.sofascoreId)

      const novoLocal = resultado.local ?? null
      const novaCidade = resultado.cidade ?? jogo.cidade ?? null
      const novoResultadoA = isFinalizado ? resultado.resultadoA : null
      const novoResultadoB = isFinalizado ? resultado.resultadoB : null
      const novoStatus = isFinalizado ? 'finalizado' : jogo.status
      const novoVencedor = resultado.vencedor ?? null
      const novoPlacarPenaltisA = resultado.placarPenaltisA ?? null
      const novoPlacarPenaltisB = resultado.placarPenaltisB ?? null

      const placarMudou = jogo.resultadoA !== novoResultadoA || jogo.resultadoB !== novoResultadoB
      const statusMudou = jogo.status !== novoStatus
      const localMudou = jogo.local !== novoLocal
      const cidadeMudou = jogo.cidade !== novaCidade

      const realmenteMudou = placarMudou || statusMudou || localMudou || cidadeMudou

      if (realmenteMudou) {
        const mudanca: MudancaJogo = {
          sofascoreId: resultado.sofascoreId,
          timeA: jogo.timeA,
          timeB: jogo.timeB,
          grupo: jogo.grupo,
          fase: jogo.fase,
          mudouPlacar: placarMudou,
          mudouStatus: statusMudou,
          mudouLocal: localMudou,
          mudouCidade: cidadeMudou,
          antes: {
            status: jogo.status,
            resultadoA: jogo.resultadoA,
            resultadoB: jogo.resultadoB,
            local: jogo.local,
            cidade: jogo.cidade,
          },
          depois: {
            status: novoStatus,
            resultadoA: novoResultadoA,
            resultadoB: novoResultadoB,
            local: novoLocal,
            cidade: novaCidade,
          },
        }
        mudancas.push(mudanca)

        console.log(`\n[JOGO ATUALIZADO] ${jogo.timeA} vs ${jogo.timeB}`)
        if (placarMudou) {
          console.log(`  Placar: ${jogo.resultadoA ?? '-'}x${jogo.resultadoB ?? '-'} → ${novoResultadoA}x${novoResultadoB}`)
        }
        if (statusMudou) {
          console.log(`  Status: ${jogo.status} → ${novoStatus}`)
        }
        if (localMudou) {
          console.log(`  Local: ${jogo.local ?? '-'} → ${novoLocal}`)
        }
        if (cidadeMudou) {
          console.log(`  Cidade: ${jogo.cidade ?? '-'} → ${novaCidade}`)
        }

        const data: Record<string, unknown> = {
          local: novoLocal,
          cidade: novaCidade,
          rankingTimeA: null,
          rankingTimeB: null,
        }

        if (isFinalizado) {
          data.resultadoA = novoResultadoA
          data.resultadoB = novoResultadoB
          data.vencedor = novoVencedor
          data.placarPenaltisA = novoPlacarPenaltisA
          data.placarPenaltisB = novoPlacarPenaltisB
          data.status = 'finalizado'
        }

        updates.push({ id: jogo.id, data })
      }
    }

    if (updates.length > 0) {
      console.log(`\nExecutando ${updates.length} updates no banco...`)
      await prisma.$transaction(
        updates.map((u) =>
          prisma.jogo.update({
            where: { id: u.id },
            data: u.data,
          })
        ),
        { timeout: 30000 }
      )
    }

    console.log(`\n=== FIM SYNC RESULTADOS ===`)
    console.log(`Total processado: ${comDados.length} jogos`)
    console.log(`Realmente atualizados: ${updates.length} jogos`)
    console.log(`Finalizados: ${finalizados.length} jogos`)

    return NextResponse.json({
      success: true,
      atualizados: updates.length,
      finalizados: finalizados.length,
      mudancas,
    })
  } catch (error) {
    console.error('POST resultados/sync error:', error)
    const message = error instanceof Error ? error.message : 'Erro ao sincronizar resultados'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
