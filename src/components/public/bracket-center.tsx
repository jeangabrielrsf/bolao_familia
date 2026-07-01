import type { BracketSlot } from '@/lib/services/bracket/types'
import { BracketMatchCard } from './bracket-match-card'

type Props = {
  final: BracketSlot | null
  terceiro: BracketSlot | null
}

export function BracketCenter({ final, terceiro }: Props) {
  return (
    <div className="min-w-[140px] flex flex-col items-center justify-center gap-4 px-2">
      {/* Final */}
      <div className="text-center flex flex-col items-center">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">FINAL</div>
        {final ? (
          <BracketMatchCard
            slot={final}
            size="md"
            href={`/jogos/${final.jogoId}`}
          />
        ) : (
          <div className="bg-card border border-amber-500/50 rounded-md p-3 min-w-[130px] text-center">
            <div className="text-amber-400 font-bold text-sm">🏆 FINAL</div>
            <div className="text-[10px] text-muted-foreground mt-1">A definir</div>
          </div>
        )}
      </div>

      {/* Connector: dashed line */}
      <div className="flex items-center justify-center">
        <div className="w-0.5 h-6" style={{ borderLeft: '2px dashed #475569' }} />
      </div>

      {/* 3rd place */}
      <div className="text-center flex flex-col items-center">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">3º LUGAR</div>
        {terceiro ? (
          <BracketMatchCard
            slot={terceiro}
            size="sm"
            href={`/jogos/${terceiro.jogoId}`}
          />
        ) : (
          <div className="bg-card border border-border rounded-md p-2.5 min-w-[130px] text-center opacity-50">
            <div className="text-[11px] text-muted-foreground">3º Lugar</div>
          </div>
        )}
      </div>
    </div>
  )
}
