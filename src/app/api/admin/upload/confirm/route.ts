import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { participanteId, palpites, extras, fonte, arquivoUrl, arquivoBase64, arquivoNome, arquivoContentType } = body

    if (!participanteId || typeof participanteId !== 'string' || participanteId.trim() === '') {
      return NextResponse.json({ error: 'participanteId inválido' }, { status: 400 })
    }

    if (!Array.isArray(palpites)) {
      return NextResponse.json({ error: 'palpites deve ser um array' }, { status: 400 })
    }
    for (const p of palpites) {
      if (!p.jogoId || typeof p.jogoId !== 'string' || p.jogoId.trim() === '') {
        return NextResponse.json({ error: 'jogoId inválido em palpites' }, { status: 400 })
      }
      if (!Number.isInteger(p.placarA) || p.placarA < 0) {
        return NextResponse.json({ error: 'placarA deve ser um inteiro não negativo' }, { status: 400 })
      }
      if (!Number.isInteger(p.placarB) || p.placarB < 0) {
        return NextResponse.json({ error: 'placarB deve ser um inteiro não negativo' }, { status: 400 })
      }
    }

    if (!Array.isArray(extras)) {
      return NextResponse.json({ error: 'extras deve ser um array' }, { status: 400 })
    }
    const validTipos = ['artilheiro', 'campeao', 'vice', 'terceiro', 'quarto'] as const
    for (const e of extras) {
      if (!validTipos.includes(e.tipo)) {
        return NextResponse.json({ error: `tipo inválido em extras: ${e.tipo}` }, { status: 400 })
      }
      if (!e.valor || typeof e.valor !== 'string' || e.valor.trim() === '') {
        return NextResponse.json({ error: 'valor inválido em extras' }, { status: 400 })
      }
    }

    if (fonte !== 'excel' && fonte !== 'foto' && fonte !== 'pdf') {
      return NextResponse.json({ error: 'fonte deve ser "excel", "foto" ou "pdf"' }, { status: 400 })
    }

    const participante = await prisma.participante.findUnique({ where: { id: participanteId } })
    if (!participante) {
      return NextResponse.json({ error: 'Participante não encontrado' }, { status: 404 })
    }

    let finalArquivoUrl = arquivoUrl || ''

    if (arquivoBase64 && arquivoNome) {
      const { uploadFile } = await import('@/lib/services/storage/supabase')
      const buffer = Buffer.from(arquivoBase64, 'base64')
      const sanitizedNome = arquivoNome
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9.-]/g, '-')
      const path = `uploads/${participanteId}/${Date.now()}-${sanitizedNome}`
      finalArquivoUrl = await uploadFile('palpites', path, buffer, arquivoContentType || 'application/octet-stream')
    }

    await prisma.$transaction(async (tx) => {
      await tx.palpite.deleteMany({ where: { participanteId } })
      await tx.palpiteExtra.deleteMany({ where: { participanteId } })

      await tx.palpite.createMany({
        data: palpites.map((p: { jogoId: string; placarA: number; placarB: number }) => ({
          participanteId,
          jogoId: p.jogoId,
          placarA: p.placarA,
          placarB: p.placarB,
          fonte,
        })),
      })

      await tx.palpiteExtra.createMany({
        data: extras.map((e: { tipo: string; valor: string }) => ({
          participanteId,
          tipo: e.tipo as 'artilheiro' | 'campeao' | 'vice' | 'terceiro' | 'quarto',
          valor: e.valor,
          fonte,
        })),
      })

      await tx.uploadLog.create({
        data: {
          participanteId,
          tipoArquivo: fonte,
          arquivoUrl: finalArquivoUrl,
          status: 'sucesso',
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Upload confirm error:', error)
    return NextResponse.json({ error: 'Erro ao confirmar upload' }, { status: 500 })
  }
}
