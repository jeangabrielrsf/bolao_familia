'use client'
import { Jogo } from '@prisma/client'
import { Badge } from '@/components/ui/badge'

type Props = {
  jogo: Jogo
  onEdit: (id: string) => void
}

const STATUS_LABEL: Record<string, string> = {
  agendado: 'Agendado',
  em_andamento: 'Em andamento',
  finalizado: 'Finalizado',
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  agendado: 'secondary',
  em_andamento: 'default',
  finalizado: 'destructive',
}

export function JogoRow({ jogo, onEdit }: Props) {
  const isTBD = !jogo.timeA && !jogo.timeB

  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="px-3 py-2 text-sm">
        <div className="flex items-center gap-1">
          {isTBD ? (
            <span className="text-muted-foreground italic">A definir</span>
          ) : (
            <>
              <span className="font-medium">{jogo.timeA}</span>
              <span className="text-muted-foreground mx-1">×</span>
              <span className="font-medium">{jogo.timeB}</span>
            </>
          )}
        </div>
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">
        {jogo.fase}
        {jogo.grupo && ` (${jogo.grupo})`}
      </td>
      <td className="px-3 py-2">
        <Badge variant={STATUS_VARIANT[jogo.status]}>{STATUS_LABEL[jogo.status]}</Badge>
      </td>
      <td className="px-3 py-2 text-sm tabular-nums">
        {jogo.resultadoA ?? '-'} × {jogo.resultadoB ?? '-'}
        {jogo.placarPenaltisA !== null && jogo.placarPenaltisB !== null && (
          <span className="text-xs text-muted-foreground ml-1">
            ({jogo.placarPenaltisA}-{jogo.placarPenaltisB} pen)
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">
        {new Date(jogo.dataHora).toLocaleDateString('pt-BR')}
      </td>
      <td className="px-3 py-2 text-right">
        <button
          onClick={() => onEdit(jogo.id)}
          disabled={isTBD}
          className="text-primary hover:underline text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Editar
        </button>
      </td>
    </tr>
  )
}
