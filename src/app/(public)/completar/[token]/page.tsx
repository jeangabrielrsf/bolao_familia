'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Flag } from '@/components/ui/flag'
import { Skeleton } from '@/components/ui/skeleton'
import { getTimeFlag } from '@/lib/utils/flags'
import { toast } from 'sonner'
import { Save, CheckCircle, XCircle, Calendar, Lock } from 'lucide-react'

interface TokenInfo {
  valido: boolean
  participanteId?: string
  nome?: string
  fotoUrl?: string | null
  prazo?: string
  habilitado?: boolean
  erro?: string
}

interface JogoComPalpite {
  id: string
  grupo: string | null
  dataHora: string
  timeA: string
  timeB: string
  palpite: { placarA: number; placarB: number } | null
}

type Status = 'loading' | 'invalido' | 'prazo_encerrado' | 'desabilitado' | 'pronto'

export default function CompletarBolaoPage() {
  const params = useParams()
  const token = params.token as string

  const [status, setStatus] = useState<Status>('loading')
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [jogos, setJogos] = useState<JogoComPalpite[]>([])
  const [inputs, setInputs] = useState<Map<string, { placarA: string; placarB: string }>>(new Map())
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  useEffect(() => {
    if (!token) return

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

        fetch(`/api/completar/${token}/jogos`)
          .then((r) => r.json())
          .then((data: { jogos: JogoComPalpite[] }) => {
            setJogos(data.jogos)
            const map = new Map<string, { placarA: string; placarB: string }>()
            for (const j of data.jogos) {
              if (j.palpite) {
                map.set(j.id, { placarA: String(j.palpite.placarA), placarB: String(j.palpite.placarB) })
              }
            }
            setInputs(map)
          })
          .catch(() => toast.error('Erro ao carregar jogos'))
      })
      .catch(() => {
        setStatus('invalido')
      })
  }, [token])

  const atualizarPalpite = (jogoId: string, campo: 'placarA' | 'placarB', valor: string) => {
    const cleaned = valor.replace(/[^0-9]/g, '')
    const limited = cleaned.length > 2 ? cleaned.slice(0, 2) : cleaned

    setInputs((prev) => {
      const novo = new Map(prev)
      const atual = novo.get(jogoId) ?? { placarA: '', placarB: '' }
      novo.set(jogoId, { ...atual, [campo]: limited })
      return novo
    })
    setSalvo(false)
  }

  const salvar = async () => {
    if (!token) return

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
      const res = await fetch(`/api/completar/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ palpites: palpitesArray }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Erro ao salvar palpites')
        return
      }

      toast.success(`Palpites salvos com sucesso! (${data.totalSalvos} jogos)`)
      setSalvo(true)
    } catch {
      toast.error('Erro ao salvar palpites')
    } finally {
      setSalvando(false)
    }
  }

  if (status === 'loading') {
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

  const totalPreenchidos = Array.from(inputs.values()).filter(
    (v) => v.placarA !== '' && v.placarB !== ''
  ).length
  const totalJogos = jogos.length

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-display tracking-wide">Complete seu Bolão</h1>
        <p className="text-muted-foreground">
          Olá, <span className="font-semibold text-foreground">{tokenInfo?.nome}</span>! Preencha seus palpites para os {totalJogos} jogos restantes.
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="info">{totalPreenchidos}/{totalJogos} preenchidos</Badge>
          {salvo && <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />Salvo</Badge>}
        </div>
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

      <div className="sticky bottom-4">
        <Button
          onClick={salvar}
          disabled={salvando || totalPreenchidos === 0}
          size="lg"
          className="w-full shadow-lg"
        >
          {salvando ? (
            'Salvando...'
          ) : (
            <>
              <Save className="w-4 h-4" />
              Salvar Palpites ({totalPreenchidos}/{totalJogos})
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
