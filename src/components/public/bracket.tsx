'use client'
import type { BracketSlot } from '@/lib/services/bracket/types'
import { BracketTwoSided } from './bracket-two-sided'
import { BracketMobile } from './bracket-mobile'

type Props = {
  slots: BracketSlot[]
}

export function Bracket({ slots }: Props) {
  return (
    <div>
      <BracketMobile slots={slots} />
      <BracketTwoSided slots={slots} />
    </div>
  )
}
