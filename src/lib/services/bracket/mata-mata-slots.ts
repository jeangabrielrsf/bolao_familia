/**
 * Slot definitions do mata-mata — Copa do Mundo FIFA 2026.
 *
 * Fonte única da verdade para a sequência oficial de 32 confrontos
 * (R32 → R16 → QF → SF → 3º lugar → Final). Usado por:
 * - `scripts/seed.ts` para criar os registros na tabela `jogos`
 *   (idempotente via busca por `sofascoreId`).
 * - `src/lib/services/bracket/projector.ts` para mapear cada slot
 *   do bracket ao Jogo correspondente no DB.
 *
 * Importante: o `sofascoreId` é o ID REAL do football-data.org
 * (não um placeholder como `R32-M1`), porque o sync do microserviço
 * precisa desses IDs pra buscar resultados ao vivo.
 *
 * Source: https://api.football-data.org/v4/competitions/WC/matches
 * Migration de prod: scripts/fix_sofascore_ids_mata_mata.py
 */

export type FaseMataMata =
  | 'dezesseis_avos'
  | 'oitavas'
  | 'quartas'
  | 'semifinal'
  | 'terceiro'
  | 'final'

export type MataMataSlot = {
  fase: FaseMataMata
  slot: number
  dataHora: string
  cidade: string
  sofascoreId: string
}

