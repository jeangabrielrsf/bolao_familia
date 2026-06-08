import { NextResponse } from 'next/server'
import { getRanking } from '@/lib/db/queries/ranking'

export async function GET() {
  try {
    const ranking = await getRanking()
    return NextResponse.json(ranking)
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
