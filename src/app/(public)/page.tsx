import { getProximosJogos, countJogosByStatus } from "@/lib/db/queries/jogos"
import { getRanking } from "@/lib/db/queries/ranking"
import { getTodosParticipantes } from "@/lib/db/queries/participantes"
import { ProximosJogosTabs } from "@/components/public/proximos-jogos-tabs"
import { RankingCard } from "@/components/public/ranking-card"
import { Hero } from "@/components/public/hero"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const [proximos, ranking, jogosStatus, participantes] = await Promise.all([
    getProximosJogos(),
    getRanking(),
    countJogosByStatus(),
    getTodosParticipantes(),
  ])

  const percentualCopa =
    jogosStatus.total === 0
      ? 0
      : Math.round((jogosStatus.finalizado / jogosStatus.total) * 100)

  return (
    <div className="space-y-10">
      <Hero
        totalParticipantes={participantes.length}
        jogosStatus={{
          finalizado: jogosStatus.finalizado,
          emAndamento: jogosStatus.em_andamento,
          restante: jogosStatus.restante,
        }}
        percentualCopa={percentualCopa}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <ProximosJogosTabs
          jogosHoje={proximos.hoje}
          jogosAmanha={proximos.amanha}
          jogosDepois={proximos.depois}
        />
        <RankingCard
          ranking={ranking}
          title="Top 5 participantes"
          maxItems={5}
          showViewAll
        />
      </div>
    </div>
  )
}
