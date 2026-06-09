import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  titulo: string
  valor: string | number
  icone?: ReactNode
  variant?: 'default' | 'success' | 'warning'
}

const variantClasses: Record<string, string> = {
  default: 'border-l-4 border-l-primary',
  success: 'border-l-4 border-l-green-500',
  warning: 'border-l-4 border-l-yellow-500',
}

const iconVariantClasses: Record<string, string> = {
  default: 'text-primary',
  success: 'text-green-500',
  warning: 'text-yellow-500',
}

export function StatsCard({ titulo, valor, icone, variant = 'default' }: StatsCardProps) {
  return (
    <Card className={cn(variantClasses[variant], 'hover:-translate-y-0.5 transition-transform')}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {icone && <div className={`text-2xl ${iconVariantClasses[variant]}`}>{icone}</div>}
          <div>
            <p className="text-sm text-muted-foreground font-medium">{titulo}</p>
            <p className="text-2xl font-display text-foreground">{valor}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
