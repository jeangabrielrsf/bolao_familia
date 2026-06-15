import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"

interface CopaProgressCardProps {
  percentual: number
  finalizados: number
  total: number
  href?: string
}

export function CopaProgressCard({ percentual, finalizados, total, href }: CopaProgressCardProps) {
  const dasharray = `${percentual} 100`

  const content = (
    <Card
      role="group"
      aria-label={`Copa: ${percentual} por cento concluído, ${finalizados} de ${total} jogos`}
      className="w-full"
    >
      <CardContent className="p-4 flex flex-row items-center justify-center sm:justify-start gap-3 text-center sm:text-left">
        <div className="relative w-10 h-10 sm:w-12 sm:h-12 shrink-0 text-primary">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90" aria-hidden="true">
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              className="text-border"
              stroke="currentColor"
              strokeWidth="2.5"
            />
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              className="text-primary"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeDasharray={dasharray}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-[0.6rem] sm:text-xs font-bold text-primary">
            {percentual}%
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Copa</p>
          <p className="text-xl font-display text-primary truncate">{percentual}%</p>
          <p className="text-xs text-muted-foreground">concluído</p>
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
