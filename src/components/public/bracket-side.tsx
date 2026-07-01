'use client'

import type { BracketSlot } from '@/lib/services/bracket/types'
import { BracketMatchCard } from './bracket-match-card'
import { cn } from '@/lib/utils'

type Props = {
  side: 'left' | 'right'
  /** Slots R32 + Oitavas + QF + SF deste lado */
  slots: BracketSlot[]
  highlightedTeam?: string | null
  onTeamHover?: (team: string | null) => void
}

const SIDE_COLORS = {
  left: { bg: 'bg-blue-950/30', text: 'text-blue-400', label: 'SF-1 ←' },
  right: { bg: 'bg-purple-950/30', text: 'text-purple-400', label: '→ SF-2' },
} as const

const FASE_LABELS: Record<BracketSlot['fase'], string> = {
  dezesseis_avos: '16 AVOS',
  oitavas: 'OITAVAS',
  quartas: 'QUARTAS',
  semifinal: 'SEMI',
  terceiro: '3º',
  final: 'FINAL',
}

export function BracketSide({ side, slots, highlightedTeam, onTeamHover }: Props) {
  const colors = SIDE_COLORS[side]
  const grouped = groupByFase(slots)

  return (
    <div className={cn('rounded-lg p-3 flex-1 min-w-0', colors.bg)}>
      <div className={cn('text-xs font-semibold mb-3 text-center', colors.text)}>
        {side === 'left' ? 'LADO ESQUERDO' : 'LADO DIREITO'}
      </div>

      <div className="flex gap-2">
        {(Object.keys(grouped) as BracketSlot['fase'][]).filter(f => f !== 'final' && f !== 'terceiro').map(fase => (
          <div key={fase} className="flex-1 min-w-0">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider text-center mb-1">
              {FASE_LABELS[fase]}
            </div>
            <div className="space-y-1">
              {grouped[fase].map(slot => (
                <BracketMatchCard
                  key={slot.jogoId}
                  slot={slot}
                  size="sm"
                  href={`/jogos/${slot.jogoId}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function groupByFase(slots: BracketSlot[]): Record<string, BracketSlot[]> {
  const g: Record<string, BracketSlot[]> = {}
  for (const s of slots) {
    (g[s.fase] ??= []).push(s)
  }
  for (const fase of Object.keys(g)) {
    g[fase].sort((a, b) => a.slot - b.slot)
  }
  return g
}
