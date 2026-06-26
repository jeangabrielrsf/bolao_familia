/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { Sheet, SheetContent, SheetTitle } from '../sheet'

describe('Sheet', () => {
  it('renderiza children quando open=true', () => {
    render(
      <Sheet open onOpenChange={() => {}}>
        <SheetContent>
          <SheetTitle>Test</SheetTitle>
          <p>Content here</p>
        </SheetContent>
      </Sheet>
    )
    expect(screen.getByText('Test')).toBeInTheDocument()
    expect(screen.getByText('Content here')).toBeInTheDocument()
  })

  it('chama onOpenChange(false) ao pressionar ESC', () => {
    const onOpenChange = jest.fn()
    render(
      <Sheet open onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetTitle>Test</SheetTitle>
        </SheetContent>
      </Sheet>
    )
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('aplica classes de side="right" por padrão', () => {
    render(
      <Sheet open onOpenChange={() => {}}>
        <SheetContent>
          <SheetTitle>Right</SheetTitle>
        </SheetContent>
      </Sheet>
    )
    const content = screen.getByText('Right').closest('[role="dialog"]')!
    expect(content.className).toMatch(/right-0|inset-y-0/)
  })

  it('aplica classes de side="bottom" quando especificado', () => {
    render(
      <Sheet open onOpenChange={() => {}}>
        <SheetContent side="bottom">
          <SheetTitle>Bottom</SheetTitle>
        </SheetContent>
      </Sheet>
    )
    const content = screen.getByText('Bottom').closest('[role="dialog"]')!
    expect(content.className).toMatch(/bottom-0|inset-x-0/)
  })
})
