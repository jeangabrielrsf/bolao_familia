import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import {
  salvarPalpitesCompletar,
  salvarExtrasCompletar,
  salvarPalpitesFase,
  getJogosRestantes,
  getJogosCompletos,
  getJogosFase,
  detectarModoGrupo,
  getGruposParticipante,
  isFaseMataMata,
} from '@/lib/db/queries/completar-bolao'

export async function PUT(
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

    const body = await request.json()
    const { palpites, extras, palpiteGrupoId, fase } = body as {
      palpites: { jogoId: string; placarA: number; placarB: number; vencedorPalpite?: number | null }[]
      extras?: { tipo: string; valor: string }[]
      palpiteGrupoId?: string
      fase?: string
    }

    if (!Array.isArray(palpites) || palpites.length === 0) {
      return NextResponse.json({ error: 'Palpites inválidos' }, { status: 400 })
    }

    for (const p of palpites) {
      if (!p.jogoId || typeof p.placarA !== 'number' || typeof p.placarB !== 'number') {
        return NextResponse.json({ error: 'Formato de palpite inválido' }, { status: 400 })
      }
      if (p.placarA < 0 || p.placarB < 0 || p.placarA > 99 || p.placarB > 99) {
        return NextResponse.json({ error: 'Placar inválido' }, { status: 400 })
      }
    }

    if (fase && isFaseMataMata(fase)) {
      const jogosFase = await getJogosFase(fase)
      const jogosFaseIds = new Set(jogosFase.map((j) => j.id))

      for (const p of palpites) {
        if (!jogosFaseIds.has(p.jogoId)) {
          return NextResponse.json(
            { error: `Jogo ${p.jogoId} não pertence a esta fase` },
            { status: 400 }
          )
        }
      }

      const grupos = await getGruposParticipante(id)
      const targetGrupoId = palpiteGrupoId ?? grupos[0]?.id
      if (!targetGrupoId) {
        return NextResponse.json({ error: 'Grupo de palpites não encontrado' }, { status: 400 })
      }

      const resultado = await salvarPalpitesFase(
        id,
        palpites.map((p) => ({
          jogoId: p.jogoId,
          placarA: p.placarA,
          placarB: p.placarB,
          vencedorPalpite: p.vencedorPalpite ?? null,
        })),
        targetGrupoId
      )

      return NextResponse.json({ success: true, ...resultado })
    }

    const grupos = await getGruposParticipante(id)
    const targetGrupoId = palpiteGrupoId ?? grupos[0]?.id
    const modo = targetGrupoId ? await detectarModoGrupo(targetGrupoId) : 'restante'

    const maxPalpites = modo === 'completo' ? 72 : 39
    if (palpites.length > maxPalpites) {
      return NextResponse.json(
        { error: `Máximo de ${maxPalpites} palpites permitidos` },
        { status: 400 }
      )
    }

    for (const p of palpites) {
      if (!p.jogoId || typeof p.placarA !== 'number' || typeof p.placarB !== 'number') {
        return NextResponse.json({ error: 'Formato de palpite inválido' }, { status: 400 })
      }
      if (p.placarA < 0 || p.placarB < 0 || p.placarA > 99 || p.placarB > 99) {
        return NextResponse.json({ error: 'Placar inválido' }, { status: 400 })
      }
    }

    const jogosValidos = modo === 'completo' ? await getJogosCompletos() : await getJogosRestantes()
    const jogosValidosIds = new Set(jogosValidos.map((j) => j.id))

    for (const p of palpites) {
      if (!jogosValidosIds.has(p.jogoId)) {
        return NextResponse.json(
          { error: `Jogo ${p.jogoId} não é um jogo válido para o modo atual` },
          { status: 400 }
        )
      }
    }

    const resultado = await salvarPalpitesCompletar(id, palpites, palpiteGrupoId)

    if (modo === 'completo' && Array.isArray(extras) && extras.length > 0) {
      const tiposValidos = ['artilheiro', 'campeao', 'vice', 'terceiro', 'quarto']
      for (const e of extras) {
        if (!tiposValidos.includes(e.tipo) || !e.valor || typeof e.valor !== 'string') {
          return NextResponse.json({ error: 'Extra inválido' }, { status: 400 })
        }
      }
      await salvarExtrasCompletar(
        resultado.palpiteGrupoId,
        extras as { tipo: 'artilheiro' | 'campeao' | 'vice' | 'terceiro' | 'quarto'; valor: string }[]
      )
    }

    return NextResponse.json({ success: true, ...resultado })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
