"use client"

import Image from "next/image"
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
    <span
      style={{ position: "relative", display: "inline-block", height, width: height * 1.5 }}
      className={cn("object-contain", className)}
      aria-hidden="true"
    >
      <Image
        src={src}
        alt=""
        fill
        sizes="auto"
        className="object-contain"
      />
    </span>
  )
}
