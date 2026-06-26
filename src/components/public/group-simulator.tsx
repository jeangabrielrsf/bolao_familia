'use client'
import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { JogoSimulatorRow } from './jogo-simulator-row'
import type { JogoComTimes, ClassificacaoGrupo } from '@/lib/services/bracket/types'

type Props = {
  grupo: ClassificacaoGrupo
  jogos: JogoComTimes[]
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

  useEffect(() => {
    if (isDesktop || !open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open, isDesktop])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? 'right' : 'bottom'}
        zIndex={isDesktop ? 50 : 60}
        onOpenChange={onOpenChange}
        className={cn(
          'flex flex-col gap-0 p-0',
          isDesktop
            ? 'sm:max-w-md p-6'
            : 'h-[100dvh] max-h-[100dvh] rounded-t-2xl border-t shadow-2xl',
        )}
      >
        {!isDesktop && (
          <>
            <div aria-hidden className="pt-2 pb-1">
              <div className="mx-auto h-1 w-8 rounded-full bg-muted" />
            </div>

            <div className="sticky top-0 z-10 bg-background px-4 py-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <SheetTitle>Grupo {grupo.grupo}</SheetTitle>
                  <SheetDescription>
                    {jogos.length === 0
                      ? 'Nenhum jogo futuro neste grupo.'
                      : `${jogos.length} jogo${jogos.length === 1 ? '' : 's'} futuro${jogos.length === 1 ? '' : 's'}`}
                  </SheetDescription>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y px-4">
              {jogos.map(jogo => (
                <JogoSimulatorRow
                  key={jogo.id}
                  jogo={jogo}
                  onPlacarChange={(a, b) => onPlacarChange(jogo.id, a, b)}
                />
              ))}
            </div>

            <div
              className="sticky bottom-0 bg-background border-t p-4"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
            >
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                Fechar
              </Button>
            </div>
          </>
        )}

        {isDesktop && (
          <>
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
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
