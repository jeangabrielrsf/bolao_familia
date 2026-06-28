import { NextRequest, NextResponse } from 'next/server'
import {
  getParticipanteByToken,
  getConfigCompletarBolao,
  salvarPalpitesCompletar,
  salvarExtrasCompletar,
  getJogosRestantes,
  getJogosCompletos,
  detectarModoGrupo,
  getGruposParticipante,
  isFaseMataMata,
  getJogosFase,
  salvarPalpitesFase,
  getConfigFaseMataMata,
  isFaseEditavel,
} from '@/lib/db/queries/completar-bolao'

export async function POST(
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
      return NextResponse.json({ error: 'Token inválido', valido: false }, { status: 404 })
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
      const [config, editavel] = await Promise.all([
        getConfigFaseMataMata(fase),
        isFaseEditavel(fase),
      ])

      if (!config.habilitado) {
        return NextResponse.json(
          { error: `Palpites para esta fase estão desabilitados` },
          { status: 403 }
        )
      }

      if (!editavel) {
        return NextResponse.json(
          { error: `Esta fase já começou ou o prazo encerrou` },
          { status: 403 }
        )
      }

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

      if (palpites.length > jogosFase.length) {
        return NextResponse.json(
          { error: `Máximo de ${jogosFase.length} palpites permitidos para esta fase` },
          { status: 400 }
        )
      }

      const grupos = await getGruposParticipante(participante.id)
      const targetGrupoId = palpiteGrupoId ?? grupos[0]?.id
      if (!targetGrupoId) {
        return NextResponse.json({ error: 'Grupo de palpites não encontrado' }, { status: 400 })
      }

      const resultado = await salvarPalpitesFase(
        participante.id,
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

    const config = await getConfigCompletarBolao()

    if (!config.habilitado) {
      return NextResponse.json(
        { error: 'A coleta de palpites está desabilitada no momento' },
        { status: 403 }
      )
    }

    if (new Date() > config.prazo) {
      return NextResponse.json(
        { error: 'O prazo para completar o bolão já foi encerrado' },
        { status: 403 }
      )
    }

    const grupos = await getGruposParticipante(participante.id)
    const targetGrupoId = palpiteGrupoId ?? grupos[0]?.id
    const modo = targetGrupoId ? await detectarModoGrupo(targetGrupoId) : 'restante'

    const maxPalpites = modo === 'completo' ? 72 : 39
    if (palpites.length > maxPalpites) {
      return NextResponse.json(
        { error: `Máximo de ${maxPalpites} palpites permitidos` },
        { status: 400 }
      )
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

    const resultado = await salvarPalpitesCompletar(participante.id, palpites.map(p => ({
      jogoId: p.jogoId,
      placarA: p.placarA,
      placarB: p.placarB,
    })), palpiteGrupoId)

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
