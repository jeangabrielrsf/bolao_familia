'use client'
import { useState } from 'react'
import type { BracketSlot } from '@/lib/services/bracket/types'
import { BracketColumn } from './bracket-column'

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
      <div className="lg:hidden mb-4 flex gap-2 overflow-x-auto">
        {FASES.map(f => (
          <button
            key={f}
            onClick={() => setFaseAtiva(f)}
            className={`px-3 py-1 rounded text-sm whitespace-nowrap ${
              faseAtiva === f ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}
          >
            {faseLabel(f)}
          </button>
        ))}
      </div>

      {/* Mobile: uma fase por vez */}
      <div className="lg:hidden">
        <BracketColumn fase={faseAtiva} slots={slotsPorFase(faseAtiva)} />
      </div>

      {/* Desktop/tablet: todas as fases em scroll horizontal */}
      <div className="hidden lg:block overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-max">
          {FASES.map(f => (
            <BracketColumn key={f} fase={f} slots={slotsPorFase(f)} />
          ))}
        </div>
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
