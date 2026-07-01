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

/**
 * Pareamento R32 → Oitavas para cada lado
 * Lado esquerdo: pares que alimentam Oitavas 1, 2, 5, 6
 * Lado direito: pares que alimentam Oitavas 3, 4, 7, 8
 */
const PAIRING_R32_LEFT = [[2, 5], [1, 3], [11, 12], [9, 10]] as const
const PAIRING_R32_RIGHT = [[4, 6], [7, 8], [14, 16], [13, 15]] as const

/**
 * Reordena slots R32 para que os pares fiquem consecutivos
 * Ex: [1, 2, 3, 5, 9, 10, 11, 12] → [2, 5, 1, 3, 11, 12, 9, 10]
 */
export function reorderR32ByPairing<T extends { slot: number }>(slots: T[], side: Lado): T[] {
  const pairing = side === 'left' ? PAIRING_R32_LEFT : PAIRING_R32_RIGHT
  const slotMap = new Map(slots.map(s => [s.slot, s]))
  
  const reordered: T[] = []
  for (const [a, b] of pairing) {
    const slotA = slotMap.get(a)
    const slotB = slotMap.get(b)
    if (slotA) reordered.push(slotA)
    if (slotB) reordered.push(slotB)
  }
  
  return reordered
}

/**
 * Pareamento Oitavas → Quartas para cada lado
 */
const PAIRING_OIT_LEFT = [[1, 2], [5, 6]] as const
const PAIRING_OIT_RIGHT = [[3, 4], [7, 8]] as const

/**
 * Reordena slots Oitavas para que os pares fiquem consecutivos
 */
export function reorderOitByPairing<T extends { slot: number }>(slots: T[], side: Lado): T[] {
  const pairing = side === 'left' ? PAIRING_OIT_LEFT : PAIRING_OIT_RIGHT
  const slotMap = new Map(slots.map(s => [s.slot, s]))
  
  const reordered: T[] = []
  for (const [a, b] of pairing) {
    const slotA = slotMap.get(a)
    const slotB = slotMap.get(b)
    if (slotA) reordered.push(slotA)
    if (slotB) reordered.push(slotB)
  }
  
  return reordered
}

/**
 * Pareamento Quartas → Semi para cada lado
 */
const PAIRING_QF_LEFT = [[1, 2]] as const
const PAIRING_QF_RIGHT = [[3, 4]] as const

/**
 * Reordena slots Quartas para que os pares fiquem consecutivos
 */
export function reorderQfByPairing<T extends { slot: number }>(slots: T[], side: Lado): T[] {
  const pairing = side === 'left' ? PAIRING_QF_LEFT : PAIRING_QF_RIGHT
  const slotMap = new Map(slots.map(s => [s.slot, s]))
  
  const reordered: T[] = []
  for (const [a, b] of pairing) {
    const slotA = slotMap.get(a)
    const slotB = slotMap.get(b)
    if (slotA) reordered.push(slotA)
    if (slotB) reordered.push(slotB)
  }
  
  return reordered
}
