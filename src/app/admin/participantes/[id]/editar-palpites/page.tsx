'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Flag } from '@/components/ui/flag'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { getTimeFlag } from '@/lib/utils/flags'
import { formatarData, formatarHora } from '@/lib/utils/date'
import { toast } from 'sonner'
import { Save, ChevronLeft, Calendar, Loader2, AlertCircle, RotateCcw, CheckCircle, Award, Info } from 'lucide-react'
import { FASE_LABELS, FASES_MATA_MATA } from '@/lib/utils/constants'
import { PhaseSelector } from '@/components/public/phase-selector'
import { QuemPassaCard } from '@/components/public/quem-passa-card'

interface PalpiteGrupo {
  id: string
  nome: string
  apelido: string
}

interface JogoComPalpite {
  id: string
  grupo: string | null
  fase?: string
  dataHora: string
  timeA: string | null
  timeB: string | null
  cidade?: string
  palpite: { placarA: number; placarB: number; vencedorPalpite?: number | null } | null
}

interface Participante {
  id: string
  nome: string
}

interface PalpiteInput {
  placarA: string
  placarB: string
  vencedorPalpite?: number | null
}

interface ExtraInput {
  tipo: string
  valor: string
}

interface GrupoComModo extends PalpiteGrupo {
  modo: 'completo' | 'restante'
}

type PalpitesPorAba = Map<string, Map<string, PalpiteInput>>

const EXTRAS_LABELS: Record<string, string> = {
  artilheiro: 'Artilheiro',
  campeao: 'Campeão',
  vice: 'Vice',
  terceiro: '3º Lugar',
  quarto: '4º Lugar',
}

const EXTRAS_TIPOS = ['artilheiro', 'campeao', 'vice', 'terceiro', 'quarto'] as const

function getDraftKey(participanteId: string, grupoId: string, fase: string | null = null): string {
  if (fase) return `bolao_admin_draft_${participanteId}_${fase}`
  return `bolao_admin_draft_${participanteId}_${grupoId}`
}

function loadDraft(participanteId: string, grupoId: string, fase: string | null = null): Map<string, PalpiteInput> | null {
  if (typeof window === 'undefined') return null
  try {
    const key = getDraftKey(participanteId, grupoId, fase)
    const data = localStorage.getItem(key)
    if (!data) return null
    const parsed = JSON.parse(data) as Record<string, PalpiteInput>
    return new Map(Object.entries(parsed))
  } catch {
    return null
  }
}

function saveDraft(participanteId: string, grupoId: string, inputs: Map<string, PalpiteInput>, fase: string | null = null): void {
  if (typeof window === 'undefined') return
  try {
    const key = getDraftKey(participanteId, grupoId, fase)
    const data = Object.fromEntries(inputs)
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // ignore
  }
}

