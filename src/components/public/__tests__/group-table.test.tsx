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

  it('pinta 1º e 2º com bg verde (classificado)', () => {
    const { container } = render(<GroupTable grupo={mockClassificacao} />)
    const rows = container.querySelectorAll('tbody tr')
    expect(rows[0].className).toContain('bg-green-50')
    expect(rows[1].className).toContain('bg-green-50')
  })

  it('pinta 1º e 2º com dark mode bg (classificado)', () => {
    const { container } = render(<GroupTable grupo={mockClassificacao} />)
    const rows = container.querySelectorAll('tbody tr')
    expect(rows[0].className).toContain('dark:bg-green-950/40')
    expect(rows[1].className).toContain('dark:bg-green-950/40')
  })

  it('pinta 3º com bg amarelo se qualificado entre os 8 melhores', () => {
    const { container } = render(
      <GroupTable grupo={mockClassificacao} qualificadosTerceiros={new Set(['A'])} />
    )
    const rows = container.querySelectorAll('tbody tr')
    expect(rows[2].className).toContain('bg-amber-50')
    expect(rows[2].className).toContain('dark:bg-amber-950/40')
  })

  it('pinta 3º com bg vermelho se NÃO qualificado entre os 8 melhores', () => {
    const { container } = render(
      <GroupTable grupo={mockClassificacao} qualificadosTerceiros={new Set(['B'])} />
    )
    const rows = container.querySelectorAll('tbody tr')
    expect(rows[2].className).toContain('bg-red-50')
    expect(rows[2].className).toContain('dark:bg-red-950/40')
  })

  it('pinta 4º com bg vermelho (eliminado)', () => {
    const { container } = render(<GroupTable grupo={mockClassificacao} />)
    const rows = container.querySelectorAll('tbody tr')
    expect(rows[3].className).toContain('bg-red-50')
    expect(rows[3].className).toContain('dark:bg-red-950/40')
  })
})
