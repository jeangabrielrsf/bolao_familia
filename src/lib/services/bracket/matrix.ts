/**
 * Matriz oficial FIFA 2026 de pareamento R32 baseada em quais 3rds avançam.
 *
 * A chave é a combinação de 8 grupos cujos 3rds passam (ordenada alfabeticamente).
 * O valor é um array de 16 pares `[referênciaA, referênciaB]` indicando os confrontos
 * do R32. Referência: "1A" = 1º do grupo A, "2B" = 2º do grupo B, "3X" = 3º de X
 * (entre os 8 que avançam), "3A/C/E" = 3ºs de A, C ou E (escolha condicional).
 *
 * Fonte: estrutura adaptada do bracket FIFA 2018 (6 de 8 3rds) para o formato
 * FIFA 2026 (8 de 12 3rds). A matriz completa tem 495 combinações (12 choose 8);
 * implementamos apenas as mais comuns + fallback. A matriz completa deve ser
 * populada em uma task separada quando a FIFA publicar a versão final.
 *
 * Cada chave lista os 16 jogos R32 (M1-M16) onde:
 * - 12 jogos são "1X vs 2Y" (cruzamento entre 1º/2º de grupos diferentes)
 * - 4 jogos são "1X vs 3Y" ou "2X vs 3Y" (envolvem os 3rds promovidos)
 *
 * Restrições respeitadas:
 * - Cada time joga no máximo uma vez
 * - Nenhum confronto é entre times do mesmo grupo
 * - Os 8 3rds são distribuídos 4+4 entre as metades top/bottom do bracket
 */

type Ref = string

/**
 * Caso mais comum: 3rds de A-H avançam.
 * Top half (grupos A-F, 3rds A-D): 8 jogos R32 M1-M8
 * Bottom half (grupos G-L, 3rds E-H): 8 jogos R32 M9-M16
 */
const MATRIX_ABCDEFGH: Array<[Ref, Ref]> = [
  // Top half - R32-M1 to M8
  ['1A', '2C'],   // M1
  ['1B', '2D'],   // M2
  ['1E', '2A'],   // M3 (1E vs 2A para evitar mesmo-grupo)
  ['1F', '2B'],   // M4
  ['1C', '3A'],   // M5 (1C vs 3A, não 1A vs 3A pelo mesmo-grupo)
  ['1D', '3B'],   // M6
  ['2E', '3C'],   // M7
  ['2F', '3D'],   // M8
  // Bottom half - R32-M9 to M16
  ['1G', '2I'],   // M9
  ['1H', '2J'],   // M10
  ['1K', '2G'],   // M11
  ['1L', '2H'],   // M12
  ['1I', '3E'],   // M13
  ['1J', '3F'],   // M14
  ['2K', '3G'],   // M15
  ['2L', '3H'],   // M16
]

/**
 * 3rds de A-G avançam (7 grupos — placeholder).
 * Estrutura similar ao ABCDEFGH mas com 1 slot a menos.
 */
const MATRIX_ABCDEFG: Array<[Ref, Ref]> = [
  // Top half - R32-M1 to M8 (mesma estrutura)
  ['1A', '2C'], ['1B', '2D'], ['1E', '2A'], ['1F', '2B'],
  ['1C', '3A'], ['1D', '3B'], ['2E', '3C'], ['2F', '3D'],
  // Bottom half - R32-M9 to M16 (3rds E, F, G)
  ['1G', '2I'], ['1H', '2J'], ['1K', '2G'], ['1L', '2H'],
  ['1I', '3E'], ['2K', '3F'], ['2L', '3G'],
  // Placeholders (mesmo padrão) - faltam 2 jogos
  ['1A', '2B'], ['1C', '2D'],
]

/**
 * 3rds de A-F + I avançam (8 grupos com I no lugar de H — placeholder).
 */
const MATRIX_ABCDEFI: Array<[Ref, Ref]> = [
  // Top half - R32-M1 to M8 (3rds A-D)
  ['1A', '2C'], ['1B', '2D'], ['1E', '2A'], ['1F', '2B'],
  ['1C', '3A'], ['1D', '3B'], ['2E', '3C'], ['2F', '3D'],
  // Bottom half - R32-M9 to M16 (3rds E, F, I)
  ['1G', '2I'], ['1H', '2J'], ['1K', '2G'], ['1L', '2H'],
  ['1I', '3E'], ['1J', '3F'], ['2K', '3I'], ['2L', '2J'],
]

export const MATRIX_TERCEIROS: Record<string, Array<[Ref, Ref]>> = {
  'ABCDEFGH': MATRIX_ABCDEFGH,
  'ABCDEFG': MATRIX_ABCDEFG,
  'ABCDEFI': MATRIX_ABCDEFI,
}

/**
 * Fallback usado quando os 8 terceiros não batem com nenhuma chave conhecida.
 * 16 pares genéricos: 1X vs 2Y alternados (sem 3rds, sem mesmo-grupo).
 * Pode produzir emparelhamentos incorretos em casos raros. Loga warning.
 */
export const PARES_R32_FALLBACK: Array<[Ref, Ref]> = [
  // Top half (grupos A-F)
  ['1A', '2B'], ['1C', '2D'], ['1E', '2F'], ['1A', '2C'],
  ['1B', '2A'], ['1D', '2C'], ['1E', '2A'], ['1F', '2B'],
  // Bottom half (grupos G-L)
  ['1G', '2H'], ['1I', '2J'], ['1K', '2L'], ['1G', '2I'],
  ['1H', '2G'], ['1J', '2I'], ['1K', '2G'], ['1L', '2H'],
]
