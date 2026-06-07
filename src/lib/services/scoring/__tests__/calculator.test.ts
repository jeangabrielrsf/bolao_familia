import { calcularPontosJogo, calcularPontosExtra } from '@/lib/utils/helpers'
import { PONTUACAO_PADRAO } from '@/lib/utils/constants'

describe('calcularPontosJogo', () => {
  it('retorna 10 pontos para placar exato', () => {
    expect(calcularPontosJogo(2, 1, 2, 1, PONTUACAO_PADRAO))
      .toEqual({ pontos: 10, tipo: 'exato' })
  })

  it('retorna 10 pontos para empate exato', () => {
    expect(calcularPontosJogo(0, 0, 0, 0, PONTUACAO_PADRAO))
      .toEqual({ pontos: 10, tipo: 'exato' })
  })

  it('retorna 6 pontos para vencedor correto sem placar exato', () => {
    expect(calcularPontosJogo(3, 1, 2, 0, PONTUACAO_PADRAO))
      .toEqual({ pontos: 6, tipo: 'vencedor' })
  })

  it('retorna 6 pontos para empate previsto corretamente', () => {
    expect(calcularPontosJogo(1, 1, 2, 2, PONTUACAO_PADRAO))
      .toEqual({ pontos: 6, tipo: 'vencedor' })
  })

  it('retorna 0 pontos para vencedor errado', () => {
    expect(calcularPontosJogo(1, 2, 2, 0, PONTUACAO_PADRAO))
      .toEqual({ pontos: 0, tipo: 'erro' })
  })

  it('retorna 0 pontos para empate quando houve vencedor', () => {
    expect(calcularPontosJogo(1, 1, 2, 0, PONTUACAO_PADRAO))
      .toEqual({ pontos: 0, tipo: 'erro' })
  })
})

describe('calcularPontosExtra', () => {
  it('retorna pontos para acerto exato', () => {
    expect(calcularPontosExtra('Brasil', 'Brasil', PONTUACAO_PADRAO, 'campeao')).toBe(10)
  })

  it('retorna 0 para erro', () => {
    expect(calcularPontosExtra('Argentina', 'Brasil', PONTUACAO_PADRAO, 'campeao')).toBe(0)
  })

  it('ignora case e espaços', () => {
    expect(calcularPontosExtra(' brasil ', 'Brasil', PONTUACAO_PADRAO, 'campeao')).toBe(10)
  })
})
