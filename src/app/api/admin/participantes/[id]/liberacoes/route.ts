import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { setLiberacoesParticipante, getLiberacoesParticipante } from '@/lib/db/queries/completar-bolao'
import { FASES_LIBERAVEIS } from '@/lib/utils/constants'

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
    const { liberacoes } = body as { liberacoes: string[] }

    if (!Array.isArray(liberacoes)) {
      return NextResponse.json({ error: 'Liberações inválidas' }, { status: 400 })
    }

    const fasesValidas = new Set<string>(FASES_LIBERAVEIS)
    for (const f of liberacoes) {
      if (!fasesValidas.has(f)) {
        return NextResponse.json({ error: `Fase inválida: ${f}` }, { status: 400 })
      }
    }

    await setLiberacoesParticipante(id, liberacoes)
    const atualizadas = await getLiberacoesParticipante(id)

    return NextResponse.json({ success: true, liberacoes: atualizadas })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

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

    const liberacoes = await getLiberacoesParticipante(id)
    return NextResponse.json({ liberacoes })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
