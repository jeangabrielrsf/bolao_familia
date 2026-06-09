import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getJogoById } from '@/lib/db/queries/jogos'
import { getConfiguracao } from '@/lib/db/queries/config'
import { getRanking } from '@/lib/db/queries/ranking'
import { calcularPontosJogo } from '@/lib/utils/helpers'
import { FASE_LABELS } from '@/lib/utils/constants'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Calendar, ChevronLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

const statusLabels: Record<string, string> = {
  agendado: 'Agendado',
  em_andamento: 'Em andamento',
  finalizado: 'Finalizado',
}

const statusVariants: Record<string, 'default' | 'warning' | 'success'> = {
  agendado: 'default',
  em_andamento: 'warning',
  finalizado: 'success',
}

export default async function JogoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [jogo, config, ranking] = await Promise.all([
    getJogoById(id),
    getConfiguracao(),
    getRanking(),
  ])

  if (!jogo) notFound()

  const rankingMap = new Map(ranking.map((r, idx) => [r.participanteId, { ...r, posicao: idx + 1 }]))

  const palpitesComPontos = jogo.palpites.map((palpite) => {
    let pontos = 0
    let tipo: 'exato' | 'vencedor' | 'erro' = 'erro'

    if (jogo.status === 'finalizado' && jogo.resultadoA !== null && jogo.resultadoB !== null) {
      const resultado = calcularPontosJogo(
        palpite.placarA,
        palpite.placarB,
        jogo.resultadoA,
        jogo.resultadoB,
        config
      )
      pontos = resultado.pontos
      tipo = resultado.tipo
    }

    const rankingEntry = rankingMap.get(palpite.participanteId)
    const posicaoRanking = rankingEntry?.posicao ?? null

    return { ...palpite, pontos, tipo, posicaoRanking }
  })

  palpitesComPontos.sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos
    return a.participante.nome.localeCompare(b.participante.nome)
  })

  const dataFormatada = jogo.dataHora.toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  const horaFormatada = jogo.dataHora.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in-up">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/jogos"><ChevronLeft className="w-4 h-4" /> Voltar aos jogos</Link>
      </Button>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {jogo.grupo ? <Badge variant="info">Grupo {jogo.grupo}</Badge> : <Badge variant="info">{FASE_LABELS[jogo.fase] ?? jogo.fase}</Badge>}
              <Badge variant={statusVariants[jogo.status] ?? 'default'}>{statusLabels[jogo.status] ?? jogo.status}</Badge>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {dataFormatada} · {horaFormatada}
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 py-4">
            <div className="flex-1 text-right">
              <span className="text-xl sm:text-2xl font-display tracking-wide">{jogo.timeA}</span>
            </div>
            <div className="shrink-0">
              {jogo.status === 'finalizado' ? (
                <span className="text-3xl sm:text-4xl font-display font-bold text-primary tabular-nums">{jogo.resultadoA} - {jogo.resultadoB}</span>
              ) : (
                <span className="text-lg font-medium text-muted-foreground">vs</span>
              )}
            </div>
            <div className="flex-1 text-left">
              <span className="text-xl sm:text-2xl font-display tracking-wide">{jogo.timeB}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-2xl font-display tracking-wide">Palpites ({palpitesComPontos.length})</h2>

        {palpitesComPontos.length > 0 ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participante</TableHead>
                  <TableHead>Palpite</TableHead>
                  <TableHead className="text-right">Pontos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {palpitesComPontos.map((palpite) => (
                  <TableRow key={palpite.id}>
                    <TableCell>
                      <Link href={`/participantes/${palpite.participanteId}`} className="flex items-center gap-3 hover:text-primary transition-colors">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
                          {palpite.participante.fotoUrl ? (
                            <Image src={palpite.participante.fotoUrl} alt={palpite.participante.nome} width={32} height={32} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-muted-foreground">{palpite.participante.nome.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{palpite.participante.nome}</span>
                          {palpite.posicaoRanking && <span className="text-xs text-muted-foreground">{palpite.posicaoRanking}º no ranking</span>}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell><span className="font-semibold tabular-nums">{palpite.placarA} x {palpite.placarB}</span></TableCell>
                    <TableCell className="text-right">
                      {jogo.status === 'finalizado' ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-display text-lg text-primary">{palpite.pontos}</span>
                          {palpite.tipo === 'exato' && <Badge variant="success">Exato</Badge>}
                          {palpite.tipo === 'vencedor' && <Badge variant="info">Vencedor</Badge>}
                          {palpite.tipo === 'erro' && <Badge variant="destructive">Erro</Badge>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <span className="text-6xl mb-4">⚽</span>
              <h3 className="text-xl font-semibold mb-2">Nenhum palpite registrado</h3>
              <p className="text-muted-foreground text-center max-w-md">Os palpites aparecerão aqui quando cadastrados.</p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
