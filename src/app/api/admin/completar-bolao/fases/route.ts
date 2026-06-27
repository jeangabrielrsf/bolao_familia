import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { getFasesHabilitadas, setConfigFaseMataMata, getConfigFaseMataMata } from '@/lib/db/queries/completar-bolao'
import { FASES_MATA_MATA } from '@/lib/utils/constants'

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdmin(request)
    if (authError) return authError

    const fases = await Promise.all(
      FASES_MATA_MATA.map(async (fase) => {
        const config = await getConfigFaseMataMata(fase)
        return {
          fase,
          habilitado: config.habilitado,
          prazo: config.prazo?.toISOString() ?? null,
        }
      })
    )

    return NextResponse.json({ fases })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authError = await requireAdmin(request)
    if (authError) return authError

    const body = await request.json()
    const { fase, habilitado, prazo } = body as {
      fase: string
      habilitado?: boolean
      prazo?: string
    }

    if (!fase || !(FASES_MATA_MATA as readonly string[]).includes(fase)) {
      return NextResponse.json({ error: 'Fase inválida' }, { status: 400 })
    }

    await setConfigFaseMataMata(fase, { habilitado, prazo })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
