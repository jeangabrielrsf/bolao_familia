import { NextRequest, NextResponse } from 'next/server'
import { getParticipanteByToken, getJogosRestantesComPalpites } from '@/lib/db/queries/completar-bolao'

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
      return NextResponse.json({ error: 'Token inválido' }, { status: 404 })
    }

    const jogos = await getJogosRestantesComPalpites(participante.id)

    return NextResponse.json({ jogos })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
