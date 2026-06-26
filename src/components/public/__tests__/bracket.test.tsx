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
