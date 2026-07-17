'use client'

import { cn } from '@/lib/utils'
import { FASE_LABELS, FASE_COMBINADA_TERCEIRO_FINAL } from '@/lib/utils/constants'

interface PhaseSelectorProps {
  fasesHabilitadas: Record<string, boolean>
  faseAtual: string | null
  onFaseChange: (fase: string | null) => void
}

export function PhaseSelector({ fasesHabilitadas, faseAtual, onFaseChange }: PhaseSelectorProps) {
  const fasesAtivasOriginal = Object.entries(fasesHabilitadas)
    .filter(([, habilitado]) => habilitado)
    .map(([fase]) => fase)

  const terceiroHabilitado = fasesHabilitadas.terceiro === true
  const finalHabilitada = fasesHabilitadas.final === true
  const ambasHabilitadas = terceiroHabilitado && finalHabilitada

  const fasesAtivas = ambasHabilitadas
    ? [...fasesAtivasOriginal.filter((f) => f !== 'terceiro' && f !== 'final'), FASE_COMBINADA_TERCEIRO_FINAL]
    : fasesAtivasOriginal

  if (fasesAtivas.length === 0) return null

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">Fase</label>
      <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-muted/50" role="tablist">
        <button
          role="tab"
          aria-selected={faseAtual === null}
          onClick={() => onFaseChange(null)}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            faseAtual === null
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Fase de Grupos
        </button>
        {fasesAtivas.map((fase) => (
          <button
            key={fase}
            role="tab"
            aria-selected={faseAtual === fase}
            onClick={() => onFaseChange(fase)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              faseAtual === fase
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {FASE_LABELS[fase] ?? fase}
          </button>
        ))}
      </div>
    </div>
  )
}
