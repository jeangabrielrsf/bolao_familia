'use client'

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { JogoFilters, FiltrosJogos } from '@/components/admin/jogo-filters'
import { JogoPagination } from '@/components/admin/jogo-pagination'
import { FASE_LABELS } from '@/lib/utils/constants'
import { formatarDataHoraCompleta } from '@/lib/utils/date'
import { toast } from 'sonner'
import { Loader2, ChevronLeft } from 'lucide-react'

type Fase = 'grupos' | 'dezesseis_avos' | 'oitavas' | 'quartas' | 'semifinal' | 'terceiro' | 'final'
type StatusJogo = 'agendado' | 'em_andamento' | 'finalizado'
interface Jogo { id: string; grupo: string | null; fase: Fase; dataHora: string; timeA: string; timeB: string; resultadoA: number | null; resultadoB: number | null; status: StatusJogo; local: string | null; cidade: string | null; vencedor: number | null }
interface JogoSaveState { resultadoA: string; resultadoB: string; saving: boolean }

const FASE_ORDER: Fase[] = ['grupos', 'dezesseis_avos', 'oitavas', 'quartas', 'semifinal', 'terceiro', 'final']
const STATUS_BADGE: Record<StatusJogo, { variant: 'default' | 'warning' | 'success'; label: string }> = {
  agendado: { variant: 'default', label: 'Agendado' },
  em_andamento: { variant: 'warning', label: 'Em Andamento' },
  finalizado: { variant: 'success', label: 'Finalizado' },
}

const PER_PAGE = 25

function formatDateTime(iso: string) {
  return formatarDataHoraCompleta(new Date(iso))
}

function parseFiltrosFromURL(params: URLSearchParams): FiltrosJogos {
  return {
    fases: (params.get('fase') || '').split(',').filter(Boolean),
    statuses: (params.get('status') || '').split(',').filter(Boolean),
    grupos: [],
    time: params.get('q') || '',
    de: '',
    ate: '',
  }
}

export default function AdminJogosPage() {
  return (
    <Suspense fallback={null}>
      <AdminJogosContent />
    </Suspense>
  )
}

function AdminJogosContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filtros, setFiltros] = useState<FiltrosJogos>(parseFiltrosFromURL(searchParams))
  const [page, setPage] = useState(1)
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saveStates, setSaveStates] = useState<Record<string, JogoSaveState>>({})

  useEffect(() => {
    const params = new URLSearchParams()
    if (filtros.fases.length) params.set('fase', filtros.fases.join(','))
    if (filtros.statuses.length) params.set('status', filtros.statuses.join(','))
    if (filtros.time) params.set('q', filtros.time)
    const qs = params.toString()
    const target = qs ? `/admin/jogos?${qs}` : '/admin/jogos'
    router.replace(target)
  }, [filtros, router])

  const fetchJogos = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/jogos')
      if (!res.ok) throw new Error('Erro ao carregar')
      const data = await res.json(); setJogos(data); setError('')
    } catch { setError('Erro ao carregar jogos') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchJogos()
  }, [fetchJogos])

  const jogosFiltrados = useMemo(() => {
    return jogos.filter(j => {
      if (filtros.fases.length > 0 && !filtros.fases.includes(j.fase)) return false
      if (filtros.statuses.length > 0 && !filtros.statuses.includes(j.status)) return false
      if (filtros.time) {
        const q = filtros.time.toLowerCase()
        if (!j.timeA?.toLowerCase().includes(q) && !j.timeB?.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [jogos, filtros])

  const jogosPaginados = useMemo(() => {
    return jogosFiltrados.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  }, [jogosFiltrados, page])

  function getSaveState(jogoId: string): JogoSaveState {
    return saveStates[jogoId] || { resultadoA: '', resultadoB: '', saving: false }
  }
  function updateSaveState(jogoId: string, partial: Partial<JogoSaveState>) {
    setSaveStates((prev) => ({ ...prev, [jogoId]: { ...(prev[jogoId] || { resultadoA: '', resultadoB: '', saving: false }), ...partial } }))
  }

  async function handleSave(jogo: Jogo) {
    const state = getSaveState(jogo.id)
    const rA = state.resultadoA.trim(); const rB = state.resultadoB.trim()
    if (rA === '' || rB === '') { toast.error('Preencha ambos os resultados'); return }
    const numA = parseInt(rA, 10); const numB = parseInt(rB, 10)
    if (isNaN(numA) || isNaN(numB) || numA < 0 || numB < 0) { toast.error('Resultados inválidos'); return }
    updateSaveState(jogo.id, { saving: true })
    try {
      const res = await fetch('/api/admin/jogos', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: jogo.id, resultadoA: numA, resultadoB: numB }),
      })
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Erro ao salvar') }
      const updated = await res.json()
      setJogos((prev) => prev.map((j) => (j.id === updated.id ? updated : j)))
      updateSaveState(jogo.id, { resultadoA: '', resultadoB: '', saving: false })
      toast.success(`${jogo.timeA} vs ${jogo.timeB} salvo!`)
    } catch (err) {
      updateSaveState(jogo.id, { saving: false })
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    }
  }

  function groupByFase(jogosList: Jogo[]): Record<Fase, Jogo[]> {
    const groups: Record<string, Jogo[]> = {}
    for (const jogo of jogosList) { if (!groups[jogo.fase]) groups[jogo.fase] = []; groups[jogo.fase].push(jogo) }
    return groups as Record<Fase, Jogo[]>
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin"><ChevronLeft className="w-4 h-4" /> Voltar ao Dashboard</Link>
        </Button>
        <h1 className="text-3xl font-display tracking-wide">Jogos</h1>
        <Card><CardContent className="p-4 space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></CardContent></Card>
      </div>
    )
  }

  const grouped = groupByFase(jogosPaginados)
  const fasesVisiveis = FASE_ORDER.filter(f => grouped[f]?.length > 0)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in-up">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin"><ChevronLeft className="w-4 h-4" /> Voltar ao Dashboard</Link>
      </Button>
      <h1 className="text-3xl font-display tracking-wide">Jogos</h1>

      <JogoFilters value={filtros} onChange={(f) => { setFiltros(f); setPage(1) }} />

      {error && (
        <Card><CardContent className="p-4 flex items-center gap-2">
          <Badge variant="destructive">{error}</Badge>
          <Button variant="secondary" size="sm" onClick={fetchJogos}>Tentar Novamente</Button>
        </CardContent></Card>
      )}

      {jogosFiltrados.length === 0 && !error && (
        <Card><CardContent className="flex flex-col items-center justify-center py-12"><p className="text-muted-foreground">Nenhum jogo encontrado com os filtros atuais.</p></CardContent></Card>
      )}

      {fasesVisiveis.map((fase) => {
        const faseJogos = grouped[fase]
        return (
          <div key={fase} className="space-y-3">
            <h2 className="text-xl font-display tracking-wide">{FASE_LABELS[fase] || fase}</h2>
            <div className="space-y-3">
              {faseJogos.map((jogo) => {
                const state = getSaveState(jogo.id)
                const statusInfo = STATUS_BADGE[jogo.status]
                return (
                  <Card key={jogo.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {jogo.fase === 'grupos' && jogo.grupo && <Badge variant="info">Grupo {jogo.grupo}</Badge>}
                            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                          </div>
                          <p className="font-medium">{jogo.timeA || 'A definir'} vs {jogo.timeB || 'A definir'}</p>
                          <p className="text-sm text-muted-foreground">{formatDateTime(jogo.dataHora)}</p>
                          {jogo.local && (
                            <p className="text-xs text-muted-foreground">
                              📍 {jogo.local}{jogo.cidade && `, ${jogo.cidade}`}
                            </p>
                          )}
                          {jogo.resultadoA !== null && jogo.resultadoB !== null && (
                            <p className="text-sm font-semibold mt-1">Resultado: {jogo.resultadoA} x {jogo.resultadoB}</p>
                          )}
                          {jogo.status === 'agendado' && <p className="text-sm text-muted-foreground italic">A realizar</p>}
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs text-muted-foreground">{jogo.timeA || 'Time A'}</label>
                            <Input type="number" min="0" aria-label={`Resultado ${jogo.timeA}`} className="w-16 text-center" value={state.resultadoA} onChange={(e) => updateSaveState(jogo.id, { resultadoA: e.target.value })} disabled={state.saving} />
                          </div>
                          <span className="pb-2 text-muted-foreground font-bold">x</span>
                          <div className="flex flex-col gap-1">
                            <label className="text-xs text-muted-foreground">{jogo.timeB || 'Time B'}</label>
                            <Input type="number" min="0" aria-label={`Resultado ${jogo.timeB}`} className="w-16 text-center" value={state.resultadoB} onChange={(e) => updateSaveState(jogo.id, { resultadoB: e.target.value })} disabled={state.saving} />
                          </div>
                          <Button size="sm" onClick={() => handleSave(jogo)} disabled={state.saving}>
                            {state.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )
      })}

      <JogoPagination total={jogosFiltrados.length} page={page} perPage={PER_PAGE} onPageChange={setPage} />
    </div>
  )
}
