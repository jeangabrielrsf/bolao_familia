import {
  inicioDiaBrasilia,
  fimDiaBrasilia,
  inicioDiaBrasiliaMais,
  fimDiaBrasiliaMais,
} from '../date'

describe('inicioDiaBrasiliaMais', () => {
  it('retorna exatamente 24h após o início de hoje quando dias=1', () => {
    const hoje = inicioDiaBrasilia()
    const amanha = inicioDiaBrasiliaMais(1)

    const umDiaMs = 24 * 60 * 60 * 1000
    expect(amanha.getTime() - hoje.getTime()).toBe(umDiaMs)
  })

  it('retorna exatamente 48h após o início de hoje quando dias=2', () => {
    const hoje = inicioDiaBrasilia()
    const depois = inicioDiaBrasiliaMais(2)

    const doisDiasMs = 2 * 24 * 60 * 60 * 1000
    expect(depois.getTime() - hoje.getTime()).toBe(doisDiasMs)
  })

  it('retorna o mesmo valor que inicioDiaBrasilia() quando dias=0', () => {
    const hoje = inicioDiaBrasilia()
    const mesmo = inicioDiaBrasiliaMais(0)

    expect(mesmo.getTime()).toBe(hoje.getTime())
  })
})

describe('fimDiaBrasiliaMais', () => {
  it('retorna exatamente 24h após o fim de hoje quando dias=1', () => {
    const hojeFim = fimDiaBrasilia()
    const amanhaFim = fimDiaBrasiliaMais(1)

    const umDiaMs = 24 * 60 * 60 * 1000
    expect(amanhaFim.getTime() - hojeFim.getTime()).toBe(umDiaMs)
  })

  it('retorna o mesmo valor que fimDiaBrasilia() quando dias=0', () => {
    const hojeFim = fimDiaBrasilia()
    const mesmo = fimDiaBrasiliaMais(0)

    expect(mesmo.getTime()).toBe(hojeFim.getTime())
  })
})
