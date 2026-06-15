import Link from "next/link"
import { Calendar } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface JogosStatusCardProps {
  finalizado: number
  emAndamento: number
  restante: number
  href?: string
}

export function JogosStatusCard({ finalizado, emAndamento, restante, href }: JogosStatusCardProps) {
  const content = (
    <Card
      role="group"
      aria-label={`Jogos: ${finalizado} finalizados, ${emAndamento} em jogo, ${restante} restantes`}
      className="w-full"
    >
      <CardContent className="p-4 flex flex-col sm:flex-row items-center sm:items-center gap-3 text-center sm:text-left">
        <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
          <Calendar className="w-5 h-5 text-success" />
        </div>
        <div className="min-w-0 flex-1 w-full">
          <p className="text-sm text-muted-foreground mb-2">Jogos</p>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-muted-foreground">finalizados</span>
              <span className="text-lg font-display text-success tabular-nums">{finalizado}</span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-muted-foreground">em jogo</span>
              <span className="text-lg font-display text-warning tabular-nums">{emAndamento}</span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-muted-foreground">restantes</span>
              <span className="text-lg font-display text-muted-foreground tabular-nums">{restante}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="block focus:outline-none focus:ring-2 focus:ring-ring rounded-lg"
      >
        {content}
      </Link>
    )
  }

  return content
}
