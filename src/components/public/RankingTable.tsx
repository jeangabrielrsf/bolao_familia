import { Table, TableRow, TableCell } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import type { RankingEntry } from '@/lib/utils/types'

interface RankingTableProps {
  ranking: RankingEntry[]
}

const posicaoBadges: Record<number, { variant: 'warning' | 'default' | 'danger'; label: string }> = {
  1: { variant: 'warning', label: '🥇' },
  2: { variant: 'default', label: '🥈' },
  3: { variant: 'danger', label: '🥉' },
}

export function RankingTable({ ranking }: RankingTableProps) {
  if (ranking.length === 0) {
    return <p className="text-center text-muted py-8">Nenhum participante ainda.</p>
  }

  return (
    <Table headers={['#', 'Participante', 'Pts', 'Placares', 'Vencedores']}>
      {ranking.map((entry, index) => {
        const posicao = index + 1
        const badge = posicaoBadges[posicao]

        return (
          <TableRow key={entry.participanteId}>
            <TableCell>
              {badge ? (
                <Badge variant={badge.variant}>{badge.label} {posicao}</Badge>
              ) : (
                <span className="text-muted font-medium">{posicao}</span>
              )}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {entry.fotoUrl ? (
                  <img
                    src={entry.fotoUrl}
                    alt={entry.nome}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary-light text-white flex items-center justify-center text-sm font-bold">
                    {entry.nome.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-medium">{entry.nome}</span>
              </div>
            </TableCell>
            <TableCell>
              <span className="font-bold text-primary text-lg">{entry.pontos}</span>
            </TableCell>
            <TableCell>{entry.placaresExatos}</TableCell>
            <TableCell>{entry.vencedoresCorretos}</TableCell>
          </TableRow>
        )
      })}
    </Table>
  )
}
