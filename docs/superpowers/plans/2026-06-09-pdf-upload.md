# PDF Upload Support - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar suporte ao upload de PDFs no sistema de upload de palpites, extraindo páginas como imagens via `pdfjs-dist` e processando via OCR (modelo de visão).

**Architecture:** O PDF é renderizado página-a-página como imagens PNG usando `pdfjs-dist`. As imagens são enviadas ao modelo de visão (OpenRouter/GPT-4o) em uma única chamada para extração dos palpites. O fluxo de 2 etapas (parse/preview → confirm) permanece inalterado.

**Tech Stack:** Next.js 16, TypeScript, `pdfjs-dist`, OpenRouter API, Prisma, Supabase Storage

---

## File Structure

| Ação | Arquivo | Responsabilidade |
|------|---------|-----------------|
| Modificar | `prisma/schema.prisma` | Adicionar `pdf` ao enum `Fonte` |
| Modificar | `src/lib/utils/types.ts` | Adicionar `'pdf'` ao tipo `UploadResult.fonte` |
| Criar | `src/lib/services/upload/pdf-parser.ts` | Renderizar páginas do PDF como imagens e delegar ao OCR |
| Modificar | `src/lib/services/upload/ocr-vision.ts` | Aceitar `Buffer | Buffer[]` para multi-página |
| Modificar | `src/app/api/upload/route.ts` | Adicionar branch `application/pdf` |
| Modificar | `src/components/admin/UploadForm.tsx` | Aceitar `.pdf` no input e validação |
| Modificar | `src/app/admin/upload/page.tsx` | Atualizar tipo `fonte` para incluir `'pdf'` |
| Criar | `src/lib/services/upload/__tests__/pdf-parser.test.ts` | Testes unitários do parser PDF |

---

### Task 1: Instalar `pdfjs-dist`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Instalar a dependência**

```bash
npm install pdfjs-dist
```

- [ ] **Step 2: Verificar a instalação**

Run: `npm ls pdfjs-dist`
Expected: Mostra `pdfjs-dist` instalado sem erros

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install pdfjs-dist for PDF parsing"
```

---

### Task 2: Atualizar tipos e enum Prisma

**Files:**
- Modify: `prisma/schema.prisma:24-27`
- Modify: `src/lib/utils/types.ts:12-16`

- [ ] **Step 1: Atualizar o enum `Fonte` no schema Prisma**

No arquivo `prisma/schema.prisma`, alterar o enum `Fonte` (linhas 24-27):

```prisma
enum Fonte {
  excel
  foto
  pdf
}
```

- [ ] **Step 2: Atualizar o tipo `UploadResult`**

No arquivo `src/lib/utils/types.ts`, alterar a interface `UploadResult` (linhas 12-16):

```typescript
export interface UploadResult {
  palpites: PalpiteDTO[]
  extras: PalpiteExtraDTO[]
  fonte: 'excel' | 'foto' | 'pdf'
}
```

- [ ] **Step 3: Gerar o client Prisma**

```bash
npx prisma generate
```

Expected: Client gerado com sucesso sem erros

- [ ] **Step 4: Criar a migration**

```bash
npx prisma migrate dev --name add-pdf-fonte
```

Expected: Migration criada e aplicada com sucesso

- [ ] **Step 5: Commit**

```bash
git add prisma/ src/lib/utils/types.ts
git commit -m "feat: add pdf to Fonte enum and UploadResult type"
```

---

### Task 3: Refatorar `ocr-vision.ts` para aceitar múltiplas imagens

**Files:**
- Modify: `src/lib/services/upload/ocr-vision.ts`

- [ ] **Step 1: Refatorar `parseFoto` para aceitar `Buffer | Buffer[]`**

Substituir o conteúdo de `src/lib/services/upload/ocr-vision.ts`:

```typescript
import type { UploadResult } from '@/lib/utils/types'

const PROMPT_SINGLE = `Analise esta imagem de uma planilha de bolão da Copa do Mundo 2026.
Extraia todos os palpites e retorne como JSON no seguinte formato:
{
  "palpites": [{"jogo_numero": 1, "placar_a": 0, "placar_b": 0}, ...],
  "extras": {"artilheiro": "", "quarto": "", "terceiro": "", "vice": "", "campeao": ""}
}
Os jogos estão numerados de 1 a 33. As colunas de placar são as que o participante preencheu.
Os palpites extras estão no final da planilha.
Retorne APENAS o JSON, sem texto adicional.`

