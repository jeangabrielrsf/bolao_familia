import type { ConfiguracaoPontuacao } from './types'

export const PONTUACAO_PADRAO: ConfiguracaoPontuacao = {
  placarExato: 10,
  vencedorCorreto: 6,
  campeao: 10,
  vice: 10,
  terceiro: 10,
  quarto: 10,
  artilheiro: 10,
}

export const CONFIG_CHAVES = {
  PONTUACAO: 'pontuacao',
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
] as const

export const GRUPOS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const

export const FASE_LABELS: Record<string, string> = {
  grupos: 'Fase de Grupos',
  oitavas: 'Oitavas de Final',
  quartas: 'Quartas de Final',
  semifinal: 'Semifinal',
  terceiro: 'Disputa pelo 3º Lugar',
  final: 'Final',
}
