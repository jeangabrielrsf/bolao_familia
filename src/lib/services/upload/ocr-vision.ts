import type { UploadResult } from '@/lib/utils/types'

const PROMPT = `Analise esta imagem de uma planilha de bolão da Copa do Mundo 2026.
Extraia todos os palpites e retorne como JSON no seguinte formato:
{
  "palpites": [{"jogo_numero": 1, "placar_a": 0, "placar_b": 0}, ...],
  "extras": {"artilheiro": "", "quarto": "", "terceiro": "", "vice": "", "campeao": ""}
}
Os jogos estão numerados de 1 a 33. As colunas de placar são as que o participante preencheu.
Os palpites extras estão no final da planilha.
Retorne APENAS o JSON, sem texto adicional.`

export async function parseFoto(imageBuffer: Buffer): Promise<UploadResult> {
  const base64 = imageBuffer.toString('base64')

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
              { type: 'text', text: PROMPT },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
            ],
          },
        ],
        max_tokens: 2000,
      }),
    })
  } catch (error) {
    throw new Error(`Falha na conexão com o serviço de OCR: ${(error as Error).message}`)
  }

  if (!response.ok) {
    throw new Error(`Serviço de OCR retornou erro ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()

  const content = data?.choices?.[0]?.message?.content
  if (!content || typeof content !== 'string') {
    throw new Error('Resposta inválida do serviço de OCR: conteúdo ausente')
  }

  let parsed: {
    palpites?: Array<{ jogo_numero: number; placar_a: number; placar_b: number }>
    extras?: Record<string, string>
  }
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error('Resposta inválida do serviço de OCR: JSON malformado')
  }

  if (!Array.isArray(parsed.palpites)) {
    throw new Error('Resposta inválida do serviço de OCR: campo "palpites" ausente')
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
    fonte: 'foto',
  }
}
