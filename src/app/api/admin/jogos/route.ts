import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { getTodosJogos, updateResultado } from '@/lib/db/queries/jogos'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const jogos = await getTodosJogos()
    return NextResponse.json(jogos)
  } catch (error) {
    console.error('GET jogos error:', error)
    return NextResponse.json({ error: 'Erro ao buscar jogos' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { id, resultadoA, resultadoB } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    }

    if (
      typeof resultadoA !== 'number' ||
      typeof resultadoB !== 'number' ||
      !Number.isInteger(resultadoA) ||
      !Number.isInteger(resultadoB) ||
      resultadoA < 0 ||
      resultadoB < 0
    ) {
      return NextResponse.json(
        { error: 'Resultados devem ser números inteiros não negativos' },
        { status: 400 }
      )
    }

    const jogo = await updateResultado(id, resultadoA, resultadoB)
    return NextResponse.json(jogo)
  } catch (error) {
    console.error('PUT jogos error:', error)
    return NextResponse.json({ error: 'Erro ao atualizar resultado' }, { status: 500 })
  }
}
