'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { PalpiteDTO, PalpiteExtraDTO, ValidationResult } from '@/lib/utils/types'

interface PreviewTableProps {
  preview: {
    palpites: PalpiteDTO[]
    extras: PalpiteExtraDTO[]
    fonte: 'excel' | 'foto'
  }
  validacao: ValidationResult
  jogos: Array<{ id: string; timeA: string; timeB: string; grupo?: string | null; fase: string }>
  onEdit: (palpites: PalpiteDTO[], extras: PalpiteExtraDTO[]) => void
}

const EXTRA_LABELS: Record<string, string> = {
  artilheiro: 'Artilheiro',
  campeao: 'Campeão',
  vice: 'Vice-campeão',
  terceiro: '3º Colocado',
  quarto: '4º Colocado',
}

const EXTRA_ORDER = ['artilheiro', 'campeao', 'vice', 'terceiro', 'quarto'] as const

export function PreviewTable({ preview, validacao, jogos, onEdit }: PreviewTableProps) {
  const [palpites, setPalpites] = useState<PalpiteDTO[]>(preview.palpites)
  const [extras, setExtras] = useState<PalpiteExtraDTO[]>(preview.extras)

  useEffect(() => {
    onEdit(palpites, extras)
  }, [palpites, extras, onEdit])

  function handlePlacarChange(jogoId: string, field: 'placarA' | 'placarB', value: string) {
    const num = Math.max(0, parseInt(value) || 0)
    setPalpites((prev) =>
      prev.map((p) => (p.jogoId === jogoId ? { ...p, [field]: num } : p))
    )
  }

  function handleExtraChange(tipo: string, value: string) {
    setExtras((prev) =>
      prev.map((e) => (e.tipo === tipo ? { ...e, valor: value } : e))
    )
  }

  return (
    <div className="space-y-6">
      {validacao.alertas.length > 0 && (
        <div className="space-y-2">
          {validacao.alertas.map((alerta, i) => (
            <Badge key={i} variant="warning">{alerta}</Badge>
          ))}
        </div>
      )}

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-3 text-left font-medium">#</th>
                <th className="px-4 py-3 text-left font-medium">Time A</th>
                <th className="px-4 py-3 text-center font-medium">Placar A</th>
                <th className="px-4 py-3 text-center font-medium">x</th>
                <th className="px-4 py-3 text-center font-medium">Placar B</th>
                <th className="px-4 py-3 text-left font-medium">Time B</th>
              </tr>
            </thead>
            <tbody>
              {jogos.map((jogo, index) => {
                const palpite = palpites.find((p) => p.jogoId === jogo.id)
                return (
                  <tr key={jogo.id} className="border-b border-border hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-muted">{index + 1}</td>
                    <td className="px-4 py-3 font-medium">{jogo.timeA}</td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        value={palpite?.placarA ?? 0}
                        onChange={(e) => handlePlacarChange(jogo.id, 'placarA', e.target.value)}
                        className="w-16 px-2 py-1 border border-border rounded text-center focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </td>
                    <td className="px-4 py-3 text-center text-muted">x</td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        value={palpite?.placarB ?? 0}
                        onChange={(e) => handlePlacarChange(jogo.id, 'placarB', e.target.value)}
                        className="w-16 px-2 py-1 border border-border rounded text-center focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{jogo.timeB}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card padding="md">
        <h3 className="font-semibold text-foreground mb-4">Extras</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {EXTRA_ORDER.map((tipo) => {
            const extra = extras.find((e) => e.tipo === tipo)
            return (
              <div key={tipo} className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground">{EXTRA_LABELS[tipo]}</label>
                <input
                  type="text"
                  value={extra?.valor ?? ''}
                  onChange={(e) => handleExtraChange(tipo, e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                />
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
