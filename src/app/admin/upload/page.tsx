'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { UploadForm } from '@/components/admin/UploadForm'
import { PreviewTable } from '@/components/admin/PreviewTable'
import { UploadModeSelector, type UploadMode } from '@/components/admin/UploadModeSelector'
import { BatchPreviewTabs } from '@/components/admin/BatchPreviewTabs'
import { toast } from 'sonner'
import { Loader2, ChevronLeft } from 'lucide-react'
import type { PalpiteDTO, PalpiteExtraDTO, ValidationResult } from '@/lib/utils/types'

interface Participante { id: string; nome: string }
interface Jogo { id: string; timeA: string; timeB: string; grupo?: string | null; fase: string }

interface BatchGrupo {
  nomeParticipante: string
  apelido: string
  nomeCompleto: string
  participanteId: string | null
  palpites: PalpiteDTO[]
  extras: PalpiteExtraDTO[]
}

type Step = 'select-mode' | 'select' | 'upload' | 'preview' | 'upload-lote' | 'preview-lote' | 'confirming' | 'success' | 'error'

export default function AdminUploadPage() {
  const [step, setStep] = useState<Step>('select-mode')
  const [mode, setMode] = useState<UploadMode>('individual')
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [participanteId, setParticipanteId] = useState('')
  const [preview, setPreview] = useState<{ palpites: PalpiteDTO[]; extras: PalpiteExtraDTO[]; fonte: 'excel' | 'foto' | 'pdf' } | null>(null)
  const [validacao, setValidacao] = useState<ValidationResult | null>(null)
  const [editedPalpites, setEditedPalpites] = useState<PalpiteDTO[]>([])
  const [editedExtras, setEditedExtras] = useState<PalpiteExtraDTO[]>([])
  const [showReplaceDialog, setShowReplaceDialog] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fetchError, setFetchError] = useState('')
  const [batchGrupos, setBatchGrupos] = useState<BatchGrupo[]>([])
  const [batchValidacao, setBatchValidacao] = useState<ValidationResult | null>(null)
  const [batchResumo, setBatchResumo] = useState<{ totalGrupos: number; participantesExistentes: number; novosParticipantes: number } | null>(null)
  const [editedBatchGrupos, setEditedBatchGrupos] = useState<BatchGrupo[]>([])
  const [loteFile, setLoteFile] = useState<File | null>(null)
  const [loteUploading, setLoteUploading] = useState(false)
  const [loteProgress, setLoteProgress] = useState(0)
  const [loteError, setLoteError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/participantes').then((r) => r.json()).then((data) => setParticipantes(data)).catch(() => setFetchError('Erro ao carregar participantes'))
    fetch('/api/jogos').then((r) => r.json()).then((data) => setJogos(data)).catch(() => setFetchError((prev) => prev ? prev + ' e jogos' : 'Erro ao carregar jogos'))
  }, [])

  const handleUploadSuccess = useCallback(
    (previewData: { palpites: PalpiteDTO[]; extras: PalpiteExtraDTO[]; fonte: 'excel' | 'foto' | 'pdf' }, validacaoData: ValidationResult) => {
      setPreview(previewData); setValidacao(validacaoData)
      setEditedPalpites(previewData.palpites); setEditedExtras(previewData.extras)
      setStep('preview')
    }, []
  )

  async function handleConfirmClick() {
    if (!participanteId) return
    try {
      const res = await fetch(`/api/participantes?id=${participanteId}`)
      if (res.ok) { const data = await res.json(); if (data.grupos && data.grupos.length > 0) { setShowReplaceDialog(true); return } }
      else { setShowReplaceDialog(true); return }
    } catch { setShowReplaceDialog(true); return }
    await doConfirm()
  }

  async function doConfirm() {
    if (!preview || !participanteId) return
    setConfirming(true); setStep('confirming'); setShowReplaceDialog(false)
    try {
      let arquivoBase64 = ''; let arquivoNome = ''; let arquivoContentType = ''
      if (selectedFile) {
        arquivoNome = selectedFile.name; arquivoContentType = selectedFile.type
        const arrayBuffer = await selectedFile.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer); let binary = ''
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
        arquivoBase64 = btoa(binary)
      }
      const res = await fetch('/api/admin/upload/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participanteId, palpites: editedPalpites, extras: editedExtras, fonte: preview.fonte, arquivoBase64, arquivoNome, arquivoContentType }),
      })
      if (!res.ok) { const data = await res.json(); setErrorMessage(data.error || 'Erro ao confirmar upload'); setStep('error'); return }
      setStep('success'); toast.success('Palpites salvos com sucesso!')
    } catch { setErrorMessage('Erro de conexão ao confirmar'); setStep('error') }
    finally { setConfirming(false) }
  }

  async function doConfirmLote() {
    setConfirming(true); setStep('confirming')
    try {
      const res = await fetch('/api/admin/upload/confirm-lote', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grupos: editedBatchGrupos.map(g => ({
            nomeParticipante: g.nomeParticipante,
            apelido: g.apelido,
            nomeCompleto: g.nomeCompleto,
            palpites: g.palpites,
            extras: g.extras,
          })),
        }),
      })
      if (!res.ok) { const data = await res.json(); setErrorMessage(data.error || 'Erro ao confirmar upload em lote'); setStep('error'); return }
      const data = await res.json()
      setStep('success')
      toast.success(`${data.gruposCriados} grupo(s) criado(s), ${data.participantesCriados} participante(s) novo(s)!`)
    } catch { setErrorMessage('Erro de conexão ao confirmar'); setStep('error') }
    finally { setConfirming(false) }
  }

  function handleUploadLote() {
    if (!loteFile) return
    setLoteUploading(true); setLoteError(null); setLoteProgress(0)
    const formData = new FormData()
    formData.append('file', loteFile)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/upload/lote')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setLoteProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      setLoteUploading(false)
      if (xhr.status >= 200 && xhr.status < 300) {
        setLoteProgress(100)
        try {
          const data = JSON.parse(xhr.responseText)
          setBatchGrupos(data.grupos)
          setEditedBatchGrupos(data.grupos)
          setBatchValidacao(data.validacao)
          setBatchResumo(data.resumo)
          setStep('preview-lote')
        } catch { setLoteError('Erro ao processar resposta do servidor') }
      } else {
        try {
          const data = JSON.parse(xhr.responseText)
          setLoteError(data.error || 'Erro ao processar arquivo')
        } catch { setLoteError('Erro de conexão ao enviar arquivo') }
      }
    }
    xhr.onerror = () => { setLoteUploading(false); setLoteError('Erro de conexão ao enviar arquivo') }
    xhr.send(formData)
  }

  function handleReset() {
    setStep('select-mode'); setParticipanteId(''); setPreview(null); setValidacao(null)
    setEditedPalpites([]); setEditedExtras([]); setErrorMessage(''); setSelectedFile(null)
    setBatchGrupos([]); setBatchValidacao(null); setBatchResumo(null); setEditedBatchGrupos([])
    setLoteFile(null); setLoteError(null); setLoteProgress(0)
  }

  const handleEdit = useCallback((palpites: PalpiteDTO[], extras: PalpiteExtraDTO[]) => {
    setEditedPalpites(palpites); setEditedExtras(extras)
  }, [])

  const handleBatchEdit = useCallback((grupos: BatchGrupo[]) => {
    setEditedBatchGrupos(grupos)
  }, [])

  if (step === 'success') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in-up">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin"><ChevronLeft className="w-4 h-4" /> Voltar ao Dashboard</Link>
        </Button>
        <h1 className="text-3xl font-display tracking-wide">Upload de Palpites</h1>
        <Card><CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <Badge variant="success">Sucesso</Badge>
          <p>Palpites salvos com sucesso!</p>
          <Button onClick={handleReset}>Novo Upload</Button>
        </CardContent></Card>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in-up">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin"><ChevronLeft className="w-4 h-4" /> Voltar ao Dashboard</Link>
        </Button>
        <h1 className="text-3xl font-display tracking-wide">Upload de Palpites</h1>
        <Card><CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <Badge variant="destructive">Erro</Badge>
          <p>{errorMessage}</p>
          <Button onClick={handleReset}>Tentar Novamente</Button>
        </CardContent></Card>
      </div>
    )
  }

  if (step === 'preview-lote' && batchGrupos.length > 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in-up">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin"><ChevronLeft className="w-4 h-4" /> Voltar ao Dashboard</Link>
        </Button>
        <h1 className="text-3xl font-display tracking-wide">Upload em Lote — Prévia</h1>

        {batchResumo && (
          <Card>
            <CardContent className="p-4 flex flex-wrap gap-4">
              <Badge variant="info">{batchResumo.totalGrupos} grupo(s)</Badge>
              <Badge variant="success">{batchResumo.participantesExistentes} existente(s)</Badge>
              {batchResumo.novosParticipantes > 0 && <Badge variant="warning">{batchResumo.novosParticipantes} novo(s)</Badge>}
            </CardContent>
          </Card>
        )}

        <BatchPreviewTabs grupos={batchGrupos} validacao={batchValidacao!} jogos={jogos} onEdit={handleBatchEdit} />

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleReset}>Cancelar</Button>
          <Button onClick={doConfirmLote} disabled={confirming}>
            {confirming ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Confirmar Tudo'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in-up">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin"><ChevronLeft className="w-4 h-4" /> Voltar ao Dashboard</Link>
      </Button>
      <h1 className="text-3xl font-display tracking-wide">Upload de Palpites</h1>

      {fetchError && (
        <Card><CardContent className="p-4 flex items-center gap-2">
          <Badge variant="destructive">{fetchError}</Badge>
          <Button variant="secondary" onClick={() => window.location.reload()}>Tentar Novamente</Button>
        </CardContent></Card>
      )}

      <UploadModeSelector value={mode} onChange={(m) => { setMode(m); setStep('select-mode') }} />

      {mode === 'individual' && (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="participante" className="text-sm font-medium">Participante</label>
                <Select id="participante" value={participanteId} onChange={(e) => setParticipanteId(e.target.value)}>
                  <option value="">Selecione um participante</option>
                  {participantes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </Select>
              </div>
            </CardContent>
          </Card>

          {participanteId && (
            <UploadForm participanteId={participanteId} onUploadSuccess={handleUploadSuccess} onFileSelect={setSelectedFile} />
          )}

          {step === 'preview' && preview && (
            <div className="space-y-6">
              <PreviewTable preview={preview} validacao={validacao!} jogos={jogos} onEdit={handleEdit} />
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={handleReset}>Cancelar</Button>
                <Button onClick={handleConfirmClick} disabled={confirming}>
                  {confirming ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Confirmar e Salvar'}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {mode === 'lote' && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div
              onClick={() => document.getElementById('lote-file-input')?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files[0]; if (f) { setLoteFile(f); setLoteError(null) } }}
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors border-border hover:border-primary"
            >
              <input id="lote-file-input" type="file" accept=".xlsx" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setLoteFile(f); setLoteError(null) } }} className="hidden" />
              {loteFile ? (
                <div className="space-y-2">
                  <p className="font-medium">{loteFile.name}</p>
                  <p className="text-sm text-muted-foreground">{(loteFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-muted-foreground">Arraste a planilha Excel aqui ou clique para selecionar</p>
                  <p className="text-sm text-muted-foreground">.xlsx com múltiplas abas (máx. 10MB)</p>
                </div>
              )}
            </div>

            {loteError && <p className="text-sm text-danger">{loteError}</p>}

            {loteUploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Enviando...</span>
                  <span>{loteProgress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${loteProgress}%` }} />
                </div>
              </div>
            )}

            {loteFile && !loteUploading && (
              <div className="flex justify-end">
                <Button onClick={handleUploadLote}>Enviar e Processar</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Substituir Palpites</DialogTitle>
            <DialogDescription>
              Este participante já possui palpites salvos. Deseja substituir todos os palpites existentes? Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReplaceDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={doConfirm}>Substituir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
