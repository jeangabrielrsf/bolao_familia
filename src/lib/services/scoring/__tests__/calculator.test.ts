import { calcularPontosJogo, calcularPontosExtra, calcularPontosMataMata, statusBonusQuemPassa } from '@/lib/utils/helpers'
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

  it('ignora acentos', () => {
    expect(calcularPontosExtra('Brasíl', 'Brasil', PONTUACAO_PADRAO, 'campeao')).toBe(10)
    expect(calcularPontosExtra('Argentina', 'Argentiná', PONTUACAO_PADRAO, 'vice')).toBe(10)
  })
})

describe('calcularPontosMataMata', () => {
  const config = PONTUACAO_PADRAO

  it('placar exato, resultado NÃO é empate → 10 pts', () => {
    expect(calcularPontosMataMata(2, 1, null, 2, 1, 1, config))
      .toEqual({ pontos: 10, tipo: 'exato', quemPassa: false })
  })

  it('vencedor correto, resultado NÃO é empate → 6 pts', () => {
    expect(calcularPontosMataMata(3, 1, null, 2, 0, 1, config))
      .toEqual({ pontos: 6, tipo: 'vencedor', quemPassa: false })
  })

  it('palpite errado (vencedor errado) → 0 pts', () => {
    expect(calcularPontosMataMata(1, 2, null, 2, 0, 1, config))
      .toEqual({ pontos: 0, tipo: 'erro', quemPassa: false })
  })

  it('empate exato + quem passa correto → 16 pts', () => {
    expect(calcularPontosMataMata(1, 1, 1, 1, 1, 1, config))
      .toEqual({ pontos: 16, tipo: 'exato', quemPassa: true })
  })

  it('empate exato + quem passa errado → 10 pts', () => {
    expect(calcularPontosMataMata(1, 1, 2, 1, 1, 1, config))
      .toEqual({ pontos: 10, tipo: 'exato', quemPassa: false })
  })

  it('empate não-exato + quem passa correto → 12 pts', () => {
    expect(calcularPontosMataMata(2, 2, 1, 1, 1, 1, config))
      .toEqual({ pontos: 12, tipo: 'vencedor', quemPassa: true })
  })

  it('empate não-exato + quem passa errado → 6 pts', () => {
    expect(calcularPontosMataMata(2, 2, 2, 1, 1, 1, config))
      .toEqual({ pontos: 6, tipo: 'vencedor', quemPassa: false })
  })

  it('palpite NÃO é empate, resultado É empate → 0 pts (erro)', () => {
    expect(calcularPontosMataMata(2, 1, null, 1, 1, 1, config))
      .toEqual({ pontos: 0, tipo: 'erro', quemPassa: false })
  })

  it('palpite NÃO é empate (lado errado), resultado É empate → 0 pts', () => {
    expect(calcularPontosMataMata(1, 2, null, 1, 1, 1, config))
      .toEqual({ pontos: 0, tipo: 'erro', quemPassa: false })
  })

  it('empate 0x0 + quem passa correto → 16 pts', () => {
    expect(calcularPontosMataMata(0, 0, 2, 0, 0, 2, config))
      .toEqual({ pontos: 16, tipo: 'exato', quemPassa: true })
  })

  it('vencedorPalpite null com resultado empate → sem bonus', () => {
    expect(calcularPontosMataMata(1, 1, null, 1, 1, 1, config))
      .toEqual({ pontos: 10, tipo: 'exato', quemPassa: false })
  })
})

describe('statusBonusQuemPassa', () => {
  it('fase de grupos → nao-aplicavel', () => {
    expect(statusBonusQuemPassa(
      { placarA: 1, placarB: 1, vencedorPalpite: 1 },
      { resultadoA: 1, resultadoB: 1, vencedor: 2, fase: 'grupos' }
    )).toBe('nao-aplicavel')
  })

  it('mata-mata sem empate no resultado → nao-aplicavel', () => {
    expect(statusBonusQuemPassa(
      { placarA: 1, placarB: 1, vencedorPalpite: 1 },
      { resultadoA: 2, resultadoB: 1, vencedor: 1, fase: 'oitavas' }
    )).toBe('nao-aplicavel')
  })

  it('mata-mata empate resultado, palpite de placar não-empate → nao-aplicavel', () => {
    expect(statusBonusQuemPassa(
      { placarA: 2, placarB: 1, vencedorPalpite: 1 },
      { resultadoA: 1, resultadoB: 1, vencedor: 2, fase: 'oitavas' }
    )).toBe('nao-aplicavel')
  })

  it('empate com palpite empate mas vencedorPalpite null → nao-aplicavel', () => {
    expect(statusBonusQuemPassa(
      { placarA: 1, placarB: 1, vencedorPalpite: null },
      { resultadoA: 1, resultadoB: 1, vencedor: 2, fase: 'oitavas' }
    )).toBe('nao-aplicavel')
  })

  it('empate com palpite empate mas resultado.vencedor null → nao-aplicavel', () => {
    expect(statusBonusQuemPassa(
      { placarA: 1, placarB: 1, vencedorPalpite: 2 },
      { resultadoA: 1, resultadoB: 1, vencedor: null, fase: 'oitavas' }
    )).toBe('nao-aplicavel')
  })

  it('mata-mata empate, palpite empate, vencedor palpite === resultado → acertou', () => {
    expect(statusBonusQuemPassa(
      { placarA: 1, placarB: 1, vencedorPalpite: 2 },
      { resultadoA: 1, resultadoB: 1, vencedor: 2, fase: 'oitavas' }
    )).toBe('acertou')
  })

  it('mata-mata empate, palpite empate, vencedor palpite !== resultado → errou', () => {
    expect(statusBonusQuemPassa(
      { placarA: 1, placarB: 1, vencedorPalpite: 1 },
      { resultadoA: 1, resultadoB: 1, vencedor: 2, fase: 'oitavas' }
    )).toBe('errou')
  })
})
