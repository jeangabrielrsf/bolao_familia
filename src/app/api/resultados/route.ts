import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function GET() {
  const resultados = await prisma.jogo.findMany({
    where: { status: 'finalizado' },
    select: {
      id: true,
      resultadoA: true,
      resultadoB: true,
    },
    orderBy: { dataHora: 'asc' },
  })
  return NextResponse.json(resultados)
}
