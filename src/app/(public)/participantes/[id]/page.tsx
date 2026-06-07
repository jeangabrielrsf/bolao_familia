import { notFound } from 'next/navigation'
import { getParticipanteById } from '@/lib/db/queries/participantes'
import { getRanking } from '@/lib/db/queries/ranking'
import { getConfiguracao } from '@/lib/db/queries/config'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Table, TableRow, TableCell } from '@/components/ui/Table'
import { PalpitesTable } from '@/components/public/PalpitesTable'

export const dynamic = 'force-dynamic'

const tipoExtraLabels: Record<string, string> = {
  artilheiro: 'Artilheiro',
  campeao: 'Campeão',
  vice: 'Vice-campeão',
  terceiro: '3º Colocado',
  quarto: '4º Colocado',
}

const faseLabels: Record<string, string> = {
  grupos: 'Fase de Grupos',
  oitavas: 'Oitavas',
  quartas: 'Quartas',
  semifinal: 'Semifinal',
  terceiro: '3º Lugar',
  final: 'Final',
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Card padding="md" className="flex flex-col sm:flex-row items-center gap-6">
        <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center shrink-0">
          {participante.fotoUrl ? (
            <img src={participante.fotoUrl} alt={participante.nome} className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl font-bold text-gray-400">
              {participante.nome.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="text-center sm:text-left space-y-1">
          <h1 className="text-2xl font-bold text-primary">{participante.nome}</h1>
          <div className="flex items-center gap-3 justify-center sm:justify-start">
            <Badge variant="success">{pontos} pts</Badge>
            {posicao && <Badge variant="info">{posicao}º no ranking</Badge>}
          </div>
        </div>
      </Card>

      {gruposMap.size > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">Palpites - Fase de Grupos</h2>
          {Array.from(gruposMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([grupo, palpites]) => (
              <PalpitesTable key={grupo} titulo={`Grupo ${grupo}`} palpites={palpites} config={config} />
            ))}
        </section>
      )}

      {fasesMap.size > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">Palpites - Eliminatórias</h2>
          {Array.from(fasesMap.entries()).map(([fase, palpites]) => (
            <PalpitesTable key={fase} titulo={faseLabels[fase] ?? fase} palpites={palpites} config={config} />
          ))}
        </section>
      )}

      {participante.extras.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">Palpites Extras</h2>
          <Card padding="none">
            <Table headers={['Categoria', 'Palpite']}>
              {participante.extras.map((extra) => (
                <TableRow key={extra.id}>
                  <TableCell>{tipoExtraLabels[extra.tipo] ?? extra.tipo}</TableCell>
                  <TableCell className="font-semibold">{extra.valor}</TableCell>
                </TableRow>
              ))}
            </Table>
          </Card>
        </section>
      )}
    </div>
  )
}
