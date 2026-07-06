interface Estatisticas {
  timeA_posse?: number
  timeB_posse?: number
  timeA_xg?: number
  timeB_xg?: number
  timeA_grandes_chances?: number
  timeB_grandes_chances?: number
  timeA_chutes_gol?: number
  timeB_chutes_gol?: number
  timeA_chutes?: number
  timeB_chutes?: number
  timeA_escanteios?: number
  timeB_escanteios?: number
  timeA_faltas?: number
  timeB_faltas?: number
  timeA_defesas?: number
  timeB_defesas?: number
  timeA_cartoes_amarelos?: number
  timeB_cartoes_amarelos?: number
  timeA_cartoes_vermelhos?: number
  timeB_cartoes_vermelhos?: number
  timeA_cartoes?: number
  timeB_cartoes?: number
}

interface EstatisticasProps {
  estatisticas: Estatisticas | null
  timeA: string | null
  timeB: string | null
}

interface StatBarProps {
  label: string
  valorA: number | undefined
  valorB: number | undefined
  formato?: "inteiro" | "porcentagem" | "xg"
}

function StatBar({ label, valorA, valorB, formato = "inteiro" }: StatBarProps) {
  if (valorA === undefined && valorB === undefined) return null

  const numA = valorA ?? 0
  const numB = valorB ?? 0
  const total = numA + numB
  const pctA = total > 0 ? (numA / total) * 100 : 50
  const pctB = total > 0 ? (numB / total) * 100 : 50

  const formatarValor = (v: number | undefined) => {
    if (v === undefined) return "—"
    if (formato === "porcentagem") return `${v}%`
    if (formato === "xg") return v.toFixed(2)
    return v.toString()
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold tabular-nums w-16 text-right">
          {formatarValor(valorA)}
        </span>
        <span className="flex-1 text-center text-muted-foreground text-xs uppercase tracking-wide">
          {label}
        </span>
        <span className="font-semibold tabular-nums w-16 text-left">
          {formatarValor(valorB)}
        </span>
      </div>
      <div className="flex gap-1 h-2">
        <div className="flex-1 bg-muted rounded-full overflow-hidden flex justify-end">
          <div
            className="bg-primary rounded-full transition-all duration-500"
            style={{ width: `${pctA}%` }}
          />
        </div>
        <div className="flex-1 bg-muted rounded-full overflow-hidden">
          <div
            className="bg-primary rounded-full transition-all duration-500"
            style={{ width: `${pctB}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export function EstatisticasView({ estatisticas, timeA, timeB }: EstatisticasProps) {
  if (!estatisticas) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <span className="text-6xl mb-4">📊</span>
        <h3 className="text-xl font-semibold mb-2">Estatísticas não disponíveis</h3>
        <p className="text-muted-foreground text-center max-w-md">
          As estatísticas serão exibidas quando o jogo começar
        </p>
      </div>
    )
  }

  const temDados = Object.keys(estatisticas).length > 0

  if (!temDados) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <span className="text-6xl mb-4">📊</span>
        <h3 className="text-xl font-semibold mb-2">Estatísticas não disponíveis</h3>
        <p className="text-muted-foreground text-center max-w-md">
          As estatísticas serão exibidas quando o jogo começar
        </p>
      </div>
    )
  }

  const temCartoesAmarelos = estatisticas.timeA_cartoes_amarelos !== undefined || estatisticas.timeB_cartoes_amarelos !== undefined
  const temCartoesVermelhos = estatisticas.timeA_cartoes_vermelhos !== undefined || estatisticas.timeB_cartoes_vermelhos !== undefined
  const temCartoesGenerico = !temCartoesAmarelos && !temCartoesVermelhos && (estatisticas.timeA_cartoes !== undefined || estatisticas.timeB_cartoes !== undefined)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
        <span className="truncate max-w-[40%] text-right">{timeA ?? "Time A"}</span>
        <span className="w-8" />
        <span className="truncate max-w-[40%] text-left">{timeB ?? "Time B"}</span>
      </div>

      <div className="space-y-5">
        <StatBar label="Posse de bola" valorA={estatisticas.timeA_posse} valorB={estatisticas.timeB_posse} formato="porcentagem" />
        <StatBar label="Expected Goals" valorA={estatisticas.timeA_xg} valorB={estatisticas.timeB_xg} formato="xg" />
        <StatBar label="Grandes chances" valorA={estatisticas.timeA_grandes_chances} valorB={estatisticas.timeB_grandes_chances} />
        <StatBar label="Chutes ao gol" valorA={estatisticas.timeA_chutes_gol} valorB={estatisticas.timeB_chutes_gol} />
        <StatBar label="Chutes totais" valorA={estatisticas.timeA_chutes} valorB={estatisticas.timeB_chutes} />
        <StatBar label="Escanteios" valorA={estatisticas.timeA_escanteios} valorB={estatisticas.timeB_escanteios} />
        <StatBar label="Faltas" valorA={estatisticas.timeA_faltas} valorB={estatisticas.timeB_faltas} />
        <StatBar label="Defesas" valorA={estatisticas.timeA_defesas} valorB={estatisticas.timeB_defesas} />
        {temCartoesAmarelos && (
          <StatBar label="Cartões amarelos" valorA={estatisticas.timeA_cartoes_amarelos} valorB={estatisticas.timeB_cartoes_amarelos} />
        )}
        {temCartoesVermelhos && (
          <StatBar label="Cartões vermelhos" valorA={estatisticas.timeA_cartoes_vermelhos} valorB={estatisticas.timeB_cartoes_vermelhos} />
        )}
        {temCartoesGenerico && (
          <StatBar label="Cartões" valorA={estatisticas.timeA_cartoes} valorB={estatisticas.timeB_cartoes} />
        )}
      </div>
    </div>
  )
}
