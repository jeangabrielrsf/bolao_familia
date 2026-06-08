import { NextResponse } from 'next/server'
import { getResultados } from '@/lib/db/queries/resultados'

export async function GET() {
  try {
    const resultados = await getResultados()
    return NextResponse.json(resultados)
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
