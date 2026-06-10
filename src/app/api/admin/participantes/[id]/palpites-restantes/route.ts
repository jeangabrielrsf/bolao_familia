import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import {
  getJogosRestantesComPalpites,
  getJogosCompletosComPalpites,
  getGruposParticipante,
  getExtrasPorGrupo,
  detectarModoGrupo,
} from '@/lib/db/queries/completar-bolao'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const { id } = await params

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const palpiteGrupoId = searchParams.get('grupoId') ?? undefined

    const gruposRaw = await getGruposParticipante(id)

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
        ? getJogosCompletosComPalpites(id, targetGrupoId)
        : getJogosRestantesComPalpites(id, targetGrupoId),
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
