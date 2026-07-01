'use client'
import { useMemo, useRef, useLayoutEffect, useState } from 'react'
import type { BracketSlot } from '@/lib/services/bracket/types'
import { BracketSide } from './bracket-side'
import { BracketCenter } from './bracket-center'
import { groupR32BySide } from './bracket-lado-utils'

type Props = {
  slots: BracketSlot[]
}

type Point = { x: number; y: number }

const PAIRING_R32_TO_OIT = [[2,5],[1,3],[4,6],[7,8],[11,12],[9,10],[14,16],[13,15]] as const
const PAIRING_OIT_TO_QF = [[1,2],[5,6],[3,4],[7,8]] as const
const PAIRING_QF_TO_SF = [[1,2],[3,4]] as const

export function BracketTwoSided({ slots }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [connectors, setConnectors] = useState<React.ReactNode[]>([])

  const { leftSlots, rightSlots, finalSlot, terceiroSlot } = useMemo(() => {
    const final = slots.find(s => s.fase === 'final') ?? null
    const terceiro = slots.find(s => s.fase === 'terceiro') ?? null

    const r32 = slots.filter(s => s.fase === 'dezesseis_avos')
    const { left: r32Left, right: r32Right } = groupR32BySide(r32)

    const oitavas = slots.filter(s => s.fase === 'oitavas')
    const oitLeft = oitavas.filter(s => [1, 2, 5, 6].includes(s.slot))
    const oitRight = oitavas.filter(s => [3, 4, 7, 8].includes(s.slot))

    const quartas = slots.filter(s => s.fase === 'quartas')
    const qfLeft = quartas.filter(s => [1, 2].includes(s.slot))
    const qfRight = quartas.filter(s => [3, 4].includes(s.slot))

    const semis = slots.filter(s => s.fase === 'semifinal')
    const sfLeft = semis.filter(s => s.slot === 1)
    const sfRight = semis.filter(s => s.slot === 2)

    return {
      leftSlots: [...r32Left, ...oitLeft, ...qfLeft, ...sfLeft],
      rightSlots: [...r32Right, ...oitRight, ...qfRight, ...sfRight],
      finalSlot: final,
      terceiroSlot: terceiro,
    }
  }, [slots])

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    requestAnimationFrame(() => {
      const cRect = container.getBoundingClientRect()

      const center = (jogoId: string): Point | null => {
        const el = container.querySelector(`[data-jogo-id="${jogoId}"]`)
        if (!el) return null
        const r = el.getBoundingClientRect()
        return {
          x: r.left - cRect.left + r.width / 2,
          y: r.top - cRect.top + r.height / 2,
        }
      }

      type Conn = { a: Point; b: Point; key: string }
      const lines: Conn[] = []

      const connectPair = (slotA: number, slotB: number, targetSlot: number, faseSource: string, faseTarget: string, side: 'left' | 'right') => {
        const srcA = slots.find(s => (s as Record<string, unknown>).slot === slotA && (s as Record<string, unknown>).fase === faseSource)
        const srcB = slots.find(s => (s as Record<string, unknown>).slot === slotB && (s as Record<string, unknown>).fase === faseSource)
        const tgt = slots.find(s => (s as Record<string, unknown>).slot === targetSlot && (s as Record<string, unknown>).fase === faseTarget)

        if (!srcA || !srcB || !tgt) return

        const pa = center(srcA.jogoId)
        const pb = center(srcB.jogoId)
        const pt = center(tgt.jogoId)
        if (!pa || !pb || !pt) return

        const isLeft = side === 'left'
        const edgeX = isLeft ? Math.max(pa.x, pb.x) + 8 : Math.min(pa.x, pb.x) - 8
        const midY = (pa.y + pb.y) / 2
        const targetX = isLeft ? pt.x - 6 : pt.x + 6

        const key = `${faseSource}-${slotA}-${slotB}-${faseTarget}-${targetSlot}`

        // Horizontal from card A to edge
        lines.push({ a: pa, b: { x: edgeX, y: pa.y }, key: `${key}-a` })
        // Horizontal from card B to edge
        lines.push({ a: pb, b: { x: edgeX, y: pb.y }, key: `${key}-b` })
        // Vertical joining A and B
        lines.push({ a: { x: edgeX, y: pa.y }, b: { x: edgeX, y: pb.y }, key: `${key}-v` })
        // Horizontal from midline to target
        lines.push({ a: { x: edgeX, y: midY }, b: { x: targetX, y: midY }, key: `${key}-t` })
        // Vertical down/up from midline to target Y if different
        if (Math.abs(midY - pt.y) > 2) {
          lines.push({ a: { x: targetX, y: midY }, b: { x: targetX, y: pt.y }, key: `${key}-tv` })
          lines.push({ a: { x: targetX, y: pt.y }, b: pt, key: `${key}-th` })
        } else {
          lines.push({ a: { x: targetX, y: midY }, b: pt, key: `${key}-th` })
        }
      }

      const connectCenter = (sourceSlot: number, targetFase: string, side: 'left' | 'right') => {
        const src = slots.find(s => (s as Record<string, unknown>).slot === sourceSlot && (s as Record<string, unknown>).fase === 'semifinal')
        const tgt = slots.find(s => (s as Record<string, unknown>).fase === targetFase)
        if (!src || !tgt) return
        const ps = center(src.jogoId)
        const pt = center(tgt.jogoId)
        if (!ps || !pt) return

        const isLeft = side === 'left'
        const edgeX = isLeft ? ps.x + 8 : ps.x - 8
        const key = `sf-${sourceSlot}-to-${targetFase}`

        lines.push({ a: ps, b: { x: edgeX, y: ps.y }, key: `${key}-h` })
        lines.push({ a: { x: edgeX, y: ps.y }, b: { x: edgeX, y: pt.y }, key: `${key}-v` })
        lines.push({ a: { x: edgeX, y: pt.y }, b: pt, key: `${key}-h2` })
      }

      // R32 → Oit pairs
      PAIRING_R32_TO_OIT.forEach(([a, b], idx) => {
        const oitSlot = idx + 1
        const side = groupR32BySide([{ slot: a } as BracketSlot]).left.length ? 'left' : 'right'
        connectPair(a, b, oitSlot, 'dezesseis_avos', 'oitavas', side)
      })

      // Oit → QF pairs
      PAIRING_OIT_TO_QF.forEach(([a, b], idx) => {
        const qfSlot = idx + 1
        const side = a <= 2 || (a >= 5 && a <= 6) ? 'left' : 'right'
        connectPair(a, b, qfSlot, 'oitavas', 'quartas', side)
      })

      // QF → SF pairs
      PAIRING_QF_TO_SF.forEach(([a, b], idx) => {
        const sfSlot = idx + 1
        const side = a <= 2 ? 'left' : 'right'
        connectPair(a, b, sfSlot, 'quartas', 'semifinal', side)
      })

      // SF → Final e 3º lugar
      connectCenter(1, 'final', 'left')
      connectCenter(2, 'final', 'right')
      connectCenter(1, 'terceiro', 'left')
      connectCenter(2, 'terceiro', 'right')

      setConnectors(lines.map((l) => (
        <line key={l.key} x1={l.a.x} y1={l.a.y} x2={l.b.x} y2={l.b.y}
          stroke="#475569" strokeWidth={1}
          className="transition-all duration-300"
        />
      )))
    })
  }, [slots])

  return (
    <div className="hidden lg:block">
      <div className="overflow-x-auto" ref={containerRef}>
        <div className="relative min-w-[900px]">
          <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
            {connectors}
          </svg>
          <div className="flex items-start gap-4 justify-center px-4 py-2 relative z-[1]">
            <BracketSide side="left" slots={leftSlots} />
            <BracketCenter final={finalSlot} terceiro={terceiroSlot} />
            <BracketSide side="right" slots={rightSlots} />
          </div>
        </div>
      </div>
    </div>
  )
}

 
