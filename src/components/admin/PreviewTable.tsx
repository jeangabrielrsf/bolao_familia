'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import type { PalpiteDTO, PalpiteExtraDTO, ValidationResult } from '@/lib/utils/types'

interface PreviewTableProps {
  preview: { palpites: PalpiteDTO[]; extras: PalpiteExtraDTO[]; fonte: 'excel' | 'foto' | 'pdf' }
  validacao: ValidationResult
  jogos: Array<{ id: string; timeA: string; timeB: string; grupo?: string | null; fase: string }>
  onEdit: (palpites: PalpiteDTO[], extras: PalpiteExtraDTO[]) => void
}

const EXTRA_LABELS: Record<string, string> = {
  artilheiro: 'Artilheiro', campeao: 'Campeão', vice: 'Vice-campeão', terceiro: '3º Colocado', quarto: '4º Colocado',
}
const EXTRA_ORDER = ['artilheiro', 'campeao', 'vice', 'terceiro', 'quarto'] as const

export function PreviewTable({ preview, validacao, jogos, onEdit }: PreviewTableProps) {
  const [palpites, setPalpites] = useState<PalpiteDTO[]>(preview.palpites)
  const [extras, setExtras] = useState<PalpiteExtraDTO[]>(preview.extras)
  const jogosComPalpite = jogos.filter((jogo) => palpites.some((p) => p.jogoId === jogo.id))

  function handlePlacarChange(jogoId: string, field: 'placarA' | 'placarB', value: string) {
    const num = Math.max(0, parseInt(value) || 0)
    setPalpites((prev) => {
      const next = prev.map((p) => (p.jogoId === jogoId ? { ...p, [field]: num } : p))
      onEdit(next, extras)
      return next
    })
  }

  function handleExtraChange(tipo: string, value: string) {
    setExtras((prev) => {
      const next = prev.map((e) => (e.tipo === tipo ? { ...e, valor: value } : e))
      onEdit(palpites, next)
      return next
    })
  }

  return (
    <div className="space-y-6">
      {validacao.alertas.length > 0 && (
        <div className="space-y-2">
          {validacao.alertas.map((alerta, i) => <Badge key={i} variant="warning">{alerta}</Badge>)}
        </div>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Time A</TableHead>
              <TableHead className="text-center">Placar A</TableHead>
              <TableHead className="text-center w-8">x</TableHead>
              <TableHead className="text-center">Placar B</TableHead>
              <TableHead>Time B</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jogosComPalpite.map((jogo, index) => {
              const palpite = palpites.find((p) => p.jogoId === jogo.id)
              return (
                <TableRow key={jogo.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{jogo.timeA}</TableCell>
                  <TableCell className="text-center">
                    <Input type="number" min="0" value={palpite?.placarA ?? 0} onChange={(e) => handlePlacarChange(jogo.id, 'placarA', e.target.value)} className="w-16 mx-auto text-center" />
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">x</TableCell>
                  <TableCell className="text-center">
                    <Input type="number" min="0" value={palpite?.placarB ?? 0} onChange={(e) => handlePlacarChange(jogo.id, 'placarB', e.target.value)} className="w-16 mx-auto text-center" />
                  </TableCell>
                  <TableCell className="font-medium">{jogo.timeB}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Extras</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {EXTRA_ORDER.map((tipo) => {
              const extra = extras.find((e) => e.tipo === tipo)
              return (
                <div key={tipo} className="flex flex-col gap-1">
                  <label className="text-sm font-medium">{EXTRA_LABELS[tipo]}</label>
                  <Input type="text" value={extra?.valor ?? ''} onChange={(e) => handleExtraChange(tipo, e.target.value)} />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
