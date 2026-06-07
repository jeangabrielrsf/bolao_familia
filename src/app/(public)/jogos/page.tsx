import { getTodosJogos } from '@/lib/db/queries/jogos'
import { GameCard } from '@/components/public/GameCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export const dynamic = 'force-dynamic'

const faseLabels: Record<string, string> = {
  grupos: 'Fase de Grupos',
  oitavas: 'Oitavas de Final',
  quartas: 'Quartas de Final',
  semifinal: 'Semifinal',
  terceiro: 'Disputa pelo 3º Lugar',
  final: 'Final',
}

const faseOrder = ['grupos', 'oitavas', 'quartas', 'semifinal', 'terceiro', 'final']

export default async function JogosPage() {
  const jogos = await getTodosJogos()

  const fasesMap = new Map<string, typeof jogos>()
  for (const jogo of jogos) {
    const fase = jogo.fase
    if (!fasesMap.has(fase)) fasesMap.set(fase, [])
    fasesMap.get(fase)!.push(jogo)
  }

  const fasesOrdenadas = faseOrder.filter((f) => fasesMap.has(f))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-primary">Jogos</h1>

      {fasesOrdenadas.map((fase) => {
        const jogosDaFase = fasesMap.get(fase)!

        if (fase === 'grupos') {
          const gruposMap = new Map<string, typeof jogos>()
          for (const jogo of jogosDaFase) {
            const grupo = jogo.grupo ?? '?'
            if (!gruposMap.has(grupo)) gruposMap.set(grupo, [])
            gruposMap.get(grupo)!.push(jogo)
          }

          const gruposOrdenados = Array.from(gruposMap.entries()).sort(([a], [b]) =>
            a.localeCompare(b)
          )

          return (
            <section key={fase} className="space-y-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-foreground">{faseLabels[fase]}</h2>
                <Badge variant="default">{jogosDaFase.length} jogos</Badge>
              </div>

              {gruposOrdenados.map(([grupo, jogosDoGrupo]) => (
                <div key={grupo} className="space-y-3">
                  <h3 className="text-lg font-semibold text-foreground">
                    Grupo {grupo}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {jogosDoGrupo.map((jogo) => (
                      <GameCard
                        key={jogo.id}
                        timeA={jogo.timeA}
                        timeB={jogo.timeB}
                        dataHora={jogo.dataHora}
                        grupo={jogo.grupo}
                        fase={jogo.fase}
                        resultadoA={jogo.resultadoA}
                        resultadoB={jogo.resultadoB}
                        status={jogo.status}
                      />
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
              <h2 className="text-xl font-bold text-foreground">{faseLabels[fase]}</h2>
              <Badge variant="default">{jogosDaFase.length} jogos</Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {jogosDaFase.map((jogo) => (
                <GameCard
                  key={jogo.id}
                  timeA={jogo.timeA}
                  timeB={jogo.timeB}
                  dataHora={jogo.dataHora}
                  grupo={jogo.grupo}
                  fase={jogo.fase}
                  resultadoA={jogo.resultadoA}
                  resultadoB={jogo.resultadoB}
                  status={jogo.status}
                />
              ))}
            </div>
          </section>
        )
      })}

      {jogos.length === 0 && (
        <Card padding="md" className="text-center text-muted">
          Nenhum jogo encontrado
        </Card>
      )}
    </div>
  )
}
