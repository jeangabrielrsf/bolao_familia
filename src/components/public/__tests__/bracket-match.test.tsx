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
  dataHora: null,
}

const slotTBD: BracketSlot = {
  ...slotFinalizado, timeA: null, timeB: null,
  placarA: null, placarB: null, status: 'agendado', vencedor: null,
  dataHora: null,
}

const slotComPenaltes: BracketSlot = {
  ...slotFinalizado,
  placarA: 1, placarB: 1,
  placarPenaltisA: 4, placarPenaltisB: 3,
}

const slotFuturo: BracketSlot = {
  ...slotFinalizado, status: 'agendado', placarA: null, placarB: null, vencedor: null,
  dataHora: new Date('2026-06-28T16:00:00.000Z'),
}

const slotTerceiroIndefinido: BracketSlot = {
  jogoId: 'r32-2', fase: 'dezesseis_avos', slot: 2,
  timeA: 'Alemanha', timeB: null,
  placarA: null, placarB: null, status: 'agendado', vencedor: null,
  dataHora: null,
  sourceGrupo: {
    timeA: { grupo: 'E', posicao: 1 },
    timeB: { grupo: 'A', posicao: 3, gruposAlternativos: ['A', 'B', 'C', 'D', 'F'] },
  },
}

const slotTerceiroDefinido: BracketSlot = {
  jogoId: 'r32-2', fase: 'dezesseis_avos', slot: 2,
  timeA: 'Alemanha', timeB: 'Marrocos',
  placarA: null, placarB: null, status: 'agendado', vencedor: null,
  dataHora: null,
  sourceGrupo: {
    timeA: { grupo: 'E', posicao: 1 },
    timeB: { grupo: 'C', posicao: 3, gruposAlternativos: ['A', 'B', 'C', 'D', 'F'] },
  },
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

  it('renderiza "3º de X, Y ou Z" (italic muted) quando 3rd indefinido', () => {
    render(<BracketMatch slot={slotTerceiroIndefinido} />)
    const placeholder = screen.getByText('3º de A, B, C, D ou F')
    expect(placeholder).toBeInTheDocument()
    expect(placeholder.tagName).toBe('SPAN')
    expect(placeholder.className).toMatch(/italic/)
    expect(placeholder.className).toMatch(/muted-foreground/)
  })

  it('renderiza nome do time quando 3rd já resolvido', () => {
    render(<BracketMatch slot={slotTerceiroDefinido} />)
    expect(screen.getByText('Marrocos')).toBeInTheDocument()
    expect(screen.queryByText('3º de A, B, C, D ou F')).not.toBeInTheDocument()
  })

  it('mostra "A definir" sem italic (não é placeholder de 3rd)', () => {
    render(<BracketMatch slot={slotTBD} />)
    const aDefinir = screen.getAllByText('A definir')
    aDefinir.forEach(el => {
      expect(el.className).not.toMatch(/italic/)
    })
  })

  it('renderiza data/hora (Brasília) quando dataHora está setada', () => {
    // 2026-06-28T16:00:00.000Z = 13:00 Brasília (UTC-3)
    render(<BracketMatch slot={slotFuturo} />)
    expect(screen.getByText('28/06 · 13:00')).toBeInTheDocument()
  })

  it('não renderiza data/hora quando dataHora é null', () => {
    render(<BracketMatch slot={slotTBD} />)
    expect(screen.queryByText(/\d{2}\/\d{2} · \d{2}:\d{2}/)).not.toBeInTheDocument()
  })

  it('renderiza como link quando href é fornecido', () => {
    render(<BracketMatch slot={slotFuturo} href="/jogos/r32-1" />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/jogos/r32-1')
  })

  it('não renderiza link quando href não é fornecido', () => {
    render(<BracketMatch slot={slotFuturo} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
