/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useIsDesktop } from '../use-is-desktop'

describe('useIsDesktop', () => {
  const mockMatchMedia = (matches: boolean) => {
    const listeners: Array<(e: { matches: boolean }) => void> = []
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches,
        media: query,
        addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
          listeners.push(cb)
        },
        removeEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
          const idx = listeners.indexOf(cb)
          if (idx >= 0) listeners.splice(idx, 1)
        },
        dispatchEvent: jest.fn(),
      })),
    })
    return listeners
  }

  it('retorna false em mobile (matches=false)', () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useIsDesktop())
    expect(result.current).toBe(false)
  })

  it('retorna true em desktop (matches=true)', () => {
    mockMatchMedia(true)
    const { result } = renderHook(() => useIsDesktop())
    expect(result.current).toBe(true)
  })

  it('atualiza quando matchMedia dispara change', () => {
    const listeners = mockMatchMedia(false)
    const { result } = renderHook(() => useIsDesktop())
    expect(result.current).toBe(false)

    act(() => {
      listeners.forEach(cb => cb({ matches: true }))
    })

    expect(result.current).toBe(true)
  })

  it('remove listener no unmount', () => {
    const listeners = mockMatchMedia(false)
    const { unmount } = renderHook(() => useIsDesktop())
    const initialListenerCount = listeners.length
    expect(initialListenerCount).toBe(1)

    unmount()

    expect(listeners.length).toBe(0)
  })
})
