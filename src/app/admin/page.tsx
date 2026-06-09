import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { StatsCard } from '@/components/admin/StatsCard'
import { getTodosParticipantes } from '@/lib/db/queries/participantes'
import { getJogosDoDia, getTodosJogos } from '@/lib/db/queries/jogos'
import { getRanking } from '@/lib/db/queries/ranking'
import { prisma } from '@/lib/db/client'
import { Users, Calendar, Trophy, Upload, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

const statusMap: Record<string, { variant: 'success' | 'destructive' | 'warning'; label: string }> = {
  sucesso: { variant: 'success', label: 'Sucesso' },
  falha: { variant: 'destructive', label: 'Falha' },
  pendente_revisao: { variant: 'warning', label: 'Pendente' },
}

const posicaoBadges: Record<number, { variant: 'secondary' | 'default' | 'destructive'; label: string }> = {
  1: { variant: 'secondary', label: '1º' },
  2: { variant: 'default', label: '2º' },
  3: { variant: 'destructive', label: '3º' },
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
        // eslint-disable-next-line react-hooks/purity
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in-up">
      <h1 className="text-3xl font-display tracking-wide">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard titulo="Total de Participantes" valor={participantes.length} icone={<Users />} variant="default" />
        <StatsCard titulo="Jogos Hoje" valor={jogosHoje.length} icone={<Calendar />} variant="success" />
        <StatsCard titulo="Total de Jogos" valor={todosJogos.length} icone={<Trophy />} variant="default" />
        <StatsCard titulo="Uploads Recentes" valor={uploadsRecentes} icone={<Upload />} variant="warning" />
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-display tracking-wide">Top 3 do Ranking</h2>
        {top3.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center justify-center py-8"><p className="text-muted-foreground">Nenhum participante cadastrado ainda.</p></CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {top3.map((entry, index) => {
              const posicao = index + 1
              const badge = posicaoBadges[posicao]
              return (
                <Card key={entry.participanteId}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    <div className="flex-1 min-w-0"><p className="font-medium truncate">{entry.nome}</p></div>
                    <span className="text-lg font-display text-primary">{entry.pontos} pts</span>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-display tracking-wide">Últimos Uploads</h2>
        {ultimosUploads.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center justify-center py-8"><p className="text-muted-foreground">Nenhum upload registrado.</p></CardContent></Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participante</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ultimosUploads.map((upload) => {
                  const status = statusMap[upload.status] ?? { variant: 'warning' as const, label: upload.status }
                  return (
                    <TableRow key={upload.id}>
                      <TableCell>{upload.participante.nome}</TableCell>
                      <TableCell>{upload.tipoArquivo}</TableCell>
                      <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{upload.criadoEm.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-display tracking-wide">Navegação</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {adminLinks.map((link) => (
            <Button key={link.href} variant="outline" asChild className="h-auto py-4 flex flex-col gap-1">
              <Link href={link.href}>
                <span className="font-medium">{link.label}</span>
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Link>
            </Button>
          ))}
        </div>
      </section>
    </div>
  )
}
