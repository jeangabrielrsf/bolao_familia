import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { getResultadoExtras, setResultadosExtras } from '@/lib/db/queries/resultados'
import type { TipoExtra } from '@prisma/client'

const TIPOS_VALIDOS: TipoExtra[] = ['artilheiro', 'campeao', 'vice', 'terceiro', 'quarto']

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const extras = await getResultadoExtras()
    return NextResponse.json(extras)
  } catch (error) {
    console.error('GET resultados-extras error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()

    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'Formato inválido' }, { status: 400 })
    }

    for (const item of body) {
      if (!TIPOS_VALIDOS.includes(item.tipo)) {
        return NextResponse.json({ error: `Tipo inválido: ${item.tipo}` }, { status: 400 })
      }
      if (typeof item.valor !== 'string' || item.valor.trim() === '') {
        return NextResponse.json({ error: `Valor vazio para ${item.tipo}` }, { status: 400 })
      }
    }

    const extras = body.map((item: { tipo: TipoExtra; valor: string }) => ({
      tipo: item.tipo,
      valor: item.valor,
    }))

    const resultados = await setResultadosExtras(extras)
    return NextResponse.json(resultados)
  } catch (error) {
    console.error('PUT resultados-extras error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
