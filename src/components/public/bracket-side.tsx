'use client'

import type { BracketSlot } from '@/lib/services/bracket/types'
import { BracketMatchCard } from './bracket-match-card'
import { cn } from '@/lib/utils'
import { reorderR32ByPairing, reorderOitByPairing, reorderQfByPairing } from './bracket-lado-utils'

type Props = {
  side: 'left' | 'right'
  slots: BracketSlot[]
  highlightedTeam?: string | null
  onTeamHover?: (team: string | null) => void
}

const SIDE_COLORS = {
  left: { bg: 'bg-blue-950/30', text: 'text-blue-400' },
  right: { bg: 'bg-purple-950/30', text: 'text-purple-400' },
} as const

const FASE_LABELS: Record<BracketSlot['fase'], string> = {
  dezesseis_avos: '16 AVOS',
  oitavas: 'OITAVAS',
  quartas: 'QUARTAS',
  semifinal: 'SEMI',
  terceiro: '3º',
  final: 'FINAL',
}

export function BracketSide({ side, slots }: Props) {
  const colors = SIDE_COLORS[side]
  const grouped = groupByFase(slots)

  const r32 = reorderR32ByPairing(grouped['dezesseis_avos'] || [], side)
  const oitavas = reorderOitByPairing(grouped['oitavas'] || [], side)
  const quartas = reorderQfByPairing(grouped['quartas'] || [], side)
  const semis = grouped['semifinal'] || []

  // Colunas invertidas no lado direito
  const colR32 = side === 'left' ? 1 : 4
  const colOit = side === 'left' ? 2 : 3
  const colQf = side === 'left' ? 3 : 2
  const colSf = side === 'left' ? 4 : 1

  return (
    <div className={cn('rounded-lg p-3 flex-1 min-w-0', colors.bg)}>
      <div className={cn('text-xs font-semibold mb-3 text-center', colors.text)}>
        {side === 'left' ? 'LADO ESQUERDO' : 'LADO DIREITO'}
      </div>

      {/* Grid com 18 rows para distribuição precisa, altura fixa para aproximar cards */}
      <div className="grid grid-cols-4 gap-2" style={{ gridTemplateRows: 'repeat(18, minmax(0, 1fr))', minHeight: '500px' }}>
        {/* Coluna 16 AVOS - 8 cards */}
        <div className="contents">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider text-center col-span-1" style={{ gridRow: '1', gridColumn: colR32 }}>
            {FASE_LABELS.dezesseis_avos}
          </div>
          {r32.map((slot, i) => (
            <div
              key={`r32-${i}`}
              className="flex items-center justify-center"
              style={{ gridRow: `${i * 2 + 2} / ${i * 2 + 4}`, gridColumn: colR32 }}
            >
              <BracketMatchCard slot={slot} size="sm" href={`/jogos/${slot.jogoId}`} />
            </div>
          ))}
        </div>

        {/* Coluna OITAVAS - 4 cards centralizados entre pares R32 */}
        <div className="contents">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider text-center" style={{ gridRow: '1', gridColumn: colOit }}>
            {FASE_LABELS.oitavas}
          </div>
          {oitavas.map((slot, i) => (
            <div
              key={`oit-${i}`}
              className="flex items-center justify-center"
              style={{ gridRow: `${i * 4 + 2} / ${i * 4 + 6}`, gridColumn: colOit }}
            >
              <BracketMatchCard slot={slot} size="sm" href={`/jogos/${slot.jogoId}`} />
            </div>
          ))}
        </div>

        {/* Coluna QUARTAS - 2 cards centralizados entre pares Oitavas */}
        <div className="contents">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider text-center" style={{ gridRow: '1', gridColumn: colQf }}>
            {FASE_LABELS.quartas}
          </div>
          {quartas.map((slot, i) => (
            <div
              key={`qf-${i}`}
              className="flex items-center justify-center"
              style={{ gridRow: `${i * 8 + 2} / ${i * 8 + 10}`, gridColumn: colQf }}
            >
              <BracketMatchCard slot={slot} size="sm" href={`/jogos/${slot.jogoId}`} />
            </div>
          ))}
        </div>

        {/* Coluna SEMI - 1 card centralizado */}
        <div className="contents">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider text-center" style={{ gridRow: '1', gridColumn: colSf }}>
            {FASE_LABELS.semifinal}
          </div>
          {semis.map((slot, i) => (
            <div
              key={`sf-${i}`}
              className="flex items-center justify-center"
              style={{ gridRow: `${i * 16 + 2} / ${i * 16 + 18}`, gridColumn: colSf }}
            >
              <BracketMatchCard slot={slot} size="sm" href={`/jogos/${slot.jogoId}`} />
            </div>
          ))}
        </div>
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
