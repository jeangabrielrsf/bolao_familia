'use client'
import type { BracketSlot } from '@/lib/services/bracket/types'
import { cn } from '@/lib/utils'

const FASES: BracketSlot['fase'][] = ['dezesseis_avos', 'oitavas', 'quartas', 'semifinal', 'final', 'terceiro']

const FASE_LABELS_SHORT: Record<BracketSlot['fase'], string> = {
  dezesseis_avos: 'R32',
  oitavas: 'Oit.',
  quartas: 'QF',
  semifinal: 'Semi',
  terceiro: '3º',
  final: 'Final',
}

type Props = {
  faseAtiva: BracketSlot['fase']
  onSelect: (fase: BracketSlot['fase']) => void
}

export function BracketPhaseDots({ faseAtiva, onSelect }: Props) {
  return (
    <div className="flex justify-center gap-1.5 py-2">
      {FASES.map(f => (
        <button
          key={f}
          onClick={() => onSelect(f)}
          aria-label={FASE_LABELS_SHORT[f]}
          aria-current={faseAtiva === f ? 'page' : undefined}
          className={cn(
            'w-2 h-2 rounded-full transition-all duration-200',
            faseAtiva === f
              ? 'bg-primary w-5'
              : 'bg-border hover:bg-muted-foreground/50',
          )}
        />
      ))}
    </div>
  )
}
