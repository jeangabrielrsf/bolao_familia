import type { ClassificacaoTime } from './types'
export function aplicarTiebreakers(times: ClassificacaoTime[]): ClassificacaoTime[] {
  return [...times].sort((a, b) => b.pontos - a.pontos)
}
