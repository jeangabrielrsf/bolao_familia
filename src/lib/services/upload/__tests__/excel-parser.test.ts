import * as XLSX from 'xlsx'
import { parseExcel } from '../excel-parser'

function createTestExcelBuffer(overrides?: {
  nome?: string
  jogos?: Array<{ placarA: number | string; placarB: number | string }>
  extras?: Record<string, string>
  uppercaseX?: boolean
}): Buffer {
  const wb = XLSX.utils.book_new()
  const data: Array<Array<string | number | undefined>> = []

  for (let i = 0; i < 50; i++) {
    data.push([undefined, undefined, undefined, undefined, undefined, undefined])
  }

  data[2][0] = 'Nome:'
  if (overrides?.nome) {
    data[2][2] = overrides.nome
  }

  data[4][0] = 'Data'
  data[4][1] = 'Jogo'

  const gameRows = [
    5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
    27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
  ]

  data[24][0] = 'BOLÃO  "F A M Í L I A"   -  COPA DO MUNDO 2026'
  data[26][0] = 'Data'
  data[26][1] = 'Jogo'

  const jogos = overrides?.jogos ?? []
  for (let i = 0; i < gameRows.length; i++) {
    const row = gameRows[i]
    data[row][0] = `${i + 1}/junho`
    data[row][1] = `Time ${i + 1}A`
    data[row][3] = overrides?.uppercaseX ? 'X' : 'x'
    data[row][5] = `Time ${i + 1}B`

    if (jogos[i]) {
      data[row][2] = jogos[i].placarA
      data[row][4] = jogos[i].placarB
    }
  }

  const extras = overrides?.extras ?? {}
  const extraRows: Array<[number, string]> = [
    [42, 'artilheiro'],
    [43, 'quarto'],
    [44, 'terceiro'],
    [45, 'vice'],
    [46, 'campeao'],
  ]
  const extraLabels = ['Artilheiro', '4° colocado', '3° colocado', 'Vice campeão', 'Campeão']
  for (let i = 0; i < extraRows.length; i++) {
    const [row, tipo] = extraRows[i]
    data[row][0] = extraLabels[i]
    if (extras[tipo]) {
      data[row][1] = extras[tipo]
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
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

describe('parseExcel', () => {
  it('extracts 33 game scores and 5 extras from a filled spreadsheet', () => {
    const jogos = Array.from({ length: 33 }, (_, i) => ({
      placarA: i + 1,
      placarB: (i + 1) * 2,
    }))

    const extras = {
      artilheiro: 'Mbappé',
      quarto: 'Canadá',
      terceiro: 'Brasil',
      vice: 'Argentina',
      campeao: 'França',
    }

    const buffer = createTestExcelBuffer({ nome: 'João', jogos, extras })
    const ids = makeJogos(33)

    const result = parseExcel(buffer, ids)

    expect(result.fonte).toBe('excel')
    expect(result.palpites).toHaveLength(33)
    expect(result.palpites[0]).toEqual({ jogoId: 'jogo-id-1', placarA: 1, placarB: 2 })
    expect(result.palpites[32]).toEqual({ jogoId: 'jogo-id-33', placarA: 33, placarB: 66 })

    expect(result.extras).toHaveLength(5)
    expect(result.extras[0]).toEqual({ tipo: 'artilheiro', valor: 'Mbappé' })
    expect(result.extras[1]).toEqual({ tipo: 'quarto', valor: 'Canadá' })
    expect(result.extras[2]).toEqual({ tipo: 'terceiro', valor: 'Brasil' })
    expect(result.extras[3]).toEqual({ tipo: 'vice', valor: 'Argentina' })
    expect(result.extras[4]).toEqual({ tipo: 'campeao', valor: 'França' })
  })

  it('maps jogos IDs in spreadsheet order', () => {
    const jogos = Array.from({ length: 33 }, () => ({
      placarA: 0,
      placarB: 0,
    }))

    const extras = {
      artilheiro: 'X',
      quarto: 'X',
      terceiro: 'X',
      vice: 'X',
      campeao: 'X',
    }

    const buffer = createTestExcelBuffer({ jogos, extras })
    const ids = makeJogos(33)

    const result = parseExcel(buffer, ids)

    expect(result.palpites[0].jogoId).toBe('jogo-id-1')
    expect(result.palpites[18].jogoId).toBe('jogo-id-19')
    expect(result.palpites[19].jogoId).toBe('jogo-id-20')
    expect(result.palpites[32].jogoId).toBe('jogo-id-33')
  })

  it('throws when a game score is blank', () => {
    const jogos: Array<{ placarA: number | string; placarB: number | string }> = []
    for (let i = 0; i < 33; i++) {
      if (i !== 5) {
        jogos[i] = { placarA: i, placarB: i }
      }
    }

    const buffer = createTestExcelBuffer({
      jogos,
      extras: {
        artilheiro: 'X',
        quarto: 'X',
        terceiro: 'X',
        vice: 'X',
        campeao: 'X',
      },
    })

    expect(() => parseExcel(buffer, makeJogos(33))).toThrow('jogo 6')
  })

  it('throws when an extra is blank', () => {
    const jogos = Array.from({ length: 33 }, () => ({ placarA: 1, placarB: 1 }))
    const buffer = createTestExcelBuffer({
      jogos,
      extras: {
        artilheiro: 'X',
        quarto: 'X',
        terceiro: 'X',
        vice: 'X',
      },
    })

    expect(() => parseExcel(buffer, makeJogos(33))).toThrow('campeao')
  })

  it('throws when spreadsheet has a game not in the database', () => {
    const jogos = Array.from({ length: 33 }, (_, i) => ({
      placarA: i,
      placarB: i,
    }))

    const extras = {
      artilheiro: 'X',
      quarto: 'X',
      terceiro: 'X',
      vice: 'X',
      campeao: 'X',
    }

    const buffer = createTestExcelBuffer({ jogos, extras })
    const jogosDB = makeJogos(10)

    expect(() => parseExcel(buffer, jogosDB)).toThrow('Jogo não encontrado')
  })

  it('converts string numbers to numeric scores', () => {
    const jogos = Array.from({ length: 33 }, () => ({
      placarA: '3',
      placarB: '2',
    }))

    const extras = {
      artilheiro: 'X',
      quarto: 'X',
      terceiro: 'X',
      vice: 'X',
      campeao: 'X',
    }

    const buffer = createTestExcelBuffer({ jogos, extras })

    const result = parseExcel(buffer, makeJogos(33))

    expect(result.palpites[0].placarA).toBe(3)
    expect(result.palpites[0].placarB).toBe(2)
    expect(typeof result.palpites[0].placarA).toBe('number')
    expect(typeof result.palpites[0].placarB).toBe('number')
  })

  it('throws when a score cell contains non-numeric text', () => {
    const jogos = Array.from({ length: 33 }, (_, i) => ({
      placarA: i === 0 ? 'abc' : i,
      placarB: i,
    }))

    const extras = {
      artilheiro: 'X',
      quarto: 'X',
      terceiro: 'X',
      vice: 'X',
      campeao: 'X',
    }

    const buffer = createTestExcelBuffer({ jogos, extras })

    expect(() => parseExcel(buffer, makeJogos(33))).toThrow('Placar inválido no jogo 1')
  })

  it('throws when workbook has no sheets', () => {
    jest.isolateModules(() => {
      jest.doMock('xlsx', () => ({
        read: () => ({ SheetNames: [], Sheets: {} }),
      }))

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { parseExcel: isolatedParse } = require('../excel-parser')
      expect(() => isolatedParse(Buffer.from([]), makeJogos(1))).toThrow('Planilha vazia')
    })
  })

  it('recognizes uppercase X as a game row marker', () => {
    const jogos = Array.from({ length: 33 }, () => ({
      placarA: 2,
      placarB: 1,
    }))

    const extras = {
      artilheiro: 'X',
      quarto: 'X',
      terceiro: 'X',
      vice: 'X',
      campeao: 'X',
    }

    const buffer = createTestExcelBuffer({ jogos, extras, uppercaseX: true })

    const result = parseExcel(buffer, makeJogos(33))

    expect(result.palpites).toHaveLength(33)
    expect(result.palpites[0]).toEqual({ jogoId: 'jogo-id-1', placarA: 2, placarB: 1 })
  })
})
