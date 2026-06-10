import { NextRequest, NextResponse } from 'next/server'
import { getParticipanteByToken, getConfigCompletarBolao, salvarPalpitesCompletar } from '@/lib/db/queries/completar-bolao'
import { getJogosRestantes } from '@/lib/db/queries/completar-bolao'

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
    const { palpites } = body as { palpites: { jogoId: string; placarA: number; placarB: number }[] }

    if (!Array.isArray(palpites) || palpites.length === 0) {
      return NextResponse.json({ error: 'Palpites inválidos' }, { status: 400 })
    }

    if (palpites.length > 39) {
      return NextResponse.json({ error: 'Máximo de 39 palpites permitidos' }, { status: 400 })
    }

    for (const p of palpites) {
      if (!p.jogoId || typeof p.placarA !== 'number' || typeof p.placarB !== 'number') {
        return NextResponse.json({ error: 'Formato de palpite inválido' }, { status: 400 })
      }
      if (p.placarA < 0 || p.placarB < 0 || p.placarA > 99 || p.placarB > 99) {
        return NextResponse.json({ error: 'Placar inválido' }, { status: 400 })
      }
    }

    const jogosRestantes = await getJogosRestantes()
    const jogosRestantesIds = new Set(jogosRestantes.map((j) => j.id))

    for (const p of palpites) {
      if (!jogosRestantesIds.has(p.jogoId)) {
        return NextResponse.json(
          { error: `Jogo ${p.jogoId} não é um jogo restante do bolão` },
          { status: 400 }
        )
      }
    }

    const resultado = await salvarPalpitesCompletar(participante.id, palpites)

    return NextResponse.json({ success: true, ...resultado })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
