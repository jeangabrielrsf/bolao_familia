import { prisma } from '../client'
import { inicioDiaBrasilia, fimDiaBrasilia, inicioDiaBrasiliaMais, fimDiaBrasiliaMais } from '@/lib/utils/date'

export async function getJogosPorPeriodo(inicio: Date, fim: Date) {
  return prisma.jogo.findMany({
    where: {
      dataHora: { gte: inicio, lte: fim },
    },
    orderBy: { dataHora: 'asc' },
  })
}

export async function getJogosDoDia() {
  return getJogosPorPeriodo(inicioDiaBrasilia(), fimDiaBrasilia())
}

export async function getProximosJogos() {
  const [ontem, hoje, amanha, depois] = await Promise.all([
    getJogosPorPeriodo(inicioDiaBrasiliaMais(-1), fimDiaBrasiliaMais(-1)),
    getJogosPorPeriodo(inicioDiaBrasilia(), fimDiaBrasilia()),
    getJogosPorPeriodo(inicioDiaBrasiliaMais(1), fimDiaBrasiliaMais(1)),
    getJogosPorPeriodo(inicioDiaBrasiliaMais(2), fimDiaBrasiliaMais(2)),
  ])
  return { ontem, hoje, amanha, depois }
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
  const vencedor = resultadoA > resultadoB ? 1 : resultadoB > resultadoA ? 2 : 3
  return prisma.jogo.update({
    where: { id },
    data: {
      resultadoA,
      resultadoB,
      vencedor,
      status: 'finalizado',
    },
  })
}

export type JogosCountByStatus = {
  finalizado: number
  em_andamento: number
  restante: number
  total: number
}

export async function countJogosByStatus(): Promise<JogosCountByStatus> {
  const groups = await prisma.jogo.groupBy({
    by: ['status'],
    _count: { _all: true },
  })
  const map = new Map(groups.map((g) => [g.status, g._count._all]))
  return {
    finalizado: map.get('finalizado') ?? 0,
    em_andamento: map.get('em_andamento') ?? 0,
    restante: map.get('agendado') ?? 0,
    total: groups.reduce((sum, g) => sum + g._count._all, 0),
  }
}
