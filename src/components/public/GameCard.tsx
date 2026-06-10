import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Flag } from "@/components/ui/flag"
import { FASE_LABELS } from "@/lib/utils/constants"
import { getTimeFlag } from "@/lib/utils/flags"
import { Calendar, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface GameCardProps {
  id?: string
  timeA: string
  timeB: string
  dataHora: Date
  grupo: string | null
  fase: string
  resultadoA: number | null
  resultadoB: number | null
  status: string
  isBolao?: boolean
}

export function GameCard({ id, timeA, timeB, dataHora, grupo, fase, resultadoA, resultadoB, status, isBolao }: GameCardProps) {
  const dataFormatada = dataHora.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
  const horaFormatada = dataHora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  const finalizado = status === "finalizado"

  const content = (
    <Card className={cn(
      "group cursor-pointer hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg",
      isBolao && "border-l-4 border-l-amber-500"
    )}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {grupo ? <Badge variant="info">Grupo {grupo}</Badge> : <Badge>{FASE_LABELS[fase] ?? fase}</Badge>}
            {isBolao && <Badge variant="warning">BOLÃO</Badge>}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {dataFormatada} · {horaFormatada}
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-right flex items-center justify-end gap-2">
            {getTimeFlag(timeA) && <Flag codigoIso={getTimeFlag(timeA)!} size={20} />}
            <span className="font-display text-lg tracking-wide">{timeA}</span>
          </div>
          <div className="shrink-0">
            {finalizado ? (
              <span className="text-2xl font-display font-bold text-primary tabular-nums">{resultadoA} - {resultadoB}</span>
            ) : (
              <span className="text-sm font-medium text-muted-foreground">vs</span>
            )}
          </div>
          <div className="flex-1 text-left flex items-center gap-2">
            <span className="font-display text-lg tracking-wide">{timeB}</span>
            {getTimeFlag(timeB) && <Flag codigoIso={getTimeFlag(timeB)!} size={20} />}
          </div>
        </div>
      </CardContent>
      <CardFooter className="px-4 pb-4 pt-0">
        {finalizado && <Badge variant="success">Finalizado</Badge>}
        {status === "em_andamento" && <Badge variant="warning">Em andamento</Badge>}
        {status === "agendado" && (
          <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
            Ver palpites <ChevronRight className="w-3 h-3" />
          </div>
        )}
      </CardFooter>
    </Card>
  )

  if (id) {
    return <Link href={`/jogos/${id}`} className="block focus:outline-none focus:ring-2 focus:ring-ring rounded-lg">{content}</Link>
  }
  return content
}
