import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from './session'

export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  const token = request.cookies.get('admin_session')?.value

  if (!token || !(await verifySession(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  return null
}
