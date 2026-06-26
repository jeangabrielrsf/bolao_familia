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
  const dataHoraTexto = slot.dataHora ? formatarDataHora(slot.dataHora) : null

  const cardClasses = `block bg-card border rounded ${SIZE_CLASSES[size]} ${isTBD ? 'opacity-50' : ''} ${href ? 'hover:bg-muted/50 transition-colors cursor-pointer' : ''}`

  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className={`flex-1 truncate flex items-center gap-1.5 ${slot.vencedor === 'A' ? 'font-bold' : ''}`}>
          {slot.timeA && getTimeFlag(slot.timeA) && <Flag codigoIso={getTimeFlag(slot.timeA)!} size={size === 'sm' ? 14 : 18} />}
          <span className={`truncate ${italicA ? 'italic text-muted-foreground' : ''}`}>{textoA}</span>
        </span>
        <span className="tabular-nums font-mono">{slot.placarA ?? '-'}</span>
      </div>
      <div className="flex items-center justify-between gap-2 mt-1">
        <span className={`flex-1 truncate flex items-center gap-1.5 ${slot.vencedor === 'B' ? 'font-bold' : ''}`}>
          {slot.timeB && getTimeFlag(slot.timeB) && <Flag codigoIso={getTimeFlag(slot.timeB)!} size={size === 'sm' ? 14 : 18} />}
          <span className={`truncate ${italicB ? 'italic text-muted-foreground' : ''}`}>{textoB}</span>
        </span>
        <span className="tabular-nums font-mono">{slot.placarB ?? '-'}</span>
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
