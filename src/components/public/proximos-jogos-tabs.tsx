'use client'

import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import Link from 'next/link'
import type { Jogo } from '@prisma/client'
import { GameCard } from './GameCard'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'
import { formatarData, inicioDiaBrasilia, inicioDiaBrasiliaMais } from '@/lib/utils/date'
import { cn } from '@/lib/utils'

type DiaKey = 'hoje' | 'amanha' | 'depois'

const DIAS: { key: DiaKey; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: 'amanha', label: 'Amanhã' },
  { key: 'depois', label: 'Depois' },
]

const DATA_LABELS: Record<DiaKey, string> = {
  hoje: formatarData(inicioDiaBrasilia()),
  amanha: formatarData(inicioDiaBrasiliaMais(1)),
  depois: formatarData(inicioDiaBrasiliaMais(2)),
}

const VAZIO_MSG: Record<DiaKey, string> = {
  hoje: 'Nenhum jogo hoje',
  amanha: 'Nenhum jogo amanhã',
  depois: 'Nenhum jogo depois de amanhã',
}

interface ProximosJogosTabsProps {
  jogosHoje: Jogo[]
  jogosAmanha: Jogo[]
  jogosDepois: Jogo[]
}

export function ProximosJogosTabs({ jogosHoje, jogosAmanha, jogosDepois }: ProximosJogosTabsProps) {
  const [active, setActive] = useState<DiaKey>('hoje')
  const wrapRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const btnRefs = useRef<Record<DiaKey, HTMLButtonElement | null>>({
    hoje: null,
    amanha: null,
    depois: null,
  })

  const jogosPorDia: Record<DiaKey, Jogo[]> = {
    hoje: jogosHoje,
    amanha: jogosAmanha,
    depois: jogosDepois,
  }
  const jogos = jogosPorDia[active]

  function moveIndicator() {
    const wrap = wrapRef.current
    const btn = btnRefs.current[active]
    const indicator = indicatorRef.current
    if (!wrap || !btn || !indicator) return

    const wrapRect = wrap.getBoundingClientRect()
    const btnRect = btn.getBoundingClientRect()

    indicator.style.left = `${btnRect.left - wrapRect.left}px`
    indicator.style.width = `${btnRect.width}px`
  }

  useLayoutEffect(() => {
    moveIndicator()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  useEffect(() => {
    window.addEventListener('resize', moveIndicator)
    return () => window.removeEventListener('resize', moveIndicator)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display tracking-wide">Próximos Jogos</h2>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/jogos">
            Ver todos <ChevronRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>

      <div className="relative w-full sm:inline-block sm:w-auto" ref={wrapRef}>
        <div className="flex w-full h-11 items-center rounded-md bg-muted p-1 text-muted-foreground relative sm:inline-flex sm:w-auto">
          <div
            ref={indicatorRef}
            className="absolute top-1 bottom-1 rounded-sm bg-primary shadow-sm transition-[left,width] duration-300 ease-out"
            style={{ left: 0, width: 0 }}
            aria-hidden="true"
            data-testid="tab-indicator"
          />
          {DIAS.map((d) => (
            <button
              key={d.key}
              ref={(el) => {
                btnRefs.current[d.key] = el
              }}
              onClick={() => setActive(d.key)}
              role="tab"
              aria-selected={active === d.key}
              data-tab={d.key}
              className={cn(
                'relative z-10 inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-sm px-3 sm:px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active === d.key
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span>{d.label}</span>
              <span className="text-xs opacity-70">{DATA_LABELS[d.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {jogos.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jogos.map((jogo) => (
            <GameCard
              key={jogo.id}
              id={jogo.id}
              timeA={jogo.timeA}
              timeB={jogo.timeB}
              dataHora={jogo.dataHora}
              grupo={jogo.grupo}
              fase={jogo.fase}
              resultadoA={jogo.resultadoA}
              resultadoB={jogo.resultadoB}
              status={jogo.status}
              local={jogo.local}
              cidade={jogo.cidade}
              placarPenaltisA={jogo.placarPenaltisA}
              placarPenaltisB={jogo.placarPenaltisB}
              rankingTimeA={jogo.rankingTimeA}
              rankingTimeB={jogo.rankingTimeB}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <span className="text-6xl mb-4">⚽</span>
            <h3 className="text-xl font-semibold mb-2">{VAZIO_MSG[active]}</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Os jogos serão exibidos aqui quando forem cadastrados.
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  )
}
