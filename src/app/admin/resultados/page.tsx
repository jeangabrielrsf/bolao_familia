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
  sofascoreId: string | null
}

interface SyncResult {
  sofascoreId: string
  timeA: string
  timeB: string
  resultadoA: number
  resultadoB: number
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

function groupByFase(jogosList: Jogo[]): Record<Fase, Jogo[]> {
  const groups: Record<string, Jogo[]> = {}
  for (const jogo of jogosList) {
    if (!groups[jogo.fase]) groups[jogo.fase] = []
    groups[jogo.fase].push(jogo)
  }
  return groups as Record<Fase, Jogo[]>
}

export default function AdminResultadosPage() {
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [syncResults, setSyncResults] = useState<{
    atualizados: number
    resultados: SyncResult[]
  } | null>(null)

  const fetchJogos = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/jogos')
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
    fetchJogos()
  }, [fetchJogos])

  async function handleSync() {
    setSyncing(true)
    setSyncError('')
    setSyncResults(null)

    try {
      const res = await fetch('/api/resultados/sync', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao sincronizar')
      }

      setSyncResults({
        atualizados: data.atualizados,
        resultados: data.resultados,
      })
      await fetchJogos()
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Erro ao sincronizar resultados')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-6">Resultados</h1>
        <Card padding="md">
          <p className="text-center text-muted">Carregando...</p>
        </Card>
      </div>
    )
  }

  const grouped = groupByFase(jogos)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Resultados</h1>
        <Button onClick={handleSync} disabled={syncing}>
          {syncing ? 'Sincronizando...' : 'Sincronizar Resultados'}
        </Button>
      </div>

      {syncError && (
        <Card padding="md">
          <div role="alert">
            <Badge variant="danger">{syncError}</Badge>
          </div>
        </Card>
      )}

      {syncResults && (
        <Card padding="md">
          <div aria-live="polite" className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="success">
                {syncResults.atualizados} jogo{syncResults.atualizados !== 1 ? 's' : ''} atualizado{syncResults.atualizados !== 1 ? 's' : ''}
              </Badge>
            </div>

            {syncResults.atualizados === 0 && (
              <p className="text-sm text-muted">Nenhum jogo foi atualizado nesta sincronização.</p>
            )}

            {syncResults.resultados.length > 0 && (
              <div className="space-y-2">
                {syncResults.resultados.map((r) => (
                  <div
                    key={r.sofascoreId}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <span className="font-medium text-foreground">
                      {r.timeA} vs {r.timeB}
                    </span>
                    <Badge variant="info">
                      {r.resultadoA} x {r.resultadoB}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {error && (
        <Card padding="md">
          <div role="alert" className="flex items-center gap-2">
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

      {jogos.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-foreground">Jogos Cadastrados</h2>
          {FASE_ORDER.map((fase) => {
            const faseJogos = grouped[fase]
            if (!faseJogos || faseJogos.length === 0) return null

            return (
              <div key={fase} className="space-y-3">
                <h3 className="text-lg font-medium text-foreground">
                  {FASE_LABELS[fase] || fase}
                </h3>
                <div className="space-y-2">
                  {faseJogos.map((jogo) => {
                    const statusInfo = STATUS_BADGE[jogo.status]

                    return (
                      <Card key={jogo.id} padding="sm">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="min-w-0">
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
                          </div>
                          <div className="text-right">
                            {jogo.resultadoA !== null && jogo.resultadoB !== null ? (
                              <Badge variant="success">
                                {jogo.resultadoA} x {jogo.resultadoB}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted italic">A realizar</span>
                            )}
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
