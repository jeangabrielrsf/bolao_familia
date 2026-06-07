import { getTodosParticipantes } from '@/lib/db/queries/participantes'
import { ParticipantCard } from '@/components/public/ParticipantCard'

export const dynamic = 'force-dynamic'

export default async function ParticipantesPage() {
  const participantes = await getTodosParticipantes()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-primary">Participantes</h1>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {participantes.map((p) => (
          <ParticipantCard key={p.id} id={p.id} nome={p.nome} fotoUrl={p.fotoUrl} />
        ))}
      </div>
    </div>
  )
}
