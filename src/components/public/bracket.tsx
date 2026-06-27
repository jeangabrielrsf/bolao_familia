'use client'
import { useState } from 'react'
import type { BracketSlot } from '@/lib/services/bracket/types'
import { BracketColumn } from './bracket-column'
import { BracketGrid } from './bracket-grid'
import { cn } from '@/lib/utils'

type Props = {
  slots: BracketSlot[]
}

const FASES: BracketSlot['fase'][] = ['dezesseis_avos', 'oitavas', 'quartas', 'semifinal', 'final', 'terceiro']

export function Bracket({ slots }: Props) {
  const [faseAtiva, setFaseAtiva] = useState<BracketSlot['fase']>('dezesseis_avos')

  const slotsPorFase = (fase: BracketSlot['fase']) =>
    slots.filter(s => s.fase === fase).sort((a, b) => a.slot - b.slot)

  return (
    <div>
      {/* Mobile: seletor de fase */}
      <div className="lg:hidden mb-4 flex gap-2 overflow-x-auto border-b">
        {FASES.map(f => (
          <button
            key={f}
            onClick={() => setFaseAtiva(f)}
            aria-current={faseAtiva === f ? 'page' : undefined}
            className={cn(
              'relative px-3 py-2 text-sm whitespace-nowrap transition-colors',
              'hover:text-foreground',
              faseAtiva === f ? 'text-foreground font-semibold' : 'text-muted-foreground',
            )}
          >
            {faseLabel(f)}
            {faseAtiva === f && (
              <span aria-hidden className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Mobile: uma fase por vez */}
      <div className="lg:hidden">
        <BracketColumn fase={faseAtiva} slots={slotsPorFase(faseAtiva)} />
      </div>

      {/* Desktop/tablet: grid BBC-style com row spans */}
      <div className="hidden lg:block">
        <BracketGrid slots={slots} />
      </div>
    </div>
  )
}

function faseLabel(f: BracketSlot['fase']): string {
  const map: Record<BracketSlot['fase'], string> = {
    dezesseis_avos: 'R32', oitavas: 'Oitavas', quartas: 'Quartas',
    semifinal: 'Semi', terceiro: '3º', final: 'Final',
  }
  return map[f]
}
