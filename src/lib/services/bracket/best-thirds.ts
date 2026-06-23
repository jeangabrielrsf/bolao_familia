import type { ClassificacaoGrupo } from './types'

/**
 * Seleciona os 8 melhores terceiros colocados entre os 12 grupos.
 * Critérios: pontos → saldo de gols → gols pró (steps 1-3; 4-5 não implementados).
 */
export function getMelhores8Terceiros(grupos: ClassificacaoGrupo[]): Array<{ grupo: string; time: string; pontos: number }> {
  const terceiros = grupos
    .filter(g => g.terceiro && g.terceiro.time !== '?')
    .map(g => ({
      grupo: g.grupo,
      time: g.terceiro.time,
      pontos: g.terceiro.pontos,
      golsPro: g.terceiro.golsPro,
      saldo: g.terceiro.saldo,
    }))

  terceiros.sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos
    if (b.saldo !== a.saldo) return b.saldo - a.saldo
    return b.golsPro - a.golsPro
  })

  return terceiros.slice(0, 8)
}
