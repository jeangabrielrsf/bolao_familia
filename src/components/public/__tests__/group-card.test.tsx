/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { GroupCard } from '../group-card'
import type { ClassificacaoGrupo, ClassificacaoTime } from '@/lib/services/bracket/types'

const makeTime = (overrides: Partial<ClassificacaoTime> = {}): ClassificacaoTime => ({
  time: 'México',
  jogos: 3, vitorias: 2, empates: 0, derrotas: 1,
  golsPro: 5, golsContra: 2, saldo: 3, pontos: 6,
  posicao: 1,
  jogosDetalhe: [],
  ...overrides,
})

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

describe('GroupCard variant=compact', () => {
  const times: ClassificacaoTime[] = [
    makeTime({ time: 'México', pontos: 6, posicao: 1 }),
    makeTime({ time: 'África do Sul', pontos: 4, posicao: 2 }),
    makeTime({ time: 'Suécia', pontos: 4, posicao: 3 }),
    makeTime({ time: 'Alemanha', pontos: 0, posicao: 4 }),
  ]

  const grupoCompact = (overrides: Partial<ClassificacaoGrupo> = {}): ClassificacaoGrupo => ({
    grupo: 'A',
    times,
    classificados: [],
    terceiro: times.find(t => t.posicao === 3) ?? makeTime({ time: 'placeholder', posicao: null }),
    ...overrides,
  })

  it('renderiza header "GRUPO A" e chevron', () => {
    render(<GroupCard grupo={grupoCompact()} variant="compact" onClick={() => {}} />)
    expect(screen.getByText('GRUPO A')).toBeInTheDocument()
  })

  it('renderiza 4 linhas com nome e pontos', () => {
    render(<GroupCard grupo={grupoCompact()} variant="compact" onClick={() => {}} />)
    expect(screen.getByText('México')).toBeInTheDocument()
    expect(screen.getByText('África do Sul')).toBeInTheDocument()
    expect(screen.getByText('Suécia')).toBeInTheDocument()
    expect(screen.getByText('Alemanha')).toBeInTheDocument()
  })

  it('não renderiza colunas P/J/V/E/D/SG (variant compact não tem)', () => {
    render(<GroupCard grupo={grupoCompact()} variant="compact" onClick={() => {}} />)
    expect(screen.queryByText('P')).not.toBeInTheDocument()
    expect(screen.queryByText('SG')).not.toBeInTheDocument()
  })

  it('aplica borda verde quando 1º e 2º classificados', () => {
    const { container } = render(
      <GroupCard grupo={grupoCompact()} variant="compact" onClick={() => {}} />
    )
    const button = container.querySelector('button')!
    expect(button.className).toMatch(/border-l-emerald/)
  })

  it('aplica borda amarela quando 3º está nos qualificados', () => {
    const timesSem1e2: ClassificacaoTime[] = [
      makeTime({ time: 'México', pontos: 6, posicao: null }),
      makeTime({ time: 'África do Sul', pontos: 4, posicao: null }),
      makeTime({ time: 'Suécia', pontos: 4, posicao: 3 }),
      makeTime({ time: 'Alemanha', pontos: 0, posicao: 4 }),
    ]
    const { container } = render(
      <GroupCard
        grupo={grupoCompact({ times: timesSem1e2 })}
        qualificadosTerceiros={new Set(['A'])}
        variant="compact"
        onClick={() => {}}
      />
    )
    const button = container.querySelector('button')!
    expect(button.className).toMatch(/border-l-amber/)
  })

  it('aplica borda vermelha quando 3º eliminado', () => {
    const timesSem1e2: ClassificacaoTime[] = [
      makeTime({ time: 'México', pontos: 6, posicao: null }),
      makeTime({ time: 'África do Sul', pontos: 4, posicao: null }),
      makeTime({ time: 'Suécia', pontos: 4, posicao: 3 }),
      makeTime({ time: 'Alemanha', pontos: 0, posicao: 4 }),
    ]
    const { container } = render(
      <GroupCard
        grupo={grupoCompact({ times: timesSem1e2 })}
        qualificadosTerceiros={new Set(['B', 'C'])}
        variant="compact"
        onClick={() => {}}
      />
    )
    const button = container.querySelector('button')!
    expect(button.className).toMatch(/border-l-rose/)
  })

  it('chama onClick ao clicar', () => {
    const onClick = jest.fn()
    render(<GroupCard grupo={grupoCompact()} variant="compact" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
