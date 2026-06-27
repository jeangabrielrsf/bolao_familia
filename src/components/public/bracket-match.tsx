import Link from 'next/link'
import type { BracketSlot } from '@/lib/services/bracket/types'
import { Flag } from '@/components/ui/flag'
import { getTimeFlag } from '@/lib/utils/flags'
import { formatarData, formatarHora } from '@/lib/utils/date'

type Props = {
  slot: BracketSlot
  size?: 'sm' | 'md' | 'lg'
  href?: string
}

const SIZE_CLASSES = {
  sm: 'text-xs p-2 min-w-[140px]',
  md: 'text-sm p-3 min-w-[180px]',
  lg: 'text-base p-4 min-w-[220px]',
}

/**
 * Gera texto descritivo para slot cujo time depende de 3rd de set de grupos.
 * Ex: "3º de A, B, C, D ou F"
 * Retorna null se não for um caso de 3rd-set indefinido.
 */
function placeholder3rd(source: BracketSlot['sourceGrupo'], lado: 'timeA' | 'timeB'): string | null {
  if (!source) return null
  const info = source[lado]
  if (!info) return null
  if (info.posicao !== 3) return null
  const grupos = info.gruposAlternativos
  if (!grupos || grupos.length < 2) return null
  if (grupos.length === 2) return `3º de ${grupos[0]} ou ${grupos[1]}`
  const ultimos = grupos.slice(0, -1).join(', ')
  return `3º de ${ultimos} ou ${grupos[grupos.length - 1]}`
}

function formatarDataHora(data: Date): string {
  return `${formatarData(data)} · ${formatarHora(data)}`
}

export function BracketMatch({ slot, size = 'md', href }: Props) {
  const isFinalizado = slot.status === 'finalizado'
  const isTBD = slot.timeA === null && slot.timeB === null
  const comPenaltes = isFinalizado
    && slot.placarA === slot.placarB
    && slot.placarPenaltisA !== null
    && slot.placarPenaltisB !== null

  const placeholderA = slot.timeA === null ? placeholder3rd(slot.sourceGrupo, 'timeA') : null
  const placeholderB = slot.timeB === null ? placeholder3rd(slot.sourceGrupo, 'timeB') : null
  const textoA = slot.timeA ?? placeholderA ?? 'A definir'
  const textoB = slot.timeB ?? placeholderB ?? 'A definir'
  const italicA = !!placeholderA
  const italicB = !!placeholderB
  const isWinnerA = isFinalizado && slot.vencedor === 'A'
  const isWinnerB = isFinalizado && slot.vencedor === 'B'
  const dataHoraTexto = slot.dataHora ? formatarDataHora(slot.dataHora) : null

  const cardClasses = `block bg-card border rounded ${SIZE_CLASSES[size]} ${isTBD ? 'opacity-50' : ''} ${href ? 'hover:bg-muted/50 dark:hover:bg-muted/80 transition-colors cursor-pointer' : ''}`

  const rowClassesA = isWinnerA
    ? 'flex items-center justify-between gap-2 bg-emerald-100 dark:bg-emerald-900/40 -mx-3 px-3 rounded'
    : 'flex items-center justify-between gap-2'

  const rowClassesB = isWinnerB
    ? 'flex items-center justify-between gap-2 bg-emerald-100 dark:bg-emerald-900/40 -mx-3 px-3 rounded'
    : 'flex items-center justify-between gap-2 mt-1'

  const nameClassesA = isWinnerA
    ? 'truncate flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300'
    : `truncate flex items-center gap-1.5 ${italicA ? 'italic text-muted-foreground' : ''} ${slot.vencedor === 'A' ? 'font-bold' : ''}`

  const nameClassesB = isWinnerB
    ? 'truncate flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300'
    : `truncate flex items-center gap-1.5 ${italicB ? 'italic text-muted-foreground' : ''} ${slot.vencedor === 'B' ? 'font-bold' : ''}`

  const scoreClassesA = isWinnerA
    ? 'tabular-nums font-mono font-bold text-emerald-700 dark:text-emerald-300'
    : 'tabular-nums font-mono'

  const scoreClassesB = isWinnerB
    ? 'tabular-nums font-mono font-bold text-emerald-700 dark:text-emerald-300'
    : 'tabular-nums font-mono'

  const inner = (
    <>
      <div className={rowClassesA}>
        <span className={nameClassesA}>
          {slot.timeA && getTimeFlag(slot.timeA) && <Flag codigoIso={getTimeFlag(slot.timeA)!} size={size === 'sm' ? 14 : 18} />}
          <span className="truncate">{textoA}</span>
        </span>
        <span className={scoreClassesA}>{slot.placarA ?? '-'}</span>
      </div>
      <div className={rowClassesB}>
        <span className={nameClassesB}>
          {slot.timeB && getTimeFlag(slot.timeB) && <Flag codigoIso={getTimeFlag(slot.timeB)!} size={size === 'sm' ? 14 : 18} />}
          <span className="truncate">{textoB}</span>
        </span>
        <span className={scoreClassesB}>{slot.placarB ?? '-'}</span>
      </div>
      {comPenaltes && (
        <div className="text-xs text-muted-foreground mt-1 text-center">
          ({slot.placarPenaltisA}-{slot.placarPenaltisB} pen)
        </div>
      )}
      {dataHoraTexto && (
        <div className="text-[10px] text-muted-foreground mt-1.5 whitespace-nowrap border-t pt-1">
          {dataHoraTexto}
        </div>
      )}
    </>
  )

  if (href) {
    return (
      <Link href={href} className={cardClasses}>
        {inner}
      </Link>
    )
  }

  return <div className={cardClasses}>{inner}</div>
}
