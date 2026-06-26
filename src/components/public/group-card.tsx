'use client'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GroupTable } from './group-table'
import type { ClassificacaoGrupo } from '@/lib/services/bracket/types'

type Variant = 'compact' | 'full'

type Props = {
  grupo: ClassificacaoGrupo
  qualificadosTerceiros?: Set<string>
  onClick: () => void
  variant?: Variant
}

function getStatusClass(grupo: ClassificacaoGrupo, qualificadosTerceiros?: Set<string>): string {
  const primeiro = grupo.times.find(t => t.posicao === 1)
  const segundo = grupo.times.find(t => t.posicao === 2)
  const terceiro = grupo.times.find(t => t.posicao === 3)
  if (primeiro && segundo) {
    return 'border-l-emerald-500 dark:border-l-emerald-400'
  }
  if (terceiro && qualificadosTerceiros?.has(grupo.grupo)) {
    return 'border-l-amber-500 dark:border-l-amber-400'
  }
  return 'border-l-rose-500 dark:border-l-rose-400'
}

export function GroupCard({ grupo, qualificadosTerceiros, onClick, variant = 'full' }: Props) {
  if (variant === 'compact') {
    return (
      <button
        onClick={onClick}
        aria-label={`Editar jogos do grupo ${grupo.grupo}`}
        className={cn(
          'block w-full text-left rounded-lg border-l-4 bg-card',
          'hover:bg-muted/50 active:bg-muted transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          getStatusClass(grupo, qualificadosTerceiros),
        )}
      >
        <div className="px-3 py-2 flex items-center justify-between">
          <span className="font-display text-sm tracking-wide">GRUPO {grupo.grupo}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
        <div className="px-3 pb-2 space-y-0.5">
          {grupo.times.slice(0, 4).map(t => (
            <div key={t.time} className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground w-3 text-right tabular-nums">
                {t.posicao ?? '-'}
              </span>
              <span className="truncate min-w-0 flex-1">{t.time}</span>
              <span className="tabular-nums text-muted-foreground">{t.pontos}</span>
            </div>
          ))}
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      aria-label={`Editar jogos do grupo ${grupo.grupo}`}
      className="block w-full text-left rounded-lg hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      <div className="flex items-center gap-2 p-3">
        <div className="flex-1 pointer-events-none">
          <GroupTable grupo={grupo} qualificadosTerceiros={qualificadosTerceiros} />
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" aria-hidden />
      </div>
    </button>
  )
}
