/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { GameCard } from '../GameCard'

function makeProps(overrides: Partial<React.ComponentProps<typeof GameCard>> = {}) {
  return {
    id: 'jogo-1',
    timeA: 'Brasil',
    timeB: 'Croácia',
    dataHora: new Date('2026-06-12T16:00:00Z'),
    grupo: 'G',
    fase: 'grupos',
    resultadoA: null as number | null,
    resultadoB: null as number | null,
    status: 'agendado' as string,
    local: null as string | null,
    cidade: null as string | null,
    placarPenaltisA: null as number | null,
    placarPenaltisB: null as number | null,
    rankingTimeA: 5 as number | null,
    rankingTimeB: 10 as number | null,
    ...overrides,
  }
}

describe('GameCard - local (stadium/city)', () => {
  it('não mostra local quando local e cidade são null (agendado)', () => {
    render(<GameCard {...makeProps({ status: 'agendado', local: null, cidade: null })} />)
    expect(screen.queryByText(/MetLife|Neo Química Arena|Mexico City/)).not.toBeInTheDocument()
  })

  it('mostra cidade para jogo AGENDADO (regressão: antes exigia finalizado)', () => {
    render(<GameCard {...makeProps({ status: 'agendado', local: null, cidade: 'Mexico City' })} />)
    expect(screen.getByText(/Mexico City/)).toBeInTheDocument()
  })

  it('mostra cidade para jogo EM ANDAMENTO', () => {
    render(
      <GameCard
        {...makeProps({
          status: 'em_andamento',
          local: null,
          cidade: 'Toronto',
          resultadoA: 1,
          resultadoB: 0,
        })}
      />
    )
    expect(screen.getByText(/Toronto/)).toBeInTheDocument()
  })

  it('mostra local + cidade concatenados quando ambos estão presentes', () => {
    render(
      <GameCard
        {...makeProps({
          status: 'finalizado',
          local: 'MetLife Stadium',
          cidade: 'East Rutherford',
          resultadoA: 2,
          resultadoB: 1,
        })}
      />
    )
    expect(screen.getByText(/MetLife Stadium, East Rutherford/)).toBeInTheDocument()
  })

  it('mostra só local quando cidade é null', () => {
    render(
      <GameCard
        {...makeProps({
          status: 'finalizado',
          local: 'MetLife Stadium',
          cidade: null,
          resultadoA: 2,
          resultadoB: 1,
        })}
      />
    )
    expect(screen.getByText(/MetLife Stadium/)).toBeInTheDocument()
  })
})

describe('GameCard - placar', () => {
  it('mostra "vs" para jogo AGENDADO sem resultado', () => {
    render(<GameCard {...makeProps({ status: 'agendado' })} />)
    expect(screen.getByText('vs')).toBeInTheDocument()
  })

  it('mostra placar parcial (1-0) para jogo EM ANDAMENTO com resultado', () => {
    render(
      <GameCard
        {...makeProps({ status: 'em_andamento', resultadoA: 1, resultadoB: 0 })}
      />
    )
    expect(screen.getByText('1 - 0')).toBeInTheDocument()
    expect(screen.queryByText('vs')).not.toBeInTheDocument()
  })

  it('mostra "0 - 0" para jogo EM ANDAMENTO sem resultado (sync ainda não rodou)', () => {
    render(
      <GameCard
        {...makeProps({
          status: 'em_andamento',
          resultadoA: null,
          resultadoB: null,
        })}
      />
    )
    expect(screen.getByText('0 - 0')).toBeInTheDocument()
    expect(screen.queryByText('vs')).not.toBeInTheDocument()
  })

  it('mostra placar final (2-1) para jogo FINALIZADO', () => {
    render(
      <GameCard
        {...makeProps({ status: 'finalizado', resultadoA: 2, resultadoB: 1 })}
      />
    )
    expect(screen.getByText('2 - 1')).toBeInTheDocument()
    expect(screen.queryByText('vs')).not.toBeInTheDocument()
  })

  it('mostra "0 - 0" para jogo FINALIZADO sem resultado (estado inconsistente do DB — fallback consistente)', () => {
    render(
      <GameCard
        {...makeProps({
          status: 'finalizado',
          resultadoA: null,
          resultadoB: null,
        })}
      />
    )
    expect(screen.getByText('0 - 0')).toBeInTheDocument()
    expect(screen.queryByText('vs')).not.toBeInTheDocument()
  })
})

describe('GameCard - badges de status', () => {
  it('exibe badge "Em andamento" para status em_andamento', () => {
    render(
      <GameCard
        {...makeProps({ status: 'em_andamento', resultadoA: 0, resultadoB: 0 })}
      />
    )
    expect(screen.getByText('Em andamento')).toBeInTheDocument()
  })

  it('exibe badge "Finalizado" para status finalizado', () => {
    render(
      <GameCard
        {...makeProps({ status: 'finalizado', resultadoA: 2, resultadoB: 1 })}
      />
    )
    expect(screen.getByText('Finalizado')).toBeInTheDocument()
  })

  it('exibe "Ver palpites" para status agendado (sem badge de status)', () => {
    render(<GameCard {...makeProps({ status: 'agendado' })} />)
    expect(screen.getByText(/Ver palpites/)).toBeInTheDocument()
  })
})

describe('GameCard - pênaltis (knockout finalizado)', () => {
  it('mostra placar de pênaltis para jogo finalizado de fase eliminatória', () => {
    render(
      <GameCard
        {...makeProps({
          status: 'finalizado',
          fase: 'quartas',
          resultadoA: 1,
          resultadoB: 1,
          placarPenaltisA: 4,
          placarPenaltisB: 2,
        })}
      />
    )
    expect(screen.getByText('1 - 1')).toBeInTheDocument()
    expect(screen.getByText(/\(4 - 2 pên\.\)/)).toBeInTheDocument()
  })

  it('NÃO mostra placar de pênaltis para jogo em andamento (só finalizado)', () => {
    render(
      <GameCard
        {...makeProps({
          status: 'em_andamento',
          fase: 'quartas',
          resultadoA: 1,
          resultadoB: 1,
          placarPenaltisA: 4,
          placarPenaltisB: 2,
        })}
      />
    )
    expect(screen.getByText('1 - 1')).toBeInTheDocument()
    expect(screen.queryByText(/pên\./)).not.toBeInTheDocument()
  })
})

describe('GameCard - link wrapper', () => {
  it('envolve o card em link /jogos/[id] quando id é fornecido', () => {
    render(<GameCard {...makeProps({ id: 'abc-123' })} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/jogos/abc-123')
  })

  it('não envolve em link quando id é undefined', () => {
    render(<GameCard {...makeProps({ id: undefined })} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
