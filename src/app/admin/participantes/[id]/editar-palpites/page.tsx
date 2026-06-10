'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { toast } from 'sonner'
import { Save, ChevronLeft, Calendar, Loader2 } from 'lucide-react'

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

interface Participante {
  id: string
  nome: string
}

export default function EditarPalpitesPage() {
  const params = useParams()
  const router = useRouter()
  const participanteId = params.id as string

  const [participante, setParticipante] = useState<Participante | null>(null)
  const [grupos, setGrupos] = useState<PalpiteGrupo[]>([])
  const [grupoAtivo, setGrupoAtivo] = useState<string | null>(null)
  const [jogos, setJogos] = useState<JogoComPalpite[]>([])
  const [inputs, setInputs] = useState<Map<string, { placarA: string; placarB: string }>>(new Map())
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const carregarJogos = useCallback(async (palpiteGrupoId?: string) => {
    try {
      const url = palpiteGrupoId
        ? `/api/admin/participantes/${participanteId}/palpites-restantes?grupoId=${palpiteGrupoId}`
        : `/api/admin/participantes/${participanteId}/palpites-restantes`

      const res = await fetch(url)
      if (!res.ok) return

      const data = await res.json()

      if (data.grupos) {
        setGrupos(data.grupos)
        if (data.grupos.length > 0 && !palpiteGrupoId) {
          setGrupoAtivo(data.grupos[0].id)
        }
      }

      setJogos(data.jogos)
      const map = new Map<string, { placarA: string; placarB: string }>()
      for (const j of data.jogos) {
        if (j.palpite) {
          map.set(j.id, { placarA: String(j.palpite.placarA), placarB: String(j.palpite.placarB) })
        }
      }
      setInputs(map)
      setSalvando(false)
    } catch {
      toast.error('Erro ao carregar jogos')
    }
  }, [participanteId])

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

        await carregarJogos()
      } catch {
        toast.error('Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }

    if (participanteId) load()
  }, [participanteId, router, carregarJogos])

  const trocarGrupo = (palpiteGrupoId: string) => {
    setGrupoAtivo(palpiteGrupoId)
    carregarJogos(palpiteGrupoId)
  }

  const atualizarPalpite = (jogoId: string, campo: 'placarA' | 'placarB', valor: string) => {
    const cleaned = valor.replace(/[^0-9]/g, '')
    const limited = cleaned.length > 2 ? cleaned.slice(0, 2) : cleaned

    setInputs((prev) => {
      const novo = new Map(prev)
      const atual = novo.get(jogoId) ?? { placarA: '', placarB: '' }
      novo.set(jogoId, { ...atual, [campo]: limited })
      return novo
    })
  }

  const salvar = async () => {
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

    setSalvando(true)
    try {
      const res = await fetch(`/api/admin/participantes/${participanteId}/palpites`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          palpites: palpitesArray,
          palpiteGrupoId: grupoAtivo,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Erro ao salvar palpites')
        return
      }

      toast.success(`Palpites salvos! (${data.totalSalvos} jogos)`)
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

  const totalPreenchidos = Array.from(inputs.values()).filter(
    (v) => v.placarA !== '' && v.placarB !== ''
  ).length
  const totalJogos = jogos.length

  const grupoAtualNome = grupos.find((g) => g.id === grupoAtivo)?.apelido ?? ''

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
        <div className="flex items-center gap-2">
          <Badge variant="info">{totalPreenchidos}/{totalJogos} preenchidos</Badge>
        </div>
      </div>

      {grupos.length > 1 && (
        <Tabs value={grupoAtivo ?? ''} onValueChange={trocarGrupo}>
          <TabsList className="w-full flex-wrap h-auto">
            {grupos.map((g) => (
              <TabsTrigger key={g.id} value={g.id}>
                {g.apelido}
              </TabsTrigger>
            ))}
          </TabsList>
          {grupos.map((g) => (
            <TabsContent key={g.id} value={g.id}>
              <JogosLista
                jogos={jogos}
                jogosComGrupo={jogosComGrupo}
                gruposOrdenados={gruposOrdenados}
                inputs={inputs}
                atualizarPalpite={atualizarPalpite}
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
          inputs={inputs}
          atualizarPalpite={atualizarPalpite}
        />
      )}

      <div className="sticky bottom-4">
        <Button
          onClick={salvar}
          disabled={salvando || totalPreenchidos !== totalJogos}
          size="lg"
          className="w-full shadow-lg"
        >
          {salvando ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
          ) : (
            <><Save className="w-4 h-4" /> Salvar{grupoAtualNome ? ` ${grupoAtualNome}` : ''} ({totalPreenchidos}/{totalJogos})</>
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
  inputs: Map<string, { placarA: string; placarB: string }>
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
