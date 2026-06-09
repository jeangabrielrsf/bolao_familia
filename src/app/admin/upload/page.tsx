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
import { toast } from 'sonner'
import { Loader2, ChevronLeft } from 'lucide-react'
import type { PalpiteDTO, PalpiteExtraDTO, ValidationResult } from '@/lib/utils/types'

interface Participante { id: string; nome: string }
interface Jogo { id: string; timeA: string; timeB: string; grupo?: string | null; fase: string }
type Step = 'select' | 'upload' | 'preview' | 'confirming' | 'success' | 'error'

export default function AdminUploadPage() {
  const [step, setStep] = useState<Step>('select')
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
      if (res.ok) { const data = await res.json(); if (data.palpites && data.palpites.length > 0) { setShowReplaceDialog(true); return } }
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

  function handleReset() {
    setStep('select'); setParticipanteId(''); setPreview(null); setValidacao(null)
    setEditedPalpites([]); setEditedExtras([]); setErrorMessage(''); setSelectedFile(null)
  }

  const handleEdit = useCallback((palpites: PalpiteDTO[], extras: PalpiteExtraDTO[]) => {
    setEditedPalpites(palpites); setEditedExtras(extras)
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

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="participante" className="text-sm font-medium">Participante</label>
            <Select id="participante" value={participanteId} onChange={(e) => setParticipanteId(e.target.value)} disabled={step !== 'select'}>
              <option value="">Selecione um participante</option>
              {participantes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </Select>
          </div>
        </CardContent>
      </Card>

      {step === 'select' && participanteId && (
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
