export interface PalpiteDTO {
  jogoId: string
  placarA: number
  placarB: number
}

export interface PalpiteOCR {
  timeA: string
  timeB: string
  placarA: number
  placarB: number
}

export interface PalpiteExtraDTO {
  tipo: 'artilheiro' | 'campeao' | 'vice' | 'terceiro' | 'quarto'
  valor: string
}

export interface UploadResult {
  palpites: PalpiteDTO[]
  extras: PalpiteExtraDTO[]
  fonte: 'excel' | 'foto' | 'pdf'
}

export interface UploadResultOCR {
  palpites: PalpiteOCR[]
  extras: PalpiteExtraDTO[]
  fonte: 'foto' | 'pdf'
}

export interface ValidationResult {
  valido: boolean
  erros: string[]
  alertas: string[]
}

export interface RankingEntry {
  palpiteGrupoId: string
  participanteId: string
  nomeParticipante: string
  nomeGrupo: string
  apelido: string
  fotoUrl: string | null
  pontos: number
  placaresExatos: number
  vencedoresCorretos: number
}

export interface ResultadoJogo {
  jogoId: string
  resultadoA: number
  resultadoB: number
}

export interface ConfiguracaoPontuacao {
  placarExato: number
  vencedorCorreto: number
  campeao: number
  vice: number
  terceiro: number
  quarto: number
  artilheiro: number
}

export interface PalpiteGrupoParsed {
  nomeParticipante: string
  apelido: string
  nomeCompleto: string
  palpites: PalpiteDTO[]
  extras: PalpiteExtraDTO[]
}

export interface BatchGrupoPreview {
  nomeParticipante: string
  apelido: string
  nomeCompleto: string
  participanteId: string | null
  palpites: PalpiteDTO[]
  extras: PalpiteExtraDTO[]
}
