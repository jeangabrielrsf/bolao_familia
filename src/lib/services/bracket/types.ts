import type { Jogo } from '@prisma/client'

export type ClassificacaoTime = {
  time: string
  jogos: number
  vitorias: number
  empates: number
  derrotas: number
  golsPro: number
  golsContra: number
  saldo: number
  pontos: number
  posicao: number | null
  jogosDetalhe: Array<{
    adversario: string
    placarPro: number
    placarContra: number
  }>
}

export type ClassificacaoGrupo = {
  grupo: string
  times: ClassificacaoTime[]
  classificados: string[]
  terceiro: ClassificacaoTime
}

export type BracketSlot = {
  jogoId: string
  fase: 'dezesseis_avos' | 'oitavas' | 'quartas' | 'semifinal' | 'terceiro' | 'final'
  slot: number
  timeA: string | null
  timeB: string | null
  placarA: number | null
  placarB: number | null
  placarPenaltisA: number | null
  placarPenaltisB: number | null
  status: 'agendado' | 'em_andamento' | 'finalizado'
  vencedor: 'A' | 'B' | null
  sourceGrupo?: {
    timeA: { grupo: string; posicao: 1 | 2 | 3; gruposAlternativos?: string[] }
    timeB: { grupo: string; posicao: 1 | 2 | 3; gruposAlternativos?: string[] }
  }
}

export type JogoComTimes = Pick<Jogo, 'id' | 'fase' | 'grupo' | 'timeA' | 'timeB' | 'resultadoA' | 'resultadoB' | 'status' | 'placarPenaltisA' | 'placarPenaltisB' | 'vencedor' | 'sofascoreId' | 'dataHora'>
