"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { GRUPOS } from "@/lib/utils/constants"

type FilterValue = "todos" | string

interface FilterTabsProps {
  onFilterChange: (filter: FilterValue) => void
}

export function FilterTabs({ onFilterChange }: FilterTabsProps) {
  const [active, setActive] = useState<FilterValue>("todos")

  const tabs: { value: FilterValue; label: string }[] = [
    { value: "todos", label: "Todos" },
    ...GRUPOS.map((g) => ({ value: `grupo-${g}`, label: `Grupo ${g}` })),
    { value: "encerrados", label: "Encerrados" },
  ]

  function handleSelect(value: FilterValue) {
    setActive(value)
    onFilterChange(value)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => handleSelect(tab.value)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
            active === tab.value
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
