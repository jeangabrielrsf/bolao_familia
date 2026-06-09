import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { getTodosJogos } from '@/lib/db/queries/jogos'
import { parseExcel } from '@/lib/services/upload/excel-parser'
import { parseFoto } from '@/lib/services/upload/ocr-vision'
import { parsePdf } from '@/lib/services/upload/pdf-parser'
import { validateUpload } from '@/lib/services/upload/validator'
import type { UploadResult } from '@/lib/utils/types'

const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const PDF_MIME = 'application/pdf'
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 10 * 1024 * 1024

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

    console.log(`[upload] Arquivo recebido: ${file.name} (${(file.size / 1024).toFixed(1)} KB, ${file.type}) | participante: ${participanteId}`)

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Arquivo muito grande (máximo 10MB)' }, { status: 413 })
    }

    if (!participanteId || participanteId.trim() === '') {
      return NextResponse.json({ error: 'participanteId ausente' }, { status: 400 })
    }

    const mime = file.type
    const isExcel = mime === EXCEL_MIME
    const isImage = IMAGE_MIMES.includes(mime)
    const isPdf = mime === PDF_MIME

    if (!isExcel && !isImage && !isPdf) {
      return NextResponse.json({ error: 'Tipo de arquivo não suportado' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const jogos = await getTodosJogos()
    const jogosIds = jogos.map((j) => j.id)
    const timesJogos = jogos.map((j) => ({ timeA: j.timeA, timeB: j.timeB }))

    let result: UploadResult
    let timesJogosValidacao = timesJogos

    if (isExcel) {
      console.log('[upload] Parseando Excel...')
      result = parseExcel(buffer, jogosIds)
    } else if (isPdf) {
      console.log('[upload] Parseando PDF...')
      result = await parsePdf(buffer)
      const mappedPalpites = result.palpites.map((p) => {
        const jogo = jogos.find(j =>
          j.timeA.toLowerCase() === p.timeA.toLowerCase() &&
          j.timeB.toLowerCase() === p.timeB.toLowerCase()
        )
        return {
          jogoId: jogo?.id ?? '',
          placarA: p.placarA,
          placarB: p.placarB,
        }
      })
      if (mappedPalpites.some(p => !p.jogoId)) {
        const naoEncontrados = mappedPalpites
          .filter(p => !p.jogoId)
          .map(p => `${result.palpites[mappedPalpites.indexOf(p)].timeA} x ${result.palpites[mappedPalpites.indexOf(p)].timeB}`)
        return NextResponse.json({
          error: 'Jogos não encontrados no banco',
          detalhes: naoEncontrados,
        }, { status: 400 })
      }
      result = { ...result, palpites: mappedPalpites }
      timesJogosValidacao = timesJogos.slice(0, mappedPalpites.length)
    } else {
      console.log('[upload] Parseando imagem...')
      const fotoResult = await parseFoto(buffer, mime)
      const mappedPalpites = fotoResult.palpites.map((p) => {
        const jogo = jogos.find(j =>
          j.timeA.toLowerCase() === p.timeA.toLowerCase() &&
          j.timeB.toLowerCase() === p.timeB.toLowerCase()
        )
        return {
          jogoId: jogo?.id ?? '',
          placarA: p.placarA,
          placarB: p.placarB,
        }
      })
      if (mappedPalpites.some(p => !p.jogoId)) {
        const naoEncontrados = mappedPalpites
          .filter(p => !p.jogoId)
          .map(p => `${fotoResult.palpites[mappedPalpites.indexOf(p)].timeA} x ${fotoResult.palpites[mappedPalpites.indexOf(p)].timeB}`)
        return NextResponse.json({
          error: 'Jogos não encontrados no banco',
          detalhes: naoEncontrados,
        }, { status: 400 })
      }
      result = { ...fotoResult, palpites: mappedPalpites }
      timesJogosValidacao = timesJogos.slice(0, mappedPalpites.length)
    }

    console.log(`[upload] Parse concluído — ${result.palpites.length} palpites, ${result.extras.length} extras, fonte: ${result.fonte}`)

    const validacao = validateUpload(result, timesJogosValidacao)

    if (!validacao.valido) {
      console.log(`[upload] ❌ Validação falhou: ${validacao.erros.length} erro(s)`)
      return NextResponse.json({
        error: 'Erros de validação',
        validacao,
        detalhes: validacao.erros,
      }, { status: 400 })
    }

    console.log('[upload] ✅ Upload processado com sucesso')

    return NextResponse.json({
      preview: {
        participanteId,
        palpites: result.palpites.map((p) => ({ jogoId: p.jogoId, placarA: p.placarA, placarB: p.placarB })),
        extras: result.extras,
        fonte: result.fonte,
      },
      validacao,
    })
  } catch (error) {
    console.error('[upload] Erro:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
