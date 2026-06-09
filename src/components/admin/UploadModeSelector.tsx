'use client'

import { CardContent } from '@/components/ui/card'
import { FileText, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

export type UploadMode = 'individual' | 'lote'

interface UploadModeSelectorProps {
  value: UploadMode
  onChange: (mode: UploadMode) => void
}

export function UploadModeSelector({ value, onChange }: UploadModeSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <button
        type="button"
        onClick={() => onChange('individual')}
        className={cn(
          'rounded-lg border-2 p-4 text-left transition-all hover:shadow-md',
          value === 'individual' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        )}
      >
        <CardContent className="p-0 space-y-2">
          <FileText className={cn('w-8 h-8', value === 'individual' ? 'text-primary' : 'text-muted-foreground')} />
          <h3 className="font-semibold">Upload Individual</h3>
          <p className="text-sm text-muted-foreground">Um participante por vez</p>
        </CardContent>
      </button>

      <button
        type="button"
        onClick={() => onChange('lote')}
        className={cn(
          'rounded-lg border-2 p-4 text-left transition-all hover:shadow-md',
          value === 'lote' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        )}
      >
        <CardContent className="p-0 space-y-2">
          <Layers className={cn('w-8 h-8', value === 'lote' ? 'text-primary' : 'text-muted-foreground')} />
          <h3 className="font-semibold">Upload em Lote</h3>
          <p className="text-sm text-muted-foreground">Múltiplos participantes de uma vez</p>
        </CardContent>
      </button>
    </div>
  )
}
