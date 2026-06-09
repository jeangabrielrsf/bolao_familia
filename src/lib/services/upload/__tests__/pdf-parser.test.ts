import { parsePdf } from '../pdf-parser'
import { parseFoto } from '../ocr-vision'

jest.mock('child_process', () => {
  const fs = jest.requireActual<typeof import('fs')>('fs')
  const path = jest.requireActual<typeof import('path')>('path')

  return {
    execFile: jest.fn((_cmd: string, args: string[], cb: (err: Error | null, stdout: string, stderr: string) => void) => {
      const outDir = args[args.length - 1].replace('/page', '')

      for (let i = 1; i <= 2; i++) {
        fs.writeFileSync(path.join(outDir, `page-${String(i).padStart(2, '0')}.png`), Buffer.from([137, 80, 78, 71]))
      }
      cb(null, '', '')
    }),
  }
})

jest.mock('../ocr-vision', () => ({
  parseFoto: jest.fn().mockResolvedValue({
    palpites: Array.from({ length: 33 }, (_, i) => ({
      timeA: `Time A${i + 1}`,
      timeB: `Time B${i + 1}`,
      placarA: i % 5,
      placarB: (i + 1) % 3,
    })),
    extras: [
      { tipo: 'artilheiro' as const, valor: 'Mbappé' },
      { tipo: 'quarto' as const, valor: 'Alemanha' },
      { tipo: 'terceiro' as const, valor: 'França' },
      { tipo: 'vice' as const, valor: 'Argentina' },
      { tipo: 'campeao' as const, valor: 'Brasil' },
    ],
    fonte: 'pdf' as const,
  }),
}))

describe('parsePdf', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('throws on empty buffer', async () => {
    await expect(parsePdf(Buffer.from([]))).rejects.toThrow('PDF vazio')
  })

  it('returns UploadResult with fonte pdf for valid PDF', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4 fake pdf content')
    const result = await parsePdf(pdfBuffer)

    expect(result.fonte).toBe('pdf')
    expect(result.palpites).toHaveLength(33)
    expect(result.extras).toHaveLength(5)
  })

  it('calls pdftoppm to convert PDF to images', async () => {
    const { execFile } = await import('child_process')
    const pdfBuffer = Buffer.from('%PDF-1.4 fake pdf content')

    await parsePdf(pdfBuffer)

    expect(execFile).toHaveBeenCalledWith(
      'pdftoppm',
      expect.arrayContaining(['-png', '-r', '200']),
      expect.any(Function)
    )
  })

  it('calls parseFoto with converted page images', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4 fake pdf content')

    await parsePdf(pdfBuffer)

    expect(parseFoto).toHaveBeenCalledWith(
      expect.arrayContaining([expect.any(Buffer)]),
      'image/png'
    )
  })
})
