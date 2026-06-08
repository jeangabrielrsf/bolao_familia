import { NextResponse } from 'next/server'
import { getRanking } from '@/lib/db/queries/ranking'

export async function GET() {
  const ranking = await getRanking()
  return NextResponse.json(ranking)
}
