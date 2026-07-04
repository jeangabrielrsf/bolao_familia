import { NextRequest } from 'next/server'
import { POST } from '../atualizar/route'

jest.mock('@/lib/auth/middleware', () => ({
  requireAdmin: jest.fn().mockResolvedValue(
    new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 })
  ),
}))

jest.mock('@/lib/services/bracket/updater', () => ({
  atualizarBracket: jest.fn().mockResolvedValue([]),
}))

describe('POST /api/admin/bracket/atualizar', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret'
  })

  it('rejeita sem cookie admin e sem X-Cron-Secret', async () => {
    const req = new NextRequest('http://localhost/api/admin/bracket/atualizar', {
      method: 'POST',
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('aceita request com X-Cron-Secret correto (service-to-service)', async () => {
    const req = new NextRequest('http://localhost/api/admin/bracket/atualizar', {
      method: 'POST',
      headers: { 'x-cron-secret': 'test-secret' },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('rejeita X-Cron-Secret errado', async () => {
    const req = new NextRequest('http://localhost/api/admin/bracket/atualizar', {
      method: 'POST',
      headers: { 'x-cron-secret': 'wrong-secret' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})
