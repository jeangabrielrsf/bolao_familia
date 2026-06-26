'use client'
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
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        onOpenChange={onOpenChange}
        className="flex flex-col gap-4"
        aria-label={`Simulador do grupo ${grupo.grupo}`}
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
