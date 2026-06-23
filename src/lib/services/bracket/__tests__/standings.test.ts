import { getClassificacaoGrupos } from '../standings'
import type { JogoComTimes } from '../types'

const makeJogo = (overrides: Partial<JogoComTimes>): JogoComTimes => ({
  id: 'j1', fase: 'grupos', grupo: 'A', timeA: 'México', timeB: 'África do Sul',
  resultadoA: null, resultadoB: null, status: 'agendado',
  placarPenaltisA: null, placarPenaltisB: null, vencedor: null,
  sofascoreId: '1', dataHora: new Date(),
  ...overrides,
})

describe('getClassificacaoGrupos', () => {
  it('retorna 12 grupos (A-L) mesmo sem jogos', () => {
    const result = getClassificacaoGrupos([])
    expect(result).toHaveLength(12)
    expect(result.map(g => g.grupo)).toEqual(['A','B','C','D','E','F','G','H','I','J','K','L'])
  })

  it('agrega W/D/L, GF, GA para 1 grupo com 3 jogos finalizados', () => {
    const jogos: JogoComTimes[] = [
      makeJogo({ id: 'g1', timeA: 'México', timeB: 'África do Sul', resultadoA: 2, resultadoB: 1, status: 'finalizado' }),
      makeJogo({ id: 'g2', timeA: 'México', timeB: 'Coreia do Sul', resultadoA: 1, resultadoB: 1, status: 'finalizado' }),
      makeJogo({ id: 'g3', timeA: 'Coreia do Sul', timeB: 'África do Sul', resultadoA: 0, resultadoB: 3, status: 'finalizado' }),
    ]
    const result = getClassificacaoGrupos(jogos)
    const mexico = result.find(g => g.grupo === 'A')!.times.find(t => t.time === 'México')!
    expect(mexico.pontos).toBe(4)
    expect(mexico.vitorias).toBe(1)
    expect(mexico.empates).toBe(1)
  })

  it('ignora jogos não finalizados', () => {
    const jogos: JogoComTimes[] = [
      makeJogo({ id: 'g1', timeA: 'México', timeB: 'África do Sul', resultadoA: 2, resultadoB: 1, status: 'finalizado' }),
      makeJogo({ id: 'g2', timeA: 'México', timeB: 'Coreia do Sul', status: 'agendado' }),
    ]
    const result = getClassificacaoGrupos(jogos)
    const mexico = result.find(g => g.grupo === 'A')!.times.find(t => t.time === 'México')!
    expect(mexico.jogos).toBe(1)
  })

  it('expõe classificados e terceiro', () => {
    const jogos: JogoComTimes[] = [
      makeJogo({ id: 'g1', timeA: 'México', timeB: 'África do Sul', resultadoA: 2, resultadoB: 1, status: 'finalizado' }),
      makeJogo({ id: 'g2', timeA: 'México', timeB: 'Coreia do Sul', resultadoA: 1, resultadoB: 0, status: 'finalizado' }),
      makeJogo({ id: 'g3', timeA: 'Coreia do Sul', timeB: 'África do Sul', resultadoA: 0, resultadoB: 2, status: 'finalizado' }),
    ]
    const result = getClassificacaoGrupos(jogos)
    const grupoA = result.find(g => g.grupo === 'A')!
    expect(grupoA.classificados).toEqual(['México', 'África do Sul'])
    expect(grupoA.terceiro.time).toBe('Coreia do Sul')
  })
})
