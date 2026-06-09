import Link from "next/link"
import { getJogosDoDia, getTodosJogos } from "@/lib/db/queries/jogos"
import { getRanking } from "@/lib/db/queries/ranking"
import { getTodosParticipantes } from "@/lib/db/queries/participantes"
import { GameCard } from "@/components/public/GameCard"
import { RankingCard } from "@/components/public/ranking-card"
import { Hero } from "@/components/public/hero"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const [jogosDoDia, ranking, todosJogos, participantes] = await Promise.all([
    getJogosDoDia(), getRanking(), getTodosJogos(), getTodosParticipantes(),
  ])

  return (
    <div className="space-y-10">
      <Hero totalParticipantes={participantes.length} totalJogos={todosJogos.length} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display tracking-wide">Jogos do Dia</h2>
            <Button variant="ghost" size="sm" asChild><Link href="/jogos">Ver todos <ChevronRight className="w-4 h-4" /></Link></Button>
          </div>
          {jogosDoDia.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {jogosDoDia.map((jogo) => (
                <GameCard key={jogo.id} id={jogo.id} timeA={jogo.timeA} timeB={jogo.timeB} dataHora={jogo.dataHora} grupo={jogo.grupo} fase={jogo.fase} resultadoA={jogo.resultadoA} resultadoB={jogo.resultadoB} status={jogo.status} />
              ))}
            </div>
          ) : (
            <Card><CardContent className="flex flex-col items-center justify-center py-12">
              <span className="text-6xl mb-4">⚽</span>
              <h3 className="text-xl font-semibold mb-2">Nenhum jogo hoje</h3>
              <p className="text-muted-foreground text-center max-w-md">Os jogos da fase de grupos serão exibidos aqui em breve.</p>
            </CardContent></Card>
          )}
        </section>
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
