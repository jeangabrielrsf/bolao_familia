import { prisma } from '../client'
import { CONFIG_CHAVES } from '@/lib/utils/constants'

export async function getParticipanteByToken(token: string) {
  return prisma.participante.findUnique({
    where: { token },
    include: {
      grupos: {
        include: {
          palpites: true,
        },
      },
    },
  })
}

export async function getJogosRestantes() {
  return prisma.jogo.findMany({
    where: { isBolao: false, fase: 'grupos' },
    orderBy: { dataHora: 'asc' },
  })
}

export async function getConfigCompletarBolao() {
  const configs = await prisma.configuracao.findMany({
    where: {
      chave: {
        in: [CONFIG_CHAVES.PRAZO_COMPLETAR_BOLAO, CONFIG_CHAVES.COMPLETAR_BOLAO_HABILITADO],
      },
    },
  })

  const prazo = configs.find((c) => c.chave === CONFIG_CHAVES.PRAZO_COMPLETAR_BOLAO)
  const habilitado = configs.find((c) => c.chave === CONFIG_CHAVES.COMPLETAR_BOLAO_HABILITADO)

  return {
    prazo: prazo?.valor ? new Date(prazo.valor) : new Date('2026-06-11T15:00:00.000Z'),
    habilitado: habilitado?.valor === 'true',
  }
}

export async function setPrazoCompletarBolao(prazo: string) {
  await prisma.configuracao.upsert({
    where: { chave: CONFIG_CHAVES.PRAZO_COMPLETAR_BOLAO },
    update: { valor: prazo },
    create: {
      chave: CONFIG_CHAVES.PRAZO_COMPLETAR_BOLAO,
      valor: prazo,
      descricao: 'Prazo para participantes completarem palpites restantes (ISO 8601)',
    },
  })
}

export async function setCompletarBolaoHabilitado(habilitado: boolean) {
  await prisma.configuracao.upsert({
    where: { chave: CONFIG_CHAVES.COMPLETAR_BOLAO_HABILITADO },
    update: { valor: String(habilitado) },
    create: {
      chave: CONFIG_CHAVES.COMPLETAR_BOLAO_HABILITADO,
      valor: String(habilitado),
      descricao: 'Habilita/desabilita coleta de palpites restantes pelos participantes',
    },
  })
}

export async function getPalpitesParticipante(participanteId: string) {
  const grupos = await prisma.palpiteGrupo.findMany({
    where: { participanteId },
    include: { palpites: true },
  })

  const palpitesMap = new Map<string, { placarA: number; placarB: number }>()
  for (const grupo of grupos) {
    for (const palpite of grupo.palpites) {
      palpitesMap.set(palpite.jogoId, { placarA: palpite.placarA, placarB: palpite.placarB })
    }
  }

  return palpitesMap
}

export async function getPalpitesPorGrupo(palpiteGrupoId: string) {
  const grupo = await prisma.palpiteGrupo.findUnique({
    where: { id: palpiteGrupoId },
    include: { palpites: true },
  })

  const palpitesMap = new Map<string, { placarA: number; placarB: number }>()
  if (grupo) {
    for (const palpite of grupo.palpites) {
      palpitesMap.set(palpite.jogoId, { placarA: palpite.placarA, placarB: palpite.placarB })
    }
  }

  return palpitesMap
}

export async function getGruposParticipante(participanteId: string) {
  return prisma.palpiteGrupo.findMany({
    where: { participanteId },
    orderBy: { criadoEm: 'asc' },
    select: { id: true, nome: true, apelido: true },
  })
}

