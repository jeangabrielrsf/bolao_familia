import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { participanteId, palpites, extras, fonte, arquivoUrl, arquivoBase64, arquivoNome, arquivoContentType } = body

    if (!participanteId || !palpites || !extras) {
      return NextResponse.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 })
    }

    let finalArquivoUrl = arquivoUrl || ''

    if (arquivoBase64 && arquivoNome) {
      const { uploadFile } = await import('@/lib/services/storage/supabase')
      const buffer = Buffer.from(arquivoBase64, 'base64')
      const path = `uploads/${participanteId}/${Date.now()}-${arquivoNome}`
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
