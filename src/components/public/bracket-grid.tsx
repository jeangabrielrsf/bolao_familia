'use client'
import type { BracketSlot } from '@/lib/services/bracket/types'
import { BracketMatch } from './bracket-match'

type Props = {
  slots: BracketSlot[]
}

const FASE_LABEL: Record<BracketSlot['fase'], string> = {
  dezesseis_avos: 'R32',
  oitavas: 'Oitavas',
  quartas: 'Quartas',
  semifinal: 'Semi',
  terceiro: '3º lugar',
  final: 'Final',
}

export function BracketGrid({ slots }: Props) {
  const getSlot = (fase: BracketSlot['fase'], slot: number) =>
    slots.find(s => s.fase === fase && s.slot === slot)

  return (
    <div className="overflow-x-auto pb-4">
      <div
        className="grid gap-x-6 min-w-max"
        style={{
          gridTemplateRows: 'repeat(16, minmax(0, 1fr))',
          gridTemplateColumns: 'repeat(6, 180px)',
        }}
      >
        {/* R32 column (16 jogos, 1 linha cada) */}
        {Array.from({ length: 16 }, (_, i) => i + 1).map(i => {
          const slot = getSlot('dezesseis_avos', i)
          if (!slot) return null
          return (
            <div key={`r32-${i}`} style={{ gridRow: i, gridColumn: 1 }} className="flex items-center">
              <BracketMatch slot={slot} size="sm" />
            </div>
          )
        })}

        {/* R16 column (8 jogos, 2 linhas cada) */}
        {Array.from({ length: 8 }, (_, i) => i + 1).map(i => {
          const slot = getSlot('oitavas', i)
          if (!slot) return null
          return (
            <div
              key={`r16-${i}`}
              style={{ gridRow: `${(i - 1) * 2 + 1} / span 2`, gridColumn: 2 }}
              className="flex items-center"
            >
              <BracketMatch slot={slot} size="sm" />
            </div>
          )
        })}

        {/* QF column (4 jogos, 4 linhas cada) */}
        {Array.from({ length: 4 }, (_, i) => i + 1).map(i => {
          const slot = getSlot('quartas', i)
          if (!slot) return null
          return (
            <div
              key={`qf-${i}`}
              style={{ gridRow: `${(i - 1) * 4 + 1} / span 4`, gridColumn: 3 }}
              className="flex items-center"
            >
              <BracketMatch slot={slot} size="sm" />
            </div>
          )
        })}

        {/* SF column (2 jogos, 8 linhas cada) */}
        {Array.from({ length: 2 }, (_, i) => i + 1).map(i => {
          const slot = getSlot('semifinal', i)
          if (!slot) return null
          return (
            <div
              key={`sf-${i}`}
              style={{ gridRow: `${(i - 1) * 8 + 1} / span 8`, gridColumn: 4 }}
              className="flex items-center"
            >
              <BracketMatch slot={slot} size="sm" />
            </div>
          )
        })}

        {/* Final column (1 jogo, 16 linhas) */}
        {(() => {
          const slot = getSlot('final', 1)
          if (!slot) return null
          return (
            <div
              key="f-1"
              style={{ gridRow: '1 / span 16', gridColumn: 5 }}
              className="flex items-center"
            >
              <BracketMatch slot={slot} size="md" />
            </div>
          )
        })()}

        {/* 3º lugar (1 jogo, entre SF-M1 e SF-M2 — linhas 7-10) */}
        {(() => {
          const slot = getSlot('terceiro', 1)
          if (!slot) return null
          return (
            <div
              key="tp-1"
              style={{ gridRow: '7 / span 4', gridColumn: 6 }}
              className="flex flex-col items-center justify-center"
            >
              <div className="text-xs font-display tracking-wide text-muted-foreground mb-1">
                {FASE_LABEL.terceiro}
              </div>
              <BracketMatch slot={slot} size="sm" />
            </div>
          )
        })()}
      </div>

      {/* Fase labels — header row */}
      <div
        className="grid gap-x-6 mt-3 min-w-max text-xs font-display tracking-wide text-muted-foreground text-center"
        style={{ gridTemplateColumns: 'repeat(6, 180px)' }}
      >
        <div>R32</div>
        <div>Oitavas</div>
        <div>Quartas</div>
        <div>Semi</div>
        <div>Final</div>
        <div></div>
      </div>
    </div>
  )
}
