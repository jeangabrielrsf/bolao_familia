'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Flag } from '@/components/ui/flag'
import { Skeleton } from '@/components/ui/skeleton'
import { getTimeFlag } from '@/lib/utils/flags'
import { toast } from 'sonner'
import { Save, ChevronLeft, Calendar, Loader2 } from 'lucide-react'

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
  const [jogos, setJogos] = useState<JogoComPalpite[]>([])
  const [palpites, setPalpites] = useState<Map<string, { placarA: number; placarB: number }>>(new Map())
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [partRes, jogosRes] = await Promise.all([
          fetch(`/api/participantes?id=${participanteId}`),
          fetch(`/api/completar/dummy/jogos`),
        ])

        if (!partRes.ok) {
          toast.error('Participante não encontrado')
          router.push('/admin/completar-bolao')
          return
        }

        const partData = await partRes.json()
        setParticipante({ id: partData.id, nome: partData.nome })

        if (jogosRes.ok) {
          const jogosData = await jogosRes.json()
          setJogos(jogosData.jogos)

          const map = new Map<string, { placarA: number; placarB: number }>()
          for (const j of jogosData.jogos) {
            if (j.palpite) map.set(j.id, j.palpite)
          }
          setPalpites(map)
        }
      } catch {
        toast.error('Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }

    if (participanteId) load()
  }, [participanteId, router])

  useEffect(() => {
    if (!participanteId) return

    fetch(`/api/admin/participantes/${participanteId}/palpites-restantes`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.jogos) {
          setJogos(data.jogos)
          const map = new Map<string, { placarA: number; placarB: number }>()
          for (const j of data.jogos) {
            if (j.palpite) map.set(j.id, j.palpite)
          }
          setPalpites(map)
        }
      })
      .catch(() => {})
  }, [participanteId])

  const atualizarPalpite = (jogoId: string, campo: 'placarA' | 'placarB', valor: string) => {
    const num = parseInt(valor) || 0
    const clamped = Math.max(0, Math.min(99, num))

    setPalpites((prev) => {
      const novo = new Map(prev)
      const atual = novo.get(jogoId) ?? { placarA: 0, placarB: 0 }
      novo.set(jogoId, { ...atual, [campo]: clamped })
      return novo
    })
  }

  const salvar = async () => {
    const palpitesArray = Array.from(palpites.entries()).map(([jogoId, placar]) => ({
      jogoId,
      placarA: placar.placarA,
      placarB: placar.placarB,
    }))

    if (palpitesArray.length === 0) {
      toast.error('Preencha pelo menos um palpite')
      return
    }

    setSalvando(true)
    try {
      const res = await fetch(`/api/admin/participantes/${participanteId}/palpites`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ palpites: palpitesArray }),
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

  const totalPreenchidos = palpites.size
  const totalJogos = jogos.length

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
        <Badge variant="info">{totalPreenchidos}/{totalJogos} preenchidos</Badge>
      </div>

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
                const palpiteAtual = palpites.get(jogo.id)

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
                            type="number"
                            min={0}
                            max={99}
                            value={palpiteAtual?.placarA ?? ''}
                            onChange={(e) => atualizarPalpite(jogo.id, 'placarA', e.target.value)}
                            className="w-14 h-10 text-center text-lg font-bold"
                            placeholder="-"
                          />
                          <span className="text-muted-foreground font-bold">×</span>
                          <Input
                            type="number"
                            min={0}
                            max={99}
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

      <div className="sticky bottom-4">
        <Button
          onClick={salvar}
          disabled={salvando || totalPreenchidos === 0}
          size="lg"
          className="w-full shadow-lg"
        >
          {salvando ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
          ) : (
            <><Save className="w-4 h-4" /> Salvar Palpites ({totalPreenchidos}/{totalJogos})</>
          )}
        </Button>
      </div>
    </div>
  )
}
