import { NextRequest, NextResponse } from 'next/server'
import {
  getParticipanteByToken,
  getJogosRestantesComPalpites,
  getJogosCompletosComPalpites,
  getGruposParticipante,
  getExtrasPorGrupo,
  detectarModoGrupo,
} from '@/lib/db/queries/completar-bolao'

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

    const gruposRaw = await getGruposParticipante(participante.id)

    const gruposComModo = await Promise.all(
      gruposRaw.map(async (g) => ({
        ...g,
        modo: await detectarModoGrupo(g.id),
      }))
    )

    const targetGrupoId = palpiteGrupoId ?? gruposComModo[0]?.id
    const modo = gruposComModo.find((g) => g.id === targetGrupoId)?.modo ?? 'restante'

    const [jogos, extras] = await Promise.all([
      modo === 'completo'
        ? getJogosCompletosComPalpites(participante.id, targetGrupoId)
        : getJogosRestantesComPalpites(participante.id, targetGrupoId),
      modo === 'completo' && targetGrupoId
        ? getExtrasPorGrupo(targetGrupoId)
        : Promise.resolve([]),
    ])

    return NextResponse.json({
      grupos: gruposComModo,
      jogos,
      extras: extras.map((e) => ({ tipo: e.tipo, valor: e.valor })),
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
