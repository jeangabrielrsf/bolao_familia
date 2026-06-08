import * as XLSX from 'xlsx'
import type { UploadResult } from '@/lib/utils/types'

export function parseExcel(buffer: Buffer, jogosIds: string[]): UploadResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' })

  if (!workbook.SheetNames.length) {
    throw new Error('Planilha vazia')
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')

  const gameRows: number[] = []
  for (let r = 0; r <= range.e.r; r++) {
    const cell = sheet[XLSX.utils.encode_cell({ r, c: 3 })]
    if (cell?.v != null && String(cell.v).toLowerCase() === 'x') {
      gameRows.push(r)
    }
  }

  const palpites = []
  const count = Math.min(gameRows.length, jogosIds.length)
  for (let i = 0; i < count; i++) {
    const row = gameRows[i]
    const placarACell = sheet[XLSX.utils.encode_cell({ r: row, c: 2 })]
    const placarBCell = sheet[XLSX.utils.encode_cell({ r: row, c: 4 })]

    if (placarACell?.v === undefined || placarBCell?.v === undefined) {
      throw new Error(`Palpite em branco no jogo ${i + 1}`)
    }

    const placarA = Number(placarACell.v)
    const placarB = Number(placarBCell.v)

    if (!Number.isInteger(placarA) || placarA < 0) {
      throw new Error(`Placar inválido no jogo ${i + 1}`)
    }
    if (!Number.isInteger(placarB) || placarB < 0) {
      throw new Error(`Placar inválido no jogo ${i + 1}`)
    }

    palpites.push({
      jogoId: jogosIds[i],
      placarA,
      placarB,
    })
  }

  const tiposExtra = ['artilheiro', 'quarto', 'terceiro', 'vice', 'campeao'] as const
  const extras = []
  for (let i = 0; i < 5; i++) {
    const row = 42 + i
    const cell = sheet[XLSX.utils.encode_cell({ r: row, c: 2 })]

    if (cell?.v == null || cell.v === '') {
      throw new Error(`Extra '${tiposExtra[i]}' em branco`)
    }

    extras.push({
      tipo: tiposExtra[i],
      valor: String(cell.v).trim(),
    })
  }

  return { palpites, extras, fonte: 'excel' }
}
