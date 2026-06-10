import { prisma } from '../client'
import type { TipoExtra } from '@prisma/client'

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

export async function getResultadoExtras() {
  return prisma.resultadoExtra.findMany()
}

export async function setResultadosExtras(
  extras: { tipo: TipoExtra; valor: string }[]
) {
  const ops = extras.map((e) =>
    prisma.resultadoExtra.upsert({
      where: { tipo: e.tipo },
      update: { valor: e.valor.trim() },
      create: { tipo: e.tipo, valor: e.valor.trim() },
    })
  )
  return prisma.$transaction(ops)
}
