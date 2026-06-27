import type { ClassificacaoGrupo } from '@/lib/services/bracket/types'
import { Flag } from '@/components/ui/flag'
import { getTimeFlag } from '@/lib/utils/flags'

type Props = {
  grupo: ClassificacaoGrupo
  qualificadosTerceiros?: Set<string>
}

export function GroupTable({ grupo, qualificadosTerceiros }: Props) {
  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div className="bg-primary text-primary-foreground px-4 py-2 font-display tracking-wide">
        Grupo {grupo.grupo}
      </div>
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground border-b">
          <tr>
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Time</th>
            <th className="px-3 py-2 text-center">P</th>
            <th className="px-3 py-2 text-center">J</th>
            <th className="px-3 py-2 text-center">V</th>
            <th className="px-3 py-2 text-center">E</th>
            <th className="px-3 py-2 text-center">D</th>
            <th className="px-3 py-2 text-center">SG</th>
          </tr>
        </thead>
        <tbody>
          {grupo.times.map((time, idx) => {
            const pos = idx + 1
            const isClassificado = pos <= 2
            const isTerceiro = pos === 3
            const terceiroQualificado = isTerceiro && qualificadosTerceiros?.has(grupo.grupo)
            const isEliminado = pos > 3 || (isTerceiro && !terceiroQualificado)

            const rowBg = isClassificado
              ? 'bg-emerald-100 dark:bg-emerald-900/60'
              : terceiroQualificado
              ? 'bg-amber-100 dark:bg-amber-900/60'
              : isEliminado
              ? 'bg-rose-100 dark:bg-rose-900/60'
              : ''

            const borderAccent = isClassificado
              ? 'border-l-4 border-emerald-500 dark:border-l-emerald-400'
              : terceiroQualificado
              ? 'border-l-4 border-amber-500 dark:border-l-amber-400'
              : isEliminado
              ? 'border-l-4 border-rose-500 dark:border-l-rose-400'
              : ''

            return (
              <tr key={time.time} className={`${rowBg} ${borderAccent} border-b border-border last:border-0`}>
                <td className="px-3 py-2 text-muted-foreground tabular-nums">{pos}</td>
                <td className="px-3 py-2 font-medium">
                  <div className="flex items-center gap-2">
                    {getTimeFlag(time.time) && <Flag codigoIso={getTimeFlag(time.time)!} size={20} />}
                    <span>{time.time}</span>
                    {time.posicao === null && (
                      <span className="text-xs text-amber-600 dark:text-amber-400" title="Desempate exige fair play / ranking FIFA">⚠</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-center tabular-nums font-bold">{time.pontos}</td>
                <td className="px-3 py-2 text-center tabular-nums">{time.jogos}</td>
                <td className="px-3 py-2 text-center tabular-nums">{time.vitorias}</td>
                <td className="px-3 py-2 text-center tabular-nums">{time.empates}</td>
                <td className="px-3 py-2 text-center tabular-nums">{time.derrotas}</td>
                <td className="px-3 py-2 text-center tabular-nums">
                  {time.saldo > 0 ? '+' : ''}{time.saldo}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
