'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Loader2, ChevronLeft, Copy, Dice5, CheckCircle, AlertCircle, Settings, ExternalLink } from 'lucide-react'

interface ParticipanteStatus {
  id: string
  nome: string
  token: string | null
  fotoUrl: string | null
  totalJogos: number
  jogosCompletos: number
  jogosFaltando: number
  completo: boolean
  modo: 'completo' | 'restante'
  extrasCompletos: number
  totalExtras: number
}

interface Config {
  prazo: string
  habilitado: boolean
}

interface Resumo {
  totalParticipantes: number
  participantesCompletos: number
  participantesIncompletos: number
  totalJogosFaltando: number
}

export default function AdminCompletarBolaoPage() {
  const [participantes, setParticipantes] = useState<ParticipanteStatus[]>([])
  const [config, setConfig] = useState<Config | null>(null)
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [loading, setLoading] = useState(true)
  const [sorteando, setSorteando] = useState<string | null>(null)
  const [sorteandoTodos, setSorteandoTodos] = useState(false)
  const [editandoPrazo, setEditandoPrazo] = useState(false)
  const [prazoInput, setPrazoInput] = useState('')
  const [salvandoConfig, setSalvandoConfig] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [elegiveis, setElegiveis] = useState<{ id: string; nome: string }[]>([])
  const [participanteSelecionado, setParticipanteSelecionado] = useState('')
  const [apelidoInput, setApelidoInput] = useState('')
  const [criando, setCriando] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/completar-bolao/status')
      if (!res.ok) throw new Error('Erro ao carregar')
      const data = await res.json()
      setParticipantes(data.participantes)
      setConfig(data.config)
      setResumo(data.resumo)
      if (data.config?.prazo) {
        const d = new Date(data.config.prazo)
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
        setPrazoInput(local)
      }
    } catch {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [fetchData])

  async function copiarLink(token: string, nome: string) {
    const url = `${window.location.origin}/completar/${token}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success(`Link copiado para ${nome}!`)
    } catch {
      toast.error('Erro ao copiar link')
    }
  }

  async function sortearIndividual(participanteId: string, nome: string) {
    setSorteando(participanteId)
    try {
      const res = await fetch('/api/admin/completar-bolao/sortear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participanteIds: [participanteId] }),
      })
      if (!res.ok) throw new Error('Erro ao sortear')
      const data = await res.json()
      const total = data.resultados?.[0]?.totalSorteados ?? 0
      toast.success(`Sorteio concluído para ${nome}! ${total} jogos sorteados.`)
      fetchData()
    } catch {
      toast.error('Erro ao sortear palpites')
    } finally {
      setSorteando(null)
    }
  }

  async function sortearTodos() {
    setSorteandoTodos(true)
    try {
      const res = await fetch('/api/admin/completar-bolao/sortear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todosIncompletos: true }),
      })
      if (!res.ok) throw new Error('Erro ao sortear')
      const data = await res.json()
      toast.success(`Sorteio em lote concluído! ${data.participantesAfetados} participantes afetados.`)
      fetchData()
    } catch {
      toast.error('Erro ao sortear palpites')
    } finally {
      setSorteandoTodos(false)
    }
  }

  async function toggleHabilitado() {
    if (!config) return
    setSalvandoConfig(true)
    try {
      const res = await fetch('/api/admin/config/completar-bolao', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habilitado: !config.habilitado }),
      })
      if (!res.ok) throw new Error('Erro ao atualizar')
      setConfig({ ...config, habilitado: !config.habilitado })
      toast.success(config.habilitado ? 'Coleta desabilitada' : 'Coleta habilitada')
    } catch {
      toast.error('Erro ao atualizar configuração')
    } finally {
      setSalvandoConfig(false)
    }
  }

  async function salvarPrazo() {
    setSalvandoConfig(true)
    try {
      const res = await fetch('/api/admin/config/completar-bolao', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prazo: new Date(prazoInput).toISOString() }),
      })
      if (!res.ok) throw new Error('Erro ao atualizar')
      setConfig({ ...config!, prazo: new Date(prazoInput).toISOString() })
      setEditandoPrazo(false)
      toast.success('Prazo atualizado!')
    } catch {
      toast.error('Erro ao atualizar prazo')
    } finally {
      setSalvandoConfig(false)
    }
  }

  async function abrirModalNovoPalpite() {
    try {
      const res = await fetch('/api/admin/completar-bolao/participantes-elegiveis')
      if (!res.ok) throw new Error('Erro ao carregar')
      const data = await res.json()
      setElegiveis(data.participantes)
      setParticipanteSelecionado('')
      setApelidoInput('')
      setModalAberto(true)
    } catch {
      toast.error('Erro ao carregar participantes elegíveis')
    }
  }

  async function criarPalpite() {
    if (!participanteSelecionado) return
    setCriando(true)
    try {
      const res = await fetch('/api/admin/completar-bolao/novo-palpite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participanteId: participanteSelecionado,
          apelido: apelidoInput || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao criar')
      }
      const nome = elegiveis.find((p) => p.id === participanteSelecionado)?.nome ?? ''
      toast.success(`Palpite criado para ${nome}!`)
      setModalAberto(false)
      fetchData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar palpite')
    } finally {
      setCriando(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin"><ChevronLeft className="w-4 h-4" /> Voltar ao Dashboard</Link>
        </Button>
        <h1 className="text-3xl font-display tracking-wide">Completar Bolão</h1>
        <Card><CardContent className="p-4 space-y-3">
          <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" />
        </CardContent></Card>
      </div>
    )
  }

  const prazoFormatado = config?.prazo
    ? new Date(config.prazo).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Não definido'

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in-up">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin"><ChevronLeft className="w-4 h-4" /> Voltar ao Dashboard</Link>
      </Button>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-display tracking-wide">Completar Bolão</h1>
        <div className="flex gap-2">
          <Button onClick={abrirModalNovoPalpite} variant="secondary">
            Novo Palpite
          </Button>
          {resumo && resumo.participantesIncompletos > 0 && (
            <Button onClick={sortearTodos} disabled={sorteandoTodos} variant="secondary">
              {sorteandoTodos ? <><Loader2 className="w-4 h-4 animate-spin" /> Sorteando...</> : <><Dice5 className="w-4 h-4" /> Sortear Todos Incompletos</>}
            </Button>
          )}
        </div>
      </div>

      {resumo && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-display font-bold text-primary">{resumo.totalParticipantes}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-display font-bold text-green-600">{resumo.participantesCompletos}</p>
              <p className="text-xs text-muted-foreground">Completos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-display font-bold text-amber-600">{resumo.participantesIncompletos}</p>
              <p className="text-xs text-muted-foreground">Incompletos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-display font-bold text-danger">{resumo.totalJogosFaltando}</p>
              <p className="text-xs text-muted-foreground">Jogos Faltando</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Configurações</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status da Coleta</label>
              <div className="flex items-center gap-2">
                <Badge variant={config?.habilitado ? 'success' : 'secondary'}>
                  {config?.habilitado ? 'Habilitada' : 'Desabilitada'}
                </Badge>
                <Button variant="outline" size="sm" onClick={toggleHabilitado} disabled={salvandoConfig}>
                  {config?.habilitado ? 'Desabilitar' : 'Habilitar'}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Prazo</label>
              {editandoPrazo ? (
                <div className="flex items-center gap-2">
                  <Input type="datetime-local" value={prazoInput} onChange={(e) => setPrazoInput(e.target.value)} />
                  <Button size="sm" onClick={salvarPrazo} disabled={salvandoConfig}>Salvar</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditandoPrazo(false)}>Cancelar</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm">{prazoFormatado}</span>
                  <Button variant="outline" size="sm" onClick={() => setEditandoPrazo(true)}>Editar</Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {participantes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum participante</h3>
            <p className="text-muted-foreground">Cadastre participantes primeiro.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Link</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participantes.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell>
                    {p.completo ? (
                      <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />
                        {p.modo === 'completo' ? 'Completo (72+extras)' : 'Completo'}
                      </Badge>
                    ) : p.modo === 'completo' ? (
                      <Badge variant="warning">{p.jogosCompletos}/{p.totalJogos} jogos + {p.extrasCompletos}/{p.totalExtras} extras</Badge>
                    ) : (
                      <Badge variant="warning">{p.jogosCompletos}/{p.totalJogos} jogos</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.token ? (
                      <Button variant="ghost" size="sm" onClick={() => { if (p.token) copiarLink(p.token, p.nome) }}>
                        <Copy className="w-3 h-3 mr-1" />Copiar
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem token</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      {p.token && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/completar/${p.token}`} target="_blank">
                            <ExternalLink className="w-3 h-3 mr-1" />Ver
                          </Link>
                        </Button>
                      )}
                      {!p.completo && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => sortearIndividual(p.id, p.nome)}
                          disabled={sorteando === p.id}
                        >
                          {sorteando === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Dice5 className="w-3 h-3 mr-1" />}
                          Sortear
                        </Button>
                      )}
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/participantes/${p.id}/editar-palpites`}>Editar</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-display font-bold">Novo Palpite</h2>
              <p className="text-sm text-muted-foreground">
                Crie um grupo vazio para um participante que não preencheu a planilha. Ele poderá preencher os 72 jogos + extras pelo link.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Participante</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={participanteSelecionado}
                  onChange={(e) => setParticipanteSelecionado(e.target.value)}
                >
                  <option value="">Selecione um participante</option>
                  {elegiveis.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
                {elegiveis.length === 0 && (
                  <p className="text-xs text-muted-foreground">Todos os participantes já possuem palpites.</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Apelido (opcional)</label>
                <Input
                  placeholder="Palpite 1"
                  value={apelidoInput}
                  onChange={(e) => setApelidoInput(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
                <Button onClick={criarPalpite} disabled={criando || !participanteSelecionado}>
                  {criando ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</> : 'Criar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
