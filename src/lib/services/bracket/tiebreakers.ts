import type { ClassificacaoTime } from './types'

/**
 * Aplica tiebreakers oficiais FIFA 2026 (steps 1-5) entre os times.
 * Steps 6-7 (fair play, ranking FIFA) não implementados — posicao fica null.
 */
export function aplicarTiebreakers(times: ClassificacaoTime[]): ClassificacaoTime[] {
  if (times.length === 0) return []

  const ordenados = [...times].sort((a, b) => b.pontos - a.pontos)

  const resultado: ClassificacaoTime[] = []
  let grupoAtual: ClassificacaoTime[] = []
  let pontosAnteriores = -1
  const tiedTimes = new Set<string>()

  for (const time of ordenados) {
    if (time.pontos !== pontosAnteriores) {
      if (grupoAtual.length > 1) {
        const { times: ordenadosGrupo, tiedTimes: tiedGrupo } = desempatarGrupo(grupoAtual)
        resultado.push(...ordenadosGrupo)
        for (const nome of tiedGrupo) tiedTimes.add(nome)
      } else if (grupoAtual.length === 1) {
        resultado.push(grupoAtual[0])
      }
      grupoAtual = [time]
      pontosAnteriores = time.pontos
    } else {
      grupoAtual.push(time)
    }
  }
  if (grupoAtual.length > 1) {
    const { times: ordenadosGrupo, tiedTimes: tiedGrupo } = desempatarGrupo(grupoAtual)
    resultado.push(...ordenadosGrupo)
    for (const nome of tiedGrupo) tiedTimes.add(nome)
  } else if (grupoAtual.length === 1) {
    resultado.push(grupoAtual[0])
  }

  let posicao = 1
  for (const time of resultado) {
    if (!tiedTimes.has(time.time)) {
      time.posicao = posicao
    }
    posicao++
  }
  return resultado
}

function desempatarGrupo(grupo: ClassificacaoTime[]): { times: ClassificacaoTime[]; tiedTimes: Set<string> } {
  let times = grupo
  for (const step of [1, 2, 3, 4, 5] as const) {
    times = aplicarStep(times, step)
  }

  const signatures = new Map<string, ClassificacaoTime[]>()
  for (const time of times) {
    const sig = ([1, 2, 3, 4, 5] as const).map(step => calcularCriterio(time, times, step)).join(',')
    if (!signatures.has(sig)) signatures.set(sig, [])
    signatures.get(sig)!.push(time)
  }

  const tiedTimes = new Set<string>()
  for (const [, grupo] of signatures) {
    if (grupo.length > 1) {
      for (const t of grupo) tiedTimes.add(t.time)
    }
  }

  return { times, tiedTimes }
}

function aplicarStep(times: ClassificacaoTime[], step: 1 | 2 | 3 | 4 | 5): ClassificacaoTime[] {
  if (times.length <= 1) return times

  const comCriterio = times.map(t => ({ time: t, valor: calcularCriterio(t, times, step) }))

  const gruposPorCriterio = new Map<number, typeof comCriterio>()
  for (const item of comCriterio) {
    const key = item.valor
    if (!gruposPorCriterio.has(key)) gruposPorCriterio.set(key, [])
    gruposPorCriterio.get(key)!.push(item)
  }

  if (gruposPorCriterio.size === 1) return times

  const valoresOrdenados = Array.from(gruposPorCriterio.keys()).sort((a, b) => b - a)
  const resultado: ClassificacaoTime[] = []
  for (const valor of valoresOrdenados) {
    for (const item of gruposPorCriterio.get(valor)!) {
      resultado.push(item.time)
    }
  }
  return resultado
}

function calcularCriterio(time: ClassificacaoTime, grupo: ClassificacaoTime[], step: 1 | 2 | 3 | 4 | 5): number {
  if (step === 4) return time.saldo
  if (step === 5) return time.golsPro

  const nomesGrupo = new Set(grupo.map(t => t.time))
  let pontosH2H = 0
  let golsProH2H = 0
  let golsContraH2H = 0
  for (const jogo of time.jogosDetalhe) {
    if (!nomesGrupo.has(jogo.adversario)) continue
    pontosH2H += jogo.placarPro > jogo.placarContra ? 3 : jogo.placarPro === jogo.placarContra ? 1 : 0
    golsProH2H += jogo.placarPro
    golsContraH2H += jogo.placarContra
  }
  if (step === 1) return pontosH2H
  if (step === 2) return golsProH2H - golsContraH2H
  return golsProH2H
}
