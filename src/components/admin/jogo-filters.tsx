'use client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { GRUPOS, FASES } from '@/lib/utils/constants'

export type FiltrosJogos = {
  fases: string[]
  statuses: string[]
  grupos: string[]
  time: string
  de: string
  ate: string
}

type Props = {
  value: FiltrosJogos
  onChange: (filtros: FiltrosJogos) => void
}

export function JogoFilters({ value, onChange }: Props) {
  const toggle = (key: 'fases' | 'statuses' | 'grupos', item: string) => {
    const list = value[key]
    const updated = list.includes(item)
      ? list.filter(x => x !== item)
      : [...list, item]
    onChange({ ...value, [key]: updated })
  }

  return (
    <div className="bg-card border rounded-lg p-4 mb-4 space-y-3">
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Fase</label>
          <div className="flex gap-1 flex-wrap mt-1">
            {FASES.map(f => (
              <button
                key={f}
                onClick={() => toggle('fases', f)}
                className={`px-2 py-1 text-xs rounded border ${
                  value.fases.includes(f) ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Status</label>
          <div className="flex gap-1 flex-wrap mt-1">
            {['agendado', 'em_andamento', 'finalizado'].map(s => (
              <button
                key={s}
                onClick={() => toggle('statuses', s)}
                className={`px-2 py-1 text-xs rounded border ${
                  value.statuses.includes(s) ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Grupo</label>
          <div className="flex gap-1 flex-wrap mt-1">
            {GRUPOS.map(g => (
              <button
                key={g}
                onClick={() => toggle('grupos', g)}
                className={`px-2 py-1 text-xs rounded border w-8 ${
                  value.grupos.includes(g) ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground">Time</label>
          <Input
            value={value.time}
            onChange={e => onChange({ ...value, time: e.target.value })}
            placeholder="Buscar time..."
            className="mt-1"
          />
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange({ fases: [], statuses: [], grupos: [], time: '', de: '', ate: '' })}
      >
        Limpar filtros
      </Button>
    </div>
  )
}
