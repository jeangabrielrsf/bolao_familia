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
  PRAZO_COMPLETAR_BOLAO: 'prazo_completar_bolao',
  COMPLETAR_BOLAO_HABILITADO: 'completar_bolao_habilitado',
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

export const FASE_LABELS: Record<string, string> = {
  grupos: 'Fase de Grupos',
  dezerveis_avos: '16avos de Final',
  oitavas: 'Oitavas de Final',
  quartas: 'Quartas de Final',
  semifinal: 'Semifinal',
  terceiro: 'Disputa pelo 3º Lugar',
  final: 'Final',
}
