import { aplicarTiebreakers } from '../tiebreakers'
import type { ClassificacaoTime } from '../types'

function makeTime(overrides: Partial<ClassificacaoTime>): ClassificacaoTime {
  return {
    time: 'X', jogos: 3, vitorias: 0, empates: 0, derrotas: 0,
    golsPro: 0, golsContra: 0, saldo: 0, pontos: 0, posicao: null, jogosDetalhe: [],
    ...overrides,
  }
}

describe('aplicarTiebreakers (FIFA 2026, steps 1-5)', () => {
  it('step 1 puro: A ganha H2H contra B', () => {
    const a = makeTime({ time: 'A', pontos: 6, jogosDetalhe: [
      { adversario: 'B', placarPro: 2, placarContra: 0 },
      { adversario: 'C', placarPro: 1, placarContra: 1 },
      { adversario: 'D', placarPro: 1, placarContra: 0 },
    ]})
    const b = makeTime({ time: 'B', pontos: 6, jogosDetalhe: [
      { adversario: 'A', placarPro: 0, placarContra: 2 },
      { adversario: 'C', placarPro: 3, placarContra: 0 },
      { adversario: 'D', placarPro: 0, placarContra: 1 },
    ]})
    const c = makeTime({ time: 'C', pontos: 3, jogosDetalhe: [
      { adversario: 'A', placarPro: 1, placarContra: 1 },
      { adversario: 'B', placarPro: 0, placarContra: 3 },
      { adversario: 'D', placarPro: 2, placarContra: 1 },
    ]})
    const d = makeTime({ time: 'D', pontos: 0 })
    const ordenados = aplicarTiebreakers([b, a, d, c])
    expect(ordenados[0].time).toBe('A')
    expect(ordenados[1].time).toBe('B')
  })

  it('step 4 (saldo geral) desempat quando steps 1-3 empatam', () => {
    const a = makeTime({ time: 'A', pontos: 6, saldo: 2, jogosDetalhe: [
      { adversario: 'B', placarPro: 1, placarContra: 1 },
      { adversario: 'C', placarPro: 2, placarContra: 0 },
      { adversario: 'D', placarPro: 2, placarContra: 0 },
    ]})
    const b = makeTime({ time: 'B', pontos: 6, saldo: 0, jogosDetalhe: [
      { adversario: 'A', placarPro: 1, placarContra: 1 },
      { adversario: 'C', placarPro: 1, placarContra: 1 },
      { adversario: 'D', placarPro: 1, placarContra: 1 },
    ]})
    const c = makeTime({ time: 'C', pontos: 1 })
    const d = makeTime({ time: 'D', pontos: 1 })
    const ordenados = aplicarTiebreakers([b, a, d, c])
    expect(ordenados[0].time).toBe('A')
  })

  it('retorna posicao=null quando steps 1-5 não desempatam', () => {
    const a = makeTime({ time: 'A', pontos: 6, golsPro: 3, golsContra: 1, saldo: 2, jogosDetalhe: [
      { adversario: 'B', placarPro: 1, placarContra: 1 },
      { adversario: 'C', placarPro: 1, placarContra: 0 },
      { adversario: 'D', placarPro: 1, placarContra: 0 },
    ]})
    const b = makeTime({ time: 'B', pontos: 6, golsPro: 3, golsContra: 1, saldo: 2, jogosDetalhe: [
      { adversario: 'A', placarPro: 1, placarContra: 1 },
      { adversario: 'C', placarPro: 1, placarContra: 0 },
      { adversario: 'D', placarPro: 1, placarContra: 0 },
    ]})
    const ordenados = aplicarTiebreakers([a, b])
    expect(ordenados[0].posicao).toBeNull()
    expect(ordenados[1].posicao).toBeNull()
  })
})
