import { calcularPontosJogo } from '@/lib/utils/helpers'
import type { ConfiguracaoPontuacao } from '@/lib/utils/types'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Table, TableRow, TableCell } from '@/components/ui/Table'

interface JogoPalpite {
  timeA: string
  timeB: string
  dataHora: Date
  resultadoA: number | null
  resultadoB: number | null
  status: string
}

interface PalpiteRow {
  id: string
  placarA: number
  placarB: number
  jogo: JogoPalpite
}

interface PalpitesTableProps {
  titulo: string
  palpites: PalpiteRow[]
  config: ConfiguracaoPontuacao
}

export function PalpitesTable({ titulo, palpites, config }: PalpitesTableProps) {
  return (
    <Card padding="none">
      <div className="bg-primary text-white px-4 py-2 rounded-t-lg">
        <h3 className="font-semibold">{titulo}</h3>
      </div>
      <Table headers={['Jogo', 'Data', 'Palpite', 'Resultado', 'Pts']}>
        {palpites.map((palpite) => {
          const finalizado = palpite.jogo.status === 'finalizado'
          const resultadoA = palpite.jogo.resultadoA
          const resultadoB = palpite.jogo.resultadoB
          let ptsJogo = 0
          if (finalizado && resultadoA !== null && resultadoB !== null) {
            ptsJogo = calcularPontosJogo(
              palpite.placarA, palpite.placarB,
              resultadoA, resultadoB,
              config
            ).pontos
          }
          const dataFormatada = palpite.jogo.dataHora.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
          })
          return (
            <TableRow key={palpite.id}>
              <TableCell>{palpite.jogo.timeA} vs {palpite.jogo.timeB}</TableCell>
              <TableCell>{dataFormatada}</TableCell>
              <TableCell>{palpite.placarA} x {palpite.placarB}</TableCell>
              <TableCell>
                {finalizado ? `${resultadoA} x ${resultadoB}` : '-'}
              </TableCell>
              <TableCell>
                {finalizado ? (
                  <Badge variant={ptsJogo > 0 ? 'success' : 'default'}>{ptsJogo}</Badge>
                ) : '-'}
              </TableCell>
            </TableRow>
          )
        })}
      </Table>
    </Card>
  )
}
