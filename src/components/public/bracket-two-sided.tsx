'use client'
import { useState, useMemo } from 'react'
import type { BracketSlot } from '@/lib/services/bracket/types'
import { BracketSide } from './bracket-side'
import { BracketCenter } from './bracket-center'
import { groupR32BySide } from './bracket-lado-utils'

type Props = {
  slots: BracketSlot[]
}

export function BracketTwoSided({ slots }: Props) {
  const [highlightedTeam, setHighlightedTeam] = useState<string | null>(null)

  const { leftSlots, rightSlots, finalSlot, terceiroSlot } = useMemo(() => {
    const final = slots.find(s => s.fase === 'final') ?? null
    const terceiro = slots.find(s => s.fase === 'terceiro') ?? null

    const r32 = slots.filter(s => s.fase === 'dezesseis_avos')
    const { left: r32Left, right: r32Right } = groupR32BySide(r32)

    const oitavas = slots.filter(s => s.fase === 'oitavas')
    const oitLeft = oitavas.filter(s => [1, 2, 5, 6].includes(s.slot))
    const oitRight = oitavas.filter(s => [3, 4, 7, 8].includes(s.slot))

    const quartas = slots.filter(s => s.fase === 'quartas')
    const qfLeft = quartas.filter(s => [1, 2].includes(s.slot))
    const qfRight = quartas.filter(s => [3, 4].includes(s.slot))

    const semis = slots.filter(s => s.fase === 'semifinal')
    const sfLeft = semis.filter(s => s.slot === 1)
    const sfRight = semis.filter(s => s.slot === 2)

    return {
      leftSlots: [...r32Left, ...oitLeft, ...qfLeft, ...sfLeft],
      rightSlots: [...r32Right, ...oitRight, ...qfRight, ...sfRight],
      finalSlot: final,
      terceiroSlot: terceiro,
    }
  }, [slots])

  return (
    <div className="hidden lg:block">
      <div className="overflow-x-auto">
        <div className="flex items-start gap-4 min-w-[900px] justify-center px-4 py-2">
          <BracketSide
            side="left"
            slots={leftSlots}
            highlightedTeam={highlightedTeam}
            onTeamHover={setHighlightedTeam}
          />
          <BracketCenter final={finalSlot} terceiro={terceiroSlot} />
          <BracketSide
            side="right"
            slots={rightSlots}
            highlightedTeam={highlightedTeam}
            onTeamHover={setHighlightedTeam}
          />
        </div>
      </div>
    </div>
  )
}
