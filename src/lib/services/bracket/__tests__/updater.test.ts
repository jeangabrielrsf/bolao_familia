import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { atualizarBracket } from '../updater'

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.TEST_DATABASE_URL!),
})

type Snapshot = { id: string; status: string; resultadoA: number | null; resultadoB: number | null; vencedor: number | null; timeA: string | null; timeB: string | null }

describe('atualizarBracket', () => {
  let groupASnapshot: Snapshot[] = []
  let mataMataSnapshot: Snapshot[] = []

  beforeAll(async () => {
    const groupA = await prisma.jogo.findMany({
      where: { fase: 'grupos', grupo: 'A' },
      select: { id: true, status: true, resultadoA: true, resultadoB: true, vencedor: true, timeA: true, timeB: true },
    })
    groupASnapshot = groupA

    const mataMata = await prisma.jogo.findMany({
      where: { fase: { not: 'grupos' } },
      select: { id: true, status: true, resultadoA: true, resultadoB: true, vencedor: true, timeA: true, timeB: true },
    })
    mataMataSnapshot = mataMata
  })

  afterAll(async () => {
    for (const j of groupASnapshot) {
      await prisma.jogo.update({
        where: { id: j.id },
        data: { status: j.status, resultadoA: j.resultadoA, resultadoB: j.resultadoB, vencedor: j.vencedor, timeA: j.timeA, timeB: j.timeB },
      })
    }
    for (const j of mataMataSnapshot) {
      await prisma.jogo.update({
        where: { id: j.id },
        data: { timeA: j.timeA, timeB: j.timeB },
      })
    }
    await prisma.$disconnect()
  })

  it('atualiza timeA/timeB dos Jogo mata-mata com base na classificação', async () => {
    await prisma.jogo.updateMany({
      where: { fase: 'grupos', grupo: 'A', timeA: 'México', timeB: 'África do Sul' },
      data: { status: 'finalizado', resultadoA: 2, resultadoB: 1, vencedor: 1 },
    })
    await prisma.jogo.updateMany({
      where: { fase: 'grupos', grupo: 'A', timeA: 'Coreia do Sul', timeB: 'México' },
      data: { status: 'finalizado', resultadoA: 0, resultadoB: 1, vencedor: 2 },
    })
    await prisma.jogo.updateMany({
      where: { fase: 'grupos', grupo: 'A', timeA: 'África do Sul', timeB: 'Coreia do Sul' },
      data: { status: 'finalizado', resultadoA: 2, resultadoB: 0, vencedor: 1 },
    })

    await atualizarBracket()

    const mataMata = await prisma.jogo.findFirst({
      where: { fase: 'dezesseis_avos', timeA: { not: null } },
    })
    expect(mataMata).not.toBeNull()
  }, 30000)
})
