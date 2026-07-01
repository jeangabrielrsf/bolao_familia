import { projetarChaveamento } from '../projector'
import type { JogoComTimes, ClassificacaoGrupo } from '../types'
import { getSlotSofascoreId } from '../mata-mata-slots'

const makeJogo = (overrides: Partial<JogoComTimes>): JogoComTimes => {
  const defaultSofascoreId = getSlotSofascoreId('dezesseis_avos', 1)!
  return {
    id: 'r32-1', fase: 'dezesseis_avos', grupo: null, timeA: null, timeB: null,
    resultadoA: null, resultadoB: null, status: 'agendado',
    placarPenaltisA: null, placarPenaltisB: null, vencedor: null,
    sofascoreId: defaultSofascoreId, dataHora: new Date(),
    ...overrides,
  }
}

const makeChaveamentoCompleto = (): JogoComTimes[] => {
  const jogos: JogoComTimes[] = []
  for (let i = 1; i <= 16; i++) {
    jogos.push(makeJogo({ id: `r32-${i}`, sofascoreId: getSlotSofascoreId('dezesseis_avos', i)!, fase: 'dezesseis_avos' }))
  }
  for (let i = 1; i <= 8; i++) {
    jogos.push(makeJogo({ id: `r16-${i}`, sofascoreId: getSlotSofascoreId('oitavas', i)!, fase: 'oitavas' }))
  }
  for (let i = 1; i <= 4; i++) {
    jogos.push(makeJogo({ id: `qf-${i}`, sofascoreId: getSlotSofascoreId('quartas', i)!, fase: 'quartas' }))
  }
  for (let i = 1; i <= 2; i++) {
    jogos.push(makeJogo({ id: `sf-${i}`, sofascoreId: getSlotSofascoreId('semifinal', i)!, fase: 'semifinal' }))
  }
  jogos.push(makeJogo({ id: 'tp-1', sofascoreId: getSlotSofascoreId('terceiro', 1)!, fase: 'terceiro' }))
  jogos.push(makeJogo({ id: 'f-1', sofascoreId: getSlotSofascoreId('final', 1)!, fase: 'final' }))
  return jogos
}

