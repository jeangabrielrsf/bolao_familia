'use client'
import { Input } from '@/components/ui/input'
import { Flag } from '@/components/ui/flag'
import { getTimeFlag } from '@/lib/utils/flags'
import type { JogoComTimes } from '@/lib/services/bracket/types'

type Props = {
  jogo: JogoComTimes
  onPlacarChange: (placarA: number, placarB: number) => void
}

export function JogoSimulatorRow({ jogo, onPlacarChange }: Props) {
  const finalizado = jogo.status === 'finalizado'

  if (finalizado && jogo.resultadoA !== null && jogo.resultadoB !== null) {
    return (
      <div className="flex items-center gap-3 py-2 opacity-60">
        {jogo.timeA && getTimeFlag(jogo.timeA) && <Flag codigoIso={getTimeFlag(jogo.timeA)!} size={20} />}
        <span className="flex-1 font-medium">{jogo.timeA}</span>
        <span className="font-mono tabular-nums">{jogo.resultadoA}</span>
        <span className="text-muted-foreground">×</span>
        <span className="font-mono tabular-nums">{jogo.resultadoB}</span>
        <span className="flex-1 font-medium text-right">{jogo.timeB}</span>
        {jogo.timeB && getTimeFlag(jogo.timeB) && <Flag codigoIso={getTimeFlag(jogo.timeB)!} size={20} />}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 py-2">
      {jogo.timeA && getTimeFlag(jogo.timeA) && <Flag codigoIso={getTimeFlag(jogo.timeA)!} size={20} />}
      <span className="flex-1 font-medium">{jogo.timeA}</span>
      <Input
        type="number"
        min="0"
        max="99"
        value={jogo.resultadoA ?? ''}
        onChange={e => onPlacarChange(parseInt(e.target.value) || 0, jogo.resultadoB ?? 0)}
        aria-label={`Placar ${jogo.timeA}`}
        className="w-16 text-center"
      />
      <span className="text-muted-foreground">×</span>
      <Input
        type="number"
        min="0"
        max="99"
        value={jogo.resultadoB ?? ''}
        onChange={e => onPlacarChange(jogo.resultadoA ?? 0, parseInt(e.target.value) || 0)}
        aria-label={`Placar ${jogo.timeB}`}
        className="w-16 text-center"
      />
      <span className="flex-1 font-medium text-right">{jogo.timeB}</span>
      {jogo.timeB && getTimeFlag(jogo.timeB) && <Flag codigoIso={getTimeFlag(jogo.timeB)!} size={20} />}
    </div>
  )
}
