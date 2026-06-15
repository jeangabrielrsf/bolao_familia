import Image from "next/image"
import Link from "next/link"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import type { RankingEntry } from "@/lib/utils/types"

interface RankingTableProps { ranking: RankingEntry[] }

const posicaoBadges: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" }

export function RankingTable({ ranking }: RankingTableProps) {
  if (ranking.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <span className="text-6xl mb-4">⚽</span>
        <h3 className="text-xl font-semibold mb-2">Nenhum participante ainda</h3>
        <p className="text-muted-foreground text-center max-w-md">Os participantes aparecerão aqui quando cadastrados.</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Participante</TableHead>
          <TableHead className="text-right">Pts</TableHead>
          <TableHead className="text-center">Exatas</TableHead>
          <TableHead className="text-center">Vencedores</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ranking.map((entry, index) => {
          const posicao = index + 1
          return (
            <TableRow key={entry.palpiteGrupoId}>
              <TableCell>{posicaoBadges[posicao] ? <span className="text-lg">{posicaoBadges[posicao]}</span> : <span className="text-muted-foreground font-medium">{posicao}</span>}</TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/participantes/${entry.participanteId}`}
                    aria-label={`Ver perfil de ${entry.nomeParticipante}`}
                    className="block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 shrink-0"
                  >
                    {entry.fotoUrl ? (
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-muted relative">
                        <Image src={entry.fotoUrl} alt={`Foto de ${entry.nomeParticipante}`} fill sizes="32px" className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">{entry.nomeParticipante.charAt(0).toUpperCase()}</div>
                    )}
                  </Link>
                  <div className="flex flex-col">
                    <Link
                      href={`/participantes/${entry.participanteId}`}
                      className="font-medium rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      {entry.nomeGrupo}
                    </Link>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right"><span className="font-display text-xl text-primary">{entry.pontos}</span></TableCell>
              <TableCell className="text-center">{entry.placaresExatos}</TableCell>
              <TableCell className="text-center">{entry.vencedoresCorretos}</TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