export async function salvarPalpitesCompletar(
  participanteId: string,
  palpites: { jogoId: string; placarA: number; placarB: number }[],
  palpiteGrupoId?: string
) {
  let grupo: { id: string; nome: string; apelido: string } | null

  if (palpiteGrupoId) {
    grupo = await prisma.palpiteGrupo.findFirst({
      where: { id: palpiteGrupoId, participanteId },
      select: { id: true, nome: true, apelido: true },
    })
  } else {
    grupo = await prisma.palpiteGrupo.findFirst({
      where: { participanteId },
      orderBy: { criadoEm: 'asc' },
      select: { id: true, nome: true, apelido: true },
    })
  }

  if (!grupo) {
    const participante = await prisma.participante.findUnique({
      where: { id: participanteId },
    })
    if (!participante) throw new Error('Participante não encontrado')

    grupo = await prisma.palpiteGrupo.create({
      data: {
        participanteId,
        nome: participante.nome,
        apelido: 'Palpite 1',
        fonte: 'excel',
      },
      select: { id: true, nome: true, apelido: true },
    })
  }

  const jogoIds = palpites.map((p) => p.jogoId)

  await prisma.palpite.deleteMany({
    where: {
      palpiteGrupoId: grupo.id,
      jogoId: { in: jogoIds },
    },
  })

  await prisma.palpite.createMany({
    data: palpites.map((p) => ({
      palpiteGrupoId: grupo.id,
      jogoId: p.jogoId,
      placarA: p.placarA,
      placarB: p.placarB,
      fonte: 'excel' as const,
    })),
  })

  return { totalSalvos: palpites.length, palpiteGrupoId: grupo.id }
}

export async function getStatusCompletarBolao() {
  const participantes = await prisma.participante.findMany({
    orderBy: { nome: 'asc' },
    include: {
      grupos: {
        include: {
          palpites: {
            select: { jogoId: true },
          },
        },
      },
    },
  })

  const jogosRestantes = await prisma.jogo.count({
    where: { isBolao: false, fase: 'grupos' },
  })

  const jogosRestantesIds = await prisma.jogo.findMany({
    where: { isBolao: false, fase: 'grupos' },
    select: { id: true },
  })
  const jogosRestantesSet = new Set(jogosRestantesIds.map((j) => j.id))

  return participantes.map((p) => {
    const palpitesJogoIds = new Set<string>()
    for (const grupo of p.grupos) {
      for (const palpite of grupo.palpites) {
        if (jogosRestantesSet.has(palpite.jogoId)) {
          palpitesJogoIds.add(palpite.jogoId)
        }
      }
    }

    const jogosCompletos = palpitesJogoIds.size
    const jogosFaltando = jogosRestantes - jogosCompletos

    return {
      id: p.id,
      nome: p.nome,
      token: p.token,
      fotoUrl: p.fotoUrl,
      totalJogos: jogosRestantes,
      jogosCompletos,
      jogosFaltando,
      completo: jogosFaltando === 0,
    }
  })
}

export async function sortearPalpites(participanteIds: string[]) {
  const jogosRestantes = await prisma.jogo.findMany({
    where: { isBolao: false, fase: 'grupos' },
  })

  const resultados: { participanteId: string; totalSorteados: number }[] = []

  for (const participanteId of participanteIds) {
    const palpitesMap = await getPalpitesParticipante(participanteId)

    const palpitesFaltantes = jogosRestantes
      .filter((j) => !palpitesMap.has(j.id))
      .map((j) => ({
        jogoId: j.id,
        placarA: Math.floor(Math.random() * 6),
        placarB: Math.floor(Math.random() * 6),
      }))

    if (palpitesFaltantes.length > 0) {
      await salvarPalpitesCompletar(participanteId, palpitesFaltantes)
    }

    resultados.push({
      participanteId,
      totalSorteados: palpitesFaltantes.length,
    })
  }

  return resultados
}

export async function getJogosRestantesComPalpites(participanteId: string, palpiteGrupoId?: string) {
  const jogos = await getJogosRestantes()
  const palpitesMap = palpiteGrupoId
    ? await getPalpitesPorGrupo(palpiteGrupoId)
    : await getPalpitesParticipante(participanteId)

  return jogos.map((j) => ({
    id: j.id,
    grupo: j.grupo,
    dataHora: j.dataHora,
    timeA: j.timeA,
    timeB: j.timeB,
    palpite: palpitesMap.get(j.id) ?? null,
  }))
}
