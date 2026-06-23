import type { BracketSlot } from '@/lib/services/bracket/types'
import { Flag } from '@/components/ui/flag'
import { getTimeFlag } from '@/lib/utils/flags'

type Props = {
  slot: BracketSlot
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CLASSES = {
  sm: 'text-xs p-2 min-w-[140px]',
  md: 'text-sm p-3 min-w-[180px]',
  lg: 'text-base p-4 min-w-[220px]',
}

export function BracketMatch({ slot, size = 'md' }: Props) {
  const isFinalizado = slot.status === 'finalizado'
  const isTBD = slot.timeA === null && slot.timeB === null
  const comPenaltes = isFinalizado
    && slot.placarA === slot.placarB
    && slot.placarPenaltisA !== null
    && slot.placarPenaltisB !== null

  return (
    <div className={`bg-card border rounded ${SIZE_CLASSES[size]} ${isTBD ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`flex-1 truncate flex items-center gap-1.5 ${slot.vencedor === 'A' ? 'font-bold' : ''}`}>
          {slot.timeA && getTimeFlag(slot.timeA) && <Flag codigoIso={getTimeFlag(slot.timeA)!} size={size === 'sm' ? 14 : 18} />}
          <span className="truncate">{slot.timeA ?? 'A definir'}</span>
        </span>
        <span className="tabular-nums font-mono">{slot.placarA ?? '-'}</span>
      </div>
      <div className="flex items-center justify-between gap-2 mt-1">
        <span className={`flex-1 truncate flex items-center gap-1.5 ${slot.vencedor === 'B' ? 'font-bold' : ''}`}>
          {slot.timeB && getTimeFlag(slot.timeB) && <Flag codigoIso={getTimeFlag(slot.timeB)!} size={size === 'sm' ? 14 : 18} />}
          <span className="truncate">{slot.timeB ?? 'A definir'}</span>
        </span>
        <span className="tabular-nums font-mono">{slot.placarB ?? '-'}</span>
      </div>
      {comPenaltes && (
        <div className="text-xs text-muted-foreground mt-1 text-center">
          ({slot.placarPenaltisA}-{slot.placarPenaltisB} pen)
        </div>
      )}
    </div>
  )
}
