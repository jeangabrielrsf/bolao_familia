import { aplicarSimulacao } from '../simulator'
import type { JogoComTimes } from '../types'

const makeJogo = (overrides: Partial<JogoComTimes>): JogoComTimes => ({
  id: 'g1', fase: 'grupos', grupo: 'A', timeA: 'A', timeB: 'B',
  resultadoA: null, resultadoB: null, status: 'agendado',
  placarPenaltisA: null, placarPenaltisB: null, vencedor: null,
  sofascoreId: '1', dataHora: new Date(),
  ...overrides,
})

describe('aplicarSimulacao', () => {
  it('mantém jogos finalizados intactos', () => {
    const jogos = [
      makeJogo({ id: 'final', status: 'finalizado', resultadoA: 2, resultadoB: 1 }),
      makeJogo({ id: 'futuro', status: 'agendado' }),
    ]
    const result = aplicarSimulacao(jogos, { futuro: { placarA: 3, placarB: 0 } })
    expect(result.find(j => j.id === 'final')?.resultadoA).toBe(2)
  })

  it('aplica placares simulados em jogos futuros', () => {
    const jogos = [makeJogo({ id: 'futuro', status: 'agendado' })]
    const result = aplicarSimulacao(jogos, { futuro: { placarA: 3, placarB: 0 } })
    const jogo = result.find(j => j.id === 'futuro')!
    expect(jogo.resultadoA).toBe(3)
    expect(jogo.resultadoB).toBe(0)
    expect(jogo.status).toBe('finalizado')
    expect(jogo.vencedor).toBe(1)
  })

  it('rejeita edição em jogo já finalizado', () => {
    const jogos = [makeJogo({ id: 'final', status: 'finalizado', resultadoA: 1, resultadoB: 0 })]
    const result = aplicarSimulacao(jogos, { final: { placarA: 5, placarB: 0 } })
    expect(result[0].resultadoA).toBe(1)
  })
})
