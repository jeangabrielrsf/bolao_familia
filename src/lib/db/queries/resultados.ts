import { prisma } from '../client'

export async function getResultados() {
  return prisma.jogo.findMany({
    where: { status: 'finalizado' },
    select: {
      id: true,
      resultadoA: true,
      resultadoB: true,
    },
    orderBy: { dataHora: 'asc' },
  })
}