function clearDraft(participanteId: string, grupoId: string, fase: string | null = null): void {
  if (typeof window === 'undefined') return
  try {
    const key = getDraftKey(participanteId, grupoId, fase)
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

function inputsFromJogos(jogos: JogoComPalpite[]): Map<string, PalpiteInput> {
  const map = new Map<string, PalpiteInput>()
  for (const j of jogos) {
    if (j.palpite) {
      map.set(j.id, {
        placarA: String(j.palpite.placarA),
        placarB: String(j.palpite.placarB),
        vencedorPalpite: j.palpite.vencedorPalpite ?? null,
      })
    }
  }
  return map
}

function hasUnsavedChanges(inputs: Map<string, PalpiteInput>, original: Map<string, PalpiteInput>): boolean {
  if (inputs.size !== original.size) return true
  for (const [key, val] of inputs) {
    const orig = original.get(key)
    if (!orig) return true
    if (orig.placarA !== val.placarA || orig.placarB !== val.placarB) return true
  }
  return false
}

function countFilled(inputs: Map<string, PalpiteInput>): number {
  let count = 0
  for (const v of inputs.values()) {
    if (v.placarA !== '' && v.placarB !== '') count++
  }
  return count
}

function countExtrasFilled(extrasList: ExtraInput[]): number {
  return extrasList.filter((e) => e.valor.trim() !== '').length
}

function hasExtrasChanges(current: ExtraInput[], original: ExtraInput[]): boolean {
  if (current.length !== original.length) return true
  for (let i = 0; i < current.length; i++) {
    if (current[i].valor !== original[i].valor) return true
  }
  return false
}

export default function EditarPalpitesPage() {
  const params = useParams()
  const router = useRouter()
  const participanteId = params.id as string

  const [participante, setParticipante] = useState<Participante | null>(null)
  const [grupos, setGrupos] = useState<GrupoComModo[]>([])
  const [grupoAtivo, setGrupoAtivo] = useState<string | null>(null)
  const [jogos, setJogos] = useState<JogoComPalpite[]>([])
  const [todasAbas, setTodasAbas] = useState<PalpitesPorAba>(new Map())
  const [abasOriginais, setAbasOriginais] = useState<PalpitesPorAba>(new Map())
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const initializedRef = useRef(false)

  const [modo, setModo] = useState<'completo' | 'restante'>('restante')
  const [extras, setExtras] = useState<ExtraInput[]>([])
  const [extrasOriginais, setExtrasOriginais] = useState<ExtraInput[]>([])
  const [fase, setFase] = useState<string | null>(null)
  const [fasesHabilitadas, setFasesHabilitadas] = useState<Record<string, boolean>>({})
  const [mataMataJogos, setMataMataJogos] = useState<JogoComPalpite[]>([])
  const [mataMataInputs, setMataMataInputs] = useState<Map<string, PalpiteInput>>(new Map())
  const [mataMataOriginais, setMataMataOriginais] = useState<Map<string, PalpiteInput>>(new Map())
  const [carregandoFase, setCarregandoFase] = useState(false)

  const carregarJogosGrupo = useCallback(async (palpiteGrupoId: string) => {
    try {
      const res = await fetch(`/api/admin/participantes/${participanteId}/palpites-restantes?grupoId=${palpiteGrupoId}`)
      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    }
  }, [participanteId])

  const carregarDados = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/participantes/${participanteId}/palpites-restantes`)
      if (!res.ok) return

      const data = await res.json()

      if (data.grupos) {
        setGrupos(data.grupos)
        if (data.grupos.length > 0 && !grupoAtivo) {
          setGrupoAtivo(data.grupos[0].id)
        }
        const primeiroModo = data.grupos[0]?.modo ?? 'restante'
        setModo(primeiroModo)
      }

      setJogos(data.jogos)

      if (data.extras) {
        const extrasData = data.extras.map((e: ExtraInput) => ({ ...e }))
        setExtras(extrasData)
        setExtrasOriginais(extrasData.map((e: ExtraInput) => ({ ...e })))
      }

      const inputs = inputsFromJogos(data.jogos)
      const abaId = grupoAtivo ?? data.grupos?.[0]?.id

      if (abaId) {
        const draft = loadDraft(participanteId, abaId)
        const inputsComDraft = draft ?? inputs

        setTodasAbas((prev) => {
          const novo = new Map(prev)
          novo.set(abaId, inputsComDraft)
          return novo
        })
        setAbasOriginais((prev) => {
          const novo = new Map(prev)
          novo.set(abaId, inputs)
          return novo
        })
      }

      const todasFases: Record<string, boolean> = {}
      for (const f of FASES_MATA_MATA) {
        todasFases[f] = true
      }
      setFasesHabilitadas(todasFases)
    } catch {
      toast.error('Erro ao carregar jogos')
    } finally {
      setLoading(false)
    }
  }, [participanteId, grupoAtivo])

  useEffect(() => {
    async function load() {
      try {
        const partRes = await fetch(`/api/participantes?id=${participanteId}`)

        if (!partRes.ok) {
          toast.error('Participante não encontrado')
          router.push('/admin/completar-bolao')
          return
        }

        const partData = await partRes.json()
        setParticipante({ id: partData.id, nome: partData.nome })

        if (!initializedRef.current) {
          initializedRef.current = true
          await carregarDados()
        }
      } catch {
        toast.error('Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }

    if (participanteId) load()
  }, [participanteId, router, carregarDados])

  const trocarGrupo = (palpiteGrupoId: string) => {
    setGrupoAtivo(palpiteGrupoId)

    const grupoData = grupos.find((g) => g.id === palpiteGrupoId)
    if (grupoData?.modo) setModo(grupoData.modo)

    if (fase) {
      setCarregandoFase(true)
      fetch(`/api/admin/participantes/${participanteId}/palpites-restantes?fase=${fase}&grupoId=${palpiteGrupoId}`)
        .then((r) => r.json())
        .then((data) => {
          const jogosFase = data.jogos ?? []
          setMataMataJogos(jogosFase)
          const inputs = inputsFromJogos(jogosFase)
          const draft = loadDraft(participanteId, palpiteGrupoId, fase)
          const inputsComDraft = draft ?? inputs
          setMataMataInputs(inputsComDraft)
          setMataMataOriginais(inputs)
        })
        .catch(() => toast.error('Erro ao carregar jogos da fase'))
        .finally(() => setCarregandoFase(false))
    } else if (!todasAbas.has(palpiteGrupoId)) {
      carregarJogosGrupo(palpiteGrupoId).then((data) => {
        if (data?.jogos) {
          const inputs = inputsFromJogos(data.jogos)
          const draft = loadDraft(participanteId, palpiteGrupoId)
          const inputsComDraft = draft ?? inputs

          setTodasAbas((prev) => {
            const novo = new Map(prev)
            novo.set(palpiteGrupoId, inputsComDraft)
            return novo
          })
          setAbasOriginais((prev) => {
            const novo = new Map(prev)
            novo.set(palpiteGrupoId, inputs)
            return novo
          })

          if (data.extras) {
            const extrasData = data.extras.map((e: ExtraInput) => ({ ...e }))
            setExtras(extrasData)
            setExtrasOriginais(extrasData.map((e: ExtraInput) => ({ ...e })))
          }
        }
      })
    }
  }

  const trocarFase = async (novaFase: string | null) => {
    setFase(novaFase)
    if (novaFase) {
      setCarregandoFase(true)
      try {
        const res = await fetch(`/api/admin/participantes/${participanteId}/palpites-restantes?fase=${novaFase}&grupoId=${grupoAtivo ?? ''}`)
        const data = await res.json()
        const jogosFase = data.jogos ?? []
        setMataMataJogos(jogosFase)

        const inputs = inputsFromJogos(jogosFase)
        const draft = loadDraft(participanteId, grupoAtivo ?? '', novaFase)
        const inputsComDraft = draft ?? inputs
        setMataMataInputs(inputsComDraft)
        setMataMataOriginais(inputs)
      } catch {
        toast.error('Erro ao carregar jogos da fase')
      } finally {
        setCarregandoFase(false)
      }
    }
  }

  const atualizarPalpite = (jogoId: string, campo: 'placarA' | 'placarB', valor: string) => {
    if (!grupoAtivo) return

    const cleaned = valor.replace(/[^0-9]/g, '')
    const limited = cleaned.length > 2 ? cleaned.slice(0, 2) : cleaned

    setTodasAbas((prev) => {
      const novo = new Map(prev)
      const abaAtual = new Map(novo.get(grupoAtivo) ?? new Map())
      const atual = abaAtual.get(jogoId) ?? { placarA: '', placarB: '' }
      abaAtual.set(jogoId, { ...atual, [campo]: limited })
      novo.set(grupoAtivo, abaAtual)

      saveDraft(participanteId, grupoAtivo, abaAtual)
      return novo
    })
  }

  const atualizarMataMata = (jogoId: string, campo: 'placarA' | 'placarB', valor: string) => {
    const cleaned = valor.replace(/[^0-9]/g, '')
    const limited = cleaned.length > 2 ? cleaned.slice(0, 2) : cleaned

    setMataMataInputs((prev) => {
      const novo = new Map(prev)
      const atual = novo.get(jogoId) ?? { placarA: '', placarB: '' }
      novo.set(jogoId, { ...atual, [campo]: limited })
      saveDraft(participanteId, grupoAtivo ?? '', novo, fase)
      return novo
    })
  }

  const atualizarVencedorPalpite = (jogoId: string, vencedor: number) => {
    setMataMataInputs((prev) => {
      const novo = new Map(prev)
      const atual = novo.get(jogoId) ?? { placarA: '', placarB: '' }
      novo.set(jogoId, { ...atual, vencedorPalpite: atual.vencedorPalpite === vencedor ? null : vencedor })
      saveDraft(participanteId, grupoAtivo ?? '', novo, fase)
      return novo
    })
  }

  const descartarAlteracoes = () => {
    if (!grupoAtivo) return

    if (fase) {
      setMataMataInputs(new Map(mataMataOriginais))
      clearDraft(participanteId, grupoAtivo, fase)
    } else {
      const original = abasOriginais.get(grupoAtivo) ?? new Map()
      setTodasAbas((prev) => {
        const novo = new Map(prev)
        novo.set(grupoAtivo, new Map(original))
        return novo
      })
      setExtrasOriginais(extras.map((e) => ({ ...e })))
      clearDraft(participanteId, grupoAtivo)
    }
    toast.success('Alterações descartadas')
  }

  const salvar = async () => {
    if (!grupoAtivo) return

    if (fase) {
      const palpitesArray: { jogoId: string; placarA: number; placarB: number; vencedorPalpite: number | null }[] = []
      for (const [jogoId, placar] of mataMataInputs.entries()) {
        if (placar.placarA !== '' && placar.placarB !== '') {
          const pA = parseInt(placar.placarA)
          const pB = parseInt(placar.placarB)
          const isDraw = pA === pB
          if (isDraw && !placar.vencedorPalpite) {
            toast.error('Para empates, selecione quem passa')
            return
          }
          palpitesArray.push({
            jogoId,
            placarA: pA,
            placarB: pB,
            vencedorPalpite: isDraw ? placar.vencedorPalpite ?? null : null,
          })
        }
      }
      if (palpitesArray.length === 0) {
        toast.error('Preencha pelo menos um palpite')
        return
      }
      setSalvando(true)
      try {
        const res = await fetch(`/api/admin/participantes/${participanteId}/palpites`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ palpites: palpitesArray, fase, palpiteGrupoId: grupoAtivo }),
        })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error || 'Erro ao salvar'); return }
        setMataMataOriginais(new Map(mataMataInputs))
        clearDraft(participanteId, grupoAtivo, fase)
        toast.success(`Palpites salvos! (${data.totalSalvos} jogos)`)
      } catch { toast.error('Erro ao salvar') }
      finally { setSalvando(false) }
      return
    }

    const inputs = todasAbas.get(grupoAtivo) ?? new Map()
    const palpitesArray: { jogoId: string; placarA: number; placarB: number }[] = []
    for (const [jogoId, placar] of inputs.entries()) {
      if (placar.placarA !== '' && placar.placarB !== '') {
        palpitesArray.push({
          jogoId,
          placarA: parseInt(placar.placarA),
          placarB: parseInt(placar.placarB),
        })
      }
    }

    if (palpitesArray.length === 0) {
      toast.error('Preencha pelo menos um palpite completo (ambos os times)')
      return
    }

    if (modo === 'completo') {
      const extrasVazios = extras.filter((e) => !e.valor.trim())
      if (extrasVazios.length > 0) {
        toast.error('Preencha todos os palpites extras')
        return
      }
    }

    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        palpites: palpitesArray,
        palpiteGrupoId: grupoAtivo,
      }

      if (modo === 'completo') {
        body.extras = extras
      }

      const res = await fetch(`/api/admin/participantes/${participanteId}/palpites`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Erro ao salvar palpites')
        return
      }

      const novoOriginal = new Map(inputs)
      setAbasOriginais((prev) => {
        const novo = new Map(prev)
        novo.set(grupoAtivo, novoOriginal)
        return novo
      })
      setExtrasOriginais(extras.map((e) => ({ ...e })))
      clearDraft(participanteId, grupoAtivo)
      toast.success(`Palpites salvos! (${data.totalSalvos} jogos)`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      toast.error('Erro ao salvar palpites')
    } finally {
      setSalvando(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/completar-bolao"><ChevronLeft className="w-4 h-4" /> Voltar</Link>
        </Button>
        <Skeleton className="h-8 w-64" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    )
  }

  const jogosComGrupo = new Map<string, JogoComPalpite[]>()
  for (const jogo of jogos) {
    const grupo = jogo.grupo ?? '?'
    if (!jogosComGrupo.has(grupo)) jogosComGrupo.set(grupo, [])
    jogosComGrupo.get(grupo)!.push(jogo)
  }
  const gruposOrdenados = Array.from(jogosComGrupo.keys()).sort()

  const inputsAtuais = todasAbas.get(grupoAtivo ?? '') ?? new Map()
  const inputsOriginais = abasOriginais.get(grupoAtivo ?? '') ?? new Map()
  const totalPreenchidos = countFilled(inputsAtuais)
  const totalJogos = jogos.length
  const temAlteracoesJogos = hasUnsavedChanges(inputsAtuais, inputsOriginais)
  const temAlteracoesExtras = modo === 'completo' ? hasExtrasChanges(extras, extrasOriginais) : false
  const temAlteracoesGrupos = temAlteracoesJogos || temAlteracoesExtras
  const extrasPreenchidos = modo === 'completo' ? countExtrasFilled(extras) : 0
  const estaCompletoGrupos = totalPreenchidos === totalJogos
    && (modo === 'restante' || extrasPreenchidos === 5)
    && !temAlteracoesGrupos

  const grupoAtualNome = grupos.find((g) => g.id === grupoAtivo)?.apelido ?? ''

  const abaComAlteracoes = (abaId: string): boolean => {
    const abaInputs = todasAbas.get(abaId) ?? new Map()
    const abaOriginal = abasOriginais.get(abaId) ?? new Map()
    return hasUnsavedChanges(abaInputs, abaOriginal)
  }

  const faseLabel = fase ? FASE_LABELS[fase] ?? fase : null
  const mataMataPreenchidos = countFilled(mataMataInputs)
  const mataMataTotal = mataMataJogos.length
  const mataMataCompleto = mataMataPreenchidos === mataMataTotal && !hasUnsavedChanges(mataMataInputs, mataMataOriginais)
  const temAlteracoes = fase ? hasUnsavedChanges(mataMataInputs, mataMataOriginais) : temAlteracoesGrupos

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin/completar-bolao"><ChevronLeft className="w-4 h-4" /> Voltar</Link>
      </Button>

      <div className="space-y-2">
        <h1 className="text-3xl font-display tracking-wide">Editar Palpites</h1>
        <p className="text-muted-foreground">
          Editando palpites de <span className="font-semibold text-foreground">{participante?.nome}</span>
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {!fase && (
            modo === 'completo' ? (
              <Badge variant="info">{totalPreenchidos}/{totalJogos} jogos + {extrasPreenchidos}/5 extras</Badge>
            ) : (
              <Badge variant="info">{totalPreenchidos}/{totalJogos} preenchidos</Badge>
            )
          )}
          {temAlteracoes && (
            <Badge variant="warning">
              <AlertCircle className="w-3 h-3 mr-1" />
              Não salvo
            </Badge>
          )}
          {(fase ? mataMataCompleto : estaCompletoGrupos) && (
            <Badge variant="success">
              <CheckCircle className="w-3 h-3 mr-1" />
              Palpites computados
            </Badge>
          )}
        </div>
      </div>

      {fase && (
        <Card className="bg-muted/50 border-muted">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="space-y-2">
                <p className="font-medium text-sm">Como preencher:</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Coloque o placar final de cada jogo.</li>
                  <li>Se o placar for empate, aparecem dois botões com as bandeiras — toque no time que você acha que passa.</li>
                  <li>Quando todos os jogos estiverem preenchidos, toque em Salvar.</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {fase && (
        <Card className="bg-muted/50 border-muted">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Award className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="space-y-2">
                <p className="font-medium text-sm">Pontuação do Mata-Mata</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Placar exato — 10 pts</p>
                  <p>Acertar vencedor (sem cravar placar) — 6 pts</p>
                  <div className="border-b border-border my-2" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Se arriscar o empate
                  </p>
                  <p>Acertar o empate — 6 pts</p>
                  <p className="pl-4 text-xs text-muted-foreground/70">
                    (cravar o placar = 10 pts)
                  </p>
                  <p>
                    + Acertar quem passa nos pênaltis —{' '}
                    <span className="font-semibold text-success">+6 pts</span>
                  </p>
                  <p className="font-semibold text-sm text-foreground border-t border-border pt-2 mt-2">
                    Máximo por jogo: 16 pts
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {temAlteracoes && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={descartarAlteracoes}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Descartar alterações
          </Button>
        </div>
      )}

      {grupos.length > 1 && !fase && (
        <Tabs value={grupoAtivo ?? ''} onValueChange={trocarGrupo}>
          <TabsList className="w-full flex-wrap h-auto">
            {grupos.map((g) => (
              <TabsTrigger key={g.id} value={g.id} className="relative">
                {g.apelido}
                {abaComAlteracoes(g.id) && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          {grupos.map((g) => (
            <TabsContent key={g.id} value={g.id}>
              {carregandoFase ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : (
                <JogosLista
                  jogos={jogos}
                  jogosComGrupo={jogosComGrupo}
                  gruposOrdenados={gruposOrdenados}
                  inputs={todasAbas.get(g.id) ?? new Map()}
                  atualizarPalpite={atualizarPalpite}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      <PhaseSelector
        fasesHabilitadas={fasesHabilitadas}
        faseAtual={fase}
        onFaseChange={trocarFase}
      />

      {grupos.length <= 1 && !fase && (
        carregandoFase ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <JogosLista
            jogos={jogos}
            jogosComGrupo={jogosComGrupo}
            gruposOrdenados={gruposOrdenados}
            inputs={inputsAtuais}
            atualizarPalpite={atualizarPalpite}
          />
        )
      )}

      {fase && (
        <>
          {carregandoFase ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <MataMataJogosLista
              jogos={mataMataJogos}
              inputs={mataMataInputs}
              atualizarPalpite={atualizarMataMata}
              atualizarVencedor={atualizarVencedorPalpite}
            />
          )}
        </>
      )}

      {!fase && modo === 'completo' && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <h2 className="text-lg font-semibold">Palpites Extras</h2>
            <div className="space-y-3">
              {EXTRAS_TIPOS.map((tipo) => {
                const extra = extras.find((e) => e.tipo === tipo)
                return (
                  <div key={tipo} className="flex items-center gap-3">
                    <label className="text-sm font-medium w-28 shrink-0">{EXTRAS_LABELS[tipo]}</label>
                    <Input
                      value={extra?.valor ?? ''}
                      onChange={(e) => {
                        setExtras((prev) => {
                          const exists = prev.find((ex) => ex.tipo === tipo)
                          if (exists) {
                            return prev.map((ex) => ex.tipo === tipo ? { ...ex, valor: e.target.value } : ex)
                          }
                          return [...prev, { tipo, valor: e.target.value }]
                        })
                      }}
                      placeholder={`Digite o ${EXTRAS_LABELS[tipo].toLowerCase()}`}
                      className="flex-1"
                    />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="sticky bottom-4">
        <Button
          onClick={salvar}
          disabled={salvando || (fase ? countFilled(mataMataInputs) !== mataMataJogos.length : totalPreenchidos !== totalJogos || (modo === 'completo' && extrasPreenchidos !== 5))}
          size="lg"
          className="w-full shadow-lg"
        >
          {salvando ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
          ) : fase ? (
            <>
              <Save className="w-4 h-4" />
              Salvar {faseLabel} ({countFilled(mataMataInputs)}/{mataMataJogos.length})
            </>
          ) : modo === 'completo' ? (
            <>
              <Save className="w-4 h-4" />
              Salvar{grupoAtualNome ? ` ${grupoAtualNome}` : ''} ({totalPreenchidos}/{totalJogos} jogos + {extrasPreenchidos}/5 extras)
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Salvar{grupoAtualNome ? ` ${grupoAtualNome}` : ''} ({totalPreenchidos}/{totalJogos})
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

function JogosLista({
  jogos,
  jogosComGrupo,
  gruposOrdenados,
  inputs,
  atualizarPalpite,
}: {
  jogos: JogoComPalpite[]
  jogosComGrupo: Map<string, JogoComPalpite[]>
  gruposOrdenados: string[]
  inputs: Map<string, PalpiteInput>
  atualizarPalpite: (jogoId: string, campo: 'placarA' | 'placarB', valor: string) => void
}) {
  if (jogos.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <p className="text-muted-foreground">Nenhum jogo encontrado.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {gruposOrdenados.map((grupo) => {
        const jogosDoGrupo = jogosComGrupo.get(grupo)!
        return (
          <section key={grupo} className="space-y-3">
            <h2 className="text-lg font-semibold">Grupo {grupo}</h2>
            <div className="space-y-2">
              {jogosDoGrupo.map((jogo) => {
                const dataHora = new Date(jogo.dataHora)
                const dataFormatada = formatarData(dataHora)
                const horaFormatada = formatarHora(dataHora)
                const palpiteAtual = inputs.get(jogo.id)

                return (
                  <Card key={jogo.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {dataFormatada} · {horaFormatada}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 flex items-center justify-end gap-2">
                          {jogo.timeA && getTimeFlag(jogo.timeA) && <Flag codigoIso={getTimeFlag(jogo.timeA)!} size={20} />}
                          <span className="font-display text-base tracking-wide text-right">{jogo.timeA}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={palpiteAtual?.placarA ?? ''}
                            onChange={(e) => atualizarPalpite(jogo.id, 'placarA', e.target.value)}
                            className="w-14 h-10 text-center text-lg font-bold"
                            placeholder="-"
                          />
                          <span className="text-muted-foreground font-bold">×</span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={palpiteAtual?.placarB ?? ''}
                            onChange={(e) => atualizarPalpite(jogo.id, 'placarB', e.target.value)}
                            className="w-14 h-10 text-center text-lg font-bold"
                            placeholder="-"
                          />
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <span className="font-display text-base tracking-wide">{jogo.timeB}</span>
                          {jogo.timeB && getTimeFlag(jogo.timeB) && <Flag codigoIso={getTimeFlag(jogo.timeB)!} size={20} />}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function MataMataJogosLista({
  jogos,
  inputs,
  atualizarPalpite,
  atualizarVencedor,
}: {
  jogos: JogoComPalpite[]
  inputs: Map<string, PalpiteInput>
  atualizarPalpite: (jogoId: string, campo: 'placarA' | 'placarB', valor: string) => void
  atualizarVencedor: (jogoId: string, vencedor: number) => void
}) {
  if (jogos.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <p className="text-muted-foreground">Nenhum jogo disponível para esta fase.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {jogos.map((jogo) => {
        const dataHora = new Date(jogo.dataHora)
        const dataFormatada = formatarData(dataHora)
        const horaFormatada = formatarHora(dataHora)
        const palpiteAtual = inputs.get(jogo.id)
        const pA = palpiteAtual?.placarA !== '' && palpiteAtual?.placarA !== undefined ? parseInt(palpiteAtual.placarA) : null
        const pB = palpiteAtual?.placarB !== '' && palpiteAtual?.placarB !== undefined ? parseInt(palpiteAtual.placarB) : null
        const isDraw = pA !== null && pB !== null && pA === pB

        return (
          <Card key={jogo.id} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {dataFormatada} · {horaFormatada}
                  {jogo.cidade && <span className="ml-1">· {jogo.cidade}</span>}
                </div>
              </div>
              {jogo.timeA && jogo.timeB ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 flex items-center justify-end gap-2">
                      {getTimeFlag(jogo.timeA) && <Flag codigoIso={getTimeFlag(jogo.timeA)!} size={20} />}
                      <span className="font-display text-base tracking-wide text-right">{jogo.timeA}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={palpiteAtual?.placarA ?? ''}
                        onChange={(e) => atualizarPalpite(jogo.id, 'placarA', e.target.value)}
                        className="w-14 h-10 text-center text-lg font-bold"
                        placeholder="-"
                      />
                      <span className="text-muted-foreground font-bold">×</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={palpiteAtual?.placarB ?? ''}
                        onChange={(e) => atualizarPalpite(jogo.id, 'placarB', e.target.value)}
                        className="w-14 h-10 text-center text-lg font-bold"
                        placeholder="-"
                      />
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <span className="font-display text-base tracking-wide">{jogo.timeB}</span>
                      {getTimeFlag(jogo.timeB) && <Flag codigoIso={getTimeFlag(jogo.timeB)!} size={20} />}
                    </div>
                  </div>
                  {isDraw && (
                    <QuemPassaCard
                      timeA={jogo.timeA}
                      timeB={jogo.timeB}
                      selecionado={palpiteAtual?.vencedorPalpite ?? null}
                      onSelecionar={(v) => atualizarVencedor(jogo.id, v)}
                    />
                  )}
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Times a definir
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
