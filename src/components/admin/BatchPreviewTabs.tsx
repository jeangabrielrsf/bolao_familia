'use client'

import { useState, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PreviewTable } from '@/components/admin/PreviewTable'
import type { PalpiteDTO, PalpiteExtraDTO, ValidationResult, BatchGrupoPreview } from '@/lib/utils/types'

interface BatchPreviewTabsProps {
  grupos: BatchGrupoPreview[]
  validacao: ValidationResult
  jogos: Array<{ id: string; timeA: string; timeB: string; grupo?: string | null; fase: string }>
  onEdit: (grupos: BatchGrupoPreview[]) => void
}

export function BatchPreviewTabs({ grupos, validacao, jogos, onEdit }: BatchPreviewTabsProps) {
  const [editedGrupos, setEditedGrupos] = useState<BatchGrupoPreview[]>(grupos)

  const handleGrupoEdit = useCallback((index: number, palpites: PalpiteDTO[], extras: PalpiteExtraDTO[]) => {
    setEditedGrupos(prev => {
      const next = [...prev]
      next[index] = { ...next[index], palpites, extras }
      onEdit(next)
      return next
    })
  }, [onEdit])

  if (editedGrupos.length === 0) return null

  return (
    <div className="space-y-4">
      {validacao.alertas.length > 0 && (
        <div className="space-y-2">
          {validacao.alertas.map((alerta, i) => <Badge key={i} variant="warning">{alerta}</Badge>)}
        </div>
      )}

      <Tabs defaultValue={editedGrupos[0].nomeCompleto}>
        <TabsList className="flex-wrap">
          {editedGrupos.map((grupo, index) => (
            <TabsTrigger key={index} value={grupo.nomeCompleto} className="gap-2">
              {grupo.nomeCompleto}
              {grupo.participanteId ? (
                <Badge variant="success" className="text-[10px] px-1 py-0">existente</Badge>
              ) : (
                <Badge variant="warning" className="text-[10px] px-1 py-0">novo</Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {editedGrupos.map((grupo, index) => (
          <TabsContent key={index} value={grupo.nomeCompleto}>
            <PreviewTable
              preview={{ palpites: grupo.palpites, extras: grupo.extras, fonte: 'excel' }}
              validacao={validacao}
              jogos={jogos}
              onEdit={(palpites, extras) => handleGrupoEdit(index, palpites, extras)}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
