import type { BracketSlot } from '@/lib/services/bracket/types'
import { BracketMatch } from './bracket-match'

type Props = {
  fase: BracketSlot['fase']
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

export function BracketColumn({ fase, slots }: Props) {
  return (
    <div className="flex flex-col gap-3 min-w-[180px]">
      <h4 className="text-xs font-display tracking-wide text-muted-foreground text-center">
        {FASE_LABEL[fase]}
      </h4>
      {slots.map(slot => (
        <BracketMatch key={slot.jogoId} slot={slot} size="sm" href={`/jogos/${slot.jogoId}`} />
      ))}
    </div>
  )
}
