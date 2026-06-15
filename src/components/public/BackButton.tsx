"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"

interface BackButtonProps {
  fallbackHref?: string
}

export function BackButton({ fallbackHref = "/jogos" }: BackButtonProps) {
  const router = useRouter()

  function handleClick() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleClick}>
      <ChevronLeft className="w-4 h-4" /> Voltar
    </Button>
  )
}
