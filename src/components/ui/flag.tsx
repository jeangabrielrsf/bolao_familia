"use client"

import { preconnect } from "react-dom"
import { cn } from "@/lib/utils"

const AVAILABLE_HEIGHTS = [20, 24, 40, 60, 80, 120, 240]

function getClosestHeight(size: number): number {
  return AVAILABLE_HEIGHTS.reduce((prev, curr) =>
    Math.abs(curr - size) < Math.abs(prev - size) ? curr : prev
  )
}

interface FlagProps {
  codigoIso: string
  size?: number
  className?: string
}

preconnect("https://flagcdn.com")

export function Flag({ codigoIso, size = 20, className }: FlagProps) {
  const height = getClosestHeight(size)
  const src = `https://flagcdn.com/h${height}/${codigoIso}.png`

  return (
    <img
      src={src}
      height={height}
      alt=""
      loading="lazy"
      aria-hidden="true"
      className={cn("object-contain inline-block", className)}
    />
  )
}
