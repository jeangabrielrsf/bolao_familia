import type { UploadResultOCR } from '@/lib/utils/types'

const PROMPT_SINGLE = `Analise esta imagem de uma planilha de bolão da Copa do Mundo 2026.
Extraia todos os palpites e retorne como JSON no seguinte formato:
{
  "palpites": [{"time_a": "México", "time_b": "África do Sul", "placar_a": 0, "placar_b": 0}, ...],
  "extras": {"artilheiro": "", "quarto": "", "terceiro": "", "vice": "", "campeao": ""}
}
Os jogos têm os nomes dos times nas colunas B e D. As colunas de placar são as que o participante preencheu.
Os palpites extras estão no final da planilha.
Retorne APENAS o JSON, sem texto adicional.`

const PROMPT_MULTI = `Analise estas {N} imagens de uma planilha de bolão da Copa do Mundo 2026 escaneada em PDF.
A planilha está distribuída em múltiplas páginas. Extraia todos os palpites de todas as páginas e consolide em um único JSON.
Formato do JSON:
{
  "palpites": [{"time_a": "México", "time_b": "África do Sul", "placar_a": 0, "placar_b": 0}, ...],
  "extras": {"artilheiro": "", "quarto": "", "terceiro": "", "vice": "", "campeao": ""}
}
Os jogos têm os nomes dos times nas colunas B e D. As colunas de placar são as que o participante preencheu.
Os palpites extras estão no final da planilha.
Retorne APENAS o JSON, sem texto adicional.`

const ANTHROPIC_ENDPOINT = 'https://opencode.ai/zen/go/v1/messages'
const DEFAULT_MODEL = 'qwen3.7-plus'

export async function parseFoto(
  input: Buffer | Buffer[],
  mimeType = 'image/jpeg'
): Promise<UploadResultOCR> {
  const apiKey = process.env.OPENCODE_GO_API_KEY
  if (!apiKey) {
    throw new Error('OPENCODE_GO_API_KEY não configurada')
  }

  const model = process.env.VISION_MODEL || DEFAULT_MODEL
  const buffers = Array.isArray(input) ? input : [input]
  const isMulti = buffers.length > 1

  const prompt = isMulti
    ? PROMPT_MULTI.replace('{N}', String(buffers.length))
    : PROMPT_SINGLE

  console.log(`[ocr-vision] Modelo: ${model} | Páginas: ${buffers.length} | Modo: ${isMulti ? 'multi' : 'single'}`)

  const imageContents = buffers.map((buf) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
      data: buf.toString('base64'),
    },
  }))

  const totalPayloadKB = buffers.reduce((acc, buf) => acc + buf.length, 0) / 1024
  console.log(`[ocr-vision] Payload total: ${totalPayloadKB.toFixed(1)} KB`)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120_000)

  let response: Response
  try {
    console.log(`[ocr-vision] Enviando requisição para ${ANTHROPIC_ENDPOINT}...`)
    const startTime = Date.now()

    response = await fetch(ANTHROPIC_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 3000,
        thinking: { type: 'disabled' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              ...imageContents,
            ],
          },
        ],
      }),
      signal: controller.signal,
    })

    const elapsed = Date.now() - startTime
    console.log(`[ocr-vision] Resposta recebida em ${elapsed}ms — status: ${response.status}`)
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new Error('Tempo limite excedido na conexão com o serviço de OCR')
    }
    throw new Error(`Falha na conexão com o serviço de OCR: ${(error as Error).message}`)
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    const errorBody = await response.text()
    console.error(`[ocr-vision] Erro da API: ${response.status} — ${errorBody.substring(0, 500)}`)
    throw new Error(`Serviço de OCR retornou erro ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()

  const content = data?.content?.[0]?.text
    || data?.content?.find((b: { type?: string }) => b.type === 'text')?.text
    || data?.content?.[0]?.thinking

  if (!content || typeof content !== 'string') {
    console.error('[ocr-vision] Resposta sem conteúdo:', JSON.stringify(data).substring(0, 500))
    throw new Error('Resposta inválida do serviço de OCR: conteúdo ausente')
  }

  console.log(`[ocr-vision] Resposta bruta (${content.length} chars): ${content.substring(0, 200)}...`)

  const cleaned = content.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')

  let parsed: {
    palpites?: Array<{ time_a: string; time_b: string; placar_a: number; placar_b: number }>
    extras?: Record<string, string>
  }
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    console.error('[ocr-vision] JSON malformado:', cleaned.substring(0, 500))
    throw new Error('Resposta inválida do serviço de OCR: JSON malformado')
  }

  if (!Array.isArray(parsed.palpites)) {
    throw new Error('Resposta inválida do serviço de OCR: campo "palpites" ausente')
  }

  for (const p of parsed.palpites) {
    if (!p.time_a || !p.time_b) {
      throw new Error(`Resposta inválida: nomes dos times ausentes no jogo ${parsed.palpites.indexOf(p) + 1}`)
    }
    if (!Number.isInteger(p.placar_a) || p.placar_a < 0) {
      throw new Error(`Placar inválido: placar_a do jogo ${p.time_a} x ${p.time_b} não é um inteiro não-negativo`)
    }
    if (!Number.isInteger(p.placar_b) || p.placar_b < 0) {
      throw new Error(`Placar inválido: placar_b do jogo ${p.time_a} x ${p.time_b} não é um inteiro não-negativo`)
    }
  }

  if (!parsed.extras || typeof parsed.extras !== 'object') {
    throw new Error('Resposta inválida do serviço de OCR: campo "extras" ausente')
  }

  const tiposExtra = ['artilheiro', 'quarto', 'terceiro', 'vice', 'campeao'] as const

  console.log(`[ocr-vision] Parse concluído — ${parsed.palpites.length} palpites, ${Object.keys(parsed.extras).length} extras`)

  return {
    palpites: parsed.palpites.map((p) => ({
      timeA: p.time_a,
      timeB: p.time_b,
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
