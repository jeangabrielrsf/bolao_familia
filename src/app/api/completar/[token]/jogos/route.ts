import { NextRequest, NextResponse } from 'next/server'
import { getParticipanteByToken, getJogosRestantesComPalpites, getGruposParticipante } from '@/lib/db/queries/completar-bolao'

export async function GET(
  request: NextRequest,
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

    const { searchParams } = new URL(request.url)
    const palpiteGrupoId = searchParams.get('grupoId') ?? undefined

    const [grupos, jogos] = await Promise.all([
      getGruposParticipante(participante.id),
      getJogosRestantesComPalpites(participante.id, palpiteGrupoId),
    ])

    return NextResponse.json({ grupos, jogos })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
