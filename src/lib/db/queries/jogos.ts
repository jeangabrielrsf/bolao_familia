import { prisma } from '../client'

export async function getJogosDoDia() {
  const inicio = new Date()
  inicio.setHours(0, 0, 0, 0)
  const fim = new Date()
  fim.setHours(23, 59, 59, 999)

  return prisma.jogo.findMany({
    where: {
      dataHora: { gte: inicio, lte: fim },
    },
    orderBy: { dataHora: 'asc' },
  })
}

export async function getTodosJogos() {
  return prisma.jogo.findMany({ orderBy: { dataHora: 'asc' } })
}

export async function getJogoById(id: string) {
  return prisma.jogo.findUnique({
    where: { id },
    include: {
      palpites: {
        include: { participante: true },
      },
    },
  })
}

export async function updateResultado(id: string, resultadoA: number, resultadoB: number) {
  return prisma.jogo.update({
    where: { id },
    data: {
      resultadoA,
      resultadoB,
      status: 'finalizado',
    },
  })
}
