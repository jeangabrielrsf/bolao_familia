'use client'
import { useMemo, useRef, useLayoutEffect, useState } from 'react'
import type { BracketSlot } from '@/lib/services/bracket/types'
import { BracketSide } from './bracket-side'
import { BracketCenter } from './bracket-center'
import { groupR32BySide } from './bracket-lado-utils'

type Props = {
  slots: BracketSlot[]
}

type CardRect = { cx: number; cy: number; left: number; right: number }
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

    const measure = () => {
      requestAnimationFrame(() => {
        const cRect = container.getBoundingClientRect()

      const card = (jogoId: string): CardRect | null => {
        const el = container.querySelector(`[data-jogo-id="${jogoId}"]`)
        if (!el) return null
        const r = el.getBoundingClientRect()
        const l = r.left - cRect.left
        return { cx: l + r.width / 2, cy: r.top - cRect.top + r.height / 2, left: l, right: l + r.width }
      }

      type Conn = { a: Point; b: Point; key: string }
      const lines: Conn[] = []
      const SPINE_GAP = 12

      const connectPair = (slotA: number, slotB: number, targetSlot: number, faseSource: string, faseTarget: string, side: 'left' | 'right') => {
        const srcA = slots.find(s => (s as Record<string, unknown>).slot === slotA && (s as Record<string, unknown>).fase === faseSource)
        const srcB = slots.find(s => (s as Record<string, unknown>).slot === slotB && (s as Record<string, unknown>).fase === faseSource)
        const tgt = slots.find(s => (s as Record<string, unknown>).slot === targetSlot && (s as Record<string, unknown>).fase === faseTarget)

        if (!srcA || !srcB || !tgt) return

        const ca = card(srcA.jogoId)
        const cb = card(srcB.jogoId)
        const ct = card(tgt.jogoId)
        if (!ca || !cb || !ct) return

        const isLeft = side === 'left'
        const srcEdgeA = isLeft ? ca.right : ca.left
        const srcEdgeB = isLeft ? cb.right : cb.left
        const srcEdge = isLeft ? Math.max(ca.right, cb.right) : Math.min(ca.left, cb.left)
        const tgtEdge = isLeft ? ct.left - 4 : ct.right + 4
        const distance = Math.abs(tgtEdge - srcEdge)
        const dynamicGap = Math.max(SPINE_GAP, distance * 0.15)
        const spineX = isLeft ? srcEdge + dynamicGap : srcEdge - dynamicGap
        const midY = (ca.cy + cb.cy) / 2
        const tgtY = ct.cy

        const key = `${faseSource}-${slotA}-${slotB}-${faseTarget}-${targetSlot}`

        // Card A edge → spine
        lines.push({ a: { x: srcEdgeA, y: ca.cy }, b: { x: spineX, y: ca.cy }, key: `${key}-a` })
        // Card B edge → spine
        lines.push({ a: { x: srcEdgeB, y: cb.cy }, b: { x: spineX, y: cb.cy }, key: `${key}-b` })
        // Spine vertical: do card superior até midY
        const spineTop = Math.min(ca.cy, cb.cy)
        lines.push({ a: { x: spineX, y: spineTop }, b: { x: spineX, y: midY }, key: `${key}-v1` })
        // Spine vertical: de midY até o card inferior
        const spineBottom = Math.max(ca.cy, cb.cy)
        lines.push({ a: { x: spineX, y: midY }, b: { x: spineX, y: spineBottom }, key: `${key}-v2` })
        // Spine midline → target edge X, at mid Y
        lines.push({ a: { x: spineX, y: midY }, b: { x: tgtEdge, y: midY }, key: `${key}-t` })
        // Vertical from mid Y → target Y at target edge X
        if (Math.abs(midY - tgtY) > 2) {
          lines.push({ a: { x: tgtEdge, y: midY }, b: { x: tgtEdge, y: tgtY }, key: `${key}-tv` })
        }
      }

      const connectCenter = (sourceSlot: number, targetFase: string, side: 'left' | 'right') => {
        const src = slots.find(s => (s as Record<string, unknown>).slot === sourceSlot && (s as Record<string, unknown>).fase === 'semifinal')
        const tgt = slots.find(s => (s as Record<string, unknown>).fase === targetFase)
        if (!src || !tgt) return
        const cs = card(src.jogoId)
        const ct = card(tgt.jogoId)
        if (!cs || !ct) return

        const isLeft = side === 'left'
        const srcEdge = isLeft ? cs.right : cs.left
        const tgtEdge = isLeft ? ct.left - 4 : ct.right + 4
        const distance = Math.abs(tgtEdge - srcEdge)
        const dynamicGap = Math.max(SPINE_GAP, distance * 0.15)
        const spineX = isLeft ? srcEdge + dynamicGap : srcEdge - dynamicGap
        const key = `sf-${sourceSlot}-to-${targetFase}`

        // Source card edge → spine
        lines.push({ a: { x: srcEdge, y: cs.cy }, b: { x: spineX, y: cs.cy }, key: `${key}-h` })
        // Spine vertical to target Y
        lines.push({ a: { x: spineX, y: cs.cy }, b: { x: spineX, y: ct.cy }, key: `${key}-v` })
        // Spine → target edge
        lines.push({ a: { x: spineX, y: ct.cy }, b: { x: tgtEdge, y: ct.cy }, key: `${key}-h2` })
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
        <path key={l.key}
          d={`M${l.a.x},${l.a.y} L${l.b.x},${l.b.y}`}
          stroke="#475569" fill="none" strokeWidth={1.5}
          strokeLinecap="round" strokeLinejoin="round"
          className="transition-all duration-300"
        />
      )))
      })
    }

    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [slots])

  return (
    <div className="hidden lg:block">
      <div className="overflow-x-auto" ref={containerRef}>
        <div className="relative min-w-[900px]">
          <div className="flex items-stretch gap-4 justify-center px-4 py-2 relative">
            <BracketSide side="left" slots={leftSlots} />
            <BracketCenter final={finalSlot} terceiro={terceiroSlot} />
            <BracketSide side="right" slots={rightSlots} />
          </div>
          <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
            {connectors}
          </svg>
        </div>
      </div>
    </div>
  )
}

 
