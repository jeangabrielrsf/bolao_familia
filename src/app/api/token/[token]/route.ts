import { NextRequest, NextResponse } from 'next/server'
import { getParticipanteByToken, getConfigCompletarBolao, getFasesHabilitadas } from '@/lib/db/queries/completar-bolao'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
    }

    const participante = await getParticipanteByToken(token)

    if (!participante) {
      return NextResponse.json({ error: 'Token inválido', valido: false }, { status: 404 })
    }

    const [config, fasesHabilitadas] = await Promise.all([
      getConfigCompletarBolao(),
      getFasesHabilitadas(),
    ])

    return NextResponse.json({
      valido: true,
      participanteId: participante.id,
      nome: participante.nome,
      fotoUrl: participante.fotoUrl,
      prazo: config.prazo.toISOString(),
      habilitado: config.habilitado,
      fasesHabilitadas,
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
