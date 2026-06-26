/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { GroupCard } from '../group-card'
import type { ClassificacaoGrupo } from '@/lib/services/bracket/types'

const makeGrupo = (overrides: Partial<ClassificacaoGrupo> = {}): ClassificacaoGrupo => ({
  grupo: 'A',
  times: [
    { time: 'México', posicao: 1, pontos: 6, jogos: 2, vitorias: 2, empates: 0, derrotas: 0, golsPro: 4, golsContra: 1, saldo: 3, jogosDetalhe: [] },
    { time: 'Coreia do Sul', posicao: 2, pontos: 3, jogos: 2, vitorias: 1, empates: 0, derrotas: 1, golsPro: 2, golsContra: 2, saldo: 0, jogosDetalhe: [] },
    { time: 'África do Sul', posicao: 3, pontos: 3, jogos: 2, vitorias: 1, empates: 0, derrotas: 1, golsPro: 1, golsContra: 2, saldo: -1, jogosDetalhe: [] },
    { time: 'Alemanha', posicao: 4, pontos: 0, jogos: 2, vitorias: 0, empates: 0, derrotas: 2, golsPro: 0, golsContra: 2, saldo: -2, jogosDetalhe: [] },
  ],
  classificados: [],
  terceiro: { time: 'África do Sul', posicao: 3, pontos: 3, jogos: 2, vitorias: 1, empates: 0, derrotas: 1, golsPro: 1, golsContra: 2, saldo: -1, jogosDetalhe: [] },
  ...overrides,
})

describe('GroupCard', () => {
  it('renderiza nome do grupo e times', () => {
    render(<GroupCard grupo={makeGrupo()} onClick={() => {}} />)
    expect(screen.getByText('Grupo A')).toBeInTheDocument()
    expect(screen.getByText('México')).toBeInTheDocument()
  })

  it('chama onClick ao clicar', () => {
    const onClick = jest.fn()
    render(<GroupCard grupo={makeGrupo()} onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: /editar jogos do grupo a/i }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('tem aria-label correto', () => {
    render(<GroupCard grupo={makeGrupo()} onClick={() => {}} />)
    expect(screen.getByRole('button', { name: 'Editar jogos do grupo A' })).toBeInTheDocument()
  })

  it('renderiza chevron à direita', () => {
    const { container } = render(<GroupCard grupo={makeGrupo()} onClick={() => {}} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
