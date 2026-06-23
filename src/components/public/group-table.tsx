import type { ClassificacaoGrupo } from '@/lib/services/bracket/types'
import { Flag } from '@/components/ui/flag'
import { getTimeFlag } from '@/lib/utils/flags'

type Props = {
  grupo: ClassificacaoGrupo
}

export function GroupTable({ grupo }: Props) {
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
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {grupo.times.map((time, idx) => {
            const pos = idx + 1
            const isClassificado = pos <= 2
            const isEliminado = pos > 3
            return (
              <tr key={time.time} className="border-b last:border-0 hover:bg-muted/50">
                <td className="px-3 py-2 text-muted-foreground tabular-nums">{pos}</td>
                <td className="px-3 py-2 font-medium">
                  <div className="flex items-center gap-2">
                    {getTimeFlag(time.time) && <Flag codigoIso={getTimeFlag(time.time)!} size={20} />}
                    <span>{time.time}</span>
                    {time.posicao === null && (
                      <span className="text-xs text-amber-600" title="Desempate exige fair play / ranking FIFA">⚠</span>
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
                <td className="px-3 py-2 text-right">
                  {isClassificado && (
                    <span className="inline-block px-2 py-0.5 text-xs rounded bg-green-100 text-green-700 border border-green-300">
                      ✓ Classificado
                    </span>
                  )}
                  {pos === 3 && (
                    <span className="inline-block px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-700 border border-amber-300">
                      ⚠ Melhores 8 terceiros
                    </span>
                  )}
                  {isEliminado && (
                    <span className="inline-block px-2 py-0.5 text-xs rounded bg-red-100 text-red-700 border border-red-300">
                      ✗ Eliminado
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