const PROMPT_MULTI = `Analise estas {N} imagens de uma planilha de bolão da Copa do Mundo 2026 escaneada em PDF.
A planilha está distribuída em múltiplas páginas. Extraia todos os palpites de todas as páginas e consolide em um único JSON.
Formato do JSON:
{
  "palpites": [{"jogo_numero": 1, "placar_a": 0, "placar_b": 0}, ...],
  "extras": {"artilheiro": "", "quarto": "", "terceiro": "", "vice": "", "campeao": ""}
}
Os jogos estão numerados de 1 a 33. As colunas de placar são as que o participante preencheu.
Os palpites extras estão no final da planilha.
Retorne APENAS o JSON, sem texto adicional.`

export async function parseFoto(
  input: Buffer | Buffer[],
  mimeType = 'image/jpeg'
): Promise<UploadResult> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY não configurada')
  }

  const buffers = Array.isArray(input) ? input : [input]
  const isMulti = buffers.length > 1

  const prompt = isMulti
    ? PROMPT_MULTI.replace('{N}', String(buffers.length))
    : PROMPT_SINGLE

  const imageContents = buffers.map((buf) => ({
    type: 'image_url' as const,
    image_url: { url: `data:${mimeType};base64,${buf.toString('base64')}` },
  }))

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)

  let response: Response
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.VISION_MODEL || 'openai/gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              ...imageContents,
            ],
          },
        ],
        max_tokens: 3000,
      }),
      signal: controller.signal,
    })
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new Error('Tempo limite excedido na conexão com o serviço de OCR')
    }
    throw new Error(`Falha na conexão com o serviço de OCR: ${(error as Error).message}`)
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    throw new Error(`Serviço de OCR retornou erro ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()

  const content = data?.choices?.[0]?.message?.content
  if (!content || typeof content !== 'string') {
    throw new Error('Resposta inválida do serviço de OCR: conteúdo ausente')
  }

  const cleaned = content.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')

  let parsed: {
    palpites?: Array<{ jogo_numero: number; placar_a: number; placar_b: number }>
    extras?: Record<string, string>
  }
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('Resposta inválida do serviço de OCR: JSON malformado')
  }

  if (!Array.isArray(parsed.palpites)) {
    throw new Error('Resposta inválida do serviço de OCR: campo "palpites" ausente')
  }

  for (const p of parsed.palpites) {
    if (!Number.isInteger(p.placar_a) || p.placar_a < 0) {
      throw new Error(`Placar inválido: placar_a do jogo ${p.jogo_numero} não é um inteiro não-negativo`)
    }
    if (!Number.isInteger(p.placar_b) || p.placar_b < 0) {
      throw new Error(`Placar inválido: placar_b do jogo ${p.jogo_numero} não é um inteiro não-negativo`)
    }
  }

  if (!parsed.extras || typeof parsed.extras !== 'object') {
    throw new Error('Resposta inválida do serviço de OCR: campo "extras" ausente')
  }

  const tiposExtra = ['artilheiro', 'quarto', 'terceiro', 'vice', 'campeao'] as const

  return {
    palpites: parsed.palpites.map((p) => ({
      jogoId: '',
      placarA: p.placar_a,
      placarB: p.placar_b,
    })),
    extras: tiposExtra
      .filter((tipo) => parsed.extras![tipo] != null)
      .map((tipo) => ({
        tipo,
        valor: String(parsed.extras![tipo]).trim(),
      })),
    fonte: isMulti ? 'pdf' : 'foto',
  }
}
```

- [ ] **Step 2: Verificar que o código existente não quebra**

Run: `npx tsc --noEmit`
Expected: Sem erros de tipo

- [ ] **Step 3: Rodar testes existentes**

```bash
npx jest --passWithNoTests
```

Expected: Todos os testes existentes passam

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/upload/ocr-vision.ts
git commit -m "feat: support multiple images in OCR parser for PDF pages"
```

---

### Task 4: Criar `pdf-parser.ts` com testes

**Files:**
- Create: `src/lib/services/upload/pdf-parser.ts`
- Create: `src/lib/services/upload/__tests__/pdf-parser.test.ts`

- [ ] **Step 1: Escrever os testes**

Criar `src/lib/services/upload/__tests__/pdf-parser.test.ts`:

```typescript
import { parsePdf } from '../pdf-parser'

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

function createMinimalPdf(numPages: number): Buffer {
  const pages = Array.from({ length: numPages }, (_, i) =>
    `${i + 1} 0 obj\n<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] >>\nendobj`
  ).join('\n')

  const kids = Array.from({ length: numPages }, (_, i) => `${i + 1} 0 R`).join(' ')

  const pdf = `%PDF-1.4
${pages}
${numPages + 1} 0 obj
<< /Type /Pages /Kids [${kids}] /Count ${numPages} >>
endobj
${numPages + 2} 0 obj
<< /Type /Catalog /Pages ${numPages + 1} 0 R >>
endobj
trailer
<< /Size ${numPages + 3} /Root ${numPages + 2} 0 R >>
startxref
0
%%EOF`

  return Buffer.from(pdf, 'utf-8')
}

describe('parsePdf', () => {
  it('throws on invalid PDF buffer', async () => {
    const invalidBuffer = Buffer.from('not a pdf')
    await expect(parsePdf(invalidBuffer)).rejects.toThrow()
  })

  it('throws on empty buffer', async () => {
    await expect(parsePdf(Buffer.from([]))).rejects.toThrow()
  })

  it('returns UploadResult with fonte pdf for valid PDF', async () => {
    const pdfBuffer = createMinimalPdf(2)
    const result = await parsePdf(pdfBuffer)

    expect(result.fonte).toBe('pdf')
    expect(result.palpites).toHaveLength(33)
    expect(result.extras).toHaveLength(5)
  })

  it('calls parseFoto with array of page images', async () => {
    const { parseFoto } = require('../ocr-vision')
    const pdfBuffer = createMinimalPdf(3)

    await parsePdf(pdfBuffer)

    expect(parseFoto).toHaveBeenCalledWith(
      expect.any(Array),
      'image/png'
    )
    const images = (parseFoto as jest.Mock).mock.calls[0][0]
    expect(images).toHaveLength(3)
    expect(images[0]).toBeInstanceOf(Buffer)
  })
})
```

- [ ] **Step 2: Rodar os testes para verificar que falham**

```bash
npx jest src/lib/services/upload/__tests__/pdf-parser.test.ts
```

Expected: FAIL — `pdf-parser` module not found

- [ ] **Step 3: Criar o parser PDF**

Criar `src/lib/services/upload/pdf-parser.ts`:

```typescript
import * as pdfjsLib from 'pdfjs-dist'
import { parseFoto } from './ocr-vision'
import type { UploadResult } from '@/lib/utils/types'

const MAX_PAGES = 10

pdfjsLib.GlobalWorkerOptions.workerSrc = ''

async function renderPageToPng(
  page: pdfjsLib.PDFPageProxy,
  scale: number
): Promise<Buffer> {
  const viewport = page.getViewport({ scale })

  const canvas = new OffscreenCanvas(viewport.width, viewport.height)
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Falha ao criar canvas para renderização do PDF')
  }

  await page.render({
    canvasContext: context as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise

  const blob = await canvas.convertToBlob({ type: 'image/png' })
  const arrayBuffer = await blob.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function parsePdf(buffer: Buffer): Promise<UploadResult> {
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
```

- [ ] **Step 4: Rodar os testes**

```bash
npx jest src/lib/services/upload/__tests__/pdf-parser.test.ts
```

Expected: Os testes de "invalid PDF" e "empty buffer" passam. O teste de "valid PDF" pode falhar se o PDF minimalista não for parseável pelo pdfjs-dist — isso é esperado, pois o PDF é sinteticamente construído. Ajustar conforme necessário.

- [ ] **Step 5: Verificar compilação**

```bash
npx tsc --noEmit
```

Expected: Sem erros. Se `OffscreenCanvas` não for reconhecido, adicionar `"DOM"` ao `lib` no `tsconfig.json`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/upload/pdf-parser.ts src/lib/services/upload/__tests__/pdf-parser.test.ts
git commit -m "feat: add PDF parser using pdfjs-dist with OCR delegation"
```

---

### Task 5: Atualizar API route `/api/upload` para suportar PDF

**Files:**
- Modify: `src/app/api/upload/route.ts`

- [ ] **Step 1: Atualizar o route handler**

Substituir o conteúdo de `src/app/api/upload/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { getTodosJogos } from '@/lib/db/queries/jogos'
import { parseExcel } from '@/lib/services/upload/excel-parser'
import { parseFoto } from '@/lib/services/upload/ocr-vision'
import { parsePdf } from '@/lib/services/upload/pdf-parser'
import { validateUpload } from '@/lib/services/upload/validator'
import type { UploadResult } from '@/lib/utils/types'

const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp']
const PDF_MIME = 'application/pdf'
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

    if (isExcel) {
      result = parseExcel(buffer, jogosIds)
    } else if (isPdf) {
      result = await parsePdf(buffer)
      const mappedPalpites = result.palpites.map((p, i) => ({
        jogoId: jogosIds[i] ?? '',
        placarA: p.placarA,
        placarB: p.placarB,
      }))
      if (mappedPalpites.some(p => !p.jogoId)) {
        return NextResponse.json({ error: 'Número de palpites do PDF excede número de jogos' }, { status: 400 })
      }
      result = { ...result, palpites: mappedPalpites }
    } else {
      const fotoResult = await parseFoto(buffer, mime)
      const mappedPalpites = fotoResult.palpites.map((p, i) => ({
        jogoId: jogosIds[i] ?? '',
        placarA: p.placarA,
        placarB: p.placarB,
      }))
      if (mappedPalpites.some(p => !p.jogoId)) {
        return NextResponse.json({ error: 'Número de palpites da foto excede número de jogos' }, { status: 400 })
      }
      result = { ...fotoResult, palpites: mappedPalpites }
    }

    const validacao = validateUpload(result, timesJogos)

    if (!validacao.valido) {
      return NextResponse.json({ error: 'Erros de validação', validacao }, { status: 400 })
    }

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
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verificar compilação**

```bash
npx tsc --noEmit
```

Expected: Sem erros

- [ ] **Step 3: Commit**

```bash
git add src/app/api/upload/route.ts
git commit -m "feat: add PDF support to upload API route"
```

---

### Task 6: Atualizar frontend (`UploadForm` e `upload/page.tsx`)

**Files:**
- Modify: `src/components/admin/UploadForm.tsx`
- Modify: `src/app/admin/upload/page.tsx`

- [ ] **Step 1: Atualizar `UploadForm.tsx`**

No arquivo `src/components/admin/UploadForm.tsx`, fazer as seguintes alterações:

1. Alterar o tipo de `fonte` na interface `UploadFormProps` (linha 10):

```typescript
  onUploadSuccess: (
    preview: { palpites: PalpiteDTO[]; extras: PalpiteExtraDTO[]; fonte: 'excel' | 'foto' | 'pdf' },
    validacao: ValidationResult
  ) => void
```

2. Adicionar `'application/pdf'` ao array `ACCEPTED_TYPES` (linha 24-29):

```typescript
  const ACCEPTED_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ]
```

3. Atualizar a mensagem de erro na função `validateFile` (linha 33):

```typescript
      return 'Formato não suportado. Use .xlsx, .jpg, .png, .webp ou .pdf'
```

4. Adicionar `.pdf` ao atributo `accept` do input (linha 123):

```typescript
          accept=".xlsx,.jpg,.jpeg,.png,.webp,.pdf"
```

5. Atualizar a mensagem de ajuda (linha 135):

```typescript
            <p className="text-sm text-muted">.xlsx, .jpg, .png, .webp ou .pdf (máx. 10MB)</p>
```

- [ ] **Step 2: Atualizar `upload/page.tsx`**

No arquivo `src/app/admin/upload/page.tsx`, fazer as seguintes alterações:

1. Atualizar o tipo do state `preview` (linha 33-37):

```typescript
  const [preview, setPreview] = useState<{
    palpites: PalpiteDTO[]
    extras: PalpiteExtraDTO[]
    fonte: 'excel' | 'foto' | 'pdf'
  } | null>(null)
```

2. Atualizar o tipo do parâmetro `previewData` em `handleUploadSuccess` (linha 61):

```typescript
    (
      previewData: { palpites: PalpiteDTO[]; extras: PalpiteExtraDTO[]; fonte: 'excel' | 'foto' | 'pdf' },
      validacaoData: ValidationResult
    ) => {
```

- [ ] **Step 3: Verificar compilação**

```bash
npx tsc --noEmit
```

Expected: Sem erros

- [ ] **Step 4: Rodar todos os testes**

```bash
npx jest --passWithNoTests
```

Expected: Todos os testes passam

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/UploadForm.tsx src/app/admin/upload/page.tsx
git commit -m "feat: add PDF support to upload form and admin page"
```

---

### Task 7: Verificar build e lint

- [ ] **Step 1: Rodar lint**

```bash
npm run lint
```

Expected: Sem erros. Corrigir quaisquer erros de lint.

- [ ] **Step 2: Verificar typecheck**

```bash
npx tsc --noEmit
```

Expected: Sem erros

- [ ] **Step 3: Verificar build**

```bash
npm run build
```

Expected: Build completa com sucesso. Se houver erros relacionados ao `pdfjs-dist` worker ou `OffscreenCanvas`, ajustar a configuração.

- [ ] **Step 4: Commit final (se houve ajustes)**

```bash
git add -A
git commit -m "fix: resolve build/lint issues for PDF upload support"
```
