import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getJogoById } from '@/lib/db/queries/jogos'
import { getConfiguracao } from '@/lib/db/queries/config'
import { getRanking } from '@/lib/db/queries/ranking'
import { calcularPontosJogo } from '@/lib/utils/helpers'
import { getTimeFlag } from '@/lib/utils/flags'
import { FASE_LABELS } from '@/lib/utils/constants'
import { formatarData, formatarHora } from '@/lib/utils/date'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Flag } from '@/components/ui/flag'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { BackButton } from '@/components/public/BackButton'
import { Calendar, MapPin, Trophy } from 'lucide-react'

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

  const rankingMap = new Map(ranking.map((r, idx) => [r.palpiteGrupoId, { ...r, posicao: idx + 1 }]))
  const placarVisivel = jogo.status === 'finalizado' || jogo.status === 'em_andamento'
  const placarAExibir = jogo.resultadoA ?? 0
  const placarBExibir = jogo.resultadoB ?? 0

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

    const rankingEntry = rankingMap.get(palpite.palpiteGrupoId)
    const posicaoRanking = rankingEntry?.posicao ?? null

    return { ...palpite, pontos, tipo, posicaoRanking }
  })

  palpitesComPontos.sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos
    return a.palpiteGrupo.participante.nome.localeCompare(b.palpiteGrupo.participante.nome)
  })

  const dataFormatada = formatarData(jogo.dataHora)
  const horaFormatada = formatarHora(jogo.dataHora)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8 animate-fade-in-up">
      <BackButton />

      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4">
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

          {(jogo.local || jogo.cidade) && (
            <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-1">
              <MapPin className="w-4 h-4" />
              {jogo.local}{jogo.cidade ? `, ${jogo.cidade}` : ''}
            </p>
          )}

          <div className="flex items-center justify-center gap-2 sm:gap-6 py-4">
            <div className="flex-1 text-right flex items-center justify-end gap-1.5 sm:gap-3 min-w-0">
              {jogo.rankingTimeA && <span className="hidden sm:inline text-sm text-muted-foreground font-medium"><span className="text-xs text-muted-foreground/60 mr-1">FIFA</span>#{jogo.rankingTimeA}</span>}
              {jogo.timeA && getTimeFlag(jogo.timeA) && <Flag codigoIso={getTimeFlag(jogo.timeA)!} size={20} />}
              <span className="text-sm sm:text-xl md:text-2xl font-display tracking-wide truncate">{jogo.timeA ?? 'A definir'}</span>
            </div>
            <div className="shrink-0 text-center px-2">
              {placarVisivel ? (
                <div>
                  <span className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-primary tabular-nums">{placarAExibir} - {placarBExibir}</span>
                  {jogo.fase !== 'grupos' && jogo.placarPenaltisA !== null && jogo.placarPenaltisB !== null && (
                    <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                      ({jogo.placarPenaltisA} - {jogo.placarPenaltisB} pênaltis)
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-base sm:text-lg font-medium text-muted-foreground">vs</span>
              )}
            </div>
            <div className="flex-1 text-left flex items-center gap-1.5 sm:gap-3 min-w-0">
              <span className="text-sm sm:text-xl md:text-2xl font-display tracking-wide truncate">{jogo.timeB ?? 'A definir'}</span>
              {jogo.timeB && getTimeFlag(jogo.timeB) && <Flag codigoIso={getTimeFlag(jogo.timeB)!} size={20} />}
              {jogo.rankingTimeB && <span className="hidden sm:inline text-sm text-muted-foreground font-medium"><span className="text-xs text-muted-foreground/60 mr-1">FIFA</span>#{jogo.rankingTimeB}</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      {(jogo.status === 'finalizado' && jogo.vencedor !== null) && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Informações</h3>
            
            {jogo.status === 'finalizado' && jogo.vencedor !== null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Vencedor</span>
                <Badge variant={jogo.vencedor === 0 ? 'default' : 'success'}>
                  <Trophy className="w-3 h-3 mr-1" />
                  {jogo.vencedor === 0 ? 'Empate' : jogo.vencedor === 1 ? jogo.timeA : jogo.timeB}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-display tracking-wide">Palpites ({palpitesComPontos.length})</h2>

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
                        <Link href={`/participantes/${palpite.palpiteGrupo.participante.id}`} className="flex items-center gap-2 sm:gap-3 hover:text-primary transition-colors">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
                            {palpite.palpiteGrupo.participante.fotoUrl ? (
                              <Image src={palpite.palpiteGrupo.participante.fotoUrl} alt={palpite.palpiteGrupo.participante.nome} width={32} height={32} unoptimized className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-muted-foreground">{palpite.palpiteGrupo.participante.nome.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-sm truncate">{palpite.palpiteGrupo.nome}</span>
                            {palpite.posicaoRanking && <span className="text-xs text-muted-foreground">{palpite.posicaoRanking}º no ranking</span>}
                          </div>
                        </Link>
                    </TableCell>
                    <TableCell><span className="font-semibold tabular-nums text-sm sm:text-base">{palpite.placarA} x {palpite.placarB}</span></TableCell>
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
