'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { UploadForm } from '@/components/admin/UploadForm'
import { PreviewTable } from '@/components/admin/PreviewTable'
import type { PalpiteDTO, PalpiteExtraDTO, ValidationResult } from '@/lib/utils/types'

interface Participante {
  id: string
  nome: string
}

interface Jogo {
  id: string
  timeA: string
  timeB: string
  grupo?: string | null
  fase: string
}

type Step = 'select' | 'upload' | 'preview' | 'confirming' | 'success' | 'error'

export default function AdminUploadPage() {
  const [step, setStep] = useState<Step>('select')
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [participanteId, setParticipanteId] = useState('')
  const [preview, setPreview] = useState<{
    palpites: PalpiteDTO[]
    extras: PalpiteExtraDTO[]
    fonte: 'excel' | 'foto'
  } | null>(null)
  const [validacao, setValidacao] = useState<ValidationResult | null>(null)
  const [editedPalpites, setEditedPalpites] = useState<PalpiteDTO[]>([])
  const [editedExtras, setEditedExtras] = useState<PalpiteExtraDTO[]>([])
  const [showReplaceModal, setShowReplaceModal] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    fetch('/api/participantes')
      .then((r) => r.json())
      .then((data) => setParticipantes(data))
      .catch(() => {})

    fetch('/api/jogos')
      .then((r) => r.json())
      .then((data) => setJogos(data))
      .catch(() => {})
  }, [])

  const handleUploadSuccess = useCallback(
    (
      previewData: { palpites: PalpiteDTO[]; extras: PalpiteExtraDTO[]; fonte: 'excel' | 'foto' },
      validacaoData: ValidationResult
    ) => {
      setPreview(previewData)
      setValidacao(validacaoData)
      setEditedPalpites(previewData.palpites)
      setEditedExtras(previewData.extras)
      setStep('preview')
    },
    []
  )

  async function handleConfirmClick() {
    if (!participanteId) return

    try {
      const res = await fetch(`/api/participantes?id=${participanteId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.palpites && data.palpites.length > 0) {
          setShowReplaceModal(true)
          return
        }
      }
    } catch {
    }

    await doConfirm()
  }

  async function doConfirm() {
    if (!preview || !participanteId) return
    setConfirming(true)
    setStep('confirming')
    setShowReplaceModal(false)

    try {
      let arquivoBase64 = ''
      let arquivoNome = ''
      let arquivoContentType = ''

      if (selectedFile) {
        arquivoNome = selectedFile.name
        arquivoContentType = selectedFile.type
        const arrayBuffer = await selectedFile.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer)
        let binary = ''
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        arquivoBase64 = btoa(binary)
      }

      const res = await fetch('/api/admin/upload/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participanteId,
          palpites: editedPalpites,
          extras: editedExtras,
          fonte: preview.fonte,
          arquivoBase64,
          arquivoNome,
          arquivoContentType,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setErrorMessage(data.error || 'Erro ao confirmar upload')
        setStep('error')
        return
      }

      setStep('success')
    } catch {
      setErrorMessage('Erro de conexão ao confirmar')
      setStep('error')
    } finally {
      setConfirming(false)
    }
  }

  function handleReset() {
    setStep('select')
    setParticipanteId('')
    setPreview(null)
    setValidacao(null)
    setEditedPalpites([])
    setEditedExtras([])
    setErrorMessage('')
    setSelectedFile(null)
  }

  const handleEdit = useCallback((palpites: PalpiteDTO[], extras: PalpiteExtraDTO[]) => {
    setEditedPalpites(palpites)
    setEditedExtras(extras)
  }, [])

  const participanteOptions = participantes.map((p) => ({ value: p.id, label: p.nome }))

  if (step === 'success') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Upload de Palpites</h1>
        <Card padding="lg">
          <div className="text-center space-y-4">
            <Badge variant="success">Sucesso</Badge>
            <p className="text-foreground">Palpites salvos com sucesso!</p>
            <Button onClick={handleReset}>Novo Upload</Button>
          </div>
        </Card>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Upload de Palpites</h1>
        <Card padding="lg">
          <div className="text-center space-y-4">
            <Badge variant="danger">Erro</Badge>
            <p className="text-foreground">{errorMessage}</p>
            <Button onClick={handleReset}>Tentar Novamente</Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-primary">Upload de Palpites</h1>

      <Card padding="md">
        <Select
          label="Participante"
          options={participanteOptions}
          placeholder="Selecione um participante"
          value={participanteId}
          onChange={(e) => setParticipanteId(e.target.value)}
          disabled={step !== 'select'}
        />
      </Card>

      {step === 'select' && participanteId && (
        <UploadForm
          participanteId={participanteId}
          onUploadSuccess={handleUploadSuccess}
          onFileSelect={setSelectedFile}
        />
      )}

      {step === 'preview' && preview && (
        <div className="space-y-6">
          <PreviewTable
            preview={preview}
            validacao={validacao!}
            jogos={jogos}
            onEdit={handleEdit}
          />

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={handleReset}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmClick} disabled={confirming}>
              {confirming ? 'Salvando...' : 'Confirmar e Salvar'}
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={showReplaceModal}
        onClose={() => setShowReplaceModal(false)}
        title="Substituir Palpites"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowReplaceModal(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={doConfirm}>
              Substituir
            </Button>
          </>
        }
      >
        <p className="text-foreground">
          Este participante já possui palpites salvos. Deseja substituir todos os palpites existentes?
          Essa ação não pode ser desfeita.
        </p>
      </Modal>
    </div>
  )
}
