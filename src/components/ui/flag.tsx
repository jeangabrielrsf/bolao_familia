"use client"

import { preconnect } from "react-dom"
import { cn } from "@/lib/utils"

interface FlagProps {
  codigoIso: string
  size?: number
  className?: string
}

let preconnected = false

export function Flag({ codigoIso, size = 20, className }: FlagProps) {
  if (!preconnected) {
    preconnect("https://flagcdn.com")
    preconnected = true
  }

  const width = Math.round(size * 1.5)
  const height = size
  const src = `https://flagcdn.com/w${width * 2}/${codigoIso}.png`

  return (
    <img
      src={src}
      width={width}
      height={height}
      loading="lazy"
      aria-hidden="true"
      className={cn("object-contain inline-block", className)}
    />
  )
}
