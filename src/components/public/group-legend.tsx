/**
 * Legenda das cores das linhas do GroupTable.
 * Aparece no topo da aba Classificação pra explicar:
 * - Verde: classificado (1º e 2º do grupo)
 * - Amarelo: melhor 8 terceiros (3º que avança pro R32)
 * - Vermelho: eliminado (3º que não avança + 4º em diante)
 */
export function GroupLegend() {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm mb-4 text-muted-foreground">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block w-5 h-5 rounded bg-emerald-100 dark:bg-emerald-900/60 border-l-4 border-emerald-500 dark:border-l-emerald-400"
        />
        <span>Classificado (1º e 2º)</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block w-5 h-5 rounded bg-amber-100 dark:bg-amber-900/60 border-l-4 border-amber-500 dark:border-l-amber-400"
        />
        <span>Melhor 8 terceiros</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block w-5 h-5 rounded bg-rose-100 dark:bg-rose-900/60 border-l-4 border-rose-500 dark:border-l-rose-400"
        />
        <span>Eliminado</span>
      </div>
    </div>
  )
}
