'use client'
import { ChevronRight } from 'lucide-react'
import { GroupTable } from './group-table'
import type { ClassificacaoGrupo } from '@/lib/services/bracket/types'

type Props = {
  grupo: ClassificacaoGrupo
  qualificadosTerceiros?: Set<string>
  onClick: () => void
}

export function GroupCard({ grupo, qualificadosTerceiros, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      aria-label={`Editar jogos do grupo ${grupo.grupo}`}
      className="block w-full text-left rounded-lg hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      <div className="flex items-center gap-2 p-3">
        <div className="flex-1 pointer-events-none">
          <GroupTable grupo={grupo} qualificadosTerceiros={qualificadosTerceiros} />
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" aria-hidden />
      </div>
    </button>
  )
}
