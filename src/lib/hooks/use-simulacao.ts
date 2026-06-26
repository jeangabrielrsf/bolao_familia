'use client'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { aplicarSimulacao } from '@/lib/services/bracket/simulator'
import type { JogoComTimes } from '@/lib/services/bracket/types'

export const STORAGE_KEY = 'copa_sim'

type Simulacao = Record<string, { placarA: number; placarB: number }>

type UseSimulacaoReturn = {
  simulacao: Simulacao
  jogosComSimulacao: JogoComTimes[]
  setPlacar: (jogoId: string, placarA: number, placarB: number) => void
  clear: () => void
  count: number
}

function loadFromStorage(): Simulacao {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function useSimulacao(jogos: JogoComTimes[]): UseSimulacaoReturn {
  const [simulacao, setSimulacao] = useState<Simulacao>(loadFromStorage)

  useEffect(() => {
    if (Object.keys(simulacao).length === 0) {
      window.localStorage.removeItem(STORAGE_KEY)
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(simulacao))
    }
  }, [simulacao])

  const setPlacar = useCallback((jogoId: string, placarA: number, placarB: number) => {
    setSimulacao(prev => ({ ...prev, [jogoId]: { placarA, placarB } }))
  }, [])

  const clear = useCallback(() => {
    setSimulacao({})
  }, [])

  const jogosComSimulacao = useMemo(
    () => aplicarSimulacao(jogos, simulacao),
    [jogos, simulacao],
  )

  return {
    simulacao,
    jogosComSimulacao,
    setPlacar,
    clear,
    count: Object.keys(simulacao).length,
  }
}
