import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, XCircle, Clock } from 'lucide-react'

interface ResumoDeExtrasProps {
  extras: Array<{
    tipo: string
    valorPalpite: string
    valorReal: string | null
    acertou: boolean | null
  }>
}

const tipoExtraLabels: Record<string, string> = {
  artilheiro: 'Artilheiro',
  campeao: 'Campeão',
  vice: 'Vice',
  terceiro: '3º',
  quarto: '4º',
}

const tipoExtraIcons: Record<string, string> = {
  artilheiro: '⚽',
  campeao: '🏆',
  vice: '🥈',
  terceiro: '🥉',
  quarto: '4️⃣',
}

export function ResumoDeExtras({ extras }: ResumoDeExtrasProps) {
  const extrasVisiveis = extras.filter(e => e.valorReal !== null)

  if (extrasVisiveis.length === 0) return null

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-display tracking-wide mb-4">Resumo de Extras</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {extrasVisiveis.map((extra) => (
            <div
              key={extra.tipo}
              className="flex flex-col items-center p-3 rounded-lg border border-border bg-muted/30"
            >
              <span className="text-2xl mb-1">{tipoExtraIcons[extra.tipo]}</span>
              <span className="text-xs font-medium text-muted-foreground mb-2">
                {tipoExtraLabels[extra.tipo]}
              </span>
              {extra.acertou === null ? (
                <Clock className="w-5 h-5 text-yellow-600" />
              ) : extra.acertou ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
