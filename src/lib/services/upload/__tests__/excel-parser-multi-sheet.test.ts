import * as XLSX from 'xlsx'
import { parseExcelMultiSheet } from '../excel-parser'

function createMultiSheetExcel(
  sheets: Array<{
    name: string
    jogos: Array<{ placarA: number; placarB: number }>
    extras: Record<string, string>
  }>
): Buffer {
  const wb = XLSX.utils.book_new()

  for (const sheet of sheets) {
    const data: Array<Array<string | number | undefined>> = []
    for (let i = 0; i < 50; i++) {
      data.push([undefined, undefined, undefined, undefined, undefined, undefined])
    }

    const gameRows = [
      5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
      27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
    ]

    for (let i = 0; i < gameRows.length; i++) {
      const row = gameRows[i]
      data[row][1] = `Time ${i + 1}A`
      data[row][3] = 'x'
      data[row][5] = `Time ${i + 1}B`
      if (sheet.jogos[i]) {
        data[row][2] = sheet.jogos[i].placarA
        data[row][4] = sheet.jogos[i].placarB
      }
    }

    const extraRows: Array<[number, string]> = [
      [42, 'artilheiro'],
      [43, 'quarto'],
      [44, 'terceiro'],
      [45, 'vice'],
      [46, 'campeao'],
    ]
    for (const [row, tipo] of extraRows) {
      if (sheet.extras[tipo]) {
        data[row][1] = sheet.extras[tipo]
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, sheet.name)
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return Buffer.from(buf)
}

function makeJogos(count: number): Array<{ id: string; timeA: string; timeB: string }> {
  return Array.from({ length: count }, (_, i) => ({
    id: `jogo-id-${i + 1}`,
    timeA: `Time ${i + 1}A`,
    timeB: `Time ${i + 1}B`,
  }))
}

const defaultExtras = {
  artilheiro: 'Mbappé',
  quarto: 'Canadá',
  terceiro: 'Brasil',
  vice: 'Argentina',
  campeao: 'França',
}

const defaultJogos = Array.from({ length: 33 }, (_, i) => ({
  placarA: i + 1,
  placarB: (i + 1) * 2,
}))

describe('parseExcelMultiSheet', () => {
  it('parses multiple sheets, skipping "Modelo"', () => {
    const buffer = createMultiSheetExcel([
      { name: 'Modelo', jogos: defaultJogos, extras: defaultExtras },
      { name: 'Leo', jogos: defaultJogos, extras: defaultExtras },
      { name: 'Maria', jogos: defaultJogos, extras: defaultExtras },
    ])

    const result = parseExcelMultiSheet(buffer, makeJogos(33))

    expect(result).toHaveLength(2)
    expect(result[0].nomeParticipante).toBe('Leo')
    expect(result[0].apelido).toBe('Palpite 1')
    expect(result[0].nomeCompleto).toBe('Leo')
    expect(result[1].nomeParticipante).toBe('Maria')
  })

  it('detects suffix "1" as "Palpite 1"', () => {
    const buffer = createMultiSheetExcel([
      { name: 'Leo 1', jogos: defaultJogos, extras: defaultExtras },
    ])

    const result = parseExcelMultiSheet(buffer, makeJogos(33))

    expect(result).toHaveLength(1)
    expect(result[0].nomeParticipante).toBe('Leo')
    expect(result[0].apelido).toBe('Palpite 1')
    expect(result[0].nomeCompleto).toBe('Leo - Palpite 1')
  })

  it('detects suffix "(2)" as "Palpite 2"', () => {
    const buffer = createMultiSheetExcel([
      { name: 'Leo (2)', jogos: defaultJogos, extras: defaultExtras },
    ])

    const result = parseExcelMultiSheet(buffer, makeJogos(33))

    expect(result).toHaveLength(1)
    expect(result[0].nomeParticipante).toBe('Leo')
    expect(result[0].apelido).toBe('Palpite 2')
    expect(result[0].nomeCompleto).toBe('Leo - Palpite 2')
  })

  it('detects suffix "- Palpite 3" as "Palpite 3"', () => {
    const buffer = createMultiSheetExcel([
      { name: 'João - Palpite 3', jogos: defaultJogos, extras: defaultExtras },
    ])

    const result = parseExcelMultiSheet(buffer, makeJogos(33))

    expect(result).toHaveLength(1)
    expect(result[0].nomeParticipante).toBe('João')
    expect(result[0].apelido).toBe('Palpite 3')
    expect(result[0].nomeCompleto).toBe('João - Palpite 3')
  })

  it('extracts 33 palpites and 5 extras from each sheet', () => {
    const buffer = createMultiSheetExcel([
      { name: 'Leo', jogos: defaultJogos, extras: defaultExtras },
      { name: 'Maria', jogos: defaultJogos, extras: defaultExtras },
    ])

    const result = parseExcelMultiSheet(buffer, makeJogos(33))

    for (const grupo of result) {
      expect(grupo.palpites).toHaveLength(33)
      expect(grupo.extras).toHaveLength(5)
      expect(grupo.palpites[0]).toEqual({ jogoId: 'jogo-id-1', placarA: 1, placarB: 2 })
      expect(grupo.extras[0]).toEqual({ tipo: 'artilheiro', valor: 'Mbappé' })
    }
  })

  it('handles sheet without suffix as single palpite', () => {
    const buffer = createMultiSheetExcel([
      { name: 'Maria', jogos: defaultJogos, extras: defaultExtras },
    ])

    const result = parseExcelMultiSheet(buffer, makeJogos(33))

    expect(result).toHaveLength(1)
    expect(result[0].nomeParticipante).toBe('Maria')
    expect(result[0].apelido).toBe('Palpite 1')
    expect(result[0].nomeCompleto).toBe('Maria')
  })

  it('returns empty array when all sheets are "Modelo"', () => {
    const buffer = createMultiSheetExcel([
      { name: 'Modelo', jogos: defaultJogos, extras: defaultExtras },
    ])

    const result = parseExcelMultiSheet(buffer, makeJogos(33))

    expect(result).toHaveLength(0)
  })

  it('is case-insensitive for "Modelo" filter', () => {
    const buffer = createMultiSheetExcel([
      { name: 'modelo', jogos: defaultJogos, extras: defaultExtras },
      { name: 'MODELO', jogos: defaultJogos, extras: defaultExtras },
      { name: 'Leo', jogos: defaultJogos, extras: defaultExtras },
    ])

    const result = parseExcelMultiSheet(buffer, makeJogos(33))

    expect(result).toHaveLength(1)
    expect(result[0].nomeParticipante).toBe('Leo')
  })
})
