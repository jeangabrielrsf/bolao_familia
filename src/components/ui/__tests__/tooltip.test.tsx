/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../tooltip'

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <TooltipProvider>{children}</TooltipProvider>
)

describe('Tooltip', () => {
  it('renderiza trigger com conteúdo do tooltip', async () => {
    render(
      <Wrapper>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
      </Wrapper>,
    )
    expect(screen.getByText('Hover me')).toBeInTheDocument()
  })

  it('mostra conteúdo do tooltip ao passar mouse (hover)', async () => {
    render(
      <Wrapper>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
      </Wrapper>,
    )
    const trigger = screen.getByText('Hover me')
    fireEvent.pointerDown(trigger)
    fireEvent.pointerMove(trigger)
    await waitFor(() => {
      expect(screen.getAllByText('Tooltip text').length).toBeGreaterThan(0)
    })
  })

  it('fecha tooltip ao apertar Esc', async () => {
    render(
      <Wrapper>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
      </Wrapper>,
    )
    const trigger = screen.getByText('Hover me')
    fireEvent.pointerDown(trigger)
    fireEvent.pointerMove(trigger)
    await waitFor(() => {
      expect(screen.getAllByText('Tooltip text').length).toBeGreaterThan(0)
    })
    fireEvent.keyDown(document.body, { key: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument()
    })
  })
})
