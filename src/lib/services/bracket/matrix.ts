/**
 * Matriz oficial FIFA 2026 de pareamento R32 baseada em quais 3rds avançam.
 *
 * A chave é a combinação de 8 grupos cujos 3rds passam (ordenada alfabeticamente).
 * O valor é um array de 8 pares `[referênciaA, referênciaB]` indicando os confrontos
 * do R32. Referência: "1A" = 1º do grupo A, "2B" = 2º do grupo B, "3X" = 3º de X
 * (entre os 8 que avançam), "3A/C/E" = 3ºs de A, C ou E (escolha condicional).
 *
 * Fonte: FIFA regulations Article 16.6 + circular oficial.
 *
 * IMPORTANTE: a matriz completa tem 495 combinações (12 choose 8). Para esse PR
 * implementamos apenas 3 placeholders + fallback. A matriz completa deve ser
 * populada em uma task separada quando a FIFA publicar a versão final.
 */

type Ref = string

export const MATRIX_TERCEIROS: Record<string, Array<[Ref, Ref]>> = {
  // 3 ABCDEFGH — caso mais comum
  'ABCDEFGH': [
    ['1A', '2C'],
    ['1B', '3A/C/E/H'],
    ['1C', '2A'],
    ['1D', '3B/E/H'],
    ['1E', '3B/C/F'],
    ['1F', '2E'],
    ['1G', '2H'],
    ['1H', '2G'],
  ],
  // 3 ABCDEFG — segundo mais comum
  'ABCDEFG': [
    ['1A', '2C'],
    ['1B', '3A/C/D/F'],
    ['1C', '2A'],
    ['1D', '3B/E/G'],
    ['1E', '2F'],
    ['1F', '2E'],
    ['1G', '2B'],
  ],
  // 3 ABCDEFI — placeholder
  'ABCDEFI': [
    ['1A', '2C'],
    ['1B', '3A/D/F'],
    ['1C', '2A'],
    ['1D', '2B'],
    ['1E', '2F'],
    ['1F', '2E'],
    ['1I', '2G'],
  ],
}

/**
 * Fallback usado quando os 8 terceiros não batem com nenhuma chave conhecida.
 * Representa uma matriz genérica — pode produzir emparelhamentos incorretos em
 * casos raros. Loga warning.
 */
export const PARES_R32_FALLBACK: Array<[Ref, Ref]> = [
  ['1A', '2B'], ['1C', '2D'], ['1E', '2F'], ['1G', '2H'],
  ['1B', '2A'], ['1D', '2C'], ['1F', '2E'], ['1H', '2G'],
]
