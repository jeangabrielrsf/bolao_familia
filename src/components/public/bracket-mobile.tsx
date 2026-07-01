'use client'
import { useState, useRef, useCallback } from 'react'
import type { BracketSlot } from '@/lib/services/bracket/types'
import { BracketMatchCard } from './bracket-match-card'
import { BracketPhaseDots } from './bracket-phase-dots'
import { groupR32BySide } from './bracket-lado-utils'
import { cn } from '@/lib/utils'

type Props = {
  slots: BracketSlot[]
}

const FASES: BracketSlot['fase'][] = ['dezesseis_avos', 'oitavas', 'quartas', 'semifinal', 'final', 'terceiro']

const FASE_LABELS: Record<BracketSlot['fase'], string> = {
  dezesseis_avos: '16 avos de final',
  oitavas: 'Oitavas de final',
  quartas: 'Quartas de final',
  semifinal: 'Semifinal',
  terceiro: '3º Lugar',
  final: 'Final',
}

const FASE_SUBTITLES: Record<BracketSlot['fase'], string> = {
  dezesseis_avos: '16 jogos · 32 seleções',
  oitavas: '8 jogos · 16 seleções',
  quartas: '4 jogos · 8 seleções',
  semifinal: '2 jogos · 4 seleções',
  terceiro: 'Disputa do bronze',
  final: 'A grande final',
}

const SIDE_COLORS = {
  left: { bg: 'bg-blue-950/30', border: 'border-blue-500/20', text: 'text-blue-400' },
  right: { bg: 'bg-purple-950/30', border: 'border-purple-500/20', text: 'text-purple-400' },
} as const

export function BracketMobile({ slots }: Props) {
  const [faseAtiva, setFaseAtiva] = useState<BracketSlot['fase']>('dezesseis_avos')
  const [translateX, setTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const touchStartX = useRef(0)
  const touchStartTranslateX = useRef(0)

  const slotsPorFase = useCallback((fase: BracketSlot['fase']) =>
    slots.filter(s => s.fase === fase).sort((a, b) => a.slot - b.slot),
  [slots])

  const faseIndex = FASES.indexOf(faseAtiva)

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(FASES.length - 1, index))
    setFaseAtiva(FASES[clamped])
    setTranslateX(-clamped * 100)
  }, [])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartTranslateX.current = translateX
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const diff = e.touches[0].clientX - touchStartX.current
    const trackWidth = e.currentTarget.clientWidth
    const newTranslateX = touchStartTranslateX.current + (diff / trackWidth) * 100
    const clamped = Math.max(-(FASES.length - 1) * 100, Math.min(0, newTranslateX))
    setTranslateX(clamped)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsDragging(false)
    const diff = e.changedTouches[0].clientX - touchStartX.current
    const trackWidth = e.currentTarget.clientWidth
    const threshold = trackWidth * 0.15 // 15% swipe threshold
    if (Math.abs(diff) > threshold) {
      goTo(diff > 0 ? faseIndex - 1 : faseIndex + 1)
    } else {
      goTo(faseIndex)
    }
  }

  const renderFaseCards = (fase: BracketSlot['fase']) => {
    const faseSlots = slotsPorFase(fase)
    const isR32 = fase === 'dezesseis_avos'
    const { left, right } = isR32 ? groupR32BySide(faseSlots) : { left: [], right: [] }

    if (isR32 && left.length > 0) {
      return (
        <div className="space-y-4 px-1">
          <div className={cn('rounded-lg p-3', SIDE_COLORS.left.bg, SIDE_COLORS.left.border, 'border')}>
            <div className={cn('text-[11px] font-semibold mb-2', SIDE_COLORS.left.text)}>
              LADO ESQUERDO → SF-1
            </div>
            <div className="space-y-1.5">
              {left.map(slot => (
                <BracketMatchCard key={slot.jogoId} slot={slot} size="sm" href={`/jogos/${slot.jogoId}`} />
              ))}
            </div>
          </div>
          <div className={cn('rounded-lg p-3', SIDE_COLORS.right.bg, SIDE_COLORS.right.border, 'border')}>
            <div className={cn('text-[11px] font-semibold mb-2', SIDE_COLORS.right.text)}>
              LADO DIREITO → SF-2
            </div>
            <div className="space-y-1.5">
              {right.map(slot => (
                <BracketMatchCard key={slot.jogoId} slot={slot} size="sm" href={`/jogos/${slot.jogoId}`} />
              ))}
            </div>
          </div>
        </div>
      )
    }

    if (fase === 'final') {
      return (
        <div className="px-1">
          {faseSlots.map(slot => (
            <BracketMatchCard key={slot.jogoId} slot={slot} size="md" href={`/jogos/${slot.jogoId}`} />
          ))}
        </div>
      )
    }

    return (
      <div className="space-y-1.5 px-1">
        {faseSlots.map(slot => (
          <BracketMatchCard key={slot.jogoId} slot={slot} size="sm" href={`/jogos/${slot.jogoId}`} />
        ))}
      </div>
    )
  }

  return (
    <div className="lg:hidden">
      <BracketPhaseDots faseAtiva={faseAtiva} onSelect={(f) => goTo(FASES.indexOf(f))} />

      <div className="text-center mb-3">
        <div className="text-sm font-semibold text-foreground">{FASE_LABELS[faseAtiva]}</div>
        <div className="text-[11px] text-muted-foreground">{FASE_SUBTITLES[faseAtiva]}</div>
      </div>

      <div
        className="overflow-hidden touch-pan-y select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex"
          style={{
            transform: `translateX(${translateX}%)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          }}
        >
          {FASES.map(f => (
            <div key={f} className="w-full shrink-0">
              {renderFaseCards(f)}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center mt-3 text-[10px] text-muted-foreground px-1">
        <button onClick={() => goTo(faseIndex - 1)} className="hover:text-foreground transition-colors" aria-label="Fase anterior">
          ← Anterior
        </button>
        <span>Arraste para navegar</span>
        <button onClick={() => goTo(faseIndex + 1)} className="hover:text-foreground transition-colors" aria-label="Próxima fase">
          Próximo →
        </button>
      </div>
    </div>
  )
}
