import * as XLSX from 'xlsx'
import type { UploadResult, PalpiteDTO, PalpiteExtraDTO, PalpiteGrupoParsed } from '@/lib/utils/types'

export function parseExcel(buffer: Buffer, jogosIds: string[]): UploadResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' })

  if (!workbook.SheetNames.length) {
    throw new Error('Planilha vazia')
  }

  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const { palpites, extras } = parseSheet(sheet, jogosIds, sheetName)

  return { palpites, extras, fonte: 'excel' }
}

const SUFIXO_REGEX = /^(.+?)\s*(?:[-–—]\s*(?:Palpite\s*)?\d+|\(\d+\)|\d+)$/i

function extrairNomeEApelido(nomeAba: string): { nomeParticipante: string; apelido: string; nomeCompleto: string } {
  const match = nomeAba.match(SUFIXO_REGEX)
  if (match) {
    const nomeBase = match[1].trim()
    const sufixo = nomeAba.slice(match[1].length).trim()
    let numero = sufixo.replace(/^[\s(–—-]+/, '').replace(/[\s)]+$/, '').replace(/^palpite\s*/i, '').trim()
    if (!numero) numero = '1'
    const apelido = `Palpite ${numero}`
    return {
      nomeParticipante: nomeBase,
      apelido,
      nomeCompleto: `${nomeBase} - ${apelido}`,
    }
  }
  return {
    nomeParticipante: nomeAba.trim(),
    apelido: 'Palpite 1',
    nomeCompleto: nomeAba.trim(),
  }
}

function parseSheet(sheet: XLSX.WorkSheet, jogosIds: string[], sheetName: string): { palpites: PalpiteDTO[]; extras: PalpiteExtraDTO[] } {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
  const prefix = sheetName ? `[${sheetName}] ` : ''

  const gameRows: number[] = []
  for (let r = 0; r <= range.e.r; r++) {
    const cell = sheet[XLSX.utils.encode_cell({ r, c: 3 })]
    if (cell?.v != null && String(cell.v).toLowerCase() === 'x') {
      gameRows.push(r)
    }
  }

  const palpites: PalpiteDTO[] = []
  const count = Math.min(gameRows.length, jogosIds.length)
  for (let i = 0; i < count; i++) {
    const row = gameRows[i]
    const placarACell = sheet[XLSX.utils.encode_cell({ r: row, c: 2 })]
    const placarBCell = sheet[XLSX.utils.encode_cell({ r: row, c: 4 })]

    if (placarACell?.v === undefined || placarBCell?.v === undefined) {
      throw new Error(`${prefix}Palpite em branco no jogo ${i + 1}`)
    }

    const placarA = Number(placarACell.v)
    const placarB = Number(placarBCell.v)

    if (!Number.isInteger(placarA) || placarA < 0) {
      throw new Error(`${prefix}Placar inválido no jogo ${i + 1}`)
    }
    if (!Number.isInteger(placarB) || placarB < 0) {
      throw new Error(`${prefix}Placar inválido no jogo ${i + 1}`)
    }

    palpites.push({ jogoId: jogosIds[i], placarA, placarB })
  }

  const tiposExtra = ['artilheiro', 'quarto', 'terceiro', 'vice', 'campeao'] as const
  const extras: PalpiteExtraDTO[] = []
  for (let i = 0; i < 5; i++) {
    const row = 42 + i
    const cell = sheet[XLSX.utils.encode_cell({ r: row, c: 1 })]

    if (cell?.v == null || cell.v === '') {
      throw new Error(`${prefix}Extra '${tiposExtra[i]}' em branco`)
    }

    extras.push({ tipo: tiposExtra[i], valor: String(cell.v).trim() })
  }

  return { palpites, extras }
}

export function parseExcelMultiSheet(buffer: Buffer, jogosIds: string[]): PalpiteGrupoParsed[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' })

  if (!workbook.SheetNames.length) {
    throw new Error('Planilha vazia')
  }

  const resultados: PalpiteGrupoParsed[] = []

  for (const sheetName of workbook.SheetNames) {
    if (sheetName.trim().toLowerCase() === 'modelo') continue

    const sheet = workbook.Sheets[sheetName]
    if (!sheet) continue

    const { nomeParticipante, apelido, nomeCompleto } = extrairNomeEApelido(sheetName)
    const { palpites, extras } = parseSheet(sheet, jogosIds, sheetName)

    resultados.push({
      nomeParticipante,
      apelido,
      nomeCompleto,
      palpites,
      extras,
    })
  }

  return resultados
}
