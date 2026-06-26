'use client'
import { useState, useMemo } from 'react'
import type { JogoComTimes } from '@/lib/services/bracket/types'
import { useSimulacao } from '@/lib/hooks/use-simulacao'
import { getClassificacaoGrupos } from '@/lib/services/bracket/standings'
import { getMelhores8Terceiros } from '@/lib/services/bracket/best-thirds'
import { projetarChaveamento } from '@/lib/services/bracket/projector'
import { GroupCard } from './group-card'
import { GroupLegend } from './group-legend'
import { Bracket } from './bracket'
import { GroupSimulator } from './group-simulator'
import { SimulatorBanner } from './simulator-banner'

type Props = {
  jogos: JogoComTimes[]
}

export function SimulatorTab({ jogos }: Props) {
  const [grupoAberto, setGrupoAberto] = useState<string | null>(null)
  const { jogosComSimulacao, setPlacar, clear, count } = useSimulacao(jogos)

  const { classificacao, bracket, qualificadosTerceiros } = useMemo(() => {
    const jogosGrupos = jogosComSimulacao.filter(j => j.fase === 'grupos')
    const jogosMataMata = jogosComSimulacao.filter(j => j.fase !== 'grupos')
    const c = getClassificacaoGrupos(jogosGrupos)
    const t = getMelhores8Terceiros(c)
    const q = new Set(t.map(x => x.grupo))
    const b = projetarChaveamento({ classificacao: c, melhoresTerceiros: t, jogosMataMata })
    return { classificacao: c, bracket: b, qualificadosTerceiros: q }
  }, [jogosComSimulacao])

  const grupoAtual = classificacao.find(g => g.grupo === grupoAberto) ?? null
  const jogosFuturosGrupoAtual = grupoAberto
    ? jogosComSimulacao.filter(j => j.fase === 'grupos' && j.grupo === grupoAberto && j.status !== 'finalizado')
    : []

  return (
    <div>
      <SimulatorBanner count={count} onLimpar={clear} />
      <p className="text-sm text-muted-foreground mb-4">
        Clique num grupo pra editar os placares dos jogos futuros. A classificação e o chaveamento atualizam em tempo real.
      </p>

      <GroupLegend />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mb-8">
        {classificacao.map(g => (
          <GroupCard
            key={g.grupo}
            grupo={g}
            qualificadosTerceiros={qualificadosTerceiros}
            onClick={() => setGrupoAberto(g.grupo)}
          />
        ))}
      </div>

      <h3 className="font-display text-xl tracking-wide mb-4">Chaveamento (simulado)</h3>
      <Bracket slots={bracket} />

      {grupoAtual && (
        <GroupSimulator
          grupo={grupoAtual}
          jogos={jogosFuturosGrupoAtual}
          open={!!grupoAberto}
          onOpenChange={(open) => !open && setGrupoAberto(null)}
          onPlacarChange={setPlacar}
        />
      )}
    </div>
  )
}
