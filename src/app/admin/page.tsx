import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { StatsCard } from '@/components/admin/StatsCard'
import { getTodosParticipantes } from '@/lib/db/queries/participantes'
import { getJogosDoDia, getTodosJogos } from '@/lib/db/queries/jogos'
import { getRanking } from '@/lib/db/queries/ranking'
import { prisma } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

const statusMap: Record<string, { variant: 'success' | 'danger' | 'warning'; label: string }> = {
  sucesso: { variant: 'success', label: 'Sucesso' },
  falha: { variant: 'danger', label: 'Falha' },
  pendente_revisao: { variant: 'warning', label: 'Pendente' },
}

const posicaoBadges: Record<number, { variant: 'warning' | 'default' | 'danger'; label: string }> = {
  1: { variant: 'warning', label: '1º' },
  2: { variant: 'default', label: '2º' },
  3: { variant: 'danger', label: '3º' },
}

const adminLinks = [
  { href: '/admin/upload', label: 'Upload de Palpites' },
  { href: '/admin/participantes', label: 'Participantes' },
  { href: '/admin/jogos', label: 'Jogos' },
  { href: '/admin/resultados', label: 'Resultados' },
  { href: '/admin/config', label: 'Configurações' },
]

export default async function AdminDashboardPage() {
  const [participantes, jogosHoje, todosJogos, ranking, uploadsRecentes, ultimosUploads] = await Promise.all([
    getTodosParticipantes(),
    getJogosDoDia(),
    getTodosJogos(),
    getRanking(),
    prisma.uploadLog.count({
      where: {
        criadoEm: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.uploadLog.findMany({
      take: 5,
      orderBy: { criadoEm: 'desc' },
      include: { participante: true },
    }),
  ])

  const top3 = ranking.slice(0, 3)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-primary">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard titulo="Total de Participantes" valor={participantes.length} variant="default" />
        <StatsCard titulo="Jogos Hoje" valor={jogosHoje.length} variant="success" />
        <StatsCard titulo="Total de Jogos" valor={todosJogos.length} variant="default" />
        <StatsCard titulo="Uploads Recentes" valor={uploadsRecentes} variant="warning" />
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Top 3 do Ranking</h2>
        {top3.length === 0 ? (
          <Card padding="md">
            <p className="text-center text-muted">Nenhum participante cadastrado ainda.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {top3.map((entry, index) => {
              const posicao = index + 1
              const badge = posicaoBadges[posicao]
              return (
                <Card key={entry.participanteId} padding="md" className="flex items-center gap-3">
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{entry.nome}</p>
                  </div>
                  <span className="text-lg font-bold text-primary">{entry.pontos} pts</span>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Últimos Uploads</h2>
        {ultimosUploads.length === 0 ? (
          <Card padding="md">
            <p className="text-center text-muted">Nenhum upload registrado.</p>
          </Card>
        ) : (
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-primary text-white">
                    <th className="px-4 py-3 text-left font-medium">Participante</th>
                    <th className="px-4 py-3 text-left font-medium">Tipo</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {ultimosUploads.map((upload) => {
                    const status = statusMap[upload.status] ?? { variant: 'warning' as const, label: upload.status }
                    return (
                      <tr key={upload.id} className="border-b border-border hover:bg-muted transition-colors">
                        <td className="px-4 py-3">{upload.participante.nome}</td>
                        <td className="px-4 py-3">{upload.tipoArquivo}</td>
                        <td className="px-4 py-3">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {upload.criadoEm.toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Navegação</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="bg-card border border-border rounded-lg p-4 text-center font-medium text-foreground hover:border-primary hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
