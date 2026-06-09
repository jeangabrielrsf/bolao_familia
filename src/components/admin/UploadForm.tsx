'use client'

import { useState, useRef, type DragEvent, type ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Upload, FileText, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
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
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ACCEPTED_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
  ]

  function validateFile(f: File): string | null {
    if (!ACCEPTED_TYPES.includes(f.type)) return 'Formato não suportado. Use .xlsx, .jpg, .png, .webp ou .pdf'
    if (f.size > 10 * 1024 * 1024) return 'Arquivo muito grande (máximo 10MB)'
    return null
  }

  function handleFileSelect(f: File) {
    setError(null)
    const validationError = validateFile(f)
    if (validationError) { setError(validationError); return }
    setFile(f)
    onFileSelect?.(f)
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) { e.preventDefault(); e.stopPropagation(); setDragging(true) }
  function handleDragLeave(e: DragEvent<HTMLDivElement>) { e.preventDefault(); e.stopPropagation(); setDragging(false) }
  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault(); e.stopPropagation(); setDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) handleFileSelect(droppedFile)
  }
  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (selected) handleFileSelect(selected)
  }

  function handleUpload() {
    if (!file) return
    setUploading(true); setError(null); setProgress(0)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('participanteId', participanteId)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/upload')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      setUploading(false)
      if (xhr.status >= 200 && xhr.status < 300) {
        setProgress(100)
        try {
          const data = JSON.parse(xhr.responseText)
          onUploadSuccess(data.preview, data.validacao)
        } catch { setError('Erro ao processar resposta do servidor') }
      } else {
        try {
          const data = JSON.parse(xhr.responseText)
          const errorDetails = data.detalhes || data.validacao?.erros
          if (Array.isArray(errorDetails) && errorDetails.length > 0) {
            setError(`${data.error || 'Erros de validação'}:\n• ${errorDetails.join('\n• ')}`)
          } else { setError(data.error || 'Erro ao processar arquivo') }
        } catch { setError('Erro de conexão ao enviar arquivo') }
      }
    }
    xhr.onerror = () => { setUploading(false); setError('Erro de conexão ao enviar arquivo') }
    xhr.send(formData)
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div
          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn("border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary')}
        >
          <input ref={fileInputRef} type="file" accept=".xlsx,.jpg,.jpeg,.png,.webp,.pdf" onChange={handleInputChange} className="hidden" />
          {file ? (
            <div className="space-y-2">
              <FileText className="w-8 h-8 mx-auto text-primary" />
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">{formatSize(file.size)}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">Arraste um arquivo aqui ou clique para selecionar</p>
              <p className="text-sm text-muted-foreground">.xlsx, .jpg, .png, .webp ou .pdf (máx. 10MB)</p>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        {uploading && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Enviando...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {file && !uploading && (
          <div className="flex justify-end">
            <Button onClick={handleUpload}>
              Enviar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
