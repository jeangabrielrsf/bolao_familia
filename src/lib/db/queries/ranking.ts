import { prisma } from '../client'
import { getConfiguracao } from './config'
import { calcularPontosJogo, calcularPontosExtra } from '@/lib/utils/helpers'
import type { RankingEntry } from '@/lib/utils/types'

export async function getRanking(): Promise<RankingEntry[]> {
  const config = await getConfiguracao()

  const grupos = await prisma.palpiteGrupo.findMany({
    include: {
      participante: true,
      palpites: {
        include: { jogo: true },
      },
      extras: true,
    },
  })

  const resultadosExtras = await prisma.resultadoExtra.findMany()
  const extrasMap = Object.fromEntries(resultadosExtras.map(r => [r.tipo, r.valor]))

  const ranking = grupos.map(g => {
    let pontos = 0
    let placaresExatos = 0
    let vencedoresCorretos = 0
    let quemPassaAcertos = 0

    for (const palpite of g.palpites) {
      if (palpite.jogo.status !== 'finalizado') continue
      if (palpite.jogo.resultadoA === null || palpite.jogo.resultadoB === null) continue

      const resultado = calcularPontosJogo(
        palpite.placarA, palpite.placarB,
        palpite.jogo.resultadoA, palpite.jogo.resultadoB,
        config
      )

      pontos += resultado.pontos
      if (resultado.tipo === 'exato') placaresExatos++
      if (resultado.tipo === 'vencedor' || resultado.tipo === 'exato') vencedoresCorretos++
    }

    for (const extra of g.extras) {
      const valorReal = extrasMap[extra.tipo]
      if (valorReal) {
        pontos += calcularPontosExtra(extra.valor, valorReal, config, extra.tipo)
      }
    }

    return {
      palpiteGrupoId: g.id,
      participanteId: g.participanteId,
      nomeParticipante: g.participante.nome,
      nomeGrupo: g.nome,
      apelido: g.apelido,
      fotoUrl: g.participante.fotoUrl,
      pontos,
      placaresExatos,
      vencedoresCorretos,
      quemPassaAcertos,
    }
  })

  return ranking.sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos
    if (b.placaresExatos !== a.placaresExatos) return b.placaresExatos - a.placaresExatos
    return b.vencedoresCorretos - a.vencedoresCorretos
  })
}
