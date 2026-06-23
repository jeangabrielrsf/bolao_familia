'use client'
import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { ClassificacaoGrupo, BracketSlot, JogoComTimes } from '@/lib/services/bracket/types'
import { GroupTable } from './group-table'
import { Bracket } from './bracket'
// import { SimulatorTab } from './simulator-tab'  // Tarefa 19

type Props = {
  classificacao: ClassificacaoGrupo[]
  bracket: BracketSlot[]
  jogos: JogoComTimes[]
}

export function CopaTabs({ classificacao, bracket, jogos }: Props) {
  void jogos
  const [tab, setTab] = useState('classificacao')

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="classificacao">Classificação</TabsTrigger>
        <TabsTrigger value="chaveamento">Chaveamento</TabsTrigger>
        <TabsTrigger value="simulador">Simulador</TabsTrigger>
      </TabsList>

      <TabsContent value="classificacao" className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {classificacao.map(g => (
            <GroupTable key={g.grupo} grupo={g} />
          ))}
        </div>
      </TabsContent>

      <TabsContent value="chaveamento" className="mt-6">
        <Bracket slots={bracket} />
      </TabsContent>

      <TabsContent value="simulador" className="mt-6">
        <p className="text-muted-foreground">Simulador em construção (Tarefa 19)</p>
      </TabsContent>
    </Tabs>
  )
}
