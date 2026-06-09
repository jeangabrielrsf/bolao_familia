import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { parseFoto } from './ocr-vision'
import type { UploadResultOCR } from '@/lib/utils/types'

const MAX_PAGES = 10
const SCALE = 2.0

interface CanvasFactory {
  create(width: number, height: number): { canvas: { toBuffer(format: string): Buffer }; context: CanvasRenderingContext2D }
  destroy(canvasAndContext: unknown): void
}

async function pdfToImages(buffer: Buffer): Promise<Buffer[]> {
  const startTime = Date.now()
  console.log('[pdf-parser] Convertendo PDF para imagens com pdfjs-dist...')

  const pdfDocument = await getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    useSystemFonts: true,
  }).promise

  const numPages = pdfDocument.numPages
  console.log(`[pdf-parser] PDF carregado — ${numPages} página(s)`)

  if (numPages > MAX_PAGES) {
    throw new Error(`PDF com muitas páginas (máximo ${MAX_PAGES})`)
  }

  const images: Buffer[] = []
  const canvasFactory = pdfDocument.canvasFactory as CanvasFactory

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum)
    const viewport = page.getViewport({ scale: SCALE })
    const canvasAndContext = canvasFactory.create(viewport.width, viewport.height)

    await page.render({
      canvas: null,
      canvasContext: canvasAndContext.context,
      viewport,
    }).promise

    const imageBuffer = canvasAndContext.canvas.toBuffer('image/png')
    images.push(imageBuffer)
    console.log(`[pdf-parser] Página ${pageNum}: ${(imageBuffer.length / 1024).toFixed(1)} KB`)

    canvasFactory.destroy(canvasAndContext)
    page.cleanup()
  }

  const elapsed = Date.now() - startTime
  console.log(`[pdf-parser] Conversão concluída em ${elapsed}ms — ${images.length} página(s) extraída(s)`)

  return images
}

export async function parsePdf(buffer: Buffer): Promise<UploadResultOCR> {
  console.log(`[pdf-parser] Iniciando parse de PDF — buffer: ${(buffer.length / 1024).toFixed(1)} KB`)

  if (buffer.length === 0) {
    throw new Error('PDF vazio')
  }

  const pageImages = await pdfToImages(buffer)

  if (pageImages.length === 0) {
    throw new Error('Nenhuma página encontrada no PDF')
  }

  console.log(`[pdf-parser] Enviando ${pageImages.length} página(s) para OCR...`)
  const result = await parseFoto(pageImages, 'image/png')
  console.log(`[pdf-parser] OCR concluído — ${result.palpites.length} palpites, ${result.extras.length} extras`)

  return result
}
