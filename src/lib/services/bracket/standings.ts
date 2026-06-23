import type { ClassificacaoGrupo, ClassificacaoTime, JogoComTimes } from './types'
import { GRUPOS } from '@/lib/utils/constants'
import { aplicarTiebreakers } from './tiebreakers'

export function getClassificacaoGrupos(jogos: JogoComTimes[]): ClassificacaoGrupo[] {
  const gruposMap = new Map<string, JogoComTimes[]>()
  for (const grupo of GRUPOS) {
    gruposMap.set(grupo, [])
  }
  for (const jogo of jogos) {
    if (jogo.fase !== 'grupos' || !jogo.grupo) continue
    gruposMap.get(jogo.grupo)?.push(jogo)
  }

  return GRUPOS.map(grupo => calcularClassificacaoGrupo(grupo, gruposMap.get(grupo) || []))
}

function calcularClassificacaoGrupo(grupo: string, jogos: JogoComTimes[]): ClassificacaoGrupo {
  const timesMap = new Map<string, ClassificacaoTime>()

  for (const jogo of jogos) {
    if (jogo.status !== 'finalizado') continue
    if (jogo.resultadoA === null || jogo.resultadoB === null) continue
    if (!jogo.timeA || !jogo.timeB) continue

    if (!timesMap.has(jogo.timeA)) timesMap.set(jogo.timeA, inicializarTime(jogo.timeA))
    if (!timesMap.has(jogo.timeB)) timesMap.set(jogo.timeB, inicializarTime(jogo.timeB))

    const a = timesMap.get(jogo.timeA)!
    const b = timesMap.get(jogo.timeB)!

    a.jogos++
    b.jogos++
    a.golsPro += jogo.resultadoA
    a.golsContra += jogo.resultadoB
    b.golsPro += jogo.resultadoB
    b.golsContra += jogo.resultadoA

    a.jogosDetalhe.push({ adversario: jogo.timeB, placarPro: jogo.resultadoA, placarContra: jogo.resultadoB })
    b.jogosDetalhe.push({ adversario: jogo.timeA, placarPro: jogo.resultadoB, placarContra: jogo.resultadoA })

    if (jogo.resultadoA > jogo.resultadoB) {
      a.vitorias++; a.pontos += 3; b.derrotas++
    } else if (jogo.resultadoA < jogo.resultadoB) {
      b.vitorias++; b.pontos += 3; a.derrotas++
    } else {
      a.empates++; b.empates++; a.pontos++; b.pontos++
    }
  }

  const times = Array.from(timesMap.values()).map(t => ({ ...t, saldo: t.golsPro - t.golsContra }))
  const ordenados = aplicarTiebreakers(times)

  return {
    grupo,
    times: ordenados,
    classificados: [ordenados[0]?.time, ordenados[1]?.time].filter(Boolean) as string[],
    terceiro: ordenados[2] || ordenados[0] || inicializarTime('?'),
  }
}

function inicializarTime(time: string): ClassificacaoTime {
  return {
    time, jogos: 0, vitorias: 0, empates: 0, derrotas: 0,
    golsPro: 0, golsContra: 0, saldo: 0, pontos: 0, posicao: null, jogosDetalhe: [],
  }
}
