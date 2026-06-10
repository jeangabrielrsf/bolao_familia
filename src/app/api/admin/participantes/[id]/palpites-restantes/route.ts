import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { getJogosRestantesComPalpites } from '@/lib/db/queries/completar-bolao'

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

    const jogos = await getJogosRestantesComPalpites(id)

    return NextResponse.json({ jogos })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
