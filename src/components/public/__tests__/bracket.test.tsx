/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { Bracket } from '../bracket'
import type { BracketSlot } from '@/lib/services/bracket/types'

const slots: BracketSlot[] = [
  { jogoId: 'r32-1', fase: 'dezesseis_avos', slot: 1, timeA: 'A1', timeB: 'B2', placarA: 1, placarB: 0, placarPenaltisA: null, placarPenaltisB: null, status: 'finalizado', vencedor: 'A' },
  { jogoId: 'r16-1', fase: 'oitavas', slot: 1, timeA: 'A1', timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null },
]

describe('Bracket', () => {
  it('renderiza labels das fases (R32, Oitavas)', () => {
    render(<Bracket slots={slots} />)
    expect(screen.getAllByText('R32').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Oitavas').length).toBeGreaterThan(0)
  })

  it('tem classe overflow-x-auto pra scroll horizontal', () => {
    const { container } = render(<Bracket slots={slots} />)
    expect(container.querySelector('.overflow-x-auto')).toBeInTheDocument()
  })

  it('mostra phase titles com contagem de jogos', () => {
    render(<Bracket slots={slots} />)
    // Phase titles no topo com formato "Fase (N jogos)"
    expect(screen.getByText(/R32.*16 jogos/)).toBeInTheDocument()
    expect(screen.getByText(/Oitavas.*8 jogos/)).toBeInTheDocument()
    expect(screen.getByText(/Quartas.*4 jogos/)).toBeInTheDocument()
    expect(screen.getByText(/Semi.*2 jogos/)).toBeInTheDocument()
    expect(screen.getByText(/Final.*1 jogo/)).toBeInTheDocument()
  })
})

describe('Bracket tab selector mobile', () => {
  const slots: BracketSlot[] = [{
    jogoId: 'j1', fase: 'dezesseis_avos', slot: 1,
    timeA: 'A', timeB: 'B', placarA: 0, placarB: 0,
    status: 'agendado', vencedor: null,
    placarPenaltisA: null, placarPenaltisB: null, dataHora: null,
  }]

  it('fase ativa tem aria-current="page"', () => {
    render(<Bracket slots={slots} />)
    const activeTab = screen.getByRole('button', { name: 'R32' })
    expect(activeTab.getAttribute('aria-current')).toBe('page')
  })

  it('fase inativa NÃO tem aria-current', () => {
    render(<Bracket slots={slots} />)
    const inactiveTab = screen.getByRole('button', { name: 'Oitavas' })
    expect(inactiveTab.getAttribute('aria-current')).toBeNull()
  })

  it('fase ativa NÃO tem bg-primary sólido', () => {
    render(<Bracket slots={slots} />)
    const activeTab = screen.getByRole('button', { name: 'R32' })
    expect(activeTab.className).not.toMatch(/bg-primary/)
  })

  it('fase ativa tem underline indicator (h-0.5 bg-primary)', () => {
    const { container } = render(<Bracket slots={slots} />)
    const underline = container.querySelector('.h-0\\.5.bg-primary')
    expect(underline).toBeInTheDocument()
  })
})
