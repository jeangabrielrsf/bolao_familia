import { NextResponse } from 'next/server'
import { getResultados } from '@/lib/db/queries/resultados'

export async function GET() {
  const resultados = await getResultados()
  return NextResponse.json(resultados)
}
