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
      <CardContent className="p-4 flex flex-row items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
          <Calendar className="w-5 h-5 text-success" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">Jogos</p>
          <div className="flex items-center justify-between gap-1">
            <div className="text-center flex-1 min-w-0">
              <p className="text-xl font-display text-success truncate">{finalizado}</p>
              <p className="text-xs text-muted-foreground">finalizados</p>
            </div>
            <span className="text-border text-sm select-none" aria-hidden="true">|</span>
            <div className="text-center flex-1 min-w-0">
              <p className="text-xl font-display text-warning truncate">{emAndamento}</p>
              <p className="text-xs text-muted-foreground">em jogo</p>
            </div>
            <span className="text-border text-sm select-none" aria-hidden="true">|</span>
            <div className="text-center flex-1 min-w-0">
              <p className="text-xl font-display text-muted-foreground truncate">{restante}</p>
              <p className="text-xs text-muted-foreground">restantes</p>
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
