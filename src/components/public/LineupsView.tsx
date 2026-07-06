import { cn } from "@/lib/utils"

interface Jogador {
  nome: string
  posicao: string
}

interface LineupsProps {
  lineups: {
    timeA: Jogador[]
    timeB: Jogador[]
  } | null
  timeA: string | null
  timeB: string | null
}

type PosicaoCategoria = "goleiro" | "defesa" | "meio" | "ataque" | "desconhecido"

function normalizarPosicao(posicao: string): PosicaoCategoria {
  const pos = posicao.toLowerCase()
  if (pos.includes("goalkeeper") || pos.includes("goleiro")) return "goleiro"
  if (pos.includes("defender") || pos.includes("defesa") || pos.includes("back")) return "defesa"
  if (pos.includes("midfielder") || pos.includes("meio") || pos.includes("mid")) return "meio"
  if (pos.includes("forward") || pos.includes("atacante") || pos.includes("striker")) return "ataque"
  return "desconhecido"
}

const posicaoLabels: Record<PosicaoCategoria, string> = {
  goleiro: "Goleiro",
  defesa: "Defesa",
  meio: "Meio-campo",
  ataque: "Ataque",
  desconhecido: "Outros",
}

const posicaoCores: Record<PosicaoCategoria, string> = {
  goleiro: "",
  defesa: "bg-blue-100 dark:bg-blue-950",
  meio: "bg-yellow-100 dark:bg-yellow-950",
  ataque: "bg-red-100 dark:bg-red-950",
  desconhecido: "",
}

function agruparPorPosicao(jogadores: Jogador[]): Map<PosicaoCategoria, Jogador[]> {
  const grupos = new Map<PosicaoCategoria, Jogador[]>()
  const ordem: PosicaoCategoria[] = ["goleiro", "defesa", "meio", "ataque", "desconhecido"]

  for (const jogador of jogadores) {
    const categoria = normalizarPosicao(jogador.posicao)
    if (!grupos.has(categoria)) grupos.set(categoria, [])
    grupos.get(categoria)!.push(jogador)
  }

  const ordenado = new Map<PosicaoCategoria, Jogador[]>()
  for (const cat of ordem) {
    if (grupos.has(cat) && grupos.get(cat)!.length > 0) {
      ordenado.set(cat, grupos.get(cat)!)
    }
  }
  return ordenado
}

function ListaJogadores({ jogadores }: { jogadores: Jogador[] }) {
  const grupos = agruparPorPosicao(jogadores)

  if (grupos.size === 0) {
    return <p className="text-sm text-muted-foreground">Escalação não disponível</p>
  }

  return (
    <div className="space-y-3">
      {Array.from(grupos.entries()).map(([categoria, jogadoresCat]) => (
        <div key={categoria} className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {posicaoLabels[categoria]}
          </p>
          <div className="space-y-1">
            {jogadoresCat.map((jogador, idx) => (
              <div
                key={`${jogador.nome}-${idx}`}
                className={cn(
                  "px-3 py-2 rounded-md text-sm",
                  posicaoCores[categoria]
                )}
              >
                {jogador.nome}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function LineupsView({ lineups, timeA, timeB }: LineupsProps) {
  if (!lineups || (lineups.timeA.length === 0 && lineups.timeB.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <span className="text-6xl mb-4">⚽</span>
        <h3 className="text-xl font-semibold mb-2">Escalações não disponíveis</h3>
        <p className="text-muted-foreground text-center max-w-md">
          As escalações serão exibidas quando o jogo começar
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-3">
        <h3 className="text-lg font-display tracking-wide text-center">
          {timeA ?? "Time A"}
        </h3>
        <ListaJogadores jogadores={lineups.timeA} />
      </div>
      <div className="space-y-3">
        <h3 className="text-lg font-display tracking-wide text-center">
          {timeB ?? "Time B"}
        </h3>
        <ListaJogadores jogadores={lineups.timeB} />
      </div>
    </div>
  )
}
