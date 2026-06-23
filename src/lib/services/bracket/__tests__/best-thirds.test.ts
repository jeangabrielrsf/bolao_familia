import { getMelhores8Terceiros } from '../best-thirds'
import type { ClassificacaoGrupo } from '../types'

function makeGrupo(grupo: string, terceiro: { time: string; pontos: number; golsPro: number; saldo: number }): ClassificacaoGrupo {
  return {
    grupo,
    times: [],
    classificados: [],
    terceiro: {
      time: terceiro.time, jogos: 3, vitorias: 0, empates: 0, derrotas: 0,
      golsPro: terceiro.golsPro, golsContra: terceiro.golsPro - terceiro.saldo, saldo: terceiro.saldo,
      pontos: terceiro.pontos, posicao: 3, jogosDetalhe: [],
    },
  }
}

describe('getMelhores8Terceiros', () => {
  it('seleciona 8 de 12 terceiros, ordenados por pontos desc', () => {
    const grupos: ClassificacaoGrupo[] = []
    for (const [letra, pts] of [['A',6],['B',5],['C',4],['D',4],['E',3],['F',3],['G',3],['H',1],['I',2],['J',1],['K',1],['L',0]] as const) {
      grupos.push(makeGrupo(letra, { time: letra, pontos: pts, golsPro: 0, saldo: 0 }))
    }
    const result = getMelhores8Terceiros(grupos)
    expect(result).toHaveLength(8)
    expect(result[0].time).toBe('A')
    expect(result[7].time).toBe('I')
  })

  it('desempata por saldo de gols quando pontos iguais', () => {
    const grupos = [
      makeGrupo('A', { time: 'A', pontos: 3, golsPro: 5, saldo: 3 }),
      makeGrupo('B', { time: 'B', pontos: 3, golsPro: 4, saldo: 1 }),
      makeGrupo('C', { time: 'C', pontos: 3, golsPro: 6, saldo: 0 }),
    ]
    const result = getMelhores8Terceiros(grupos)
    expect(result[0].time).toBe('A')
    expect(result[1].time).toBe('B')
  })

  it('desempata por gols pró quando saldo igual', () => {
    const grupos = [
      makeGrupo('A', { time: 'A', pontos: 3, golsPro: 5, saldo: 2 }),
      makeGrupo('B', { time: 'B', pontos: 3, golsPro: 7, saldo: 2 }),
      makeGrupo('C', { time: 'C', pontos: 3, golsPro: 3, saldo: 2 }),
    ]
    const result = getMelhores8Terceiros(grupos)
    expect(result[0].time).toBe('B')
    expect(result[1].time).toBe('A')
  })
})
