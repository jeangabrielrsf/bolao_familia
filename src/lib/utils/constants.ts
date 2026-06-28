import type { ConfiguracaoPontuacao } from './types'

export const PONTUACAO_PADRAO: ConfiguracaoPontuacao = {
  placarExato: 10,
  vencedorCorreto: 6,
  quemPassa: 6,
  campeao: 10,
  vice: 10,
  terceiro: 10,
  quarto: 10,
  artilheiro: 10,
}

export const CONFIG_CHAVES = {
  PONTUACAO: 'pontuacao',
  PRAZO_COMPLETAR_BOLAO: 'prazo_completar_bolao',
  COMPLETAR_BOLAO_HABILITADO: 'completar_bolao_habilitado',
  PRAZO_DEZESSEIS_AVOS: 'prazo_dezesseis_avos',
  HABILITADO_DEZESSEIS_AVOS: 'habilitado_dezesseis_avos',
  PRAZO_OITAVAS: 'prazo_oitavas',
  HABILITADO_OITAVAS: 'habilitado_oitavas',
  PRAZO_QUARTAS: 'prazo_quartas',
  HABILITADO_QUARTAS: 'habilitado_quartas',
  PRAZO_SEMIFINAL: 'prazo_semifinal',
  HABILITADO_SEMIFINAL: 'habilitado_semifinal',
  PRAZO_TERCEIRO: 'prazo_terceiro',
  HABILITADO_TERCEIRO: 'habilitado_terceiro',
  PRAZO_FINAL: 'prazo_final',
  HABILITADO_FINAL: 'habilitado_final',
} as const

export const TIMES_VALIDOS = [
  'Argentina', 'Austrália', 'Bélgica', 'Brasil', 'Camarões', 'Canadá',
  'Costa Rica', 'Croácia', 'Dinamarca', 'Equador', 'Espanha', 'EUA',
  'França', 'Alemanha', 'Gana', 'Inglaterra', 'Irã', 'Japão', 'Coreia do Sul',
  'Marrocos', 'México', 'Holanda', 'Polônia', 'Portugal', 'Senegal',
  'Sérvia', 'Arábia Saudita', 'Suíça', 'Tunísia', 'Uruguai', 'Gales',
  'Catar', 'Escócia', 'Ucrânia', 'Áustria', 'Itália', 'Colômbia',
  'Chile', 'Peru', 'Paraguai', 'Venezuela', 'Bolívia', 'Panamá',
  'Honduras', 'El Salvador', 'Jamaica', 'Nigéria', 'Egito', 'Argélia',
  'Costa do Marfim', 'África do Sul', 'Tanzânia',
  'Haiti', 'Curaçao', 'Cabo Verde', 'Bósnia', 'Suécia', 'Iraque',
  'Jordânia', 'Uzbequistão', 'República Checa', 'Congo', 'Noruega',
  'Turquia', 'Nova Zelândia',
] as const

export const GRUPOS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const

export const FASES = ['grupos', 'dezesseis_avos', 'oitavas', 'quartas', 'semifinal', 'terceiro', 'final'] as const

export const FASES_MATA_MATA = ['dezesseis_avos', 'oitavas', 'quartas', 'semifinal', 'terceiro', 'final'] as const

export const FASE_LABELS: Record<string, string> = {
  grupos: 'Fase de Grupos',
  dezesseis_avos: '16avos de Final',
  oitavas: 'Oitavas de Final',
  quartas: 'Quartas de Final',
  semifinal: 'Semifinal',
  terceiro: 'Disputa pelo 3º Lugar',
  final: 'Final',
}
