import { parsePdf } from '../pdf-parser'
import { parseFoto } from '../ocr-vision'

const mockToBuffer = jest.fn().mockReturnValue(Buffer.from([137, 80, 78, 71]))
const mockRender = jest.fn().mockReturnValue({ promise: Promise.resolve() })
const mockCleanup = jest.fn()
const mockGetViewport = jest.fn().mockReturnValue({ width: 800, height: 600 })
const mockGetPage = jest.fn()
const mockCanvasFactoryCreate = jest.fn()
const mockCanvasFactoryDestroy = jest.fn()

const mockPdfDocument = {
  numPages: 2,
  canvasFactory: {
    create: mockCanvasFactoryCreate,
    destroy: mockCanvasFactoryDestroy,
  },
  getPage: mockGetPage,
}

const mockGetDocument = jest.fn(() => ({
  promise: Promise.resolve(mockPdfDocument),
}))

jest.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  getDocument: (...args: unknown[]) => mockGetDocument(...args),
}))

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
    mockCanvasFactoryCreate.mockReturnValue({
      canvas: { toBuffer: mockToBuffer },
      context: {},
    })
    mockGetPage.mockResolvedValue({
      getViewport: mockGetViewport,
      render: mockRender,
      cleanup: mockCleanup,
    })
    mockPdfDocument.numPages = 2
    mockGetDocument.mockReturnValue({
      promise: Promise.resolve(mockPdfDocument),
    })
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

  it('renders each page to PNG via pdfjs-dist canvas', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4 fake pdf content')
    await parsePdf(pdfBuffer)

    expect(mockGetPage).toHaveBeenCalledTimes(2)
    expect(mockGetViewport).toHaveBeenCalledTimes(2)
    expect(mockRender).toHaveBeenCalledTimes(2)
    expect(mockToBuffer).toHaveBeenCalledWith('image/png')
    expect(mockCleanup).toHaveBeenCalledTimes(2)
  })

  it('calls parseFoto with converted page images', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4 fake pdf content')
    await parsePdf(pdfBuffer)

    expect(parseFoto).toHaveBeenCalledWith(
      expect.arrayContaining([expect.any(Buffer)]),
      'image/png'
    )
  })

  it('throws when PDF has more than MAX_PAGES', async () => {
    mockPdfDocument.numPages = 11
    mockGetDocument.mockReturnValueOnce({
      promise: Promise.resolve(mockPdfDocument),
    })

    const pdfBuffer = Buffer.from('%PDF-1.4 fake pdf content')
    await expect(parsePdf(pdfBuffer)).rejects.toThrow('PDF com muitas páginas')
  })
})
