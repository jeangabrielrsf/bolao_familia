/**
 * Derivado dos pareamentos reais do projector:
 *   PAREAMENTO_R32_PARA_R16 = [[2,5],[1,3],[4,6],[7,8],[11,12],[9,10],[14,16],[13,15]]
 *   PAREAMENTO_R16_PARA_QF = [[1,2],[5,6],[3,4],[7,8]]
 *   QF → SF: [[1,2],[3,4]]
 *
 * SF-1 = QF [1,2] = Oit [1,2] + Oit [5,6] → R32 {1,2,3,5,9,10,11,12}
 * SF-2 = QF [3,4] = Oit [3,4] + Oit [7,8] → R32 {4,6,7,8,13,14,15,16}
 */

const R32_SF1_SLOTS = new Set([1, 2, 3, 5, 9, 10, 11, 12])
const R32_SF2_SLOTS = new Set([4, 6, 7, 8, 13, 14, 15, 16])

export type Lado = 'left' | 'right'

export function getLadoSlot(r32Slot: number): Lado {
  if (R32_SF1_SLOTS.has(r32Slot)) return 'left'
  if (R32_SF2_SLOTS.has(r32Slot)) return 'right'
  throw new Error(`R32 slot ${r32Slot} não pertence a nenhum lado`)
}

/**
 * Agrupa R32 slots por lado, mantendo ordem cronológica (slot ascendente)
 */
export function groupR32BySide<T extends { slot: number }>(slots: T[]): { left: T[]; right: T[] } {
  const left: T[] = []
  const right: T[] = []
  for (const s of slots) {
    if (R32_SF1_SLOTS.has(s.slot)) left.push(s)
    else if (R32_SF2_SLOTS.has(s.slot)) right.push(s)
  }
  return { left, right }
}
