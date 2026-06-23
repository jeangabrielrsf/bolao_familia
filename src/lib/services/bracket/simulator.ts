import type { JogoComTimes } from './types'

type Simulacao = Record<string, { placarA: number; placarB: number }>

export function aplicarSimulacao(jogos: JogoComTimes[], simulacao: Simulacao): JogoComTimes[] {
  return jogos.map(jogo => {
    const edit = simulacao[jogo.id]
    if (!edit) return jogo
    if (jogo.status === 'finalizado') return jogo

    return {
      ...jogo,
      resultadoA: edit.placarA,
      resultadoB: edit.placarB,
      status: 'finalizado' as const,
      vencedor: edit.placarA > edit.placarB ? 1 : edit.placarA < edit.placarB ? 2 : null,
    }
  })
}
