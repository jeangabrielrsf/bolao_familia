import { projetarChaveamento } from '../projector'
import type { JogoComTimes, ClassificacaoGrupo } from '../types'

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
})
