import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getParticipanteById } from '@/lib/db/queries/participantes'
import { getRanking } from '@/lib/db/queries/ranking'
import { getConfiguracao } from '@/lib/db/queries/config'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { PalpitesTable } from '@/components/public/PalpitesTable'
import { FASE_LABELS } from '@/lib/utils/constants'
import { Trophy, Award } from 'lucide-react'

export const dynamic = 'force-dynamic'

const tipoExtraLabels: Record<string, string> = {
  artilheiro: 'Artilheiro',
  campeao: 'Campeão',
  vice: 'Vice-campeão',
  terceiro: '3º Colocado',
  quarto: '4º Colocado',
}

export default async function ParticipanteProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [participante, ranking, config] = await Promise.all([
    getParticipanteById(id),
    getRanking(),
    getConfiguracao(),
  ])

  if (!participante) notFound()

  const rankingEntry = ranking.find((r) => r.participanteId === id)
  const posicao = rankingEntry ? ranking.indexOf(rankingEntry) + 1 : null
  const pontos = rankingEntry?.pontos ?? 0

  const palpitesGrupos = participante.palpites.filter((p) => p.jogo.fase === 'grupos')
  const palpitesEliminatorias = participante.palpites.filter((p) => p.jogo.fase !== 'grupos')

  const gruposMap = new Map<string, typeof participante.palpites>()
  for (const palpite of palpitesGrupos) {
    const grupo = palpite.jogo.grupo ?? '?'
    if (!gruposMap.has(grupo)) gruposMap.set(grupo, [])
    gruposMap.get(grupo)!.push(palpite)
  }

  const fasesMap = new Map<string, typeof participante.palpites>()
  for (const palpite of palpitesEliminatorias) {
    const fase = palpite.jogo.fase
    if (!fasesMap.has(fase)) fasesMap.set(fase, [])
    fasesMap.get(fase)!.push(palpite)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in-up">
      <Card>
        <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-28 h-28 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 ring-4 ring-border relative">
            {participante.fotoUrl ? (
              <Image src={participante.fotoUrl} alt={participante.nome} fill className="object-cover" />
            ) : (
              <span className="text-4xl font-display font-bold text-primary">{participante.nome.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="text-center sm:text-left space-y-2">
            <h1 className="text-2xl font-display tracking-wide">{participante.nome}</h1>
            <div className="flex items-center gap-3 justify-center sm:justify-start">
              <div className="flex items-center gap-1"><Trophy className="w-4 h-4 text-primary" /><Badge variant="success">{pontos} pts</Badge></div>
              {posicao && <div className="flex items-center gap-1"><Award className="w-4 h-4 text-secondary" /><Badge variant="info">{posicao}º no ranking</Badge></div>}
            </div>
          </div>
        </CardContent>
      </Card>

      {gruposMap.size > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-display tracking-wide">Palpites - Fase de Grupos</h2>
          {Array.from(gruposMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([grupo, palpites]) => (
              <PalpitesTable key={grupo} titulo={`Grupo ${grupo}`} palpites={palpites} config={config} />
            ))}
        </section>
      )}

      {fasesMap.size > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-display tracking-wide">Palpites - Eliminatórias</h2>
          {Array.from(fasesMap.entries()).map(([fase, palpites]) => (
            <PalpitesTable key={fase} titulo={FASE_LABELS[fase] ?? fase} palpites={palpites} config={config} />
          ))}
        </section>
      )}

      {participante.extras.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-display tracking-wide">Palpites Extras</h2>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Palpite</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participante.extras.map((extra) => (
                  <TableRow key={extra.id}>
                    <TableCell>{tipoExtraLabels[extra.tipo] ?? extra.tipo}</TableCell>
                    <TableCell className="font-semibold">{extra.valor}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </section>
      )}
    </div>
  )
}
