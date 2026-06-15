"use client"

import { useMemo } from "react"
import { Select } from "@/components/ui/select"
import { SearchableSelect } from "@/components/public/searchable-select"
import { GRUPOS } from "@/lib/utils/constants"
import { formatarData } from "@/lib/utils/date"
import { Calendar, Filter } from "lucide-react"

interface Jogo {
  timeA: string
  timeB: string
  dataHora: string
  grupo: string | null
}

interface FilterBarProps {
  jogos: Jogo[]
  diaFilter: string
  grupoFilter: string
  selecaoFilter: string
  onDiaChange: (value: string) => void
  onGrupoChange: (value: string) => void
  onSelecaoChange: (value: string) => void
}

export function FilterBar({
  jogos,
  diaFilter,
  grupoFilter,
  selecaoFilter,
  onDiaChange,
  onGrupoChange,
  onSelecaoChange,
}: FilterBarProps) {
  const datas = useMemo(() => {
    const seen = new Set<string>()
    const unique: string[] = []
    for (const jogo of jogos) {
      const data = formatarData(new Date(jogo.dataHora))
      if (!seen.has(data)) {
        seen.add(data)
        unique.push(data)
      }
    }
    return unique
  }, [jogos])

  const selecoes = useMemo(() => {
    const seen = new Set<string>()
    for (const jogo of jogos) {
      seen.add(jogo.timeA)
      seen.add(jogo.timeB)
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b, "pt-BR"))
  }, [jogos])

  const hasFilters = diaFilter || grupoFilter || selecaoFilter

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1.5 min-w-[160px] flex-1 max-w-[220px]">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            Dia
          </label>
          <Select
            value={diaFilter}
            onChange={(e) => onDiaChange(e.target.value)}
            className="h-9 text-sm"
          >
            <option value="">Todos os dias</option>
            {datas.map((data) => (
              <option key={data} value={data}>
                {data}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[140px] flex-1 max-w-[180px]">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Filter className="h-3 w-3" />
            Grupo
          </label>
          <Select
            value={grupoFilter}
            onChange={(e) => onGrupoChange(e.target.value)}
            className="h-9 text-sm"
          >
            <option value="">Todos os grupos</option>
            {GRUPOS.map((g) => (
              <option key={g} value={g}>
                Grupo {g}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[200px] flex-1 max-w-[280px]">
          <label className="text-xs font-medium text-muted-foreground">
            Seleção
          </label>
          <SearchableSelect
            options={selecoes}
            value={selecaoFilter}
            onChange={onSelecaoChange}
            placeholder="Buscar seleção..."
            emptyText="Nenhuma seleção encontrada"
          />
        </div>
      </div>

      {hasFilters && (
        <button
          onClick={() => {
            onDiaChange("")
            onGrupoChange("")
            onSelecaoChange("")
          }}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
        >
          Limpar filtros
        </button>
      )}
    </div>
  )
}
