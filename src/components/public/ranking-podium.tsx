import Image from "next/image"
import type { RankingEntry } from "@/lib/utils/types"

interface RankingPodiumProps { ranking: RankingEntry[] }

const podiumStyles = [
  { border: "border-t-4 border-t-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/10", label: "1º", size: "w-20 h-20" },
  { border: "border-t-4 border-t-gray-300", bg: "bg-gray-50 dark:bg-gray-800/30", label: "2º", size: "w-16 h-16" },
  { border: "border-t-4 border-t-amber-600", bg: "bg-amber-50 dark:bg-amber-900/10", label: "3º", size: "w-16 h-16" },
]

export function RankingPodium({ ranking }: RankingPodiumProps) {
  const top3 = ranking.slice(0, 3)
  if (top3.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {top3.map((entry, index) => {
        const style = podiumStyles[index]
        return (
          <div key={entry.palpiteGrupoId} className={`rounded-lg border border-border ${style.border} ${style.bg} p-6 flex flex-col items-center gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}>
            <span className="text-sm font-medium text-muted-foreground">{style.label}</span>
            <div className={`${style.size} rounded-full overflow-hidden bg-background flex items-center justify-center ring-2 ring-border relative`}>
              {entry.fotoUrl ? (
                <Image src={entry.fotoUrl} alt={entry.nomeGrupo} fill className="object-cover" />
              ) : (
                <span className="text-2xl font-display font-bold text-primary">{entry.nomeParticipante.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <span className="font-semibold text-center">{entry.nomeGrupo}</span>
            <span className="text-2xl font-display font-bold text-primary">{entry.pontos} pts</span>
          </div>
        )
      })}
    </div>
  )
}
