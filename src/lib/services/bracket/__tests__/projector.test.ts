import { projetarChaveamento } from '../projector'
import type { JogoComTimes } from '../types'

const makeJogo = (overrides: Partial<JogoComTimes>): JogoComTimes => ({
  id: 'r32-1', fase: 'dezesseis_avos', grupo: null, timeA: null, timeB: null,
  resultadoA: null, resultadoB: null, status: 'agendado',
  placarPenaltisA: null, placarPenaltisB: null, vencedor: null,
  sofascoreId: 'R32-M1', dataHora: new Date(),
  ...overrides,
})

const makeChaveamentoCompleto = (): JogoComTimes[] => {
  const jogos: JogoComTimes[] = []
  for (let i = 1; i <= 16; i++) {
    jogos.push(makeJogo({ id: `r32-${i}`, sofascoreId: `R32-M${i}`, fase: 'dezesseis_avos' }))
  }
  for (let i = 1; i <= 8; i++) {
    jogos.push(makeJogo({ id: `r16-${i}`, sofascoreId: `R16-M${i}`, fase: 'oitavas' }))
  }
  for (let i = 1; i <= 4; i++) {
    jogos.push(makeJogo({ id: `qf-${i}`, sofascoreId: `QF-M${i}`, fase: 'quartas' }))
  }
  for (let i = 1; i <= 2; i++) {
    jogos.push(makeJogo({ id: `sf-${i}`, sofascoreId: `SF-M${i}`, fase: 'semifinal' }))
  }
  jogos.push(makeJogo({ id: 'tp-1', sofascoreId: 'TP-M1', fase: 'terceiro' }))
  jogos.push(makeJogo({ id: 'f-1', sofascoreId: 'F-M1', fase: 'final' }))
  return jogos
}

describe('projetarChaveamento', () => {
  it('retorna 32 slots: 16 R32 + 8 R16 + 4 QF + 2 SF + 1 3º + 1 F', () => {
    const result = projetarChaveamento({
      classificacao: [],
      melhoresTerceiros: [],
      jogosMataMata: makeChaveamentoCompleto(),
    })
    expect(result).toHaveLength(32)
    expect(result.filter(s => s.fase === 'dezesseis_avos')).toHaveLength(16)
    expect(result.filter(s => s.fase === 'oitavas')).toHaveLength(8)
    expect(result.filter(s => s.fase === 'quartas')).toHaveLength(4)
    expect(result.filter(s => s.fase === 'semifinal')).toHaveLength(2)
    expect(result.filter(s => s.fase === 'terceiro')).toHaveLength(1)
    expect(result.filter(s => s.fase === 'final')).toHaveLength(1)
  })

  it('preenche R16 com vencedor do R32 quando finalizado', () => {
    const jogos = [
      makeJogo({ id: 'r32-1', sofascoreId: 'R32-M1', timeA: 'Brasil', timeB: 'México', resultadoA: 2, resultadoB: 1, status: 'finalizado', vencedor: 1 }),
      makeJogo({ id: 'r32-2', sofascoreId: 'R32-M2', timeA: 'Argentina', timeB: 'Espanha', status: 'agendado' }),
      makeJogo({ id: 'r16-1', sofascoreId: 'R16-M1', fase: 'oitavas' }),
    ]
    const result = projetarChaveamento({
      classificacao: [],
      melhoresTerceiros: [],
      jogosMataMata: jogos,
    })
    const r16_1 = result.find(s => s.fase === 'oitavas' && s.slot === 1)!
    expect(r16_1.timeA).toBe('Brasil')
    expect(r16_1.timeB).toBeNull()
  })
})
