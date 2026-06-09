import { execFile } from 'child_process'
import { readFile, mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { promisify } from 'util'
import { parseFoto } from './ocr-vision'
import type { UploadResultOCR } from '@/lib/utils/types'

const execFileAsync = promisify(execFile)
const MAX_PAGES = 10

async function pdfToImages(buffer: Buffer): Promise<Buffer[]> {
  const tmpDir = await mkdtemp(join(tmpdir(), 'pdf-upload-'))
  const pdfPath = join(tmpDir, 'input.pdf')

  try {
    await import('fs').then((fs) => fs.writeFileSync(pdfPath, buffer))

    const startTime = Date.now()
    console.log('[pdf-parser] Convertendo PDF para imagens com pdftoppm...')

    await execFileAsync('pdftoppm', [
      '-png',
      '-r', '200',
      pdfPath,
      join(tmpDir, 'page'),
    ])

    const files = await import('fs').then((fs) =>
      fs.readdirSync(tmpDir)
        .filter((f) => f.startsWith('page') && f.endsWith('.png'))
        .sort()
    )

    const elapsed = Date.now() - startTime
    console.log(`[pdf-parser] Conversão concluída em ${elapsed}ms — ${files.length} página(s) extraída(s)`)

    if (files.length > MAX_PAGES) {
      throw new Error(`PDF com muitas páginas (máximo ${MAX_PAGES})`)
    }

    const images: Buffer[] = []
    for (const file of files) {
      const data = await readFile(join(tmpDir, file))
      console.log(`[pdf-parser] Página ${file}: ${(data.length / 1024).toFixed(1)} KB`)
      images.push(data)
    }

    return images
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
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
