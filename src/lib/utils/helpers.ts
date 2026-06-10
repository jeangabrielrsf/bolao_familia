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
