import type { BracketSlot } from '@/lib/services/bracket/types'
import { Flag } from '@/components/ui/flag'
import { getTimeFlag } from '@/lib/utils/flags'
import { formatarData, formatarHora } from '@/lib/utils/date'
import { cn } from '@/lib/utils'

type Props = {
  slot: BracketSlot
  size?: 'sm' | 'md'
  href?: string
}

const SIZE_CLASSES = {
  sm: 'text-[11px] p-2 min-w-[110px]',
  md: 'text-[12px] p-2.5 min-w-[130px]',
}

export function BracketMatchCard({ slot, size = 'md', href }: Props) {
  const isFinalizado = slot.status === 'finalizado'
  const isLive = slot.status === 'em_andamento'
  const isTBD = slot.timeA === null && slot.timeB === null
  const comPenaltes = isFinalizado
    && slot.placarA === slot.placarB
    && slot.placarPenaltisA !== null
    && slot.placarPenaltisB !== null

  const timeA = slot.timeA ?? formatSource(slot.sourceGrupo, 'timeA') ?? 'A definir'
  const timeB = slot.timeB ?? formatSource(slot.sourceGrupo, 'timeB') ?? 'A definir'
  const italicA = !!(!slot.timeA && formatSource(slot.sourceGrupo, 'timeA'))
  const italicB = !!(!slot.timeB && formatSource(slot.sourceGrupo, 'timeB'))
  const isWinnerA = isFinalizado && slot.vencedor === 'A'
  const isWinnerB = isFinalizado && slot.vencedor === 'B'

  const dataHoraTexto = slot.dataHora
    ? `${formatarData(slot.dataHora)} · ${formatarHora(slot.dataHora)}`
    : null

  const CardTag = href ? 'a' : 'div'
  const cardProps = href ? { href } : {}

  return (
    <CardTag
      {...cardProps}
      data-jogo-id={slot.jogoId}
      data-fase={slot.fase}
      className={cn(
        'block bg-card border rounded-md transition-all duration-200',
        SIZE_CLASSES[size],
        isTBD && 'opacity-40',
        isLive && 'border-red-500/50',
        href && 'hover:bg-muted/50 cursor-pointer',
      )}
    >
      {/* Header: date or LIVE badge */}
      {isLive ? (
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <span className="text-[10px] text-red-400 font-semibold uppercase tracking-wider">AO VIVO</span>
        </div>
      ) : dataHoraTexto ? (
        <div className="text-[10px] text-muted-foreground mb-1.5">{dataHoraTexto}</div>
      ) : null}

      {/* Team A */}
      <div className={cn(
        'flex items-center justify-between gap-2 py-0.5',
        isWinnerA && 'bg-emerald-950/40 -mx-2.5 px-2.5 rounded',
      )}>
        <span className={cn(
          'truncate flex items-center gap-1.5',
          italicA && 'italic text-muted-foreground',
          isWinnerA && 'font-bold text-emerald-300',
        )}>
          {slot.timeA && getTimeFlag(slot.timeA) && <Flag codigoIso={getTimeFlag(slot.timeA)!} size={14} />}
          <span className="truncate">{timeA}</span>
        </span>
        <span className={cn(
          'tabular-nums font-mono',
          isWinnerA ? 'font-bold text-emerald-300' : 'text-muted-foreground',
        )}>{slot.placarA ?? '—'}</span>
      </div>

      {/* Team B */}
      <div className={cn(
        'flex items-center justify-between gap-2 py-0.5 mt-0.5',
        isWinnerB && 'bg-emerald-950/40 -mx-2.5 px-2.5 rounded',
      )}>
        <span className={cn(
          'truncate flex items-center gap-1.5',
          italicB && 'italic text-muted-foreground',
          isWinnerB && 'font-bold text-emerald-300',
        )}>
          {slot.timeB && getTimeFlag(slot.timeB) && <Flag codigoIso={getTimeFlag(slot.timeB)!} size={14} />}
          <span className="truncate">{timeB}</span>
        </span>
        <span className={cn(
          'tabular-nums font-mono',
          isWinnerB ? 'font-bold text-emerald-300' : 'text-muted-foreground',
        )}>{slot.placarB ?? '—'}</span>
      </div>

      {/* Penalties */}
      {comPenaltes && (
        <div className="text-[10px] text-muted-foreground mt-1 text-center">
          ({slot.placarPenaltisA}-{slot.placarPenaltisB} pen)
        </div>
      )}

      {/* Footer: FT indicator for finished matches */}
      {slot.dataHora && isFinalizado && (
        <div className="text-[9px] text-muted-foreground mt-1.5 border-t pt-1 border-border/30">
          FT
        </div>
      )}
    </CardTag>
  )
}

function formatSource(
  source: BracketSlot['sourceGrupo'],
  lado: 'timeA' | 'timeB',
): string | null {
  if (!source) return null
  const info = source[lado]
  if (!info) return null
  return `${info.posicao}${info.grupo}`
}
