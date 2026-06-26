/**
 * Matriz oficial FIFA 2026 — pareamento R32 (M73-M88).
 *
 * A FIFA fixou a estrutura dos 16 jogos do R32. 8 são "1X vs 2Y" puros;
 * os outros 8 envolvem um "3Y" escolhido de um SET específico de 5 grupos
 * (ex: "3ABCDF" = melhor 3º colocado entre A, B, C, D, F que avançar).
 *
 * Esta matriz cobre as 495 combinações possíveis de 8 3rds classificados
 * sem precisar de variantes — o set "3ABCDF" sempre significa "o melhor
 * 3º colocado entre esses 5 grupos" e se nenhum deles avançar, o slot
 * fica como TBD (placeholder descritivo).
 *
 * Restrições respeitadas (verificadas nos testes):
 * - Cada 1º aparece exatamente uma vez (12 grupos × 1 = 12)
 * - Cada 2º aparece exatamente uma vez (4 grupos × 2 = 8, com 4 grupos
 *   tendo 2 como 1X no R32)
 * - Nenhum confronto é entre times do mesmo grupo
 * - 3rds são distribuídos 4+4 entre metades top/bottom do bracket
 *
 * Fonte: Wikipedia "2026 FIFA World Cup knockout stage" + FIFA.com.
 * Mapeamento: M73 → R32-M1, M74 → R32-M2, ..., M88 → R32-M16.
 */

export type Ref = string

/**
 * 16 pares R32 oficiais. Cada par é `[refA, refB]` onde ref pode ser:
 * - "1A".."2L" → 1º/2º do grupo X
 * - "3ABCDF" → melhor 3º entre os grupos A, B, C, D, F
 */
export const PARES_R32_OFICIAL: Array<[Ref, Ref]> = [
  ['2A', '2B'],   // R32-M1 (M73) — 2X vs 2Y
  ['1E', '3ABCDF'], // R32-M2 (M74) — 1X vs 3º de 5 grupos
  ['1F', '2C'],   // R32-M3 (M75) — 1X vs 2Y
  ['1C', '2F'],   // R32-M4 (M76) — 1X vs 2Y
  ['1I', '3CDFGH'], // R32-M5 (M77) — 1X vs 3º de 5 grupos
  ['2E', '2I'],   // R32-M6 (M78) — 2X vs 2Y
  ['1A', '3CEFHI'], // R32-M7 (M79) — 1X vs 3º de 5 grupos
  ['1L', '3EHIJK'], // R32-M8 (M80) — 1X vs 3º de 5 grupos
  ['1D', '3BEFIJ'], // R32-M9 (M81) — 1X vs 3º de 5 grupos
  ['1G', '3AEHIJ'], // R32-M10 (M82) — 1X vs 3º de 5 grupos
  ['2K', '2L'],   // R32-M11 (M83) — 2X vs 2Y
  ['1H', '2J'],   // R32-M12 (M84) — 1X vs 2Y
  ['1B', '3EFGIJ'], // R32-M13 (M85) — 1X vs 3º de 5 grupos
  ['1J', '2H'],   // R32-M14 (M86) — 1X vs 2Y
  ['1K', '3DEIJL'], // R32-M15 (M87) — 1X vs 3º de 5 grupos
  ['2D', '2G'],   // R32-M16 (M88) — 2X vs 2Y
]

/**
 * Detecta se a ref é um set de 3rds (3 grupos ou mais) ou ref simples.
 * "3A" → set de 1 grupo (também conta como set)
 * "3ABCDF" → set de 5 grupos
 * "1A", "2L" → não é set
 */
export function isRefSet(ref: string): boolean {
  return ref.startsWith('3') && ref.length >= 2
}

/**
 * Extrai a lista de letras de grupos de uma ref de set.
 * "3ABCDF" → ['A', 'B', 'C', 'D', 'F']
 * "3A" → ['A']
 */
export function gruposDoRefSet(ref: string): string[] {
  if (!isRefSet(ref)) return []
  return ref.slice(1).split('')
}
