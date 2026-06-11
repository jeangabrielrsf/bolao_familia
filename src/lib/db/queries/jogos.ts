import { prisma } from '../client'
import { inicioDiaBrasilia, fimDiaBrasilia } from '@/lib/utils/date'

export async function getJogosDoDia() {
  const inicio = inicioDiaBrasilia()
  const fim = fimDiaBrasilia()

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
        include: {
          palpiteGrupo: {
            include: { participante: true },
          },
        },
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
