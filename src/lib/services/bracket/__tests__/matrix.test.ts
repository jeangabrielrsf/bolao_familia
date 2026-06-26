import { PARES_R32_OFICIAL, isRefSet, gruposDoRefSet } from '../matrix'

describe('Pares R32 oficiais FIFA 2026', () => {
  it('tem 16 jogos', () => {
    expect(PARES_R32_OFICIAL).toHaveLength(16)
  })

  it('M1 (R32-M1) é 2A vs 2B', () => {
    expect(PARES_R32_OFICIAL[0]).toEqual(['2A', '2B'])
  })

  it('M2 (R32-M2) é 1E vs 3[ABCDF] (set de 5 grupos)', () => {
    expect(PARES_R32_OFICIAL[1]).toEqual(['1E', '3ABCDF'])
  })

  it('M7 (R32-M7) é 1A vs 3[CEFHI]', () => {
    expect(PARES_R32_OFICIAL[6]).toEqual(['1A', '3CEFHI'])
  })

  it('cada 1º aparece no máximo uma vez (A-L)', () => {
    const primeiros = PARES_R32_OFICIAL
      .map(([a, b]) => [a, b])
      .flat()
      .filter(r => r[0] === '1')
      .map(r => r[1])
    const counts = primeiros.reduce((acc, g) => {
      acc[g] = (acc[g] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    for (const [, n] of Object.entries(counts)) {
      expect(n).toBeLessThanOrEqual(1)
    }
    // 16 R32, 12 grupos = 1X de cada um aparece exatamente 1×
    expect(Object.keys(counts).length).toBe(12)
  })

  it('nenhum confronto é entre times do mesmo grupo', () => {
    for (const [a, b] of PARES_R32_OFICIAL) {
      const grupoA = a.slice(1)
      const grupoB = b.slice(1)
      expect(grupoA).not.toBe(grupoB)
    }
  })
})

describe('isRefSet', () => {
  it('detecta refs de 1º/2º como não-set', () => {
    expect(isRefSet('1A')).toBe(false)
    expect(isRefSet('2L')).toBe(false)
  })

  it('detecta refs de 3rd como set', () => {
    expect(isRefSet('3A')).toBe(true)
    expect(isRefSet('3ABCDF')).toBe(true)
    expect(isRefSet('3CEFHI')).toBe(true)
  })
})

describe('gruposDoRefSet', () => {
  it('extrai letras de grupos de um set', () => {
    expect(gruposDoRefSet('3ABCDF').sort()).toEqual(['A', 'B', 'C', 'D', 'F'])
    expect(gruposDoRefSet('3CEFHI').sort()).toEqual(['C', 'E', 'F', 'H', 'I'])
    expect(gruposDoRefSet('3A')).toEqual(['A'])
  })
})
