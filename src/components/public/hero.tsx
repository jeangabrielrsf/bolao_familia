import { Users, Trophy } from "lucide-react"
import { StatsCard } from "@/components/public/stats-card"
import { JogosStatusCard } from "@/components/public/jogos-status-card"
import { CopaProgressCard } from "@/components/public/copa-progress-card"

interface HeroProps {
  totalParticipantes: number
  jogosStatus: {
    finalizado: number
    emAndamento: number
    restante: number
  }
  percentualCopa: number
}

export function Hero({ totalParticipantes, jogosStatus, percentualCopa }: HeroProps) {
  return (
    <section className="relative overflow-hidden py-12 sm:py-16">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/20 border border-secondary/30">
          <Trophy className="w-4 h-4 text-secondary" />
          <span className="text-sm font-medium text-secondary-foreground">Copa do Mundo 2026</span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display tracking-wide text-foreground">BOLÃO DA “FAMÍLIA”</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Faça seus palpites e dispute o ranking com a família!</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto pt-4">
          <StatsCard label="Participantes" value={totalParticipantes} icon={Users} href="/participantes" />
          <JogosStatusCard
            finalizado={jogosStatus.finalizado}
            emAndamento={jogosStatus.emAndamento}
            restante={jogosStatus.restante}
            href="/jogos"
          />
          <CopaProgressCard
            percentual={percentualCopa}
            finalizados={jogosStatus.finalizado}
            total={jogosStatus.finalizado + jogosStatus.emAndamento + jogosStatus.restante}
            href="/jogos"
          />
        </div>
      </div>
    </section>
  )
}
