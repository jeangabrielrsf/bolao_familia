import type { ConfiguracaoPontuacao } from './types'

export function calcularPontosJogo(
  palpiteA: number,
  palpiteB: number,
  resultadoA: number,
  resultadoB: number,
  config: ConfiguracaoPontuacao
): { pontos: number; tipo: 'exato' | 'vencedor' | 'erro' } {
  if (palpiteA === resultadoA && palpiteB === resultadoB) {
    return { pontos: config.placarExato, tipo: 'exato' }
  }

  const palpiteVencedor = Math.sign(palpiteA - palpiteB)
  const resultadoVencedor = Math.sign(resultadoA - resultadoB)

  if (palpiteVencedor === resultadoVencedor) {
    return { pontos: config.vencedorCorreto, tipo: 'vencedor' }
  }

  return { pontos: 0, tipo: 'erro' }
}

export function calcularPontosMataMata(
  palpiteA: number,
  palpiteB: number,
  vencedorPalpite: number | null,
  resultadoA: number,
  resultadoB: number,
  vencedorResultado: number | null,
  config: ConfiguracaoPontuacao
): { pontos: number; tipo: 'exato' | 'vencedor' | 'erro'; quemPassa: boolean } {
  const isResultadoDraw = resultadoA === resultadoB
  const isPalpiteDraw = palpiteA === palpiteB

  if (isResultadoDraw) {
    if (isPalpiteDraw) {
      const isExato = palpiteA === resultadoA && palpiteB === resultadoB
      const pontosBase = isExato ? config.placarExato : config.vencedorCorreto
      const quemPassa = vencedorPalpite !== null
        && vencedorResultado !== null
        && vencedorPalpite === vencedorResultado
      return {
        pontos: pontosBase + (quemPassa ? config.quemPassa ?? 0 : 0),
        tipo: isExato ? 'exato' : 'vencedor',
        quemPassa,
      }
    }
    const palpiteVencedor = Math.sign(palpiteA - palpiteB)
    const resultadoVencedor = Math.sign(resultadoA - resultadoB)
    if (palpiteVencedor === resultadoVencedor) {
      return { pontos: config.vencedorCorreto, tipo: 'vencedor', quemPassa: false }
    }
    return { pontos: 0, tipo: 'erro', quemPassa: false }
  }

  if (palpiteA === resultadoA && palpiteB === resultadoB) {
    return { pontos: config.placarExato, tipo: 'exato', quemPassa: false }
  }

  const palpiteSign = Math.sign(palpiteA - palpiteB)
  const resultadoSign = Math.sign(resultadoA - resultadoB)
  if (palpiteSign === resultadoSign) {
    return { pontos: config.vencedorCorreto, tipo: 'vencedor', quemPassa: false }
  }

  return { pontos: 0, tipo: 'erro', quemPassa: false }
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

export function calcularPontosExtra(
  valorPalpite: string,
  valorReal: string,
  config: ConfiguracaoPontuacao,
  tipo: 'campeao' | 'vice' | 'terceiro' | 'quarto' | 'artilheiro'
): number {
  if (normalize(valorPalpite) === normalize(valorReal)) {
    return config[tipo]
  }
  return 0
}
