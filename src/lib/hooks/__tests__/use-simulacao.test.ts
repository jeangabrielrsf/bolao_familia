/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useSimulacao } from '../use-simulacao'
import type { JogoComTimes } from '@/lib/services/bracket/types'

const makeJogo = (id: string, overrides: Partial<JogoComTimes> = {}): JogoComTimes => ({
  id, fase: 'grupos', grupo: 'A', timeA: 'A', timeB: 'B',
  resultadoA: null, resultadoB: null, status: 'agendado',
  placarPenaltisA: null, placarPenaltisB: null, vencedor: null,
  sofascoreId: id, dataHora: new Date(),
  ...overrides,
})

const STORAGE_KEY = 'copa_sim'

const localStorageMock: Record<string, string> = {}

beforeEach(() => {
  localStorage.clear()
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation((k) => {
    if (k === STORAGE_KEY) return localStorageMock[k as keyof typeof localStorageMock] ?? null
    return null
  })
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation((k, v) => {
    ;(localStorageMock as Record<string, string>)[k] = v
  })
  jest.spyOn(Storage.prototype, 'removeItem').mockImplementation((k) => {
    delete localStorageMock[k as keyof typeof localStorageMock]
  })
})

describe('useSimulacao', () => {
  const jogos = [makeJogo('j1'), makeJogo('j2')]

  it('inicia com simulacao vazia', () => {
    const { result } = renderHook(() => useSimulacao(jogos))
    expect(result.current.simulacao).toEqual({})
    expect(result.current.count).toBe(0)
  })

  it('carrega do localStorage no mount', () => {
    localStorageMock[STORAGE_KEY] = JSON.stringify({ j1: { placarA: 2, placarB: 1 } })
    const { result } = renderHook(() => useSimulacao(jogos))
    expect(result.current.simulacao).toEqual({ j1: { placarA: 2, placarB: 1 } })
  })

  it('setPlacar atualiza state', () => {
    const { result } = renderHook(() => useSimulacao(jogos))
    act(() => result.current.setPlacar('j1', 3, 0))
    expect(result.current.simulacao.j1).toEqual({ placarA: 3, placarB: 0 })
    expect(result.current.count).toBe(1)
  })

  it('setPlacar persiste no localStorage', () => {
    const { result } = renderHook(() => useSimulacao(jogos))
    act(() => result.current.setPlacar('j1', 3, 0))
    expect(JSON.parse(localStorageMock[STORAGE_KEY])).toEqual({
      j1: { placarA: 3, placarB: 0 },
    })
  })

  it('jogosComSimulacao aplica simulacao via aplicarSimulacao', () => {
    const { result } = renderHook(() => useSimulacao(jogos))
    act(() => result.current.setPlacar('j1', 3, 0))
    const updated = result.current.jogosComSimulacao
    expect(updated.find(j => j.id === 'j1')?.resultadoA).toBe(3)
    expect(updated.find(j => j.id === 'j1')?.status).toBe('finalizado')
    expect(updated.find(j => j.id === 'j2')?.status).toBe('agendado')
  })

  it('clear reseta state e localStorage', () => {
    const { result } = renderHook(() => useSimulacao(jogos))
    act(() => result.current.setPlacar('j1', 3, 0))
    act(() => result.current.clear())
    expect(result.current.simulacao).toEqual({})
    expect(localStorageMock[STORAGE_KEY]).toBeUndefined()
  })
})
