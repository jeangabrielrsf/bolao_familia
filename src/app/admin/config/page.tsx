'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import type { ConfiguracaoPontuacao } from '@/lib/utils/types'

interface Jogo {
  id: string
}

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
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; mensagem: string } | null>(null)
  const [totalJogos, setTotalJogos] = useState(0)

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/config')
      if (!res.ok) throw new Error('Erro ao carregar configuração')
      const data: ConfiguracaoPontuacao = await res.json()
      setConfig(data)
    } catch {
      setFeedback({ tipo: 'erro', mensagem: 'Erro ao carregar configuração' })
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchJogos = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/jogos')
      if (res.ok) {
        const data: Jogo[] = await res.json()
        setTotalJogos(data.length)
      }
    } catch {}
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchConfig()
    fetchJogos()
  }, [fetchConfig, fetchJogos])

  function handleChange(chave: keyof ConfiguracaoPontuacao, valor: string) {
    if (!config) return
    setConfig({ ...config, [chave]: parseInt(valor) || 0 })
  }

  async function handleSalvar() {
    if (!config) return
    setSaving(true)
    setFeedback(null)

    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao salvar')
      }

      setFeedback({ tipo: 'sucesso', mensagem: 'Configuração salva com sucesso!' })
    } catch (err) {
      setFeedback({
        tipo: 'erro',
        mensagem: err instanceof Error ? err.message : 'Erro ao salvar configuração',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-6">Configurações de Pontuação</h1>
        <Card padding="md">
          <p className="text-center text-muted">Carregando...</p>
        </Card>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-6">Configurações de Pontuação</h1>
        <Card padding="md">
          <p className="text-center text-muted">Erro ao carregar configuração.</p>
        </Card>
      </div>
    )
  }

  const maximoPossivel = totalJogos * config.placarExato + config.campeao + config.vice + config.terceiro + config.quarto + config.artilheiro

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-primary">Configurações de Pontuação</h1>

      {feedback && (
        <Card padding="md" role="status" aria-live="polite">
          <Badge variant={feedback.tipo === 'sucesso' ? 'success' : 'danger'}>
            {feedback.mensagem}
          </Badge>
        </Card>
      )}

      <form onSubmit={(e) => { e.preventDefault(); handleSalvar() }}>
        <Card padding="md">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CAMPOS.map(({ chave, label }) => (
              <Input
                key={chave}
                label={label}
                type="number"
                min="0"
                value={config[chave]}
                onChange={(e) => handleChange(chave, e.target.value)}
              />
            ))}
          </div>
        </Card>

        <Card padding="md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm text-muted">Máximo possível por participante</p>
              <p className="text-2xl font-bold text-primary">{maximoPossivel} pontos</p>
              <p className="text-xs text-muted">
                {totalJogos} jogos × {config.placarExato} pts + extras ({config.campeao + config.vice + config.terceiro + config.quarto + config.artilheiro} pts)
              </p>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  )
}
