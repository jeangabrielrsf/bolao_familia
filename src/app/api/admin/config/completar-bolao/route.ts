import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { setPrazoCompletarBolao, setCompletarBolaoHabilitado } from '@/lib/db/queries/completar-bolao'

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { prazo, habilitado } = body as { prazo?: string; habilitado?: boolean }

    if (prazo !== undefined) {
      const data = new Date(prazo)
      if (isNaN(data.getTime())) {
        return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
      }
      await setPrazoCompletarBolao(data.toISOString())
    }

    if (habilitado !== undefined) {
      await setCompletarBolaoHabilitado(habilitado)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
