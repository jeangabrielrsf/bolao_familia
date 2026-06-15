import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Flag } from "@/components/ui/flag"
import { FASE_LABELS } from "@/lib/utils/constants"
import { getTimeFlag } from "@/lib/utils/flags"
import { formatarData, formatarHora } from "@/lib/utils/date"
import { Calendar, ChevronRight, MapPin } from "lucide-react"
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
  local?: string | null
  cidade?: string | null
  placarPenaltisA?: number | null
  placarPenaltisB?: number | null
  rankingTimeA?: number | null
  rankingTimeB?: number | null
}

export function GameCard({ id, timeA, timeB, dataHora, grupo, fase, resultadoA, resultadoB, status, local, cidade, placarPenaltisA, placarPenaltisB, rankingTimeA, rankingTimeB }: GameCardProps) {
  const dataFormatada = formatarData(dataHora)
  const horaFormatada = formatarHora(dataHora)
  const finalizado = status === "finalizado"
  const emAndamento = status === "em_andamento"
  const placarVisivel = finalizado || emAndamento
  const placarAExibir = resultadoA ?? 0
  const placarBExibir = resultadoB ?? 0
  const temPenaltis = finalizado && fase !== 'grupos' && (placarPenaltisA !== null && placarPenaltisA !== undefined)
  const isBrasil = timeA === 'Brasil' || timeB === 'Brasil'

  const content = (
    <Card className={cn(
      "group cursor-pointer hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg",
      isBrasil && "border-l-4 border-l-amber-500"
    )}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {grupo ? <Badge variant="info">Grupo {grupo}</Badge> : <Badge>{FASE_LABELS[fase] ?? fase}</Badge>}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {dataFormatada} · {horaFormatada}
          </div>
        </div>
        
        {(local || cidade) && (
          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            <MapPin className="w-3 h-3" />
            {local}{cidade ? `, ${cidade}` : ''}
          </p>
        )}
        
        <div className="flex items-center justify-between gap-4 min-h-[56px]">
          <div className="flex-1 text-right flex items-center justify-end gap-1.5">
            {rankingTimeA && <span className="text-[11px] text-muted-foreground font-medium whitespace-nowrap"><span className="text-[9px] text-muted-foreground/60 mr-0.5">FIFA</span>#{rankingTimeA}</span>}
            {getTimeFlag(timeA) && <Flag codigoIso={getTimeFlag(timeA)!} size={20} />}
            <span className="font-display text-base sm:text-lg tracking-wide leading-tight">{timeA}</span>
          </div>
          <div className="shrink-0 text-center">
            {placarVisivel ? (
              <div>
                <span className="text-xl sm:text-2xl font-display font-bold text-primary tabular-nums">{placarAExibir} - {placarBExibir}</span>
                {temPenaltis && (
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    ({placarPenaltisA} - {placarPenaltisB} pên.)
                  </div>
                )}
              </div>
            ) : (
              <span className="text-sm font-medium text-muted-foreground">vs</span>
            )}
          </div>
          <div className="flex-1 text-left flex items-center gap-1.5">
            <span className="font-display text-base sm:text-lg tracking-wide leading-tight">{timeB}</span>
            {getTimeFlag(timeB) && <Flag codigoIso={getTimeFlag(timeB)!} size={20} />}
            {rankingTimeB && <span className="text-[11px] text-muted-foreground font-medium whitespace-nowrap"><span className="text-[9px] text-muted-foreground/60 mr-0.5">FIFA</span>#{rankingTimeB}</span>}
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
