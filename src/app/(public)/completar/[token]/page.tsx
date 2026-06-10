'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Flag } from '@/components/ui/flag'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { getTimeFlag } from '@/lib/utils/flags'
import { toast } from 'sonner'
import { Save, XCircle, Calendar, Lock, AlertCircle, RotateCcw, CheckCircle } from 'lucide-react'

interface TokenInfo {
  valido: boolean
  participanteId?: string
  nome?: string
  fotoUrl?: string | null
  prazo?: string
  habilitado?: boolean
  erro?: string
}

interface PalpiteGrupo {
  id: string
  nome: string
  apelido: string
}

interface JogoComPalpite {
  id: string
  grupo: string | null
  dataHora: string
  timeA: string
  timeB: string
  palpite: { placarA: number; placarB: number } | null
}

interface PalpiteInput {
  placarA: string
  placarB: string
}

interface ExtraInput {
  tipo: string
  valor: string
}

interface GrupoComModo extends PalpiteGrupo {
  modo: 'completo' | 'restante'
}

type Status = 'loading' | 'invalido' | 'prazo_encerrado' | 'desabilitado' | 'pronto'
type PalpitesPorAba = Map<string, Map<string, PalpiteInput>>

function getDraftKey(token: string, grupoId: string): string {
  return `bolao_draft_${token}_${grupoId}`
}

function loadDraft(token: string, grupoId: string): Map<string, PalpiteInput> | null {
  if (typeof window === 'undefined') return null
  try {
    const key = getDraftKey(token, grupoId)
    const data = localStorage.getItem(key)
    if (!data) return null
    const parsed = JSON.parse(data) as Record<string, PalpiteInput>
    return new Map(Object.entries(parsed))
  } catch {
    return null
  }
}

function saveDraft(token: string, grupoId: string, inputs: Map<string, PalpiteInput>): void {
  if (typeof window === 'undefined') return
  try {
    const key = getDraftKey(token, grupoId)
    const data = Object.fromEntries(inputs)
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // localStorage cheio ou indisponível
  }
}

