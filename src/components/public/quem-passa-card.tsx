'use client'

import { Flag } from '@/components/ui/flag'
import { cn } from '@/lib/utils'
import { getTimeFlag } from '@/lib/utils/flags'

interface QuemPassaCardProps {
  timeA: string
  timeB: string
  selecionado: number | null
  onSelecionar: (vencedor: number) => void
  disabled?: boolean
}

export function QuemPassaCard({ timeA, timeB, selecionado, onSelecionar, disabled }: QuemPassaCardProps) {
  const flagA = getTimeFlag(timeA)
  const flagB = getTimeFlag(timeB)

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Quem passa?</p>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelecionar(1)}
          className={cn(
            'flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all',
            'min-h-[72px] text-left',
            selecionado === 1
              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
              : 'border-border hover:border-primary/50 hover:bg-muted/50',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {flagA && <Flag codigoIso={flagA} size={40} />}
          <span className="font-medium text-sm sm:text-base">{timeA}</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelecionar(2)}
          className={cn(
            'flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all',
            'min-h-[72px] text-left',
            selecionado === 2
              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
              : 'border-border hover:border-primary/50 hover:bg-muted/50',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {flagB && <Flag codigoIso={flagB} size={40} />}
          <span className="font-medium text-sm sm:text-base">{timeB}</span>
        </button>
      </div>
    </div>
  )
}
