import Link from 'next/link'
import { Card } from '@/components/ui/Card'

interface ParticipantCardProps {
  id: string
  nome: string
  fotoUrl: string | null
}

export function ParticipantCard({ id, nome, fotoUrl }: ParticipantCardProps) {
  return (
    <Link href={`/participantes/${id}`} className="rounded-lg focus:ring-2 focus:ring-primary focus:outline-none">
      <Card padding="sm" className="flex flex-col items-center gap-3 hover:shadow-md transition-shadow cursor-pointer">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
          {fotoUrl ? (
            <img src={fotoUrl} alt={nome} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-gray-400">
              {nome.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <span className="font-semibold text-sm text-center">{nome}</span>
      </Card>
    </Link>
  )
}
