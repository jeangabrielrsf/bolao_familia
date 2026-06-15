/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { ProximosJogosTabs } from '../proximos-jogos-tabs'
import type { Jogo } from '@prisma/client'

function makeJogo(overrides: Partial<Jogo> = {}): Jogo {
  return {
    id: 'jogo-1',
    grupo: 'G',
    fase: 'grupos',
    dataHora: new Date('2026-06-12T16:00:00Z'),
    timeA: 'Brasil',
    timeB: 'Croácia',
    resultadoA: null,
    resultadoB: null,
    status: 'agendado',
    isBolao: true,
    sofascoreId: null,
    local: null,
    cidade: null,
    vencedor: null,
    rankingTimeA: 5,
    rankingTimeB: 10,
    placarPenaltisA: null,
    placarPenaltisB: null,
    criadoEm: new Date('2026-01-01'),
    ...overrides,
  } as Jogo
}

describe('ProximosJogosTabs', () => {
  it('renderiza as 4 abas', () => {
    render(
      <ProximosJogosTabs jogosOntem={[]} jogosHoje={[makeJogo()]} jogosAmanha={[]} jogosDepois={[]} />
    )

    expect(screen.getByRole('tab', { name: /ontem/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /hoje/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /amanhã/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /depois/i })).toBeInTheDocument()
  })

  it('marca "Hoje" como ativa por padrão', () => {
    render(
      <ProximosJogosTabs jogosOntem={[]} jogosHoje={[makeJogo()]} jogosAmanha={[]} jogosDepois={[]} />
    )

    const hojeTab = screen.getByRole('tab', { name: /hoje/i })
    expect(hojeTab).toHaveAttribute('aria-selected', 'true')
  })

  it('exibe os jogos do dia ativo', () => {
    render(
      <ProximosJogosTabs
        jogosOntem={[]}
        jogosHoje={[makeJogo({ timeA: 'Brasil' })]}
        jogosAmanha={[makeJogo({ id: 'j2', timeA: 'França' })]}
        jogosDepois={[]}
      />
    )

    expect(screen.getByText('Brasil')).toBeInTheDocument()
    expect(screen.queryByText('França')).not.toBeInTheDocument()
  })

  it('troca para os jogos de Amanhã ao clicar na aba', () => {
    render(
      <ProximosJogosTabs
        jogosOntem={[]}
        jogosHoje={[makeJogo({ timeA: 'Brasil' })]}
        jogosAmanha={[makeJogo({ id: 'j2', timeA: 'França' })]}
        jogosDepois={[]}
      />
    )

    fireEvent.click(screen.getByRole('tab', { name: /amanhã/i }))

    const amanhaTab = screen.getByRole('tab', { name: /amanhã/i })
    expect(amanhaTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('França')).toBeInTheDocument()
    expect(screen.queryByText('Brasil')).not.toBeInTheDocument()
  })

  it('troca para os jogos de Depois ao clicar na aba', () => {
    render(
      <ProximosJogosTabs
        jogosOntem={[]}
        jogosHoje={[]}
        jogosAmanha={[]}
        jogosDepois={[makeJogo({ id: 'j3', timeA: 'Argentina' })]}
      />
    )

    fireEvent.click(screen.getByRole('tab', { name: /depois/i }))

    expect(screen.getByRole('tab', { name: /depois/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Argentina')).toBeInTheDocument()
  })

  it('mostra estado vazio quando não há jogos no dia ativo', () => {
    render(
      <ProximosJogosTabs jogosOntem={[]} jogosHoje={[]} jogosAmanha={[]} jogosDepois={[]} />
    )

    expect(screen.getByText(/nenhum jogo/i)).toBeInTheDocument()
  })

  it('tab bar usa layout responsivo (flex-1 + w-full) para caber em telas pequenas', () => {
    render(
      <ProximosJogosTabs jogosOntem={[]} jogosHoje={[makeJogo()]} jogosAmanha={[]} jogosDepois={[]} />
    )

    const tabs = screen.getAllByRole('tab')
    tabs.forEach((tab) => {
      expect(tab).toHaveClass('flex-1')
      expect(tab).toHaveClass('sm:flex-none')
    })

    const tabBar = tabs[0].parentElement
    expect(tabBar).toHaveClass('w-full')
    expect(tabBar).toHaveClass('sm:inline-flex')
  })
})
