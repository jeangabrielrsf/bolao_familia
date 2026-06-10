import { validateUpload } from '../validator'
import type { UploadResult } from '@/lib/utils/types'

function makeValidUpload(overrides?: Partial<UploadResult>): UploadResult {
  const palpites = Array.from({ length: 33 }, (_, i) => ({
    jogoId: `jogo-${i + 1}`,
    placarA: i % 5,
    placarB: (i + 1) % 3,
  }))

  const extras = [
    { tipo: 'artilheiro' as const, valor: 'Mbappé' },
    { tipo: 'campeao' as const, valor: 'Brasil' },
    { tipo: 'vice' as const, valor: 'Argentina' },
    { tipo: 'terceiro' as const, valor: 'França' },
    { tipo: 'quarto' as const, valor: 'Alemanha' },
  ]

  return {
    palpites,
    extras,
    fonte: 'excel',
    ...overrides,
  }
}

describe('validateUpload', () => {
  it('returns valido=true for a valid upload with 33 games and 5 extras', () => {
    const result = validateUpload(makeValidUpload())

    expect(result.valido).toBe(true)
    expect(result.erros).toHaveLength(0)
    expect(result.alertas).toHaveLength(0)
  })

  it('accepts any number of palpites (not fixed to 33)', () => {
    const upload = makeValidUpload({
      palpites: Array.from({ length: 30 }, (_, i) => ({
        jogoId: `jogo-${i + 1}`,
        placarA: 1,
        placarB: 1,
      })),
    })

    const result = validateUpload(upload)

    expect(result.valido).toBe(true)
    expect(result.erros).toHaveLength(0)
  })

  it('returns erro when any placar is negative', () => {
    const palpites = Array.from({ length: 33 }, (_, i) => ({
      jogoId: `jogo-${i + 1}`,
      placarA: i === 5 ? -1 : 1,
      placarB: 1,
    }))

    const upload = makeValidUpload({ palpites })
    const result = validateUpload(upload)

    expect(result.valido).toBe(false)
    expect(result.erros.some((e) => e.toLowerCase().includes('negativo'))).toBe(true)
  })

  it('returns erro when an extra is missing', () => {
    const extras = [
      { tipo: 'artilheiro' as const, valor: 'Mbappé' },
      { tipo: 'campeao' as const, valor: 'Brasil' },
      { tipo: 'vice' as const, valor: 'Argentina' },
      { tipo: 'terceiro' as const, valor: 'França' },
    ]

    const upload = makeValidUpload({ extras })
    const result = validateUpload(upload)

    expect(result.valido).toBe(false)
    expect(result.erros.some((e) => e.toLowerCase().includes('quarto'))).toBe(true)
  })

  it('returns erro when an extra has empty string value', () => {
    const extras = [
      { tipo: 'artilheiro' as const, valor: 'Mbappé' },
      { tipo: 'campeao' as const, valor: 'Brasil' },
      { tipo: 'vice' as const, valor: 'Argentina' },
      { tipo: 'terceiro' as const, valor: 'França' },
      { tipo: 'quarto' as const, valor: '' },
    ]

    const upload = makeValidUpload({ extras })
    const result = validateUpload(upload)

    expect(result.valido).toBe(false)
    expect(result.erros.some((e) => e.toLowerCase().includes('quarto'))).toBe(true)
  })

  it('returns alerta when placar is very high (>30)', () => {
    const palpites = Array.from({ length: 33 }, (_, i) => ({
      jogoId: `jogo-${i + 1}`,
      placarA: i === 0 ? 31 : 1,
      placarB: 1,
    }))

    const upload = makeValidUpload({ palpites })
    const result = validateUpload(upload)

    expect(result.valido).toBe(true)
    expect(result.alertas.some((a) => a.toLowerCase().includes('alto'))).toBe(true)
  })

  it('returns alerta when extra contains unknown team name', () => {
    const extras = [
      { tipo: 'artilheiro' as const, valor: 'Mbappé' },
      { tipo: 'campeao' as const, valor: 'Brasil' },
      { tipo: 'vice' as const, valor: 'Argentina' },
      { tipo: 'terceiro' as const, valor: 'França' },
      { tipo: 'quarto' as const, valor: 'Atlantida' },
    ]

    const upload = makeValidUpload({ extras })
    const result = validateUpload(upload)

    expect(result.valido).toBe(true)
    expect(result.alertas.some((a) => a.toLowerCase().includes('atlantida'))).toBe(true)
  })

  it('returns multiple erros and alertas for multiple issues', () => {
    const palpites = Array.from({ length: 30 }, (_, i) => ({
      jogoId: `jogo-${i + 1}`,
      placarA: i === 0 ? -1 : 1,
      placarB: i === 1 ? 35 : 1,
    }))

    const extras = [
      { tipo: 'artilheiro' as const, valor: 'Mbappé' },
      { tipo: 'campeao' as const, valor: 'Brasil' },
    ]

    const upload = makeValidUpload({ palpites, extras })
    const result = validateUpload(upload)

    expect(result.valido).toBe(false)
    expect(result.erros.length).toBeGreaterThanOrEqual(2)
    expect(result.alertas.length).toBeGreaterThanOrEqual(1)
  })

  it('returns erro when placar is not an integer', () => {
    const palpites = Array.from({ length: 33 }, (_, i) => ({
      jogoId: `jogo-${i + 1}`,
      placarA: i === 2 ? 2.5 : 1,
      placarB: 1,
    }))

    const upload = makeValidUpload({ palpites })
    const result = validateUpload(upload)

    expect(result.valido).toBe(false)
    expect(result.erros.some((e) => e.includes('não inteiro') && e.includes('jogo-3'))).toBe(true)
  })

  it('returns erro when palpites contain duplicate jogoId', () => {
    const palpites = Array.from({ length: 33 }, (_, i) => ({
      jogoId: i === 1 ? 'jogo-1' : `jogo-${i + 1}`,
      placarA: 1,
      placarB: 1,
    }))

    const upload = makeValidUpload({ palpites })
    const result = validateUpload(upload)

    expect(result.valido).toBe(false)
    expect(result.erros.some((e) => e.includes('duplicado') && e.includes('jogo-1'))).toBe(true)
  })

  it('returns erro when extras contain duplicate tipo', () => {
    const extras = [
      { tipo: 'artilheiro' as const, valor: 'Mbappé' },
      { tipo: 'artilheiro' as const, valor: 'CR7' },
      { tipo: 'campeao' as const, valor: 'Brasil' },
      { tipo: 'vice' as const, valor: 'Argentina' },
      { tipo: 'terceiro' as const, valor: 'França' },
      { tipo: 'quarto' as const, valor: 'Alemanha' },
    ]

    const upload = makeValidUpload({ extras })
    const result = validateUpload(upload)

    expect(result.valido).toBe(false)
    expect(result.erros.some((e) => e.includes('duplicado') && e.includes('artilheiro'))).toBe(true)
  })

  it('returns alerta but valido=true for valid upload with unknown team', () => {
    const extras = [
      { tipo: 'artilheiro' as const, valor: 'Mbappé' },
      { tipo: 'campeao' as const, valor: 'Time Inexistente' },
      { tipo: 'vice' as const, valor: 'Argentina' },
      { tipo: 'terceiro' as const, valor: 'França' },
      { tipo: 'quarto' as const, valor: 'Alemanha' },
    ]

    const upload = makeValidUpload({ extras })
    const result = validateUpload(upload)

    expect(result.valido).toBe(true)
    expect(result.alertas.length).toBeGreaterThan(0)
  })
})
