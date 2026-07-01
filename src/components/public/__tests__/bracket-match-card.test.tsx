/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { BracketMatchCard } from '../bracket-match-card'
import type { BracketSlot } from '@/lib/services/bracket/types'

const baseSlot: BracketSlot = {
  jogoId: 'j1', fase: 'dezesseis_avos', slot: 1,
  timeA: null, timeB: null, placarA: null, placarB: null,
  placarPenaltisA: null, placarPenaltisB: null,
  status: 'agendado', vencedor: null, dataHora: null,
}

describe('BracketMatchCard', () => {
  it('renderiza times e scores quando finalizado', () => {
    const slot: BracketSlot = { ...baseSlot, timeA: 'Brasil', timeB: 'Portugal', placarA: 3, placarB: 1, status: 'finalizado', vencedor: 'A' }
    render(<BracketMatchCard slot={slot} />)
    expect(screen.getByText('Brasil')).toBeInTheDocument()
    expect(screen.getByText('Portugal')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('vencedor tem background verde', () => {
    const slot: BracketSlot = { ...baseSlot, timeA: 'Brasil', timeB: 'Portugal', placarA: 3, placarB: 1, status: 'finalizado', vencedor: 'A' }
    const { container } = render(<BracketMatchCard slot={slot} />)
    expect(container.querySelector('.bg-emerald-950\\/40')).toBeInTheDocument()
  })

  it('mostra "A definir" quando times são null', () => {
    render(<BracketMatchCard slot={baseSlot} />)
    expect(screen.getAllByText('A definir').length).toBe(2)
  })

  it('mostra pênaltis quando placar igual e há penaltis', () => {
    const slot: BracketSlot = { ...baseSlot, timeA: 'Argentina', timeB: 'França', placarA: 2, placarB: 2, placarPenaltisA: 4, placarPenaltisB: 3, status: 'finalizado', vencedor: 'A' }
    render(<BracketMatchCard slot={slot} />)
    expect(screen.getByText(/4-3 pen/)).toBeInTheDocument()
  })

  it('mostra badge AO VIVO quando em_andamento', () => {
    const slot: BracketSlot = { ...baseSlot, timeA: 'Brasil', timeB: 'Portugal', placarA: 2, placarB: 1, status: 'em_andamento', vencedor: null }
    render(<BracketMatchCard slot={slot} />)
    expect(screen.getByText('AO VIVO')).toBeInTheDocument()
  })

  it('mostra placeholder fonte (1A, 2B) quando sourceGrupo definido', () => {
    const slot: BracketSlot = {
      ...baseSlot,
      timeA: null, timeB: null,
      sourceGrupo: {
        timeA: { grupo: 'A', posicao: 1 },
        timeB: { grupo: 'B', posicao: 2 },
      },
    }
    render(<BracketMatchCard slot={slot} />)
    expect(screen.getByText('1A')).toBeInTheDocument()
    expect(screen.getByText('2B')).toBeInTheDocument()
  })

  it('aplica classe tbd (opacity reduzida) quando ambos times null', () => {
    const { container } = render(<BracketMatchCard slot={baseSlot} />)
    expect(container.querySelector('.opacity-40')).toBeInTheDocument()
  })

  it('renderiza data/hora formatada', () => {
    const data = new Date('2026-07-14T20:00:00Z')
    const slot: BracketSlot = { ...baseSlot, dataHora: data }
    render(<BracketMatchCard slot={slot} />)
    // Data em BRT: 14/07
    expect(screen.getByText(/14\/07/)).toBeInTheDocument()
  })
})
