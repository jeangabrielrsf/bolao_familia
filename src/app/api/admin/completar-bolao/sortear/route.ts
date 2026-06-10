import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { sortearPalpites } from '@/lib/db/queries/completar-bolao'

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { participanteIds, todosIncompletos } = body as {
      participanteIds?: string[]
      todosIncompletos?: boolean
    }

    let idsParaSortear: string[]

    if (todosIncompletos) {
      const { getStatusCompletarBolao } = await import('@/lib/db/queries/completar-bolao')
      const status = await getStatusCompletarBolao()
      idsParaSortear = status.filter((p) => !p.completo).map((p) => p.id)
    } else if (Array.isArray(participanteIds) && participanteIds.length > 0) {
      idsParaSortear = participanteIds
    } else {
      return NextResponse.json({ error: 'Nenhum participante especificado' }, { status: 400 })
    }

    if (idsParaSortear.length > 100) {
      return NextResponse.json({ error: 'Máximo de 100 participantes por lote' }, { status: 400 })
    }

    const resultados = await sortearPalpites(idsParaSortear)

    return NextResponse.json({
      success: true,
      participantesAfetados: resultados.length,
      resultados,
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
