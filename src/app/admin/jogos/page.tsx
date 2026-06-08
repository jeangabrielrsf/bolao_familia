'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FASE_LABELS } from '@/lib/utils/constants'

type Fase = 'grupos' | 'oitavas' | 'quartas' | 'semifinal' | 'terceiro' | 'final'
type StatusJogo = 'agendado' | 'em_andamento' | 'finalizado'

interface Jogo {
  id: string
  grupo: string | null
  fase: Fase
  dataHora: string
  timeA: string
  timeB: string
  resultadoA: number | null
  resultadoB: number | null
  status: StatusJogo
}

interface JogoSaveState {
  resultadoA: string
  resultadoB: string
  saving: boolean
  message: string
  messageType: 'success' | 'error' | ''
}

const FASE_ORDER: Fase[] = ['grupos', 'oitavas', 'quartas', 'semifinal', 'terceiro', 'final']

const STATUS_BADGE: Record<StatusJogo, { variant: 'default' | 'warning' | 'success'; label: string }> = {
  agendado: { variant: 'default', label: 'Agendado' },
  em_andamento: { variant: 'warning', label: 'Em Andamento' },
  finalizado: { variant: 'success', label: 'Finalizado' },
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminJogosPage() {
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saveStates, setSaveStates] = useState<Record<string, JogoSaveState>>({})

  const fetchJogos = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/jogos')
      if (!res.ok) throw new Error('Erro ao carregar')
      const data = await res.json()
      setJogos(data)
      setError('')
    } catch {
      setError('Erro ao carregar jogos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchJogos()
  }, [fetchJogos])

  function getSaveState(jogoId: string): JogoSaveState {
    return saveStates[jogoId] || { resultadoA: '', resultadoB: '', saving: false, message: '', messageType: '' }
  }

  function updateSaveState(jogoId: string, partial: Partial<JogoSaveState>) {
    setSaveStates((prev) => ({
      ...prev,
      [jogoId]: { ...(prev[jogoId] || { resultadoA: '', resultadoB: '', saving: false, message: '', messageType: '' }), ...partial },
    }))
  }

  async function handleSave(jogo: Jogo) {
    const state = getSaveState(jogo.id)
    const rA = state.resultadoA.trim()
    const rB = state.resultadoB.trim()

    if (rA === '' || rB === '') {
      updateSaveState(jogo.id, { message: 'Preencha ambos os resultados', messageType: 'error' })
      return
    }

    const numA = parseInt(rA, 10)
    const numB = parseInt(rB, 10)
    if (isNaN(numA) || isNaN(numB) || numA < 0 || numB < 0) {
      updateSaveState(jogo.id, { message: 'Resultados inválidos', messageType: 'error' })
      return
    }

    updateSaveState(jogo.id, { saving: true, message: '', messageType: '' })

    try {
      const res = await fetch('/api/admin/jogos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: jogo.id, resultadoA: numA, resultadoB: numB }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao salvar')
      }

      const updated = await res.json()
      setJogos((prev) => prev.map((j) => (j.id === updated.id ? updated : j)))
      updateSaveState(jogo.id, { resultadoA: '', resultadoB: '', saving: false, message: 'Salvo!', messageType: 'success' })
      setTimeout(() => {
        updateSaveState(jogo.id, { message: '', messageType: '' })
      }, 3000)
    } catch (err) {
      updateSaveState(jogo.id, {
        saving: false,
        message: err instanceof Error ? err.message : 'Erro ao salvar',
        messageType: 'error',
      })
    }
  }

  function groupByFase(jogosList: Jogo[]): Record<Fase, Jogo[]> {
    const groups: Record<string, Jogo[]> = {}
    for (const jogo of jogosList) {
      if (!groups[jogo.fase]) groups[jogo.fase] = []
      groups[jogo.fase].push(jogo)
    }
    return groups as Record<Fase, Jogo[]>
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-6">Jogos</h1>
        <Card padding="md">
          <p className="text-center text-muted">Carregando...</p>
        </Card>
      </div>
    )
  }

  const grouped = groupByFase(jogos)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-primary">Jogos</h1>

      {error && (
        <Card padding="md">
          <div className="flex items-center gap-2">
            <Badge variant="danger">{error}</Badge>
            <Button variant="secondary" size="sm" onClick={fetchJogos}>
              Tentar Novamente
            </Button>
          </div>
        </Card>
      )}

      {jogos.length === 0 && !error && (
        <Card padding="md">
          <p className="text-center text-muted">Nenhum jogo cadastrado.</p>
        </Card>
      )}

      {FASE_ORDER.map((fase) => {
        const faseJogos = grouped[fase]
        if (!faseJogos || faseJogos.length === 0) return null

        return (
          <div key={fase} className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              {FASE_LABELS[fase] || fase}
            </h2>
            <div className="space-y-3">
              {faseJogos.map((jogo) => {
                const state = getSaveState(jogo.id)
                const statusInfo = STATUS_BADGE[jogo.status]

                return (
                  <Card key={jogo.id} padding="sm">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {jogo.fase === 'grupos' && jogo.grupo && (
                            <Badge variant="info">Grupo {jogo.grupo}</Badge>
                          )}
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </div>
                        <p className="font-medium text-foreground">
                          {jogo.timeA} vs {jogo.timeB}
                        </p>
                        <p className="text-sm text-muted">
                          {formatDateTime(jogo.dataHora)}
                        </p>
                        {jogo.resultadoA !== null && jogo.resultadoB !== null && (
                          <p className="text-sm font-semibold text-foreground mt-1">
                            Resultado: {jogo.resultadoA} x {jogo.resultadoB}
                          </p>
                        )}
                        {jogo.status === 'agendado' && (
                          <p className="text-sm text-muted italic">A realizar</p>
                        )}
                      </div>

                      <div className="flex items-end gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-muted">{jogo.timeA}</label>
                          <input
                            type="number"
                            min="0"
                            aria-label={`Resultado ${jogo.timeA}`}
                            className="w-16 px-2 py-1 border border-border rounded-md text-center text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                            value={state.resultadoA}
                            onChange={(e) => updateSaveState(jogo.id, { resultadoA: e.target.value })}
                            disabled={state.saving}
                          />
                        </div>
                        <span className="pb-1 text-muted font-bold">x</span>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-muted">{jogo.timeB}</label>
                          <input
                            type="number"
                            min="0"
                            aria-label={`Resultado ${jogo.timeB}`}
                            className="w-16 px-2 py-1 border border-border rounded-md text-center text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                            value={state.resultadoB}
                            onChange={(e) => updateSaveState(jogo.id, { resultadoB: e.target.value })}
                            disabled={state.saving}
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleSave(jogo)}
                          disabled={state.saving}
                        >
                          {state.saving ? 'Salvando...' : 'Salvar'}
                        </Button>
                      </div>
                    </div>

                    {state.message && (
                      <div className="mt-2">
                        <Badge variant={state.messageType === 'success' ? 'success' : 'danger'}>
                          {state.message}
                        </Badge>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
