import { NextRequest, NextResponse } from 'next/server'
import { getTodosJogos, getJogosDoDia, getJogoById } from '@/lib/db/queries/jogos'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const dia = searchParams.get('dia')

    if (id) {
      if (typeof id !== 'string' || id.trim() === '') {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
      }
      const jogo = await getJogoById(id)
      if (!jogo) {
        return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 })
      }
      return NextResponse.json(jogo)
    }

    if (dia === 'true') {
      const jogos = await getJogosDoDia()
      return NextResponse.json(jogos)
    }

    const jogos = await getTodosJogos()
    return NextResponse.json(jogos)
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
