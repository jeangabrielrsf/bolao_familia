'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { ConfiguracaoPontuacao } from '@/lib/utils/types'

interface Jogo { id: string }

const CAMPOS: { chave: keyof ConfiguracaoPontuacao; label: string }[] = [
  { chave: 'placarExato', label: 'Placar Exato' },
  { chave: 'vencedorCorreto', label: 'Vencedor Correto' },
  { chave: 'campeao', label: 'Campeão' },
  { chave: 'vice', label: 'Vice-campeão' },
  { chave: 'terceiro', label: '3º Colocado' },
  { chave: 'quarto', label: '4º Colocado' },
  { chave: 'artilheiro', label: 'Artilheiro' },
]

export default function AdminConfigPage() {
  const [config, setConfig] = useState<ConfiguracaoPontuacao | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [totalJogos, setTotalJogos] = useState(0)

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/config')
      if (!res.ok) throw new Error('Erro ao carregar configuração')
      const data: ConfiguracaoPontuacao = await res.json(); setConfig(data)
    } catch { toast.error('Erro ao carregar configuração') }
    finally { setLoading(false) }
  }, [])

  const fetchJogos = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/jogos')
      if (res.ok) { const data: Jogo[] = await res.json(); setTotalJogos(data.length) }
    } catch {}
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchConfig(); fetchJogos()
  }, [fetchConfig, fetchJogos])

  function handleChange(chave: keyof ConfiguracaoPontuacao, valor: string) {
    if (!config) return
    setConfig({ ...config, [chave]: parseInt(valor) || 0 })
  }

  async function handleSalvar() {
    if (!config) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config),
      })
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Erro ao salvar') }
      toast.success('Configuração salva com sucesso!')
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erro ao salvar configuração') }
    finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <h1 className="text-3xl font-display tracking-wide">Configurações de Pontuação</h1>
        <Card><CardContent className="p-4 space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardContent></Card>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <h1 className="text-3xl font-display tracking-wide">Configurações de Pontuação</h1>
        <Card><CardContent className="flex flex-col items-center justify-center py-12"><p className="text-muted-foreground">Erro ao carregar configuração.</p></CardContent></Card>
      </div>
    )
  }

  const maximoPossivel = totalJogos * config.placarExato + config.campeao + config.vice + config.terceiro + config.quarto + config.artilheiro

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in-up">
      <h1 className="text-3xl font-display tracking-wide">Configurações de Pontuação</h1>

      <form onSubmit={(e) => { e.preventDefault(); handleSalvar() }}>
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CAMPOS.map(({ chave, label }) => (
                <div key={chave} className="flex flex-col gap-1">
                  <label className="text-sm font-medium">{label}</label>
                  <Input type="number" min="0" value={config[chave]} onChange={(e) => handleChange(chave, e.target.value)} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Máximo possível por participante</p>
              <p className="text-2xl font-display text-primary">{maximoPossivel} pontos</p>
              <p className="text-xs text-muted-foreground">
                {totalJogos} jogos × {config.placarExato} pts + extras ({config.campeao + config.vice + config.terceiro + config.quarto + config.artilheiro} pts)
              </p>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Salvar'}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
