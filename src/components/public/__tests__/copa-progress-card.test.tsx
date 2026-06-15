/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { CopaProgressCard } from '../copa-progress-card'

describe('CopaProgressCard', () => {
  it('renderiza o percentual arredondado no anel e no label grande', () => {
    render(
      <CopaProgressCard percentual={14} finalizados={15} total={104} />
    )

    const percentualElements = screen.getAllByText('14%')
    expect(percentualElements.length).toBeGreaterThanOrEqual(2)
  })

  it('renderiza o label "Copa" e o caption "concluído"', () => {
    render(
      <CopaProgressCard percentual={14} finalizados={15} total={104} />
    )

    expect(screen.getByText('Copa')).toBeInTheDocument()
    expect(screen.getByText('concluído')).toBeInTheDocument()
  })

  it('SVG do anel tem stroke-dasharray correspondente ao percentual', () => {
    const { container } = render(
      <CopaProgressCard percentual={25} finalizados={26} total={104} />
    )

    const arc = container.querySelector('circle[stroke-dasharray]')
    expect(arc).toBeInTheDocument()
    expect(arc).toHaveAttribute('stroke-dasharray', '25 100')
  })

  it('tem aria-label descritivo', () => {
    render(
      <CopaProgressCard percentual={14} finalizados={15} total={104} />
    )

    const card = screen.getByRole('group', { name: /Copa: 14 por cento concluído, 15 de 104 jogos/i })
    expect(card).toBeInTheDocument()
  })

  it('envolve em Link quando href é fornecido', () => {
    render(
      <CopaProgressCard percentual={14} finalizados={15} total={104} href="/jogos" />
    )

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/jogos')
  })

  it('não envolve em Link quando href é omitido', () => {
    render(
      <CopaProgressCard percentual={14} finalizados={15} total={104} />
    )

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('edge case: total=0 mostra 0% sem arco (dasharray="0 100")', () => {
    const { container } = render(
      <CopaProgressCard percentual={0} finalizados={0} total={0} />
    )

    const arc = container.querySelector('circle[stroke-dasharray]')
    expect(arc).toHaveAttribute('stroke-dasharray', '0 100')
    expect(screen.getAllByText('0%').length).toBeGreaterThanOrEqual(2)
  })

  it('edge case: 100% mostra arco completo (dasharray="100 100")', () => {
    const { container } = render(
      <CopaProgressCard percentual={100} finalizados={104} total={104} />
    )

    const arc = container.querySelector('circle[stroke-dasharray]')
    expect(arc).toHaveAttribute('stroke-dasharray', '100 100')
  })
})
