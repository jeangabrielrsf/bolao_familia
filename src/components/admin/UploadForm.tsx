'use client'

import { useState, useRef, type DragEvent, type ChangeEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { PalpiteDTO, PalpiteExtraDTO, ValidationResult } from '@/lib/utils/types'

interface UploadFormProps {
  onUploadSuccess: (
    preview: { palpites: PalpiteDTO[]; extras: PalpiteExtraDTO[]; fonte: 'excel' | 'foto' | 'pdf' },
    validacao: ValidationResult
  ) => void
  onFileSelect?: (file: File | null) => void
  participanteId: string
}

export function UploadForm({ onUploadSuccess, onFileSelect, participanteId }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ACCEPTED_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ]

  function validateFile(f: File): string | null {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return 'Formato não suportado. Use .xlsx, .jpg, .png, .webp ou .pdf'
    }
    if (f.size > 10 * 1024 * 1024) {
      return 'Arquivo muito grande (máximo 10MB)'
    }
    return null
  }

  function handleFileSelect(f: File) {
    setError(null)
    const validationError = validateFile(f)
    if (validationError) {
      setError(validationError)
      return
    }
    setFile(f)
    onFileSelect?.(f)
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) handleFileSelect(droppedFile)
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (selected) handleFileSelect(selected)
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('participanteId', participanteId)

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao processar arquivo')
        return
      }

      onUploadSuccess(data.preview, data.validacao)
    } catch {
      setError('Erro de conexão ao enviar arquivo')
    } finally {
      setUploading(false)
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Card padding="md">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.jpg,.jpeg,.png,.webp,.pdf"
          onChange={handleInputChange}
          className="hidden"
        />
        {file ? (
          <div className="space-y-2">
            <p className="font-medium text-foreground">{file.name}</p>
            <p className="text-sm text-muted">{formatSize(file.size)}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-muted">Arraste um arquivo aqui ou clique para selecionar</p>
            <p className="text-sm text-muted">.xlsx, .jpg, .png, .webp ou .pdf (máx. 10MB)</p>
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {file && (
        <div className="mt-4 flex justify-end">
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
      )}
    </Card>
  )
}
