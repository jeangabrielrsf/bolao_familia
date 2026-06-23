'use client'
type Props = {
  count: number
  onLimpar: () => void
}

export function SimulatorBanner({ count, onLimpar }: Props) {
  if (count === 0) return null
  return (
    <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
      <span className="text-amber-900">
        🎮 Modo simulação — {count} altera{count === 1 ? 'ção' : 'ções'}
      </span>
      <button
        onClick={onLimpar}
        className="px-3 py-1 text-sm bg-amber-200 hover:bg-amber-300 text-amber-900 rounded"
      >
        Limpar simulações
      </button>
    </div>
  )
}
