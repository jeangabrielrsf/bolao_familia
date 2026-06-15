import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"

interface CopaProgressCardProps {
  percentual: number
  finalizados: number
  total: number
  href?: string
}

export function CopaProgressCard({ percentual, finalizados, total, href }: CopaProgressCardProps) {
  const content = (
    <Card
      role="group"
      aria-label={`Copa: ${percentual} por cento concluído, ${finalizados} de ${total} jogos`}
      className="w-full h-full"
    >
      <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center">
        <p className="text-sm text-muted-foreground">Copa</p>
        <p className="text-xl font-display text-primary truncate">{percentual}%</p>
        <p className="text-xs text-muted-foreground">concluído</p>
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