export const MATA_MATA_SLOTS: readonly MataMataSlot[] = [
  // Round of 32
  { fase: 'dezesseis_avos', slot: 1, dataHora: '2026-06-28T19:00:00.000Z', cidade: 'Inglewood', sofascoreId: '537417' },
  { fase: 'dezesseis_avos', slot: 2, dataHora: '2026-06-29T20:30:00.000Z', cidade: 'Foxborough', sofascoreId: '537415' },
  { fase: 'dezesseis_avos', slot: 3, dataHora: '2026-06-30T01:00:00.000Z', cidade: 'Monterrey', sofascoreId: '537418' },
  { fase: 'dezesseis_avos', slot: 4, dataHora: '2026-06-29T17:00:00.000Z', cidade: 'Houston', sofascoreId: '537423' },
  { fase: 'dezesseis_avos', slot: 5, dataHora: '2026-06-30T21:00:00.000Z', cidade: 'East Rutherford', sofascoreId: '537416' },
  { fase: 'dezesseis_avos', slot: 6, dataHora: '2026-06-30T17:00:00.000Z', cidade: 'Dallas', sofascoreId: '537424' },
  { fase: 'dezesseis_avos', slot: 7, dataHora: '2026-07-01T01:00:00.000Z', cidade: 'Mexico City', sofascoreId: '537425' },
  { fase: 'dezesseis_avos', slot: 8, dataHora: '2026-07-01T16:00:00.000Z', cidade: 'Atlanta', sofascoreId: '537426' },
  { fase: 'dezesseis_avos', slot: 9, dataHora: '2026-07-02T00:00:00.000Z', cidade: 'Santa Clara', sofascoreId: '537421' },
  { fase: 'dezesseis_avos', slot: 10, dataHora: '2026-07-01T20:00:00.000Z', cidade: 'Seattle', sofascoreId: '537422' },
  { fase: 'dezesseis_avos', slot: 11, dataHora: '2026-07-02T23:00:00.000Z', cidade: 'Toronto', sofascoreId: '537419' },
  { fase: 'dezesseis_avos', slot: 12, dataHora: '2026-07-02T19:00:00.000Z', cidade: 'Miami Gardens', sofascoreId: '537420' },
  { fase: 'dezesseis_avos', slot: 13, dataHora: '2026-07-03T03:00:00.000Z', cidade: 'Vancouver', sofascoreId: '537429' },
  { fase: 'dezesseis_avos', slot: 14, dataHora: '2026-07-03T22:00:00.000Z', cidade: 'Miami Gardens', sofascoreId: '537427' },
  { fase: 'dezesseis_avos', slot: 15, dataHora: '2026-07-04T01:30:00.000Z', cidade: 'Kansas City', sofascoreId: '537430' },
  { fase: 'dezesseis_avos', slot: 16, dataHora: '2026-07-03T18:00:00.000Z', cidade: 'Dallas', sofascoreId: '537428' },
  // Round of 16
  { fase: 'oitavas', slot: 1, dataHora: '2026-07-04T17:00:00.000Z', cidade: 'Philadelphia', sofascoreId: '537376' },
  { fase: 'oitavas', slot: 2, dataHora: '2026-07-04T21:00:00.000Z', cidade: 'Houston', sofascoreId: '537375' },
  { fase: 'oitavas', slot: 3, dataHora: '2026-07-05T20:00:00.000Z', cidade: 'East Rutherford', sofascoreId: '537377' },
  { fase: 'oitavas', slot: 4, dataHora: '2026-07-06T00:00:00.000Z', cidade: 'Mexico City', sofascoreId: '537378' },
  { fase: 'oitavas', slot: 5, dataHora: '2026-07-06T19:00:00.000Z', cidade: 'Dallas', sofascoreId: '537379' },
  { fase: 'oitavas', slot: 6, dataHora: '2026-07-07T00:00:00.000Z', cidade: 'Seattle', sofascoreId: '537380' },
  { fase: 'oitavas', slot: 7, dataHora: '2026-07-07T16:00:00.000Z', cidade: 'Kansas City', sofascoreId: '537381' },
  { fase: 'oitavas', slot: 8, dataHora: '2026-07-07T20:00:00.000Z', cidade: 'Atlanta', sofascoreId: '537382' },
  // Quarter-finals
  { fase: 'quartas', slot: 1, dataHora: '2026-07-09T20:00:00.000Z', cidade: 'East Rutherford', sofascoreId: '537383' },
  { fase: 'quartas', slot: 2, dataHora: '2026-07-10T19:00:00.000Z', cidade: 'Dallas', sofascoreId: '537384' },
  { fase: 'quartas', slot: 3, dataHora: '2026-07-11T21:00:00.000Z', cidade: 'Mexico City', sofascoreId: '537385' },
  { fase: 'quartas', slot: 4, dataHora: '2026-07-12T01:00:00.000Z', cidade: 'Atlanta', sofascoreId: '537386' },
  // Semi-finals
  { fase: 'semifinal', slot: 1, dataHora: '2026-07-14T19:00:00.000Z', cidade: 'Dallas', sofascoreId: '537387' },
  { fase: 'semifinal', slot: 2, dataHora: '2026-07-15T19:00:00.000Z', cidade: 'East Rutherford', sofascoreId: '537388' },
  // Third place
  { fase: 'terceiro', slot: 1, dataHora: '2026-07-18T21:00:00.000Z', cidade: 'Miami Gardens', sofascoreId: '537389' },
  // Final
  { fase: 'final', slot: 1, dataHora: '2026-07-19T19:00:00.000Z', cidade: 'East Rutherford', sofascoreId: '537390' },
]

const MATA_MATA_SLOTS_BY_FASE: Record<FaseMataMata, MataMataSlot[]> = {
  dezesseis_avos: [],
  oitavas: [],
  quartas: [],
  semifinal: [],
  terceiro: [],
  final: [],
}

for (const slot of MATA_MATA_SLOTS) {
  MATA_MATA_SLOTS_BY_FASE[slot.fase].push(slot)
}

export function getSlotsByFase(fase: FaseMataMata): readonly MataMataSlot[] {
  return MATA_MATA_SLOTS_BY_FASE[fase]
}

export function getSlotSofascoreId(fase: FaseMataMata, slot: number): string | null {
  const found = MATA_MATA_SLOTS_BY_FASE[fase].find(s => s.slot === slot)
  return found?.sofascoreId ?? null
}
