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
      return NextResponse.json({ error: 'Token inválido' }, { status: 404 })
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

    const body = await request.json()
    const { palpites, extras, palpiteGrupoId } = body as {
      palpites: { jogoId: string; placarA: number; placarB: number }[]
      extras?: { tipo: string; valor: string }[]
      palpiteGrupoId?: string
    }

    if (!Array.isArray(palpites) || palpites.length === 0) {
      return NextResponse.json({ error: 'Palpites inválidos' }, { status: 400 })
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

    const resultado = await salvarPalpitesCompletar(participante.id, palpites, palpiteGrupoId)

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
