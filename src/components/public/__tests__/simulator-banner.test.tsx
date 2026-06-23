/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { SimulatorBanner } from '../simulator-banner'

describe('SimulatorBanner', () => {
  it('não renderiza quando count=0', () => {
    const { container } = render(<SimulatorBanner count={0} onLimpar={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it('mostra contador de alterações', () => {
    render(<SimulatorBanner count={3} onLimpar={() => {}} />)
    expect(screen.getByText(/3 alterações/)).toBeInTheDocument()
  })
})
