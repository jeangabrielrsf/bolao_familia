"use client"

import { useState, useEffect } from "react"
import { GameCard } from "@/components/public/GameCard"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { FilterTabs } from "@/components/public/filter-tabs"
import { FASE_LABELS } from "@/lib/utils/constants"

interface Jogo {
  id: string
  timeA: string
  timeB: string
  dataHora: string
  grupo: string | null
  fase: string
  resultadoA: number | null
  resultadoB: number | null
  status: string
  isBolao: boolean
}

const faseOrder = ["grupos", "oitavas", "quartas", "semifinal", "terceiro", "final"]

export default function JogosPage() {
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("todos")

  useEffect(() => {
    fetch("/api/jogos")
      .then((r) => r.json())
      .then((data) => setJogos(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const jogosFiltrados = jogos.filter((jogo) => {
    if (filter === "todos") return true
    if (filter === "encerrados") return jogo.status === "finalizado"
    if (filter.startsWith("grupo-")) {
      const grupo = filter.replace("grupo-", "")
      return jogo.grupo === grupo
    }
    return true
  })

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <h1 className="text-3xl font-display tracking-wide">Jogos</h1>
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" />
        </div>
      </div>
    )
  }

  const fasesMap = new Map<string, Jogo[]>()
  for (const jogo of jogosFiltrados) {
    if (!fasesMap.has(jogo.fase)) fasesMap.set(jogo.fase, [])
    fasesMap.get(jogo.fase)!.push(jogo)
  }

  const fasesOrdenadas = faseOrder.filter((f) => fasesMap.has(f))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in-up">
      <h1 className="text-3xl font-display tracking-wide">Jogos</h1>

      <FilterTabs onFilterChange={setFilter} />

      {jogosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <span className="text-6xl mb-4">⚽</span>
            <h3 className="text-xl font-semibold mb-2">Nenhum jogo encontrado</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {filter === "todos" ? "Os jogos aparecerão aqui quando cadastrados." : "Nenhum jogo para o filtro selecionado."}
            </p>
          </CardContent>
        </Card>
      ) : (
        fasesOrdenadas.map((fase) => {
          const jogosDaFase = fasesMap.get(fase)!

          if (fase === "grupos") {
            const gruposMap = new Map<string, Jogo[]>()
            for (const jogo of jogosDaFase) {
              const grupo = jogo.grupo ?? "?"
              if (!gruposMap.has(grupo)) gruposMap.set(grupo, [])
              gruposMap.get(grupo)!.push(jogo)
            }
            const gruposOrdenados = Array.from(gruposMap.entries()).sort(([a], [b]) => a.localeCompare(b))

            return (
              <section key={fase} className="space-y-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-display tracking-wide">{FASE_LABELS[fase]}</h2>
                  <Badge>{jogosDaFase.length} jogos</Badge>
                </div>
                {gruposOrdenados.map(([grupo, jogosDoGrupo]) => (
                  <div key={grupo} className="space-y-3">
                    <h3 className="text-lg font-semibold">Grupo {grupo}</h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {jogosDoGrupo.map((jogo) => (
                        <GameCard key={jogo.id} id={jogo.id} timeA={jogo.timeA} timeB={jogo.timeB} dataHora={new Date(jogo.dataHora)} grupo={jogo.grupo} fase={jogo.fase} resultadoA={jogo.resultadoA} resultadoB={jogo.resultadoB} status={jogo.status} isBolao={jogo.isBolao} />
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            )
          }

          return (
            <section key={fase} className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-display tracking-wide">{FASE_LABELS[fase]}</h2>
                <Badge>{jogosDaFase.length} jogos</Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {jogosDaFase.map((jogo) => (
                  <GameCard key={jogo.id} id={jogo.id} timeA={jogo.timeA} timeB={jogo.timeB} dataHora={new Date(jogo.dataHora)} grupo={jogo.grupo} fase={jogo.fase} resultadoA={jogo.resultadoA} resultadoB={jogo.resultadoB} status={jogo.status} isBolao={jogo.isBolao} />
                ))}
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}
