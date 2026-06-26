'use client'
type Props = {
  count: number
  onLimpar: () => void
}

export function SimulatorBanner({ count, onLimpar }: Props) {
  if (count === 0) return null
  return (
    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
      <span className="text-amber-900 dark:text-amber-200">
        🎮 Modo simulação — {count} altera{count === 1 ? 'ção' : 'ções'}
      </span>
      <button
        onClick={onLimpar}
        className="px-3 py-1 text-sm bg-amber-200 dark:bg-amber-800 hover:bg-amber-300 dark:hover:bg-amber-700 text-amber-900 dark:text-amber-100 rounded"
      >
        Limpar simulações
      </button>
    </div>
  )
}