function clearDraft(token: string, grupoId: string): void {
  if (typeof window === 'undefined') return
  try {
    const key = getDraftKey(token, grupoId)
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

function inputsFromJogos(jogos: JogoComPalpite[]): Map<string, PalpiteInput> {
  const map = new Map<string, PalpiteInput>()
  for (const j of jogos) {
    if (j.palpite) {
      map.set(j.id, { placarA: String(j.palpite.placarA), placarB: String(j.palpite.placarB) })
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

const EXTRAS_LABELS: Record<string, string> = {
  artilheiro: 'Artilheiro',
  campeao: 'Campeão',
  vice: 'Vice',
  terceiro: '3º Lugar',
  quarto: '4º Lugar',
}

const EXTRAS_TIPOS = ['artilheiro', 'campeao', 'vice', 'terceiro', 'quarto'] as const

export default function CompletarBolaoPage() {
  const params = useParams()
  const token = params.token as string

  const [status, setStatus] = useState<Status>('loading')
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [grupos, setGrupos] = useState<PalpiteGrupo[]>([])
  const [grupoAtivo, setGrupoAtivo] = useState<string | null>(null)
  const [jogos, setJogos] = useState<JogoComPalpite[]>([])
  const [todasAbas, setTodasAbas] = useState<PalpitesPorAba>(new Map())
  const [abasOriginais, setAbasOriginais] = useState<PalpitesPorAba>(new Map())
  const [salvando, setSalvando] = useState(false)
  const [carregandoInicial, setCarregandoInicial] = useState(true)
  const initializedRef = useRef(false)
  const [modo, setModo] = useState<'completo' | 'restante'>('restante')
  const [extras, setExtras] = useState<ExtraInput[]>([])
  const [extrasOriginais, setExtrasOriginais] = useState<ExtraInput[]>([])

  const carregarDados = useCallback(async () => {
    try {
      const res = await fetch(`/api/completar/${token}/jogos`)
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
        const draft = loadDraft(token, abaId)
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
    } catch {
      toast.error('Erro ao carregar jogos')
    } finally {
      setCarregandoInicial(false)
    }
  }, [token, grupoAtivo])

  useEffect(() => {
    if (!token || initializedRef.current) return

    fetch(`/api/token/${token}`)
      .then((r) => r.json())
      .then((info: TokenInfo) => {
        setTokenInfo(info)

        if (!info.valido) {
          setStatus('invalido')
          return
        }

        if (!info.habilitado) {
          setStatus('desabilitado')
          return
        }

        if (info.prazo && new Date() > new Date(info.prazo)) {
          setStatus('prazo_encerrado')
          return
        }

        setStatus('pronto')
        initializedRef.current = true
        carregarDados()
      })
      .catch(() => {
        setStatus('invalido')
      })
  }, [token, carregarDados])

  const trocarGrupo = (palpiteGrupoId: string) => {
    setGrupoAtivo(palpiteGrupoId)

    const grupoData = grupos.find((g) => g.id === palpiteGrupoId) as GrupoComModo | undefined
    if (grupoData?.modo) setModo(grupoData.modo)

    if (!todasAbas.has(palpiteGrupoId)) {
      fetch(`/api/completar/${token}/jogos?grupoId=${palpiteGrupoId}`)
        .then((r) => r.json())
        .then((data) => {
          const inputs = inputsFromJogos(data.jogos)
          const draft = loadDraft(token, palpiteGrupoId)
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
        })
        .catch(() => toast.error('Erro ao carregar jogos'))
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

      saveDraft(token, grupoAtivo, abaAtual)
      return novo
    })
  }

  const descartarAlteracoes = () => {
    if (!grupoAtivo) return

    const original = abasOriginais.get(grupoAtivo) ?? new Map()
    setTodasAbas((prev) => {
      const novo = new Map(prev)
      novo.set(grupoAtivo, new Map(original))
      return novo
    })
    clearDraft(token, grupoAtivo)
    toast.success('Alterações descartadas')
  }

  const salvar = async () => {
    if (!token || !grupoAtivo) return

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

      const res = await fetch(`/api/completar/${token}`, {
        method: 'POST',
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
      clearDraft(token, grupoAtivo)
      toast.success(`Palpites salvos com sucesso! (${data.totalSalvos} jogos)`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      toast.error('Erro ao salvar palpites')
    } finally {
      setSalvando(false)
    }
  }

  if (status === 'loading' || carregandoInicial) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (status === 'invalido') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="border-danger/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <XCircle className="w-16 h-16 text-danger mb-4" />
            <h2 className="text-2xl font-display font-bold mb-2">Link inválido</h2>
            <p className="text-muted-foreground">
              Este link não é válido ou expirou. Entre em contato com o admin do bolão.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'desabilitado') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="border-warning/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Lock className="w-16 h-16 text-warning mb-4" />
            <h2 className="text-2xl font-display font-bold mb-2">Coleta desabilitada</h2>
            <p className="text-muted-foreground">
              A coleta de palpites está desabilitada no momento. Entre em contato com o admin.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'prazo_encerrado') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="border-warning/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Lock className="w-16 h-16 text-warning mb-4" />
            <h2 className="text-2xl font-display font-bold mb-2">Prazo encerrado</h2>
            <p className="text-muted-foreground">
              O prazo para completar o bolão já foi encerrado. Entre em contato com o admin para desbloquear.
            </p>
          </CardContent>
        </Card>
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
  const temAlteracoes = temAlteracoesJogos || temAlteracoesExtras
  const extrasPreenchidos = modo === 'completo' ? countExtrasFilled(extras) : 0
  const estaCompleto = totalPreenchidos === totalJogos
    && (modo === 'restante' || extrasPreenchidos === 5)
    && !temAlteracoes

  const grupoAtualNome = grupos.find((g) => g.id === grupoAtivo)?.apelido ?? ''

  const abaComAlteracoes = (abaId: string): boolean => {
    const abaInputs = todasAbas.get(abaId) ?? new Map()
    const abaOriginal = abasOriginais.get(abaId) ?? new Map()
    return hasUnsavedChanges(abaInputs, abaOriginal)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-display tracking-wide">Complete seu Bolão</h1>
        <p className="text-muted-foreground">
          Olá, <span className="font-semibold text-foreground">{tokenInfo?.nome}</span>!{' '}
          {modo === 'completo'
            ? `Preencha seus palpites para os ${totalJogos} jogos da fase de grupos e os 5 extras.`
            : `Preencha seus palpites para os ${totalJogos} jogos restantes.`}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {modo === 'completo' ? (
            <Badge variant="info">{totalPreenchidos}/{totalJogos} jogos + {extrasPreenchidos}/5 extras</Badge>
          ) : (
            <Badge variant="info">{totalPreenchidos}/{totalJogos} preenchidos</Badge>
          )}
          {temAlteracoes && (
            <Badge variant="warning">
              <AlertCircle className="w-3 h-3 mr-1" />
              Não salvo
            </Badge>
          )}
          {estaCompleto && (
            <Badge variant="success">
              <CheckCircle className="w-3 h-3 mr-1" />
              Palpites computados
            </Badge>
          )}
        </div>
      </div>

      {estaCompleto && (
        <Card className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium text-green-900 dark:text-green-100">
                  Seus palpites foram computados com sucesso!
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Caso precise alterar, entre em contato com o administrador do bolão.
                </p>
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

      {grupos.length > 1 && (
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
              <JogosLista
                jogos={jogos}
                jogosComGrupo={jogosComGrupo}
                gruposOrdenados={gruposOrdenados}
                inputs={todasAbas.get(g.id) ?? new Map()}
                atualizarPalpite={atualizarPalpite}
                desabilitado={estaCompleto}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}

      {grupos.length <= 1 && (
        <JogosLista
          jogos={jogos}
          jogosComGrupo={jogosComGrupo}
          gruposOrdenados={gruposOrdenados}
          inputs={inputsAtuais}
          atualizarPalpite={atualizarPalpite}
          desabilitado={estaCompleto}
        />
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

      {modo === 'completo' && (
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
                      disabled={estaCompleto}
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

      {!estaCompleto && (
        <div className="sticky bottom-4">
          <Button
            onClick={salvar}
            disabled={salvando || totalPreenchidos !== totalJogos || (modo === 'completo' && extrasPreenchidos !== 5)}
            size="lg"
            className="w-full shadow-lg"
          >
            {salvando ? (
              'Salvando...'
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
      )}
    </div>
  )
}

function JogosLista({
  jogos,
  jogosComGrupo,
  gruposOrdenados,
  inputs,
  atualizarPalpite,
  desabilitado = false,
}: {
  jogos: JogoComPalpite[]
  jogosComGrupo: Map<string, JogoComPalpite[]>
  gruposOrdenados: string[]
  inputs: Map<string, PalpiteInput>
  atualizarPalpite: (jogoId: string, campo: 'placarA' | 'placarB', valor: string) => void
  desabilitado?: boolean
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
                const dataFormatada = dataHora.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                const horaFormatada = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
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
                            disabled={desabilitado}
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
                            disabled={desabilitado}
                            className="w-14 h-10 text-center text-lg font-bold"
                            placeholder="-"
                          />
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <span className="font-display text-base tracking-wide">{jogo.timeB}</span>
                          {getTimeFlag(jogo.timeB) && <Flag codigoIso={getTimeFlag(jogo.timeB)!} size={20} />}
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
