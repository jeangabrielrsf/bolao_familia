import { parseFoto } from './ocr-vision'
import type { UploadResult } from '@/lib/utils/types'

const MAX_PAGES = 10

async function renderPageToPng(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  scale: number
): Promise<Buffer> {
  const viewport = page.getViewport({ scale })

  const canvas = new OffscreenCanvas(viewport.width, viewport.height)
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Falha ao criar canvas para renderização do PDF')
  }

  await page.render({
    canvas: null,
    canvasContext: context as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise

  const blob = await canvas.convertToBlob({ type: 'image/png' })
  const arrayBuffer = await blob.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function parsePdf(buffer: Buffer): Promise<UploadResult> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = ''

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  })

  const pdf = await loadingTask.promise

  if (pdf.numPages === 0) {
    throw new Error('PDF não contém páginas')
  }

  if (pdf.numPages > MAX_PAGES) {
    throw new Error(`PDF com muitas páginas (máximo ${MAX_PAGES})`)
  }

  const pageImages: Buffer[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const imageBuffer = await renderPageToPng(page, 2.0)
    pageImages.push(imageBuffer)
  }

  const result = await parseFoto(pageImages, 'image/png')

  return { ...result, fonte: 'pdf' }
}
