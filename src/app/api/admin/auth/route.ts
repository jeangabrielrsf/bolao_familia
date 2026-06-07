import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { verifyPassword } from '@/lib/auth/password'
import { createSession, verifySession } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  const { senha } = await request.json()

  const admin = await prisma.adminAuth.findFirst()
  if (!admin) {
    return NextResponse.json({ error: 'Admin não configurado' }, { status: 500 })
  }

  const valido = await verifyPassword(senha, admin.senhaHash)
  if (!valido) {
    return NextResponse.json({ error: 'Senha inválida' }, { status: 401 })
  }

  const token = await createSession()

  const response = NextResponse.json({ success: true })
  response.cookies.set('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  })

  return response
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('admin_session')
  return response
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_session')?.value
  const valido = token ? await verifySession(token) : false
  return NextResponse.json({ autenticado: valido })
}
