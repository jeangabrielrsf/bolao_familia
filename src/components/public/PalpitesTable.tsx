import { calcularPontosJogo } from '@/lib/utils/helpers'
import { formatarData } from '@/lib/utils/date'
import type { ConfiguracaoPontuacao } from '@/lib/utils/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

interface JogoPalpite {
  timeA: string | null
  timeB: string | null
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
    <Card>
      <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jogo</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Palpite</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead className="text-right">Pts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
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
              const dataFormatada = formatarData(palpite.jogo.dataHora)
              return (
                <TableRow key={palpite.id}>
                  <TableCell>{palpite.jogo.timeA ?? 'A definir'} vs {palpite.jogo.timeB ?? 'A definir'}</TableCell>
                  <TableCell>{dataFormatada}</TableCell>
                  <TableCell>{palpite.placarA} x {palpite.placarB}</TableCell>
                  <TableCell>{finalizado ? `${resultadoA} x ${resultadoB}` : '-'}</TableCell>
                  <TableCell className="text-right">
                    {finalizado ? (
                      <Badge variant={ptsJogo > 0 ? 'success' : 'default'}>{ptsJogo}</Badge>
                    ) : '-'}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
