/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { Bracket } from '../bracket'
import type { BracketSlot } from '@/lib/services/bracket/types'

const slots: BracketSlot[] = [
  { jogoId: 'r32-1', fase: 'dezesseis_avos', slot: 1, timeA: 'Brasil', timeB: 'Portugal', placarA: 3, placarB: 1, placarPenaltisA: null, placarPenaltisB: null, status: 'finalizado', vencedor: 'A', dataHora: null },
  { jogoId: 'r32-2', fase: 'dezesseis_avos', slot: 2, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'r32-3', fase: 'dezesseis_avos', slot: 3, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'r32-4', fase: 'dezesseis_avos', slot: 4, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'r32-5', fase: 'dezesseis_avos', slot: 5, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'r32-6', fase: 'dezesseis_avos', slot: 6, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'r32-7', fase: 'dezesseis_avos', slot: 7, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'r32-8', fase: 'dezesseis_avos', slot: 8, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'r32-9', fase: 'dezesseis_avos', slot: 9, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'r32-10', fase: 'dezesseis_avos', slot: 10, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'r32-11', fase: 'dezesseis_avos', slot: 11, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'r32-12', fase: 'dezesseis_avos', slot: 12, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'r32-13', fase: 'dezesseis_avos', slot: 13, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'r32-14', fase: 'dezesseis_avos', slot: 14, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'r32-15', fase: 'dezesseis_avos', slot: 15, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'r32-16', fase: 'dezesseis_avos', slot: 16, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'r16-1', fase: 'oitavas', slot: 1, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'qf-1', fase: 'quartas', slot: 1, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'sf-1', fase: 'semifinal', slot: 1, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
]

describe('Bracket', () => {
  it('renderiza sem erros', () => {
    render(<Bracket slots={slots} />)
    expect(screen.getAllByText('Brasil').length).toBeGreaterThan(0)
  })

  it('renderiza lado esquerdo e direito', () => {
    render(<Bracket slots={slots} />)
    expect(screen.getByText('LADO ESQUERDO')).toBeInTheDocument()
    expect(screen.getByText('LADO DIREITO')).toBeInTheDocument()
  })

  it('renderiza Final e 3º lugar no centro', () => {
    render(<Bracket slots={slots} />)
    expect(screen.getByText('🏆 FINAL')).toBeInTheDocument()
    expect(screen.getByText('3º LUGAR')).toBeInTheDocument()
  })
})

describe('Bracket mobile', () => {
  it('renderiza dots de navegação no mobile', () => {
    const { container } = render(<Bracket slots={slots} />)
    const dots = container.querySelectorAll('[aria-label]')
    expect(dots.length).toBeGreaterThanOrEqual(6)
  })

  it('destaca fase ativa com aria-current', () => {
    const { container } = render(<Bracket slots={slots} />)
    const active = container.querySelector('[aria-current="page"]')
    expect(active).toBeInTheDocument()
  })
})
