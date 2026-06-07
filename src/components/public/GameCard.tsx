import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { FASE_LABELS } from '@/lib/utils/constants'

interface GameCardProps {
  timeA: string
  timeB: string
  dataHora: Date
  grupo: string | null
  fase: string
  resultadoA: number | null
  resultadoB: number | null
  status: string
}

export function GameCard({ timeA, timeB, dataHora, grupo, fase, resultadoA, resultadoB, status }: GameCardProps) {
  const dataFormatada = dataHora.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })
  const horaFormatada = dataHora.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const finalizado = status === 'finalizado'

  return (
    <Card padding="sm" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        {grupo && <Badge variant="info">Grupo {grupo}</Badge>}
        {!grupo && <Badge variant="default">{FASE_LABELS[fase] ?? fase}</Badge>}
        <span className="text-xs text-muted">
          {dataFormatada} &bull; {horaFormatada}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 text-right">
          <span className="font-semibold text-sm sm:text-base">{timeA}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {finalizado ? (
            <span className="text-2xl font-bold text-primary tabular-nums">
              {resultadoA} - {resultadoB}
            </span>
          ) : (
            <span className="text-lg font-medium text-muted">vs</span>
          )}
        </div>

        <div className="flex-1 text-left">
          <span className="font-semibold text-sm sm:text-base">{timeB}</span>
        </div>
      </div>

      {finalizado && (
        <div className="text-center">
          <Badge variant="success">Finalizado</Badge>
        </div>
      )}
      {status === 'em_andamento' && (
        <div className="text-center">
          <Badge variant="warning">Em andamento</Badge>
        </div>
      )}
    </Card>
  )
}
