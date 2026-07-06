import { type Fase } from '@prisma/client'
import { prisma } from '../client'
import { CONFIG_CHAVES, FASES_MATA_MATA } from '@/lib/utils/constants'

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

export async function detectarModoGrupo(palpiteGrupoId: string): Promise<'completo' | 'restante'> {
  const count = await prisma.palpite.count({
    where: {
      palpiteGrupoId,
      jogo: { isBolao: true },
    },
  })
  return count === 0 ? 'completo' : 'restante'
}

export async function getJogosCompletos() {
  return prisma.jogo.findMany({
    where: { fase: 'grupos' },
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

  const palpitesMap = new Map<string, { placarA: number; placarB: number; vencedorPalpite: number | null }>()
  for (const grupo of grupos) {
    for (const palpite of grupo.palpites) {
      palpitesMap.set(palpite.jogoId, { placarA: palpite.placarA, placarB: palpite.placarB, vencedorPalpite: palpite.vencedorPalpite })
    }
  }

  return palpitesMap
}

export async function getPalpitesPorGrupo(palpiteGrupoId: string) {
  const grupo = await prisma.palpiteGrupo.findUnique({
    where: { id: palpiteGrupoId },
    include: { palpites: true },
  })

  const palpitesMap = new Map<string, { placarA: number; placarB: number; vencedorPalpite: number | null }>()
  if (grupo) {
    for (const palpite of grupo.palpites) {
      palpitesMap.set(palpite.jogoId, { placarA: palpite.placarA, placarB: palpite.placarB, vencedorPalpite: palpite.vencedorPalpite })
    }
  }

  return palpitesMap
}

export async function getExtrasPorGrupo(palpiteGrupoId: string) {
  return prisma.palpiteExtra.findMany({
    where: { palpiteGrupoId },
    orderBy: { tipo: 'asc' },
  })
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

export async function salvarExtrasCompletar(
  palpiteGrupoId: string,
  extras: { tipo: 'artilheiro' | 'campeao' | 'vice' | 'terceiro' | 'quarto'; valor: string }[]
) {
  for (const extra of extras) {
    await prisma.palpiteExtra.upsert({
      where: {
        palpiteGrupoId_tipo: { palpiteGrupoId, tipo: extra.tipo },
      },
      update: { valor: extra.valor },
      create: {
        palpiteGrupoId,
        tipo: extra.tipo,
        valor: extra.valor,
        fonte: 'excel',
      },
    })
  }
}

export async function getStatusCompletarBolao() {
  const participantes = await prisma.participante.findMany({
    orderBy: { nome: 'asc' },
    select: {
      id: true,
      nome: true,
      token: true,
      fotoUrl: true,
      liberacoes: true,
      grupos: {
        include: {
          palpites: {
            select: { jogoId: true, jogo: { select: { isBolao: true } } },
          },
          extras: true,
        },
      },
    },
  })

  const totalJogosGrupos = await prisma.jogo.count({ where: { fase: 'grupos' } })
  const totalJogosRestantes = await prisma.jogo.count({ where: { isBolao: false, fase: 'grupos' } })

  const jogosGruposIds = await prisma.jogo.findMany({
    where: { fase: 'grupos' },
    select: { id: true },
  })
  const jogosGruposSet = new Set(jogosGruposIds.map((j) => j.id))

  const jogosRestantesIds = await prisma.jogo.findMany({
    where: { isBolao: false, fase: 'grupos' },
    select: { id: true },
  })
  const jogosRestantesSet = new Set(jogosRestantesIds.map((j) => j.id))

  return participantes.map((p) => {
    const liberacoes = (p.liberacoes as string[]) ?? []
    if (p.grupos.length === 0) {
      return {
        id: p.id,
        nome: p.nome,
        token: p.token,
        fotoUrl: p.fotoUrl,
        liberacoes,
        totalJogos: totalJogosGrupos,
        jogosCompletos: 0,
        jogosFaltando: totalJogosGrupos,
        completo: false,
        modo: 'completo' as const,
        extrasCompletos: 0,
        totalExtras: 5,
      }
    }

    let totalCompletos = 0
    let modo: 'completo' | 'restante' = 'restante'

    for (const grupo of p.grupos) {
      const temBolao = grupo.palpites.some((pal) => pal.jogo.isBolao)
      const grupoModo: 'completo' | 'restante' = temBolao ? 'restante' : 'completo'

      const targetSet = grupoModo === 'completo' ? jogosGruposSet : jogosRestantesSet

      const grupoCompletos = grupo.palpites.filter((pal) => targetSet.has(pal.jogoId)).length
      totalCompletos += grupoCompletos

      if (grupoModo === 'completo') modo = 'completo'
    }

    const totalAlvo = modo === 'completo' ? totalJogosGrupos * Math.max(p.grupos.length, 1) : totalJogosRestantes * Math.max(p.grupos.length, 1)
    const jogosFaltando = Math.max(0, totalAlvo - totalCompletos)

    const extrasCompletos = modo === 'completo'
      ? p.grupos.reduce((acc, g) => acc + g.extras.length, 0)
      : 0

    return {
      id: p.id,
      nome: p.nome,
      token: p.token,
      fotoUrl: p.fotoUrl,
      liberacoes,
      totalJogos: modo === 'completo' ? totalJogosGrupos : totalJogosRestantes,
      jogosCompletos: totalCompletos,
      jogosFaltando,
      completo: jogosFaltando === 0 && (modo === 'restante' || extrasCompletos >= 5 * p.grupos.length),
      modo,
      extrasCompletos,
      totalExtras: modo === 'completo' ? 5 * p.grupos.length : 0,
    }
  })
}

export async function sortearPalpites(participanteIds: string[]) {
  const jogosGrupos = await prisma.jogo.findMany({ where: { fase: 'grupos' } })
  const jogosRestantes = await prisma.jogo.findMany({ where: { isBolao: false, fase: 'grupos' } })

  const TIMES_EXTRA = ['Argentina', 'Brasil', 'França', 'Alemanha', 'Espanha', 'Inglaterra', 'Holanda', 'Portugal'] as const

  const resultados: { participanteId: string; totalSorteados: number }[] = []

  for (const participanteId of participanteIds) {
    const grupos = await prisma.palpiteGrupo.findMany({
      where: { participanteId },
      include: { palpites: true, extras: true },
    })

    let totalSorteados = 0

    for (const grupo of grupos) {
      const palpiteJogoIds = new Set(grupo.palpites.map((p) => p.jogoId))
      const hasBolaoPalpites = grupo.palpites.some((pal) => {
        const jogo = jogosGrupos.find((j) => j.id === pal.jogoId)
        return jogo?.isBolao
      })
      const modo: 'completo' | 'restante' = hasBolaoPalpites ? 'restante' : (grupo.palpites.length === 0 ? 'completo' : 'restante')

      const jogosAlvo = modo === 'completo' ? jogosGrupos : jogosRestantes

      const faltantes = jogosAlvo
        .filter((j) => !palpiteJogoIds.has(j.id))
        .map((j) => ({
          jogoId: j.id,
          placarA: Math.floor(Math.random() * 6),
          placarB: Math.floor(Math.random() * 6),
        }))

      if (faltantes.length > 0) {
        await prisma.palpite.createMany({
          data: faltantes.map((f) => ({
            palpiteGrupoId: grupo.id,
            jogoId: f.jogoId,
            placarA: f.placarA,
            placarB: f.placarB,
            fonte: 'excel' as const,
          })),
        })
        totalSorteados += faltantes.length
      }

      if (modo === 'completo') {
        const extrasExistentes = new Set(grupo.extras.map((e) => e.tipo))
        const tiposExtras = ['artilheiro', 'campeao', 'vice', 'terceiro', 'quarto'] as const
        const extrasFaltantes = tiposExtras.filter((t) => !extrasExistentes.has(t))

        for (const tipo of extrasFaltantes) {
          const valor = TIMES_EXTRA[Math.floor(Math.random() * TIMES_EXTRA.length)]
          await prisma.palpiteExtra.upsert({
            where: { palpiteGrupoId_tipo: { palpiteGrupoId: grupo.id, tipo } },
            update: { valor },
            create: { palpiteGrupoId: grupo.id, tipo, valor, fonte: 'excel' },
          })
        }
        totalSorteados += extrasFaltantes.length
      }
    }

    resultados.push({ participanteId, totalSorteados })
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

export async function getJogosCompletosComPalpites(participanteId: string, palpiteGrupoId?: string) {
  const jogos = await getJogosCompletos()
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

export async function getParticipantesElegiveis() {
  const participantesComGrupos = await prisma.palpiteGrupo.findMany({
    select: { participanteId: true },
    distinct: ['participanteId'],
  })
  const idsComGrupos = new Set(participantesComGrupos.map((g) => g.participanteId))

  const todos = await prisma.participante.findMany({
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true },
  })

  return todos.filter((p) => !idsComGrupos.has(p.id))
}

export async function criarNovoPalpite(participanteId: string, apelido?: string) {
  const gruposExistentes = await prisma.palpiteGrupo.count({
    where: { participanteId },
  })

  if (gruposExistentes > 0) {
    throw new Error('Participante já possui palpites')
  }

  const participante = await prisma.participante.findUnique({
    where: { id: participanteId },
  })

  if (!participante) {
    throw new Error('Participante não encontrado')
  }

  return prisma.palpiteGrupo.create({
    data: {
      participanteId,
      nome: participante.nome,
      apelido: apelido || 'Palpite 1',
      fonte: 'excel',
    },
  })
}

export function isFaseMataMata(fase: string): boolean {
  return (FASES_MATA_MATA as readonly string[]).includes(fase)
}

export async function getFasesHabilitadas(): Promise<Record<string, boolean>> {
  const configs = await prisma.configuracao.findMany({
    where: {
      chave: {
        in: FASES_MATA_MATA.map((f) => `habilitado_${f}`),
      },
    },
  })

  const result: Record<string, boolean> = {}
  for (const fase of FASES_MATA_MATA) {
    const config = configs.find((c) => c.chave === `habilitado_${fase}`)
    result[fase] = config?.valor === 'true'
  }
  return result
}

export async function getConfigFaseMataMata(fase: string): Promise<{ prazo: Date | null; habilitado: boolean }> {
  const configs = await prisma.configuracao.findMany({
    where: {
      chave: {
        in: [`prazo_${fase}`, `habilitado_${fase}`],
      },
    },
  })

  const prazo = configs.find((c) => c.chave === `prazo_${fase}`)
  const habilitado = configs.find((c) => c.chave === `habilitado_${fase}`)

  return {
    prazo: prazo?.valor ? new Date(prazo.valor) : null,
    habilitado: habilitado?.valor === 'true',
  }
}

export async function setConfigFaseMataMata(
  fase: string,
  config: { prazo?: string; habilitado?: boolean }
): Promise<void> {
  if (config.prazo !== undefined) {
    await prisma.configuracao.upsert({
      where: { chave: `prazo_${fase}` },
      update: { valor: config.prazo },
      create: {
        chave: `prazo_${fase}`,
        valor: config.prazo,
        descricao: `Prazo para palpites da fase ${fase} (ISO 8601)`,
      },
    })
  }

  if (config.habilitado !== undefined) {
    await prisma.configuracao.upsert({
      where: { chave: `habilitado_${fase}` },
      update: { valor: String(config.habilitado) },
      create: {
        chave: `habilitado_${fase}`,
        valor: String(config.habilitado),
        descricao: `Habilita/desabilita palpites da fase ${fase}`,
      },
    })
  }
}

export async function getJogosFase(fase: string) {
  return prisma.jogo.findMany({
    where: { fase: fase as Fase },
    orderBy: { dataHora: 'asc' },
  })
}

export async function getJogosFaseComPalpites(
  fase: string,
  participanteId: string,
  palpiteGrupoId?: string
) {
  const jogos = await getJogosFase(fase)
  const palpitesMap = palpiteGrupoId
    ? await getPalpitesPorGrupo(palpiteGrupoId)
    : await getPalpitesParticipante(participanteId)

  return jogos.map((j) => ({
    id: j.id,
    fase: j.fase,
    dataHora: j.dataHora,
    timeA: j.timeA,
    timeB: j.timeB,
    local: j.local,
    cidade: j.cidade,
    palpite: palpitesMap.get(j.id) ?? null,
  }))
}

export async function salvarPalpitesFase(
  participanteId: string,
  palpites: { jogoId: string; placarA: number; placarB: number; vencedorPalpite?: number | null }[],
  palpiteGrupoId: string
) {
  const grupo = await prisma.palpiteGrupo.findFirst({
    where: { id: palpiteGrupoId, participanteId },
    select: { id: true },
  })

  if (!grupo) {
    throw new Error('Grupo de palpites não encontrado')
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
      vencedorPalpite: p.vencedorPalpite ?? null,
      fonte: 'excel' as const,
    })),
  })

  return { totalSalvos: palpites.length, palpiteGrupoId: grupo.id }
}

export async function isFaseEditavel(fase: string, participanteId?: string): Promise<boolean> {
  if (participanteId) {
    const liberacoes = await getLiberacoesParticipante(participanteId)
    const faseKey = fase === 'grupos' ? 'grupos' : fase
    if (liberacoes.includes(faseKey)) return true
  }

  if (fase === 'grupos') {
    const config = await getConfigCompletarBolao()
    if (!config.habilitado) return false
    if (new Date() > config.prazo) return false
    return true
  }

  const config = await getConfigFaseMataMata(fase)
  if (!config.habilitado) return false

  const primeiroJogo = await prisma.jogo.findFirst({
    where: { fase: fase as Fase },
    orderBy: { dataHora: 'asc' },
    select: { dataHora: true, status: true },
  })

  if (!primeiroJogo) return true
  if (primeiroJogo.status === 'finalizado' || primeiroJogo.status === 'em_andamento') return false

  const prazo = config.prazo
  if (prazo && new Date() > prazo) return false

  return new Date() < primeiroJogo.dataHora
}

export async function getLiberacoesParticipante(participanteId: string): Promise<string[]> {
  const participante = await prisma.participante.findUnique({
    where: { id: participanteId },
    select: { liberacoes: true },
  })
  return (participante?.liberacoes as string[]) ?? []
}

export async function setLiberacoesParticipante(participanteId: string, liberacoes: string[]): Promise<void> {
  await prisma.participante.update({
    where: { id: participanteId },
    data: { liberacoes },
  })
}

export async function isParticipanteLiberadoParaFase(participanteId: string, fase: string): Promise<boolean> {
  const liberacoes = await getLiberacoesParticipante(participanteId)
  const faseKey = fase === 'grupos' ? 'grupos' : fase
  return liberacoes.includes(faseKey)
}
