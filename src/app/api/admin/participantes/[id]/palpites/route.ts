import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { salvarPalpitesCompletar, getJogosRestantes } from '@/lib/db/queries/completar-bolao'

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
    const { palpites } = body as { palpites: { jogoId: string; placarA: number; placarB: number }[] }

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

    const resultado = await salvarPalpitesCompletar(id, palpites)

    return NextResponse.json({ success: true, ...resultado })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
