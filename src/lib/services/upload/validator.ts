import type { UploadResult, ValidationResult } from '@/lib/utils/types'
import { TIMES_VALIDOS } from '@/lib/utils/constants'

const PLACAR_ALTO_LIMITE = 30
const EXTRAS_OBRIGATORIOS = ['artilheiro', 'campeao', 'vice', 'terceiro', 'quarto'] as const

export function validateUpload(
  result: UploadResult,
  timesJogos: Array<{ timeA: string; timeB: string }>
): ValidationResult {
  const erros: string[] = []
  const alertas: string[] = []
  const totalJogos = timesJogos.length

  if (result.palpites.length !== totalJogos) {
    erros.push(`Esperados ${totalJogos} palpites, recebidos ${result.palpites.length}`)
  }

  for (const palpite of result.palpites) {
    if (palpite.placarA < 0 || palpite.placarB < 0) {
      erros.push(`Placar negativo no jogo ${palpite.jogoId}`)
    }
    if (palpite.placarA > PLACAR_ALTO_LIMITE || palpite.placarB > PLACAR_ALTO_LIMITE) {
      alertas.push(`Placar muito alto no jogo ${palpite.jogoId}`)
    }
  }

  for (const tipo of EXTRAS_OBRIGATORIOS) {
    const extra = result.extras.find((e) => e.tipo === tipo)
    if (!extra || extra.valor.trim() === '') {
      erros.push(`Extra '${tipo}' ausente ou vazio`)
    }
  }

  const timesSet = new Set(TIMES_VALIDOS.map((t) => t.toLowerCase()))
  const extrasTime = ['campeao', 'vice', 'terceiro', 'quarto'] as const
  for (const extra of result.extras) {
    if (extrasTime.includes(extra.tipo as typeof extrasTime[number]) &&
        extra.valor.trim() !== '' && !timesSet.has(extra.valor.toLowerCase())) {
      alertas.push(`Time desconhecido no extra '${extra.tipo}': ${extra.valor}`)
    }
  }

  return {
    valido: erros.length === 0,
    erros,
    alertas,
  }
}
