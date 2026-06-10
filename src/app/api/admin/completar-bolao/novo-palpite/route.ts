import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { criarNovoPalpite } from '@/lib/db/queries/completar-bolao'

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { participanteId, apelido } = body as {
      participanteId: string
      apelido?: string
    }

    if (!participanteId || typeof participanteId !== 'string') {
      return NextResponse.json({ error: 'Participante inválido' }, { status: 400 })
    }

    const grupo = await criarNovoPalpite(participanteId, apelido)

    return NextResponse.json({ success: true, grupo })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro interno do servidor'
    const status = message === 'Participante já possui palpites' ? 409 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
