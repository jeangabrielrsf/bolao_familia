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

const slotTerceiroIndefinido: BracketSlot = {
  jogoId: 'r32-2', fase: 'dezesseis_avos', slot: 2,
  timeA: 'Alemanha', timeB: null,
  placarA: null, placarB: null, status: 'agendado', vencedor: null,
  sourceGrupo: {
    timeA: { grupo: 'E', posicao: 1 },
    timeB: { grupo: 'A', posicao: 3, gruposAlternativos: ['A', 'B', 'C', 'D', 'F'] },
  },
}

const slotTerceiroDefinido: BracketSlot = {
  jogoId: 'r32-2', fase: 'dezesseis_avos', slot: 2,
  timeA: 'Alemanha', timeB: 'Marrocos',
  placarA: null, placarB: null, status: 'agendado', vencedor: null,
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
})
