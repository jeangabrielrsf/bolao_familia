import Link from 'next/link'
import { getJogosDoDia } from '@/lib/db/queries/jogos'
import { getRanking } from '@/lib/db/queries/ranking'
import { GameCard } from '@/components/public/GameCard'
import { RankingTable } from '@/components/public/RankingTable'
import { Card } from '@/components/ui/Card'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [jogosDoDia, ranking] = await Promise.all([
    getJogosDoDia(),
    getRanking(),
  ])

  const top5 = ranking.slice(0, 5)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <section className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold text-primary">
          Bolão Copa do Mundo 2026
        </h1>
        <p className="text-muted text-lg">
          Faça seus palpites e dispute o ranking com a família!
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Jogos do Dia</h2>
          <Link
            href="/jogos"
            className="text-sm text-accent hover:underline font-medium"
          >
            Ver todos &rarr;
          </Link>
        </div>

        {jogosDoDia.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jogosDoDia.map((jogo) => (
              <GameCard
                key={jogo.id}
                timeA={jogo.timeA}
                timeB={jogo.timeB}
                dataHora={jogo.dataHora}
                grupo={jogo.grupo}
                fase={jogo.fase}
                resultadoA={jogo.resultadoA}
                resultadoB={jogo.resultadoB}
                status={jogo.status}
              />
            ))}
          </div>
        ) : (
          <Card padding="md" className="text-center text-muted">
            Nenhum jogo hoje
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Ranking</h2>
          <Link
            href="/ranking"
            className="text-sm text-accent hover:underline font-medium"
          >
            Ver completo &rarr;
          </Link>
        </div>

        <Card padding="none">
          <RankingTable ranking={top5} />
        </Card>
      </section>
    </div>
  )
}
