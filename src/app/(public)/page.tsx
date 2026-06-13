import { getProximosJogos, getTodosJogos } from "@/lib/db/queries/jogos"
import { getRanking } from "@/lib/db/queries/ranking"
import { getTodosParticipantes } from "@/lib/db/queries/participantes"
import { getConfiguracao } from "@/lib/db/queries/config"
import { ProximosJogosTabs } from "@/components/public/proximos-jogos-tabs"
import { RankingCard } from "@/components/public/ranking-card"
import { Hero } from "@/components/public/hero"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const [proximos, ranking, todosJogos, participantes, config] = await Promise.all([
    getProximosJogos(), getRanking(), getTodosJogos(), getTodosParticipantes(), getConfiguracao(),
  ])

  const pontosMaximos = todosJogos.length * config.placarExato +
    config.campeao + config.vice + config.terceiro + config.quarto + config.artilheiro

  return (
    <div className="space-y-10">
      <Hero totalParticipantes={participantes.length} totalJogos={todosJogos.length} pontosMaximos={pontosMaximos} />
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
