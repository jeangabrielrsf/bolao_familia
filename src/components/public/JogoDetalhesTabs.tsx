"use client"

import Link from "next/link"
import Image from "next/image"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Flag } from "@/components/ui/flag"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { LineupsView } from "@/components/public/LineupsView"
import { EstatisticasView } from "@/components/public/EstatisticasView"
import { getTimeFlag } from "@/lib/utils/flags"

interface Palpite {
  id: string
  placarA: number
  placarB: number
  vencedorPalpite: number | null
  pontos: number
  tipo: "exato" | "vencedor" | "erro"
  posicaoRanking: number | null
  quemPassa: boolean
  bonus: "acertou" | "errou" | "nao-aplicavel"
  palpiteGrupo: {
    nome: string
    participante: {
      id: string
      nome: string
      fotoUrl: string | null
    }
  }
}

interface JogoDetalhesTabsProps {
  jogoId: string
  fase: string
  timeA: string | null
  timeB: string | null
  status: string
  palpites: Palpite[]
  lineups: {
    timeA: { nome: string; posicao: string }[]
    timeB: { nome: string; posicao: string }[]
  } | null
  estatisticas: Record<string, number> | null
}

export function JogoDetalhesTabs({
  fase,
  timeA,
  timeB,
  status,
  palpites,
  lineups,
  estatisticas,
}: JogoDetalhesTabsProps) {
  const isMataMata = fase !== "grupos"
  const finalizado = status === "finalizado"

  return (
    <Tabs defaultValue="palpites" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="palpites">Palpites ({palpites.length})</TabsTrigger>
        <TabsTrigger value="lineups">Escalações</TabsTrigger>
        <TabsTrigger value="estatisticas">Estatísticas</TabsTrigger>
      </TabsList>

      <TabsContent value="palpites" className="space-y-4">
        {palpites.length > 0 ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participante</TableHead>
                  <TableHead>Palpite</TableHead>
                  <TableHead className="text-right">Pontos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {palpites.map((palpite) => (
                  <TableRow key={palpite.id}>
                    <TableCell>
                      <Link
                        href={`/participantes/${palpite.palpiteGrupo.participante.id}`}
                        className="flex items-center gap-2 sm:gap-3 hover:text-primary transition-colors"
                      >
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
                          {palpite.palpiteGrupo.participante.fotoUrl ? (
                            <Image
                              src={palpite.palpiteGrupo.participante.fotoUrl}
                              alt={palpite.palpiteGrupo.participante.nome}
                              width={32}
                              height={32}
                              unoptimized
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-bold text-muted-foreground">
                              {palpite.palpiteGrupo.participante.nome.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-sm truncate">
                            {palpite.palpiteGrupo.nome}
                          </span>
                          {palpite.posicaoRanking && (
                            <span className="text-xs text-muted-foreground">
                              {palpite.posicaoRanking}º no ranking
                            </span>
                          )}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {isMataMata && palpite.placarA === palpite.placarB && palpite.vencedorPalpite ? (
                        <div className="flex flex-col">
                          <span className="font-semibold tabular-nums text-sm sm:text-base">
                            {palpite.placarA} x {palpite.placarB}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <span>→</span>
                            {palpite.vencedorPalpite === 1 ? (
                              <>
                                {timeA && getTimeFlag(timeA) && <Flag codigoIso={getTimeFlag(timeA)!} size={14} />}
                                <span>{timeA} passa</span>
                              </>
                            ) : (
                              <>
                                {timeB && getTimeFlag(timeB) && <Flag codigoIso={getTimeFlag(timeB)!} size={14} />}
                                <span>{timeB} passa</span>
                              </>
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="font-semibold tabular-nums text-sm sm:text-base">
                          {palpite.placarA} x {palpite.placarB}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {finalizado ? (
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-display text-lg text-primary">{palpite.pontos}</span>
                            {palpite.tipo === "exato" && <Badge variant="success">Exato</Badge>}
                            {palpite.tipo === "vencedor" && <Badge variant="info">Vencedor</Badge>}
                            {palpite.tipo === "erro" && <Badge variant="destructive">Erro</Badge>}
                          </div>
                          {palpite.bonus === "acertou" && (
                            <span className="text-xs font-normal text-green-700 dark:text-green-400">
                              +6 quem passa
                            </span>
                          )}
                          {palpite.bonus === "errou" && (
                            <span className="text-xs font-normal text-muted-foreground">
                              errou +6 quem passa
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <span className="text-6xl mb-4">⚽</span>
              <h3 className="text-xl font-semibold mb-2">Nenhum palpite registrado</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Os palpites aparecerão aqui quando cadastrados.
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="lineups">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <LineupsView lineups={lineups} timeA={timeA} timeB={timeB} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="estatisticas">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <EstatisticasView estatisticas={estatisticas} timeA={timeA} timeB={timeB} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
