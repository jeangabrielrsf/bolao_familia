/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { JogosStatusCard } from '../jogos-status-card'

describe('JogosStatusCard', () => {
  it('renderiza os 3 números nas cores corretas', () => {
    render(
      <JogosStatusCard finalizado={15} emAndamento={2} restante={87} />
    )

    const finalizado = screen.getByText('15')
    const emJogo = screen.getByText('2')
    const restante = screen.getByText('87')

    expect(finalizado).toHaveClass('text-success')
    expect(emJogo).toHaveClass('text-warning')
    expect(restante).toHaveClass('text-muted-foreground')
  })

  it('renderiza os labels abaixo dos números', () => {
    render(
      <JogosStatusCard finalizado={15} emAndamento={2} restante={87} />
    )

    expect(screen.getByText('finalizados')).toBeInTheDocument()
    expect(screen.getByText('em jogo')).toBeInTheDocument()
    expect(screen.getByText('restantes')).toBeInTheDocument()
  })

  it('renderiza o label "Jogos"', () => {
    render(
      <JogosStatusCard finalizado={15} emAndamento={2} restante={87} />
    )

    expect(screen.getByText('Jogos')).toBeInTheDocument()
  })

  it('envolve em Link quando href é fornecido', () => {
    render(
      <JogosStatusCard finalizado={15} emAndamento={2} restante={87} href="/jogos" />
    )

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/jogos')
  })

  it('não envolve em Link quando href é omitido', () => {
    render(
      <JogosStatusCard finalizado={15} emAndamento={2} restante={87} />
    )

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('tem aria-label descritivo', () => {
    render(
      <JogosStatusCard finalizado={15} emAndamento={2} restante={87} />
    )

    const card = screen.getByRole('group', { name: /15 finalizados, 2 em jogo, 87 restantes/i })
    expect(card).toBeInTheDocument()
  })
})
