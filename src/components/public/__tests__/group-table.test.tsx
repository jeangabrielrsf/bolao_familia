/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { GroupTable } from '../group-table'
import type { ClassificacaoGrupo } from '@/lib/services/bracket/types'

const mockClassificacao: ClassificacaoGrupo = {
  grupo: 'A',
  times: [
    { time: 'México', jogos: 3, vitorias: 2, empates: 0, derrotas: 1, golsPro: 5, golsContra: 2, saldo: 3, pontos: 6, posicao: 1, jogosDetalhe: [] },
    { time: 'África do Sul', jogos: 3, vitorias: 1, empates: 1, derrotas: 1, golsPro: 3, golsContra: 3, saldo: 0, pontos: 4, posicao: 2, jogosDetalhe: [] },
    { time: 'Coreia do Sul', jogos: 3, vitorias: 0, empates: 2, derrotas: 1, golsPro: 2, golsContra: 3, saldo: -1, pontos: 2, posicao: 3, jogosDetalhe: [] },
    { time: 'República Checa', jogos: 3, vitorias: 0, empates: 1, derrotas: 2, golsPro: 1, golsContra: 3, saldo: -2, pontos: 1, posicao: 4, jogosDetalhe: [] },
  ],
  classificados: ['México', 'África do Sul'],
  terceiro: { time: 'Coreia do Sul', jogos: 3, vitorias: 0, empates: 2, derrotas: 1, golsPro: 2, golsContra: 3, saldo: -1, pontos: 2, posicao: 3, jogosDetalhe: [] },
}

describe('GroupTable', () => {
  it('renderiza nome do grupo', () => {
    render(<GroupTable grupo={mockClassificacao} />)
    expect(screen.getByText(/Grupo A/)).toBeInTheDocument()
  })

  it('renderiza os 4 times', () => {
    render(<GroupTable grupo={mockClassificacao} />)
    expect(screen.getByText('México')).toBeInTheDocument()
    expect(screen.getByText('África do Sul')).toBeInTheDocument()
    expect(screen.getByText('Coreia do Sul')).toBeInTheDocument()
    expect(screen.getByText('República Checa')).toBeInTheDocument()
  })

  it('mostra 2 badges Classificado', () => {
    render(<GroupTable grupo={mockClassificacao} />)
    expect(screen.getAllByText(/Classificado/)).toHaveLength(2)
  })

  it('mostra badge Eliminado pro 4º lugar', () => {
    render(<GroupTable grupo={mockClassificacao} />)
    expect(screen.getByText(/Eliminado/)).toBeInTheDocument()
  })
})
