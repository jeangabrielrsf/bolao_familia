import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { getTodosJogos, updateResultado } from '@/lib/db/queries/jogos'
import { syncResultados } from '@/lib/services/resultados/client'

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    if (!process.env.MICROSERVICE_URL) {
      return NextResponse.json(
        { error: 'MICROSERVICE_URL não configurada' },
        { status: 500 }
      )
    }

    const resultados = await syncResultados()
    const jogos = await getTodosJogos()

    const jogosBySofascoreId = new Map(
      jogos
        .filter((j) => j.sofascoreId)
        .map((j) => [j.sofascoreId, j])
    )

    let atualizados = 0
    const atualizadosList: Array<{
      sofascoreId: string
      timeA: string
      timeB: string
      resultadoA: number
      resultadoB: number
    }> = []

    for (const resultado of resultados) {
      const jogo = jogosBySofascoreId.get(resultado.sofascoreId)
      if (!jogo) continue

      await updateResultado(jogo.id, resultado.resultadoA, resultado.resultadoB)
      atualizados++
      atualizadosList.push({
        sofascoreId: resultado.sofascoreId,
        timeA: jogo.timeA,
        timeB: jogo.timeB,
        resultadoA: resultado.resultadoA,
        resultadoB: resultado.resultadoB,
      })
    }

    return NextResponse.json({
      success: true,
      atualizados,
      resultados: atualizadosList,
    })
  } catch (error) {
    console.error('POST resultados/sync error:', error)
    const message = error instanceof Error ? error.message : 'Erro ao sincronizar resultados'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
