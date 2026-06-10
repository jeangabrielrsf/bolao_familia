import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { getStatusCompletarBolao, getConfigCompletarBolao } from '@/lib/db/queries/completar-bolao'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const [participantes, config] = await Promise.all([
      getStatusCompletarBolao(),
      getConfigCompletarBolao(),
    ])

    const totalJogosFaltando = participantes.reduce((acc, p) => acc + p.jogosFaltando, 0)
    const participantesCompletos = participantes.filter((p) => p.completo).length
    const participantesIncompletos = participantes.filter((p) => !p.completo).length

    return NextResponse.json({
      participantes,
      config,
      resumo: {
        totalParticipantes: participantes.length,
        participantesCompletos,
        participantesIncompletos,
        totalJogosFaltando,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
