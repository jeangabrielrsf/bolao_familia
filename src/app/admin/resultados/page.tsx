'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { FASE_LABELS } from '@/lib/utils/constants'
import { toast } from 'sonner'
import { Loader2, RefreshCw } from 'lucide-react'

type Fase = 'grupos' | 'oitavas' | 'quartas' | 'semifinal' | 'terceiro' | 'final'
type StatusJogo = 'agendado' | 'em_andamento' | 'finalizado'
interface Jogo { id: string; grupo: string | null; fase: Fase; dataHora: string; timeA: string; timeB: string; resultadoA: number | null; resultadoB: number | null; status: StatusJogo; sofascoreId: string | null }
interface SyncResult { sofascoreId: string; timeA: string; timeB: string; resultadoA: number; resultadoB: number }

const FASE_ORDER: Fase[] = ['grupos', 'oitavas', 'quartas', 'semifinal', 'terceiro', 'final']
const STATUS_BADGE: Record<StatusJogo, { variant: 'default' | 'warning' | 'success'; label: string }> = {
  agendado: { variant: 'default', label: 'Agendado' },
  em_andamento: { variant: 'warning', label: 'Em Andamento' },
  finalizado: { variant: 'success', label: 'Finalizado' },
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function groupByFase(jogosList: Jogo[]): Record<Fase, Jogo[]> {
  const groups: Record<string, Jogo[]> = {}
  for (const jogo of jogosList) { if (!groups[jogo.fase]) groups[jogo.fase] = []; groups[jogo.fase].push(jogo) }
  return groups as Record<Fase, Jogo[]>
}

export default function AdminResultadosPage() {
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncResults, setSyncResults] = useState<{ atualizados: number; resultados: SyncResult[] } | null>(null)

  const fetchJogos = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/jogos')
      if (!res.ok) throw new Error('Erro ao carregar')
      const data = await res.json(); setJogos(data); setError('')
    } catch { setError('Erro ao carregar jogos') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchJogos()
  }, [fetchJogos])

  async function handleSync() {
    setSyncing(true); setSyncResults(null)
    try {
      const res = await fetch('/api/resultados/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao sincronizar')
      setSyncResults({ atualizados: data.atualizados, resultados: data.resultados })
      await fetchJogos()
      toast.success(`${data.atualizados} jogo(s) atualizado(s)!`)
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erro ao sincronizar') }
    finally { setSyncing(false) }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <h1 className="text-3xl font-display tracking-wide">Resultados</h1>
        <Card><CardContent className="p-4 space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></CardContent></Card>
      </div>
    )
  }

  const grouped = groupByFase(jogos)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-display tracking-wide">Resultados</h1>
        <Button onClick={handleSync} disabled={syncing} className={syncing ? 'animate-shimmer text-primary-foreground' : ''}>
          {syncing ? <><Loader2 className="w-4 h-4 animate-spin" /> Sincronizando...</> : <><RefreshCw className="w-4 h-4" /> Sincronizar Resultados</>}
        </Button>
      </div>

      {error && (
        <Card><CardContent className="p-4 flex items-center gap-2">
          <Badge variant="destructive">{error}</Badge>
          <Button variant="secondary" size="sm" onClick={fetchJogos}>Tentar Novamente</Button>
        </CardContent></Card>
      )}

      {syncResults && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <Badge variant="success">{syncResults.atualizados} jogo{syncResults.atualizados !== 1 ? 's' : ''} atualizado{syncResults.atualizados !== 1 ? 's' : ''}</Badge>
            {syncResults.atualizados === 0 && <p className="text-sm text-muted-foreground">Nenhum jogo foi atualizado nesta sincronização.</p>}
            {syncResults.resultados.length > 0 && (
              <div className="space-y-2">
                {syncResults.resultados.map((r) => (
                  <div key={r.sofascoreId} className="flex items-center justify-between p-3 bg-muted rounded-md">
                    <span className="font-medium">{r.timeA} vs {r.timeB}</span>
                    <Badge variant="info">{r.resultadoA} x {r.resultadoB}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {jogos.length === 0 && !error && (
        <Card><CardContent className="flex flex-col items-center justify-center py-12"><p className="text-muted-foreground">Nenhum jogo cadastrado.</p></CardContent></Card>
      )}

      {jogos.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-display tracking-wide">Jogos Cadastrados</h2>
          {FASE_ORDER.map((fase) => {
            const faseJogos = grouped[fase]
            if (!faseJogos || faseJogos.length === 0) return null
            return (
              <div key={fase} className="space-y-3">
                <h3 className="text-lg font-medium">{FASE_LABELS[fase] || fase}</h3>
                <div className="space-y-2">
                  {faseJogos.map((jogo) => {
                    const statusInfo = STATUS_BADGE[jogo.status]
                    return (
                      <Card key={jogo.id}>
                        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {jogo.fase === 'grupos' && jogo.grupo && <Badge variant="info">Grupo {jogo.grupo}</Badge>}
                              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                            </div>
                            <p className="font-medium">{jogo.timeA} vs {jogo.timeB}</p>
                            <p className="text-sm text-muted-foreground">{formatDateTime(jogo.dataHora)}</p>
                          </div>
                          <div className="text-right">
                            {jogo.resultadoA !== null && jogo.resultadoB !== null ? (
                              <Badge variant="success">{jogo.resultadoA} x {jogo.resultadoB}</Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground italic">A realizar</span>
                            )}
                          </div>
                        </CardContent>
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
