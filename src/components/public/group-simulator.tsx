'use client'
import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { JogoSimulatorRow } from './jogo-simulator-row'
import type { JogoComTimes, ClassificacaoGrupo } from '@/lib/services/bracket/types'

type Props = {
  grupo: ClassificacaoGrupo
  jogos: JogoComTimes[]                // só futuros (já filtrado pelo caller)
  open: boolean
  onOpenChange: (open: boolean) => void
  onPlacarChange: (jogoId: string, placarA: number, placarB: number) => void
}

export function GroupSimulator({ grupo, jogos, open, onOpenChange, onPlacarChange }: Props) {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = () => setIsDesktop(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? 'right' : 'bottom'}
        onOpenChange={onOpenChange}
        className="flex flex-col gap-4"
      >
        <SheetHeader>
          <SheetTitle>Grupo {grupo.grupo}</SheetTitle>
          <SheetDescription>
            {jogos.length === 0
              ? 'Nenhum jogo futuro neste grupo.'
              : `${jogos.length} jogo${jogos.length === 1 ? '' : 's'} futuro${jogos.length === 1 ? '' : 's'}`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto divide-y">
          {jogos.map(jogo => (
            <JogoSimulatorRow
              key={jogo.id}
              jogo={jogo}
              onPlacarChange={(a, b) => onPlacarChange(jogo.id, a, b)}
            />
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Os cálculos atualizam automaticamente conforme você edita.
        </p>
      </SheetContent>
    </Sheet>
  )
}
