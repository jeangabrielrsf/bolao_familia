import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'

interface ParticipantCardProps {
  id: string
  nome: string
  fotoUrl: string | null
}

export function ParticipantCard({ id, nome, fotoUrl }: ParticipantCardProps) {
  return (
    <Link href={`/participantes/${id}`} className="rounded-lg focus:ring-2 focus:ring-ring focus:outline-none block">
      <Card className="group hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg transition-all duration-300">
        <CardContent className="flex flex-col items-center gap-3 p-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-muted flex items-center justify-center ring-2 ring-border group-hover:ring-primary/30 transition-all relative">
            {fotoUrl ? (
              <Image src={fotoUrl} alt={nome} fill className="object-cover" />
            ) : (
              <span className="text-2xl font-display font-bold text-primary">{nome.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <span className="font-semibold text-sm text-center">{nome}</span>
        </CardContent>
      </Card>
    </Link>
  )
}
