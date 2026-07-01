/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { BracketMobile } from '../bracket-mobile'
import type { BracketSlot } from '@/lib/services/bracket/types'

const slots: BracketSlot[] = [
  { jogoId: 'r1', fase: 'dezesseis_avos', slot: 1, timeA: 'Brasil', timeB: 'Portugal', placarA: 3, placarB: 1, placarPenaltisA: null, placarPenaltisB: null, status: 'finalizado', vencedor: 'A', dataHora: null },
  { jogoId: 'r2', fase: 'oitavas', slot: 1, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
]

describe('BracketMobile', () => {
  it('renderiza o título da fase ativa', () => {
    render(<BracketMobile slots={slots} />)
    expect(screen.getByText('16 avos de final')).toBeInTheDocument()
  })

  it('renderiza dots de navegação', () => {
    const { container } = render(<BracketMobile slots={slots} />)
    const dots = container.querySelectorAll('[aria-label]')
    expect(dots.length).toBeGreaterThanOrEqual(6)
  })

  it('muda de fase ao clicar em dot', () => {
    const { container } = render(<BracketMobile slots={slots} />)
    const dots = container.querySelectorAll('[aria-label]')
    fireEvent.click(dots[1]) // Oitavas
    expect(screen.getByText('Oitavas de final')).toBeInTheDocument()
  })

  it('destaca fase ativa (aria-current="page")', () => {
    const { container } = render(<BracketMobile slots={slots} />)
    const activeDot = container.querySelector('[aria-current="page"]')
    expect(activeDot).toBeInTheDocument()
  })
})
