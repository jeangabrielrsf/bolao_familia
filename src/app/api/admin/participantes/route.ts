import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { randomUUID } from 'crypto'
import { requireAdmin } from '@/lib/auth/middleware'
import {
  getTodosParticipantes,
  createParticipante,
  updateParticipante,
  deleteParticipante,
} from '@/lib/db/queries/participantes'
import { prisma } from '@/lib/db/client'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const FOTO_SIZE = 512
const FOTO_QUALITY = 85
const FOTO_MIN_SIZE = 100

function extractStoragePath(url: string): string {
  const marker = '/fotos/'
  const idx = url.indexOf(marker)
  if (idx === -1) return url
  return url.slice(idx + marker.length)
}

function validateFoto(foto: File): string | null {
  if (foto.size > MAX_FILE_SIZE) return 'Foto deve ter no máximo 5MB'
  if (!ALLOWED_MIME_TYPES.includes(foto.type)) return 'Formato de imagem inválido. Use JPEG, PNG ou WebP'
  return null
}

async function processFoto(buffer: Buffer): Promise<{ buffer: Buffer; path: string; contentType: string }> {
  const metadata = await sharp(buffer).metadata()
  if ((metadata.width ?? 0) < FOTO_MIN_SIZE || (metadata.height ?? 0) < FOTO_MIN_SIZE) {
    throw new Error(`Foto deve ter no mínimo ${FOTO_MIN_SIZE}x${FOTO_MIN_SIZE} pixels`)
  }
  const processed = await sharp(buffer)
    .resize(FOTO_SIZE, FOTO_SIZE, { fit: 'cover', position: 'center' })
    .webp({ quality: FOTO_QUALITY })
    .toBuffer()
  return {
    buffer: processed,
    path: `participantes/${Date.now()}-${randomUUID()}.webp`,
    contentType: 'image/webp',
  }
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const participantes = await getTodosParticipantes()
    return NextResponse.json(participantes)
  } catch (error) {
    console.error('GET participantes error:', error)
    return NextResponse.json({ error: 'Erro ao buscar participantes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const contentType = request.headers.get('content-type') || ''
    let nome: string | undefined
    let fotoUrl: string | undefined

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      nome = formData.get('nome') as string | null ?? undefined
      const foto = formData.get('foto') as File | null

      if (foto && foto.size > 0) {
        const validationError = validateFoto(foto)
        if (validationError) {
          return NextResponse.json({ error: validationError }, { status: foto.size > MAX_FILE_SIZE ? 413 : 400 })
        }
        const { uploadFile } = await import('@/lib/services/storage/supabase')
        const buffer = Buffer.from(await foto.arrayBuffer())
        const processed = await processFoto(buffer)
        fotoUrl = await uploadFile('fotos', processed.path, processed.buffer, processed.contentType)
      }
    } else {
      const body = await request.json()
      nome = body.nome
      fotoUrl = body.fotoUrl
    }

    if (!nome || typeof nome !== 'string' || nome.trim() === '') {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const participante = await createParticipante(nome.trim(), fotoUrl)
    return NextResponse.json(participante, { status: 201 })
  } catch (error) {
    console.error('POST participante error:', error)
    return NextResponse.json({ error: 'Erro ao criar participante' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const contentType = request.headers.get('content-type') || ''
    let id: string | undefined
    let nome: string | undefined
    let fotoUrl: string | undefined

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      id = formData.get('id') as string | null ?? undefined
      nome = formData.get('nome') as string | null ?? undefined
      const foto = formData.get('foto') as File | null

      if (foto && foto.size > 0) {
        const validationError = validateFoto(foto)
        if (validationError) {
          return NextResponse.json({ error: validationError }, { status: foto.size > MAX_FILE_SIZE ? 413 : 400 })
        }
        const { uploadFile, deleteFile } = await import('@/lib/services/storage/supabase')
        const existente = await prisma.participante.findUnique({ where: { id: id! }, select: { fotoUrl: true } })
        const buffer = Buffer.from(await foto.arrayBuffer())
        const processed = await processFoto(buffer)
        fotoUrl = await uploadFile('fotos', processed.path, processed.buffer, processed.contentType)
        if (existente?.fotoUrl) {
          try { await deleteFile('fotos', extractStoragePath(existente.fotoUrl)) } catch { /* ignore */ }
        }
      }
    } else {
      const body = await request.json()
      id = body.id
      nome = body.nome
      fotoUrl = body.fotoUrl
    }

    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    }

    const data: { nome?: string; fotoUrl?: string } = {}
    if (nome !== undefined) data.nome = nome.trim()
    if (fotoUrl !== undefined) data.fotoUrl = fotoUrl

    const participante = await updateParticipante(id, data)
    return NextResponse.json(participante)
  } catch (error) {
    console.error('PUT participante error:', error)
    return NextResponse.json({ error: 'Erro ao atualizar participante' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    let id = searchParams.get('id')

    if (!id) {
      const body = await request.json()
      id = body.id
    }

    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    }

    const existente = await prisma.participante.findUnique({ where: { id }, select: { fotoUrl: true } })

    await prisma.$transaction(async (tx) => {
      await tx.uploadLog.deleteMany({ where: { participanteId: id } })
      await deleteParticipante(id)
    })

    if (existente?.fotoUrl) {
      try {
        const { deleteFile } = await import('@/lib/services/storage/supabase')
        await deleteFile('fotos', extractStoragePath(existente.fotoUrl))
      } catch { /* ignore */ }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE participante error:', error)
    return NextResponse.json({ error: 'Erro ao excluir participante' }, { status: 500 })
  }
}
