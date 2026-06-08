import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { getTodosJogos } from '@/lib/db/queries/jogos'
import { parseExcel } from '@/lib/services/upload/excel-parser'
import { parseFoto } from '@/lib/services/upload/ocr-vision'
import { validateUpload } from '@/lib/services/upload/validator'
import type { UploadResult } from '@/lib/utils/types'

const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const participanteId = formData.get('participanteId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'Arquivo ausente' }, { status: 400 })
    }

    if (!participanteId || participanteId.trim() === '') {
      return NextResponse.json({ error: 'participanteId ausente' }, { status: 400 })
    }

    const mime = file.type
    const isExcel = mime === EXCEL_MIME
    const isImage = IMAGE_MIMES.includes(mime)

    if (!isExcel && !isImage) {
      return NextResponse.json({ error: 'Tipo de arquivo não suportado' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const jogos = await getTodosJogos()
    const jogosIds = jogos.map((j) => j.id)
    const timesJogos = jogos.map((j) => ({ timeA: j.timeA, timeB: j.timeB }))

    let result: UploadResult

    if (isExcel) {
      result = parseExcel(buffer, jogosIds)
    } else {
      const fotoResult = await parseFoto(buffer, mime)
      const mappedPalpites = fotoResult.palpites.map((p, i) => ({
        jogoId: jogosIds[i] ?? '',
        placarA: p.placarA,
        placarB: p.placarB,
      }))
      result = { ...fotoResult, palpites: mappedPalpites }
    }

    const validacao = validateUpload(result, timesJogos)

    if (!validacao.valido) {
      return NextResponse.json({ error: 'Erros de validação', validacao }, { status: 400 })
    }

    return NextResponse.json({
      preview: {
        palpites: result.palpites.map((p) => ({ jogoId: p.jogoId, placarA: p.placarA, placarB: p.placarB })),
        extras: result.extras,
        fonte: result.fonte,
      },
      validacao,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno do servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
