'use client'
import { useState, useMemo } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { ClassificacaoGrupo, BracketSlot, JogoComTimes } from '@/lib/services/bracket/types'
import { getMelhores8Terceiros } from '@/lib/services/bracket/best-thirds'
import { GroupTable } from './group-table'
import { GroupLegend } from './group-legend'
import { Bracket } from './bracket'
import { SimulatorTab } from './simulator-tab'

type Props = {
  classificacao: ClassificacaoGrupo[]
  bracket: BracketSlot[]
  jogos: JogoComTimes[]
}

export function CopaTabs({ classificacao, bracket, jogos }: Props) {
  const [tab, setTab] = useState('classificacao')

  const qualificadosTerceiros = useMemo(
    () => new Set(getMelhores8Terceiros(classificacao).map(t => t.grupo)),
    [classificacao]
  )

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="classificacao">Classificação</TabsTrigger>
        <TabsTrigger value="chaveamento">Chaveamento</TabsTrigger>
        <TabsTrigger value="simulador">Simulador</TabsTrigger>
      </TabsList>

      <TabsContent value="classificacao" className="mt-6">
        <GroupLegend />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {classificacao.map(g => (
            <GroupTable key={g.grupo} grupo={g} qualificadosTerceiros={qualificadosTerceiros} />
          ))}
        </div>
      </TabsContent>

      <TabsContent value="chaveamento" className="mt-6">
        <Bracket slots={bracket} />
      </TabsContent>

      <TabsContent value="simulador" className="mt-6">
        <SimulatorTab jogos={jogos} />
      </TabsContent>
    </Tabs>
  )
}
