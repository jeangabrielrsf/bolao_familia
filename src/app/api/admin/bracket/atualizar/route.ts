import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { atualizarBracket } from '@/lib/services/bracket/updater'

export async function POST(request: NextRequest) {
  // Auth dupla: cookie admin OU header X-Cron-Secret (service-to-service)
  const cronSecret = request.headers.get('x-cron-secret')
  const adminAuthFailed = await requireAdmin(request)
  const isCronAuth = !!cronSecret && cronSecret === process.env.CRON_SECRET

  if (adminAuthFailed && !isCronAuth) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    console.log('[bracket/atualizar] iniciando atualização do bracket')
    const bracket = await atualizarBracket()

    const slotsComTimes = bracket.filter(s => s.timeA !== null || s.timeB !== null)
    console.log(`[bracket/atualizar] ${slotsComTimes.length} slots com times definidos`)

    return NextResponse.json({
      success: true,
      atualizados: slotsComTimes.length,
      bracket,
    })
  } catch (error) {
    console.error('[bracket/atualizar] erro:', error)
    const message = error instanceof Error ? error.message : 'Erro ao atualizar bracket'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
