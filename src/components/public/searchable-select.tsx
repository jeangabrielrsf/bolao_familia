"use client"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Search, X } from "lucide-react"

interface SearchableSelectProps {
  options: string[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  emptyText?: string
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Buscar...",
  emptyText = "Nenhum resultado",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false)
        setSearch("")
        inputRef.current?.blur()
      }
    }
    if (open) {
      document.addEventListener("keydown", handleEscape)
      return () => document.removeEventListener("keydown", handleEscape)
    }
  }, [open])

  function handleSelect(option: string) {
    onChange(option === value ? "" : option)
    setOpen(false)
    setSearch("")
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange("")
    setSearch("")
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={open ? search : value || ""}
          onChange={(e) => {
            setSearch(e.target.value)
            if (!open) setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={value ? value : placeholder}
          className="pl-9 pr-8 h-9 text-sm"
        />
        {value && !open && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-md max-h-60 overflow-auto animate-in fade-in-0 zoom-in-95">
          {filtered.length === 0 ? (
            <p className="py-3 px-3 text-sm text-muted-foreground text-center">
              {emptyText}
            </p>
          ) : (
            <div className="py-1">
              {filtered.map((option) => (
                <button
                  key={option}
                  onClick={() => handleSelect(option)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                    option === value && "bg-accent text-accent-foreground font-medium"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
