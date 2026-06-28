import type { BracketSlot, ClassificacaoGrupo, JogoComTimes } from './types'
import { PARES_R32_OFICIAL, isRefSet, gruposDoRefSet } from './matrix'

type Input = {
  classificacao: ClassificacaoGrupo[]
  melhoresTerceiros: Array<{ grupo: string; time: string; pontos: number }>
  jogosMataMata: JogoComTimes[]
}

export function projetarChaveamento(input: Input): BracketSlot[] {
  const slots: BracketSlot[] = []

  for (let i = 0; i < 16; i++) {
    const jogo = input.jogosMataMata.find(j => j.sofascoreId === `R32-M${i + 1}`)
    if (!jogo) continue
    const par = PARES_R32_OFICIAL[i]
    const [refA, refB] = par
    const resA = resolverReferencia(refA, input)
    const resB = resolverReferencia(refB, input)
    slots.push({
      jogoId: jogo.id,
      fase: 'dezesseis_avos',
      slot: i + 1,
      timeA: jogo.timeA || resA.time,
      timeB: jogo.timeB || resB.time,
      placarA: jogo.resultadoA,
      placarB: jogo.resultadoB,
      placarPenaltisA: jogo.placarPenaltisA,
      placarPenaltisB: jogo.placarPenaltisB,
      status: jogo.status,
      vencedor: jogo.vencedor === 1 ? 'A' : jogo.vencedor === 2 ? 'B' : null,
      dataHora: jogo.dataHora,
      sourceGrupo: {
        timeA: extrairOrigem(refA, resA.grupo),
        timeB: extrairOrigem(refB, resB.grupo),
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
        dataHora: jogo.dataHora,
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
      dataHora: final.dataHora,
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
      dataHora: terceiro.dataHora,
    })
  }

  return slots
}

type ResolverResult = { time: string | null; grupo: string | null }

function resolverReferencia(ref: string, input: Input): ResolverResult {
  if (!ref) return { time: null, grupo: null }

  // Set de 3rds (ex: "3ABCDF"): pega o melhor 3rd do set
  if (isRefSet(ref)) {
    const grupos = gruposDoRefSet(ref)
    const candidatos = input.melhoresTerceiros
      .filter(t => grupos.includes(t.grupo))
      .sort((a, b) => b.pontos - a.pontos)  // getMelhores8Terceiros já ordena, mas garante
    const escolhido = candidatos[0]
    return { time: escolhido?.time || null, grupo: escolhido?.grupo || null }
  }

  // 1X ou 2X de grupo único
  const pos = ref[0] as '1' | '2'
  const grupoLetra = ref[1]
  const grupo = input.classificacao.find(g => g.grupo === grupoLetra)
  if (!grupo) return { time: null, grupo: grupoLetra }
  return { time: grupo.times[pos === '1' ? 0 : 1]?.time || null, grupo: grupoLetra }
}

function extrairOrigem(ref: string, grupoResolvido: string | null): { grupo: string; posicao: 1 | 2 | 3; gruposAlternativos?: string[] } {
  if (isRefSet(ref)) {
    const grupos = gruposDoRefSet(ref)
    return {
      grupo: grupoResolvido || grupos[0] || '?',
      posicao: 3,
      gruposAlternativos: grupos,
    }
  }
  const pos = ref[0] as '1' | '2' | '3'
  const grupo = ref.slice(1)
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
