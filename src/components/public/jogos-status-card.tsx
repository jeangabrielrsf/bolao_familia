import Link from "next/link"
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
      <CardContent className="p-4 text-center sm:text-left">
        <p className="text-xs text-muted-foreground mb-1.5">Jogos</p>
        <div className="space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">finalizados</span>
            </div>
            <span className="text-base font-display text-success tabular-nums">{finalizado}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">em jogo</span>
            </div>
            <span className="text-base font-display text-warning tabular-nums">{emAndamento}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground shrink-0" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">restantes</span>
            </div>
            <span className="text-base font-display text-muted-foreground tabular-nums">{restante}</span>
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
