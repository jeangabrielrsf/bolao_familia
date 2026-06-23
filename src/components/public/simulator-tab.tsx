'use client'
import { useState, useMemo, useEffect } from 'react'
import type { ClassificacaoGrupo, BracketSlot, JogoComTimes } from '@/lib/services/bracket/types'
import { aplicarSimulacao } from '@/lib/services/bracket/simulator'
import { getClassificacaoGrupos } from '@/lib/services/bracket/standings'
import { getMelhores8Terceiros } from '@/lib/services/bracket/best-thirds'
import { projetarChaveamento } from '@/lib/services/bracket/projector'
import { GroupTable } from './group-table'
import { GroupLegend } from './group-legend'
import { Bracket } from './bracket'
import { SimulatorBanner } from './simulator-banner'

type Props = {
  classificacaoInicial: ClassificacaoGrupo[]
  bracketInicial: BracketSlot[]
  jogos: JogoComTimes[]
}

const STORAGE_KEY = 'copa_sim'

function loadSimulacao(): Record<string, { placarA: number; placarB: number }> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return {}
}

export function SimulatorTab({ classificacaoInicial, bracketInicial, jogos }: Props) {
  void classificacaoInicial
  void bracketInicial

  const [simulacao, setSimulacao] = useState<Record<string, { placarA: number; placarB: number }>>(loadSimulacao)

  useEffect(() => {
    if (Object.keys(simulacao).length === 0) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(simulacao))
    }
  }, [simulacao])

  const { classificacao, bracket, qualificadosTerceiros } = useMemo(() => {
    const jogosSimulados = aplicarSimulacao(jogos, simulacao)
    const jogosGrupos = jogosSimulados.filter(j => j.fase === 'grupos')
    const jogosMataMata = jogosSimulados.filter(j => j.fase !== 'grupos')
    const c = getClassificacaoGrupos(jogosGrupos)
    const t = getMelhores8Terceiros(c)
    const b = projetarChaveamento({ classificacao: c, melhoresTerceiros: t, jogosMataMata })
    const q = new Set(t.map(x => x.grupo))
    return { classificacao: c, bracket: b, qualificadosTerceiros: q }
  }, [jogos, simulacao])

  const limpar = () => setSimulacao({})
  const count = Object.keys(simulacao).length

  return (
    <div>
      <SimulatorBanner count={count} onLimpar={limpar} />
      <p className="text-sm text-muted-foreground mb-4">
        Edite placares de jogos futuros pra ver como isso afeta a classificação e o chaveamento.
      </p>
      <GroupLegend />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {classificacao.map(g => (
          <GroupTable key={g.grupo} grupo={g} qualificadosTerceiros={qualificadosTerceiros} />
        ))}
      </div>
      <h3 className="font-display text-xl tracking-wide mb-4">Chaveamento (simulado)</h3>
      <Bracket slots={bracket} />
    </div>
  )
}
