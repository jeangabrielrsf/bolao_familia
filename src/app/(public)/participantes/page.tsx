import { getTodosParticipantes } from '@/lib/db/queries/participantes'
import { ParticipantCard } from '@/components/public/ParticipantCard'
import { Card, CardContent } from '@/components/ui/card'
import { Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ParticipantesPage() {
  const participantes = await getTodosParticipantes()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-display tracking-wide">Participantes</h1>
        <p className="text-muted-foreground mt-1">{participantes.length} participante{participantes.length !== 1 ? 's' : ''} cadastrado{participantes.length !== 1 ? 's' : ''}</p>
      </div>

      {participantes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum participante</h3>
            <p className="text-muted-foreground text-center max-w-md">Os participantes aparecerão aqui quando cadastrados.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {participantes.map((p) => (
            <ParticipantCard key={p.id} id={p.id} nome={p.nome} fotoUrl={p.fotoUrl} totalPalpites={p.grupos.length} />
          ))}
        </div>
      )}
    </div>
  )
}
