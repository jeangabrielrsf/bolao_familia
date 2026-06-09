import { parsePdf } from '../pdf-parser'
import { parseFoto } from '../ocr-vision'
import * as pdfjsLib from 'pdfjs-dist'

class MockOffscreenCanvas {
  width: number
  height: number
  constructor(width: number, height: number) {
    this.width = width
    this.height = height
  }
  getContext() {
    return {}
  }
  convertToBlob() {
    return Promise.resolve(new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }))
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).OffscreenCanvas = MockOffscreenCanvas

jest.mock('../ocr-vision', () => ({
  parseFoto: jest.fn().mockResolvedValue({
    palpites: Array.from({ length: 33 }, (_, i) => ({
      jogoId: '',
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

jest.mock('pdfjs-dist', () => {
  const mockPage = (_pageNum: number) => ({
    getViewport: jest.fn().mockReturnValue({ width: 612, height: 792 }),
    render: jest.fn().mockReturnValue({ promise: Promise.resolve() }),
  })

  const createMockPdf = (numPages: number) => {
    const pages: Record<number, ReturnType<typeof mockPage>> = {}
    for (let i = 1; i <= numPages; i++) {
      pages[i] = mockPage(i)
    }
    return {
      numPages,
      getPage: jest.fn().mockImplementation((n: number) => {
        if (pages[n]) return Promise.resolve(pages[n])
        return Promise.reject(new Error(`Page ${n} not found`))
      }),
    }
  }

  return {
    GlobalWorkerOptions: { workerSrc: '' },
    getDocument: jest.fn().mockImplementation((opts: { data: Uint8Array }) => {
      const data = opts.data
      if (!data || data.length === 0) {
        return {
          promise: Promise.reject(new Error('Invalid PDF buffer')),
        }
      }
      const header = Buffer.from(data.slice(0, 5)).toString('utf-8')
      if (!header.startsWith('%PDF')) {
        return {
          promise: Promise.reject(new Error('Invalid PDF: not a PDF file')),
        }
      }
      const numPages = Math.min(data.length > 100 ? 2 : 1, 10)
      return {
        promise: Promise.resolve(createMockPdf(numPages)),
      }
    }),
  }
})

describe('parsePdf', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('throws on invalid PDF buffer', async () => {
    const invalidBuffer = Buffer.from('not a pdf')
    await expect(parsePdf(invalidBuffer)).rejects.toThrow()
  })

  it('throws on empty buffer', async () => {
    await expect(parsePdf(Buffer.from([]))).rejects.toThrow()
  })

  it('returns UploadResult with fonte pdf for valid PDF', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4 fake pdf content here with enough bytes')
    const result = await parsePdf(pdfBuffer)

    expect(result.fonte).toBe('pdf')
    expect(result.palpites).toHaveLength(33)
    expect(result.extras).toHaveLength(5)
  })

  it('calls parseFoto with array of page images', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4 fake pdf content here with enough bytes')

    await parsePdf(pdfBuffer)

    expect(parseFoto).toHaveBeenCalledWith(
      expect.any(Array),
      'image/png'
    )
  })

  it('renders each page and passes buffers to parseFoto', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4 fake pdf content here with enough bytes')

    await parsePdf(pdfBuffer)

    const mockPdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) }).promise
    const images = (parseFoto as jest.Mock).mock.calls[0][0]
    expect(images).toHaveLength(mockPdf.numPages)
    images.forEach((img: unknown) => {
      expect(img).toBeInstanceOf(Buffer)
    })
  })
})
