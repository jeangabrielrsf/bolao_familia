import { getRanking } from '@/lib/db/queries/ranking'
import { RankingTable } from '@/components/public/RankingTable'
import { RankingPodium } from '@/components/public/ranking-podium'
import { StatsCard } from '@/components/public/stats-card'
import { Card } from '@/components/ui/card'
import { Trophy, Target, BarChart3 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function RankingPage() {
  const ranking = await getRanking()

  const maiorPontuacao = ranking.length > 0 ? ranking[0].pontos : 0
  const mediaPontos = ranking.length > 0 ? Math.round(ranking.reduce((sum, r) => sum + r.pontos, 0) / ranking.length) : 0
  const totalExatos = ranking.reduce((sum, r) => sum + r.placaresExatos, 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in-up">
      <h1 className="text-3xl font-display tracking-wide">Ranking</h1>

      {ranking.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <span className="text-6xl mb-4">🏆</span>
            <h3 className="text-xl font-semibold mb-2">Nenhum participante ainda</h3>
            <p className="text-muted-foreground text-center max-w-md">Os participantes aparecerão aqui quando cadastrados.</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatsCard label="Maior pontuação" value={`${maiorPontuacao} pts`} icon={Trophy} />
            <StatsCard label="Média de pontos" value={`${mediaPontos} pts`} icon={BarChart3} iconColor="text-secondary" iconBg="bg-secondary/10" />
            <StatsCard label="Placares exatos" value={totalExatos} icon={Target} iconColor="text-green-600 dark:text-green-400" iconBg="bg-green-100 dark:bg-green-900/20" />
          </div>

          <RankingPodium ranking={ranking} />

          <Card>
            <RankingTable ranking={ranking} />
          </Card>
        </>
      )}
    </div>
  )
}