const makeClassificacao = (letra: string, primeiro: string, segundo: string, terceiro: string): ClassificacaoGrupo => ({
  grupo: letra,
  times: [
    { time: primeiro, jogos: 3, vitorias: 3, empates: 0, derrotas: 0, golsPro: 9, golsContra: 1, saldo: 8, pontos: 9, posicao: 1, jogosDetalhe: [] },
    { time: segundo, jogos: 3, vitorias: 1, empates: 1, derrotas: 1, golsPro: 3, golsContra: 3, saldo: 0, pontos: 4, posicao: 2, jogosDetalhe: [] },
    { time: terceiro, jogos: 3, vitorias: 0, empates: 1, derrotas: 2, golsPro: 1, golsContra: 5, saldo: -4, pontos: 1, posicao: 3, jogosDetalhe: [] },
    { time: 'Quarto', jogos: 3, vitorias: 0, empates: 0, derrotas: 3, golsPro: 0, golsContra: 4, saldo: -4, pontos: 0, posicao: 4, jogosDetalhe: [] },
  ],
  classificados: [primeiro, segundo],
  terceiro: { time: terceiro, jogos: 3, vitorias: 0, empates: 1, derrotas: 2, golsPro: 1, golsContra: 5, saldo: -4, pontos: 1, posicao: 3, jogosDetalhe: [] },
})

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
      makeJogo({ id: 'r32-2', sofascoreId: getSlotSofascoreId('dezesseis_avos', 2)!, timeA: 'Brasil', timeB: 'México', resultadoA: 2, resultadoB: 1, status: 'finalizado', vencedor: 1 }),
      makeJogo({ id: 'r32-5', sofascoreId: getSlotSofascoreId('dezesseis_avos', 5)!, timeA: 'Argentina', timeB: 'Espanha', status: 'agendado' }),
      makeJogo({ id: 'r16-1', sofascoreId: getSlotSofascoreId('oitavas', 1)!, fase: 'oitavas' }),
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

  it('M1 (2A vs 2B) — 1X-vs-2Y puro, sem sourceGrupo em timeB', () => {
    const jogos = makeChaveamentoCompleto()
    const result = projetarChaveamento({
      classificacao: [
        makeClassificacao('A', 'México', 'Canadá', 'África do Sul'),
        makeClassificacao('B', 'Suíça', 'Bósnia', 'Egito'),
      ],
      melhoresTerceiros: [],
      jogosMataMata: jogos,
    })
    const m1 = result.find(s => s.fase === 'dezesseis_avos' && s.slot === 1)!
    expect(m1.timeA).toBe('Canadá')  // 2A
    expect(m1.timeB).toBe('Bósnia')  // 2B
    expect(m1.sourceGrupo?.timeA).toEqual({ grupo: 'A', posicao: 2, gruposAlternativos: undefined })
    expect(m1.sourceGrupo?.timeB).toEqual({ grupo: 'B', posicao: 2, gruposAlternativos: undefined })
  })

  it('M2 (1E vs 3[ABCDF]) — resolve 3rd de set específico', () => {
    const jogos = makeChaveamentoCompleto()
    const result = projetarChaveamento({
      classificacao: [
        makeClassificacao('A', 'México', 'Canadá', 'África do Sul'),
        makeClassificacao('B', 'Suíça', 'Bósnia', 'Egito'),
        makeClassificacao('C', 'Brasil', 'Japão', 'Marrocos'),
        makeClassificacao('D', 'EUA', 'Holanda', 'Equador'),
        makeClassificacao('E', 'Alemanha', 'Coreia', 'Curaçau'),
        makeClassificacao('F', 'Holanda', 'Marrocos B', 'Áustria'),
      ],
      melhoresTerceiros: [
        { grupo: 'A', time: 'África do Sul', pontos: 1 },
        { grupo: 'B', time: 'Egito', pontos: 2 },
        { grupo: 'C', time: 'Marrocos', pontos: 4 },
        { grupo: 'D', time: 'Equador', pontos: 3 },
        { grupo: 'F', time: 'Áustria', pontos: 2 },
        { grupo: 'G', time: 'TimeG', pontos: 3 },
        { grupo: 'H', time: 'TimeH', pontos: 1 },
        { grupo: 'I', time: 'TimeI', pontos: 0 },
      ],
      jogosMataMata: jogos,
    })
    const m2 = result.find(s => s.fase === 'dezesseis_avos' && s.slot === 2)!
    expect(m2.timeA).toBe('Alemanha')  // 1E
    expect(m2.timeB).toBe('Marrocos')  // 3C — melhor do set [A,B,C,D,F] por pontos
    expect(m2.sourceGrupo?.timeA).toEqual({ grupo: 'E', posicao: 1, gruposAlternativos: undefined })
    expect(m2.sourceGrupo?.timeB).toEqual({
      grupo: 'C',  // primeiro candidato resolvido
      posicao: 3,
      gruposAlternativos: ['A', 'B', 'C', 'D', 'F'],
    })
  })

  it('M2 com nenhum 3rd qualificado do set → timeB null, gruposAlternativos mantido', () => {
    const jogos = makeChaveamentoCompleto()
    const result = projetarChaveamento({
      classificacao: [
        makeClassificacao('A', 'México', 'Canadá', 'Quarto A'),
        makeClassificacao('B', 'Suíça', 'Bósnia', 'Quarto B'),
        makeClassificacao('C', 'Brasil', 'Japão', 'Quarto C'),
        makeClassificacao('D', 'EUA', 'Holanda', 'Quarto D'),
        makeClassificacao('E', 'Alemanha', 'Coreia', 'Curaçau'),
        makeClassificacao('F', 'Holanda B', 'Marrocos B', 'Quarto F'),
      ],
      // 8 melhores terceiros: nenhum do set [A,B,C,D,F] avançou
      melhoresTerceiros: [
        { grupo: 'G', time: 'TimeG', pontos: 4 },
        { grupo: 'H', time: 'TimeH', pontos: 3 },
        { grupo: 'I', time: 'TimeI', pontos: 2 },
        { grupo: 'J', time: 'TimeJ', pontos: 2 },
        { grupo: 'K', time: 'TimeK', pontos: 1 },
        { grupo: 'L', time: 'TimeL', pontos: 1 },
        { grupo: 'M', time: 'TimeM', pontos: 0 },
        { grupo: 'N', time: 'TimeN', pontos: 0 },
      ],
      jogosMataMata: jogos,
    })
    const m2 = result.find(s => s.fase === 'dezesseis_avos' && s.slot === 2)!
    expect(m2.timeA).toBe('Alemanha')  // 1E — classificado
    expect(m2.timeB).toBeNull()  // nenhum do set avançou
    expect(m2.sourceGrupo?.timeB?.gruposAlternativos).toEqual(['A', 'B', 'C', 'D', 'F'])
  })

  it('M2 quando 3rd do set tem 2 grupos empatados em pontos → escolhe um (não-joga)', () => {
    const jogos = makeChaveamentoCompleto()
    const result = projetarChaveamento({
      classificacao: [
        makeClassificacao('A', 'México', 'Canadá', 'Time A3'),
        makeClassificacao('B', 'Suíça', 'Bósnia', 'Time B3'),
        makeClassificacao('E', 'Alemanha', 'Coreia', 'Curaçau'),
      ],
      // 2 grupos empatados em 3 pontos
      melhoresTerceiros: [
        { grupo: 'A', time: 'Time A3', pontos: 3 },
        { grupo: 'B', time: 'Time B3', pontos: 3 },
        { grupo: 'G', time: 'TimeG', pontos: 2 },
        { grupo: 'H', time: 'TimeH', pontos: 2 },
        { grupo: 'I', time: 'TimeI', pontos: 1 },
        { grupo: 'J', time: 'TimeJ', pontos: 1 },
        { grupo: 'K', time: 'TimeK', pontos: 0 },
        { grupo: 'L', time: 'TimeL', pontos: 0 },
      ],
      jogosMataMata: jogos,
    })
    const m2 = result.find(s => s.fase === 'dezesseis_avos' && s.slot === 2)!
    // Não testamos qual é escolhido (empate ambíguo), só que algum é retornado
    expect(m2.timeB).not.toBeNull()
    expect(['Time A3', 'Time B3']).toContain(m2.timeB)
  })

  it('R32→R16: slot 1 usa R32 slots 2,5 (M89: M74×M77)', () => {
    const jogos = [
      makeJogo({ id: 'r32-2', sofascoreId: getSlotSofascoreId('dezesseis_avos', 2)!, timeA: 'Time2A', timeB: 'Time2B', resultadoA: 2, resultadoB: 0, status: 'finalizado', vencedor: 1 }),
      makeJogo({ id: 'r32-5', sofascoreId: getSlotSofascoreId('dezesseis_avos', 5)!, timeA: 'Time5A', timeB: 'Time5B', resultadoA: 1, resultadoB: 3, status: 'finalizado', vencedor: 2 }),
      makeJogo({ id: 'r16-1', sofascoreId: getSlotSofascoreId('oitavas', 1)!, fase: 'oitavas' }),
    ]
    const result = projetarChaveamento({
      classificacao: [],
      melhoresTerceiros: [],
      jogosMataMata: jogos,
    })
    const r16_1 = result.find(s => s.fase === 'oitavas' && s.slot === 1)!
    expect(r16_1.timeA).toBe('Time2A')
    expect(r16_1.timeB).toBe('Time5B')
  })

  it('R32→R16: slot 2 usa R32 slots 1,3 (M90: M73×M75)', () => {
    const jogos = [
      makeJogo({ id: 'r32-1', sofascoreId: getSlotSofascoreId('dezesseis_avos', 1)!, timeA: 'Time1A', timeB: 'Time1B', resultadoA: 2, resultadoB: 0, status: 'finalizado', vencedor: 1 }),
      makeJogo({ id: 'r32-3', sofascoreId: getSlotSofascoreId('dezesseis_avos', 3)!, timeA: 'Time3A', timeB: 'Time3B', resultadoA: 1, resultadoB: 3, status: 'finalizado', vencedor: 2 }),
      makeJogo({ id: 'r16-2', sofascoreId: getSlotSofascoreId('oitavas', 2)!, fase: 'oitavas' }),
    ]
    const result = projetarChaveamento({
      classificacao: [],
      melhoresTerceiros: [],
      jogosMataMata: jogos,
    })
    const r16_2 = result.find(s => s.fase === 'oitavas' && s.slot === 2)!
    expect(r16_2.timeA).toBe('Time1A')
    expect(r16_2.timeB).toBe('Time3B')
  })

  it('R32→R16: slot 3 usa R32 slots 4,6 (M91: M76×M78)', () => {
    const jogos = [
      makeJogo({ id: 'r32-4', sofascoreId: getSlotSofascoreId('dezesseis_avos', 4)!, timeA: 'Time4A', timeB: 'Time4B', resultadoA: 1, resultadoB: 0, status: 'finalizado', vencedor: 1 }),
      makeJogo({ id: 'r32-6', sofascoreId: getSlotSofascoreId('dezesseis_avos', 6)!, timeA: 'Time6A', timeB: 'Time6B', resultadoA: 0, resultadoB: 2, status: 'finalizado', vencedor: 2 }),
      makeJogo({ id: 'r16-3', sofascoreId: getSlotSofascoreId('oitavas', 3)!, fase: 'oitavas' }),
    ]
    const result = projetarChaveamento({
      classificacao: [],
      melhoresTerceiros: [],
      jogosMataMata: jogos,
    })
    const r16_3 = result.find(s => s.fase === 'oitavas' && s.slot === 3)!
    expect(r16_3.timeA).toBe('Time4A')
    expect(r16_3.timeB).toBe('Time6B')
  })

  it('R32→R16: slot 4 usa R32 slots 7,8 (M92: M79×M80)', () => {
    const jogos = [
      makeJogo({ id: 'r32-7', sofascoreId: getSlotSofascoreId('dezesseis_avos', 7)!, timeA: 'Time7A', timeB: 'Time7B', resultadoA: 2, resultadoB: 0, status: 'finalizado', vencedor: 1 }),
      makeJogo({ id: 'r32-8', sofascoreId: getSlotSofascoreId('dezesseis_avos', 8)!, timeA: 'Time8A', timeB: 'Time8B', resultadoA: 1, resultadoB: 3, status: 'finalizado', vencedor: 2 }),
      makeJogo({ id: 'r16-4', sofascoreId: getSlotSofascoreId('oitavas', 4)!, fase: 'oitavas' }),
    ]
    const result = projetarChaveamento({
      classificacao: [],
      melhoresTerceiros: [],
      jogosMataMata: jogos,
    })
    const r16_4 = result.find(s => s.fase === 'oitavas' && s.slot === 4)!
    expect(r16_4.timeA).toBe('Time7A')
    expect(r16_4.timeB).toBe('Time8B')
  })

  it('R32→R16: slot 5 usa R32 slots 11,12 (M93: M83×M84)', () => {
    const jogos = [
      makeJogo({ id: 'r32-11', sofascoreId: getSlotSofascoreId('dezesseis_avos', 11)!, timeA: 'Time11A', timeB: 'Time11B', resultadoA: 3, resultadoB: 1, status: 'finalizado', vencedor: 1 }),
      makeJogo({ id: 'r32-12', sofascoreId: getSlotSofascoreId('dezesseis_avos', 12)!, timeA: 'Time12A', timeB: 'Time12B', resultadoA: 0, resultadoB: 0, status: 'finalizado', vencedor: null, placarPenaltisA: 4, placarPenaltisB: 2 }),
      makeJogo({ id: 'r16-5', sofascoreId: getSlotSofascoreId('oitavas', 5)!, fase: 'oitavas' }),
    ]
    const result = projetarChaveamento({
      classificacao: [],
      melhoresTerceiros: [],
      jogosMataMata: jogos,
    })
    const r16_5 = result.find(s => s.fase === 'oitavas' && s.slot === 5)!
    expect(r16_5.timeA).toBe('Time11A')
    expect(r16_5.timeB).toBe('Time12A')
  })

  it('R32→R16: slot 8 usa R32 slots 13,15 (M96: M85×M87)', () => {
    const jogos = [
      makeJogo({ id: 'r32-13', sofascoreId: getSlotSofascoreId('dezesseis_avos', 13)!, timeA: 'Time13A', timeB: 'Time13B', resultadoA: 2, resultadoB: 2, status: 'finalizado', vencedor: null, placarPenaltisA: 5, placarPenaltisB: 3 }),
      makeJogo({ id: 'r32-15', sofascoreId: getSlotSofascoreId('dezesseis_avos', 15)!, timeA: 'Time15A', timeB: 'Time15B', resultadoA: 1, resultadoB: 0, status: 'finalizado', vencedor: 1 }),
      makeJogo({ id: 'r16-8', sofascoreId: getSlotSofascoreId('oitavas', 8)!, fase: 'oitavas' }),
    ]
    const result = projetarChaveamento({
      classificacao: [],
      melhoresTerceiros: [],
      jogosMataMata: jogos,
    })
    const r16_8 = result.find(s => s.fase === 'oitavas' && s.slot === 8)!
    expect(r16_8.timeA).toBe('Time13A')
    expect(r16_8.timeB).toBe('Time15A')
  })

  it('R16→QF: slot 2 usa R16 slots 5,6 (não 3,4)', () => {
    const jogos = [
      makeJogo({ id: 'r16-5', sofascoreId: getSlotSofascoreId('oitavas', 5)!, timeA: 'R16-5A', timeB: 'R16-5B', resultadoA: 2, resultadoB: 0, status: 'finalizado', vencedor: 1 }),
      makeJogo({ id: 'r16-6', sofascoreId: getSlotSofascoreId('oitavas', 6)!, timeA: 'R16-6A', timeB: 'R16-6B', resultadoA: 1, resultadoB: 3, status: 'finalizado', vencedor: 2 }),
      makeJogo({ id: 'qf-2', sofascoreId: getSlotSofascoreId('quartas', 2)!, fase: 'quartas' }),
    ]
    const result = projetarChaveamento({
      classificacao: [],
      melhoresTerceiros: [],
      jogosMataMata: jogos,
    })
    const qf_2 = result.find(s => s.fase === 'quartas' && s.slot === 2)!
    expect(qf_2.timeA).toBe('R16-5A')
    expect(qf_2.timeB).toBe('R16-6B')
  })

  it('R16→QF: slot 3 usa R16 slots 3,4 (não 5,6)', () => {
    const jogos = [
      makeJogo({ id: 'r16-3', sofascoreId: getSlotSofascoreId('oitavas', 3)!, timeA: 'R16-3A', timeB: 'R16-3B', resultadoA: 0, resultadoB: 1, status: 'finalizado', vencedor: 2 }),
      makeJogo({ id: 'r16-4', sofascoreId: getSlotSofascoreId('oitavas', 4)!, timeA: 'R16-4A', timeB: 'R16-4B', resultadoA: 2, resultadoB: 2, status: 'finalizado', vencedor: null, placarPenaltisA: 3, placarPenaltisB: 5 }),
      makeJogo({ id: 'qf-3', sofascoreId: getSlotSofascoreId('quartas', 3)!, fase: 'quartas' }),
    ]
    const result = projetarChaveamento({
      classificacao: [],
      melhoresTerceiros: [],
      jogosMataMata: jogos,
    })
    const qf_3 = result.find(s => s.fase === 'quartas' && s.slot === 3)!
    expect(qf_3.timeA).toBe('R16-3B')
    expect(qf_3.timeB).toBe('R16-4B')
  })

  it('propaga dataHora do Jogo em todos os slots mata-mata', () => {
    const dataR32 = new Date('2026-06-28T16:00:00.000Z')
    const dataR16 = new Date('2026-07-04T20:00:00.000Z')
    const dataFinal = new Date('2026-07-19T20:00:00.000Z')
    const jogos = makeChaveamentoCompleto().map(j => {
      if (j.fase === 'dezesseis_avos') return { ...j, dataHora: dataR32 }
      if (j.fase === 'oitavas') return { ...j, dataHora: dataR16 }
      if (j.fase === 'final') return { ...j, dataHora: dataFinal }
      return j
    })
    const result = projetarChaveamento({
      classificacao: [],
      melhoresTerceiros: [],
      jogosMataMata: jogos,
    })
    const r32 = result.find(s => s.fase === 'dezesseis_avos' && s.slot === 1)!
    const r16 = result.find(s => s.fase === 'oitavas' && s.slot === 1)!
    const fin = result.find(s => s.fase === 'final' && s.slot === 1)!
    expect(r32.dataHora).toEqual(dataR32)
    expect(r16.dataHora).toEqual(dataR16)
    expect(fin.dataHora).toEqual(dataFinal)
  })
})
