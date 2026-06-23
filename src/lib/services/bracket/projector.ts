import type { BracketSlot, ClassificacaoGrupo, JogoComTimes } from './types'
import { MATRIX_TERCEIROS, PARES_R32_FALLBACK } from './matrix'

type Input = {
  classificacao: ClassificacaoGrupo[]
  melhoresTerceiros: Array<{ grupo: string; time: string; pontos: number }>
  jogosMataMata: JogoComTimes[]
}

export function projetarChaveamento(input: Input): BracketSlot[] {
  const slots: BracketSlot[] = []

  const matrixKey = input.melhoresTerceiros.length === 8
    ? input.melhoresTerceiros.map(t => t.grupo).sort().join('')
    : ''
  const pares = MATRIX_TERCEIROS[matrixKey] || PARES_R32_FALLBACK

  for (let i = 0; i < 16; i++) {
    const jogo = input.jogosMataMata.find(j => j.sofascoreId === `R32-M${i + 1}`)
    if (!jogo) continue
    const par = pares[i] || ['1A', '2B']
    const [refA, refB] = par
    slots.push({
      jogoId: jogo.id,
      fase: 'dezesseis_avos',
      slot: i + 1,
      timeA: resolverReferencia(refA, input),
      timeB: resolverReferencia(refB, input),
      placarA: jogo.resultadoA,
      placarB: jogo.resultadoB,
      placarPenaltisA: jogo.placarPenaltisA,
      placarPenaltisB: jogo.placarPenaltisB,
      status: jogo.status,
      vencedor: jogo.vencedor === 1 ? 'A' : jogo.vencedor === 2 ? 'B' : null,
      sourceGrupo: {
        timeA: extrairOrigem(refA),
        timeB: extrairOrigem(refB),
      },
    })
  }

  const fasesConfig = [
    { fase: 'oitavas' as const, prefix: 'R16', count: 8, previous: 'R32' },
    { fase: 'quartas' as const, prefix: 'QF', count: 4, previous: 'R16' },
    { fase: 'semifinal' as const, prefix: 'SF', count: 2, previous: 'QF' },
  ]
  for (const cfg of fasesConfig) {
    for (let i = 0; i < cfg.count; i++) {
      const jogo = input.jogosMataMata.find(j => j.sofascoreId === `${cfg.prefix}-M${i + 1}`)
      if (!jogo) continue
      const j1 = input.jogosMataMata.find(j => j.sofascoreId === `${cfg.previous}-M${i * 2 + 1}`)
      const j2 = input.jogosMataMata.find(j => j.sofascoreId === `${cfg.previous}-M${i * 2 + 2}`)
      slots.push({
        jogoId: jogo.id,
        fase: cfg.fase,
        slot: i + 1,
        timeA: j1 ? vencedorDoJogo(j1) : null,
        timeB: j2 ? vencedorDoJogo(j2) : null,
        placarA: jogo.resultadoA,
        placarB: jogo.resultadoB,
        placarPenaltisA: jogo.placarPenaltisA,
        placarPenaltisB: jogo.placarPenaltisB,
        status: jogo.status,
        vencedor: jogo.vencedor === 1 ? 'A' : jogo.vencedor === 2 ? 'B' : null,
      })
    }
  }

  const final = input.jogosMataMata.find(j => j.sofascoreId === 'F-M1')
  if (final) {
    const sf1 = input.jogosMataMata.find(j => j.sofascoreId === 'SF-M1')
    const sf2 = input.jogosMataMata.find(j => j.sofascoreId === 'SF-M2')
    slots.push({
      jogoId: final.id,
      fase: 'final',
      slot: 1,
      timeA: sf1 ? vencedorDoJogo(sf1) : null,
      timeB: sf2 ? vencedorDoJogo(sf2) : null,
      placarA: final.resultadoA,
      placarB: final.resultadoB,
      placarPenaltisA: final.placarPenaltisA,
      placarPenaltisB: final.placarPenaltisB,
      status: final.status,
      vencedor: final.vencedor === 1 ? 'A' : final.vencedor === 2 ? 'B' : null,
    })
  }

  const terceiro = input.jogosMataMata.find(j => j.sofascoreId === 'TP-M1')
  if (terceiro) {
    slots.push({
      jogoId: terceiro.id,
      fase: 'terceiro',
      slot: 1,
      timeA: null,
      timeB: null,
      placarA: terceiro.resultadoA,
      placarB: terceiro.resultadoB,
      placarPenaltisA: terceiro.placarPenaltisA,
      placarPenaltisB: terceiro.placarPenaltisB,
      status: terceiro.status,
      vencedor: terceiro.vencedor === 1 ? 'A' : terceiro.vencedor === 2 ? 'B' : null,
    })
  }

  return slots
}

function resolverReferencia(ref: string, input: Input): string | null {
  if (!ref) return null
  const pos = ref[0] as '1' | '2' | '3'
  const grupoLetra = ref[1]

  if (pos === '1' || pos === '2') {
    const grupo = input.classificacao.find(g => g.grupo === grupoLetra)
    if (!grupo) return null
    return grupo.times[pos === '1' ? 0 : 1]?.time || null
  }

  if (ref.includes('/')) return null
  const terceiro = input.melhoresTerceiros.find(t => t.grupo === grupoLetra)
  return terceiro?.time || null
}

function extrairOrigem(ref: string): { grupo: string; posicao: 1 | 2 | 3 } {
  const pos = ref[0] as '1' | '2' | '3'
  const grupo = ref.match(/[A-L]/)![0]
  return { grupo, posicao: pos === '1' ? 1 : pos === '2' ? 2 : 3 }
}

function vencedorDoJogo(jogo: JogoComTimes): string | null {
  if (jogo.vencedor === 1) return jogo.timeA
  if (jogo.vencedor === 2) return jogo.timeB
  if (jogo.placarPenaltisA !== null && jogo.placarPenaltisB !== null) {
    if (jogo.placarPenaltisA > jogo.placarPenaltisB) return jogo.timeA
    if (jogo.placarPenaltisB > jogo.placarPenaltisA) return jogo.timeB
  }
  return null
}
