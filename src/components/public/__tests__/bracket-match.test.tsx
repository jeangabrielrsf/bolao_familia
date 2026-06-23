/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { BracketMatch } from '../bracket-match'
import type { BracketSlot } from '@/lib/services/bracket/types'

const slotFinalizado: BracketSlot = {
  jogoId: 'r32-1', fase: 'dezesseis_avos', slot: 1,
  timeA: 'Brasil', timeB: 'México',
  placarA: 2, placarB: 1, placarPenaltisA: null, placarPenaltisB: null,
  status: 'finalizado', vencedor: 'A',
}

const slotTBD: BracketSlot = {
  ...slotFinalizado, timeA: null, timeB: null,
  placarA: null, placarB: null, status: 'agendado', vencedor: null,
}

const slotComPenaltes: BracketSlot = {
  ...slotFinalizado,
  placarA: 1, placarB: 1,
  placarPenaltisA: 4, placarPenaltisB: 3,
}

describe('BracketMatch', () => {
  it('renderiza nomes dos times', () => {
    render(<BracketMatch slot={slotFinalizado} />)
    expect(screen.getByText('Brasil')).toBeInTheDocument()
    expect(screen.getByText('México')).toBeInTheDocument()
  })

  it('mostra placar', () => {
    render(<BracketMatch slot={slotFinalizado} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('mostra "A definir" quando times TBD', () => {
    render(<BracketMatch slot={slotTBD} />)
    expect(screen.getAllByText('A definir')).toHaveLength(2)
  })

  it('mostra "(4-3 pen)" quando placar decidido nos pênaltis', () => {
    render(<BracketMatch slot={slotComPenaltes} />)
    expect(screen.getByText('(4-3 pen)')).toBeInTheDocument()
  })
})
