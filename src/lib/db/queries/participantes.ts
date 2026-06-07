import { prisma } from '../client'

export async function getTodosParticipantes() {
  return prisma.participante.findMany({ orderBy: { nome: 'asc' } })
}

export async function getParticipanteById(id: string) {
  return prisma.participante.findUnique({
    where: { id },
    include: {
      palpites: {
        include: { jogo: true },
        orderBy: { jogo: { dataHora: 'asc' } },
      },
      extras: true,
    },
  })
}

export async function createParticipante(nome: string, fotoUrl?: string) {
  return prisma.participante.create({
    data: { nome, fotoUrl },
  })
}

export async function updateParticipante(id: string, data: { nome?: string; fotoUrl?: string }) {
  return prisma.participante.update({ where: { id }, data })
}

export async function deleteParticipante(id: string) {
  return prisma.participante.delete({ where: { id } })
}
