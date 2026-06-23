import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { PONTUACAO_PADRAO, CONFIG_CHAVES } from '../src/lib/utils/constants'

const adapter = new PrismaPg(process.env.DATABASE_URL!)
const prisma = new PrismaClient({ adapter })

const JOGOS_BOLAO = new Set([
  'México|África do Sul',
  'EUA|Paraguai',
  'Brasil|Marrocos',
  'Haiti|Escócia',
  'Alemanha|Curaçao',
  'Holanda|Japão',
  'Espanha|Cabo Verde',
  'Arábia Saudita|Uruguai',
  'França|Senegal',
  'Argentina|Argélia',
  'Inglaterra|Croácia',
  'Portugal|Congo',
  'Canadá|Catar',
  'Suíça|Bósnia',
  'Escócia|Marrocos',
  'Brasil|Haiti',
  'Holanda|Suécia',
  'Alemanha|Costa do Marfim',
  'Uruguai|Cabo Verde',
  'Bélgica|Irã',
  'França|Iraque',
  'Noruega|Senegal',
  'Jordânia|Argélia',
  'Portugal|Uzbequistão',
  'Escócia|Brasil',
  'República Checa|México',
  'Tunísia|Holanda',
  'Equador|Alemanha',
  'Noruega|França',
  'Uruguai|Espanha',
  'Egito|Irã',
  'Colômbia|Portugal',
  'Jordânia|Argentina',
])

const jogosData: Array<{
  grupo: string
  timeA: string
  timeB: string
  dataHora: string
  cidade: string
  sofascoreId: string
  isBolao?: boolean
}> = [
  // Grupo A
  { grupo: 'A', timeA: 'México', timeB: 'África do Sul', dataHora: '2026-06-11T19:00:00.000Z', cidade: 'Mexico City', sofascoreId: '15186710' },
  { grupo: 'A', timeA: 'Coreia do Sul', timeB: 'República Checa', dataHora: '2026-06-12T02:00:00.000Z', cidade: 'Guadalajara', sofascoreId: '15186720' },
  { grupo: 'A', timeA: 'República Checa', timeB: 'África do Sul', dataHora: '2026-06-18T16:00:00.000Z', cidade: 'Atlanta', sofascoreId: '15186731' },
  { grupo: 'A', timeA: 'México', timeB: 'Coreia do Sul', dataHora: '2026-06-19T01:00:00.000Z', cidade: 'Guadalajara', sofascoreId: '15186490' },
  { grupo: 'A', timeA: 'República Checa', timeB: 'México', dataHora: '2026-06-25T01:00:00.000Z', cidade: 'Mexico City', sofascoreId: '15186732' },
  { grupo: 'A', timeA: 'África do Sul', timeB: 'Coreia do Sul', dataHora: '2026-06-25T01:00:00.000Z', cidade: 'Monterrey', sofascoreId: '15186744' },

  // Grupo B
  { grupo: 'B', timeA: 'Canadá', timeB: 'Bósnia', dataHora: '2026-06-12T19:00:00.000Z', cidade: 'Toronto', sofascoreId: '15186836' },
  { grupo: 'B', timeA: 'Catar', timeB: 'Suíça', dataHora: '2026-06-13T19:00:00.000Z', cidade: 'Santa Clara', sofascoreId: '15186526' },
  { grupo: 'B', timeA: 'Suíça', timeB: 'Bósnia', dataHora: '2026-06-18T19:00:00.000Z', cidade: 'Inglewood', sofascoreId: '15186806' },
  { grupo: 'B', timeA: 'Canadá', timeB: 'Catar', dataHora: '2026-06-18T22:00:00.000Z', cidade: 'Vancouver', sofascoreId: '15186798' },
  { grupo: 'B', timeA: 'Suíça', timeB: 'Canadá', dataHora: '2026-06-24T19:00:00.000Z', cidade: 'Vancouver', sofascoreId: '15186821' },
  { grupo: 'B', timeA: 'Bósnia', timeB: 'Catar', dataHora: '2026-06-24T19:00:00.000Z', cidade: 'Seattle', sofascoreId: '15186829' },

  // Grupo C
  { grupo: 'C', timeA: 'Brasil', timeB: 'Marrocos', dataHora: '2026-06-13T22:00:00.000Z', cidade: 'East Rutherford', sofascoreId: '15186850' },
  { grupo: 'C', timeA: 'Haiti', timeB: 'Escócia', dataHora: '2026-06-14T01:00:00.000Z', cidade: 'Foxborough', sofascoreId: '15186853' },
  { grupo: 'C', timeA: 'Escócia', timeB: 'Marrocos', dataHora: '2026-06-19T22:00:00.000Z', cidade: 'Foxborough', sofascoreId: '15186859' },
  { grupo: 'C', timeA: 'Brasil', timeB: 'Haiti', dataHora: '2026-06-20T00:30:00.000Z', cidade: 'Philadelphia', sofascoreId: '15186856' },
  { grupo: 'C', timeA: 'Escócia', timeB: 'Brasil', dataHora: '2026-06-24T22:00:00.000Z', cidade: 'Miami Gardens', sofascoreId: '15186861' },
  { grupo: 'C', timeA: 'Marrocos', timeB: 'Haiti', dataHora: '2026-06-24T22:00:00.000Z', cidade: 'Atlanta', sofascoreId: '15186864' },

  // Grupo D
  { grupo: 'D', timeA: 'EUA', timeB: 'Paraguai', dataHora: '2026-06-13T01:00:00.000Z', cidade: 'Inglewood', sofascoreId: '15186873' },
  { grupo: 'D', timeA: 'Austrália', timeB: 'Turquia', dataHora: '2026-06-14T04:00:00.000Z', cidade: 'Vancouver', sofascoreId: '15186874' },
  { grupo: 'D', timeA: 'EUA', timeB: 'Austrália', dataHora: '2026-06-19T19:00:00.000Z', cidade: 'Seattle', sofascoreId: '15186878' },
  { grupo: 'D', timeA: 'Turquia', timeB: 'Paraguai', dataHora: '2026-06-20T03:00:00.000Z', cidade: 'Santa Clara', sofascoreId: '15186879' },
  { grupo: 'D', timeA: 'Turquia', timeB: 'EUA', dataHora: '2026-06-26T02:00:00.000Z', cidade: 'Inglewood', sofascoreId: '15186887' },
  { grupo: 'D', timeA: 'Paraguai', timeB: 'Austrália', dataHora: '2026-06-26T02:00:00.000Z', cidade: 'Santa Clara', sofascoreId: '15186891' },

  // Grupo E
  { grupo: 'E', timeA: 'Alemanha', timeB: 'Curaçao', dataHora: '2026-06-14T17:00:00.000Z', cidade: 'Houston', sofascoreId: '15186899' },
  { grupo: 'E', timeA: 'Costa do Marfim', timeB: 'Equador', dataHora: '2026-06-14T23:00:00.000Z', cidade: 'Philadelphia', sofascoreId: '15186904' },
  { grupo: 'E', timeA: 'Alemanha', timeB: 'Costa do Marfim', dataHora: '2026-06-20T20:00:00.000Z', cidade: 'Toronto', sofascoreId: '15186905' },
  { grupo: 'E', timeA: 'Equador', timeB: 'Curaçao', dataHora: '2026-06-21T00:00:00.000Z', cidade: 'Kansas City', sofascoreId: '15186906' },
  { grupo: 'E', timeA: 'Curaçao', timeB: 'Costa do Marfim', dataHora: '2026-06-25T20:00:00.000Z', cidade: 'Philadelphia', sofascoreId: '15186908' },
  { grupo: 'E', timeA: 'Equador', timeB: 'Alemanha', dataHora: '2026-06-25T20:00:00.000Z', cidade: 'East Rutherford', sofascoreId: '15186907' },

  // Grupo F
  { grupo: 'F', timeA: 'Holanda', timeB: 'Japão', dataHora: '2026-06-14T20:00:00.000Z', cidade: 'Arlington', sofascoreId: '15186945' },
  { grupo: 'F', timeA: 'Suécia', timeB: 'Tunísia', dataHora: '2026-06-15T02:00:00.000Z', cidade: 'Monterrey', sofascoreId: '15186951' },
  { grupo: 'F', timeA: 'Holanda', timeB: 'Suécia', dataHora: '2026-06-20T17:00:00.000Z', cidade: 'Houston', sofascoreId: '15186957' },
  { grupo: 'F', timeA: 'Tunísia', timeB: 'Japão', dataHora: '2026-06-21T04:00:00.000Z', cidade: 'Monterrey', sofascoreId: '15186963' },
  { grupo: 'F', timeA: 'Japão', timeB: 'Suécia', dataHora: '2026-06-25T23:00:00.000Z', cidade: 'Arlington', sofascoreId: '15186972' },
  { grupo: 'F', timeA: 'Tunísia', timeB: 'Holanda', dataHora: '2026-06-25T23:00:00.000Z', cidade: 'Kansas City', sofascoreId: '15186973' },

  // Grupo G
  { grupo: 'G', timeA: 'Bélgica', timeB: 'Egito', dataHora: '2026-06-15T19:00:00.000Z', cidade: 'Seattle', sofascoreId: '15186837' },
  { grupo: 'G', timeA: 'Irã', timeB: 'Nova Zelândia', dataHora: '2026-06-16T01:00:00.000Z', cidade: 'Inglewood', sofascoreId: '15186832' },
  { grupo: 'G', timeA: 'Bélgica', timeB: 'Irã', dataHora: '2026-06-21T19:00:00.000Z', cidade: 'Inglewood', sofascoreId: '15186499' },
  { grupo: 'G', timeA: 'Nova Zelândia', timeB: 'Egito', dataHora: '2026-06-22T01:00:00.000Z', cidade: 'Vancouver', sofascoreId: '15186827' },
  { grupo: 'G', timeA: 'Egito', timeB: 'Irã', dataHora: '2026-06-27T03:00:00.000Z', cidade: 'Seattle', sofascoreId: '15186828' },
  { grupo: 'G', timeA: 'Nova Zelândia', timeB: 'Bélgica', dataHora: '2026-06-27T03:00:00.000Z', cidade: 'Vancouver', sofascoreId: '15186822' },

  // Grupo H
  { grupo: 'H', timeA: 'Espanha', timeB: 'Cabo Verde', dataHora: '2026-06-15T16:00:00.000Z', cidade: 'Atlanta', sofascoreId: '15186783' },
  { grupo: 'H', timeA: 'Arábia Saudita', timeB: 'Uruguai', dataHora: '2026-06-15T22:00:00.000Z', cidade: 'Miami Gardens', sofascoreId: '15186811' },
  { grupo: 'H', timeA: 'Espanha', timeB: 'Arábia Saudita', dataHora: '2026-06-21T16:00:00.000Z', cidade: 'Atlanta', sofascoreId: '15186840' },
  { grupo: 'H', timeA: 'Uruguai', timeB: 'Cabo Verde', dataHora: '2026-06-21T22:00:00.000Z', cidade: 'Miami Gardens', sofascoreId: '15186800' },
  { grupo: 'H', timeA: 'Cabo Verde', timeB: 'Arábia Saudita', dataHora: '2026-06-27T00:00:00.000Z', cidade: 'Houston', sofascoreId: '15186803' },
  { grupo: 'H', timeA: 'Uruguai', timeB: 'Espanha', dataHora: '2026-06-27T00:00:00.000Z', cidade: 'Guadalajara', sofascoreId: '15186841' },

  // Grupo I
  { grupo: 'I', timeA: 'França', timeB: 'Senegal', dataHora: '2026-06-16T19:00:00.000Z', cidade: 'East Rutherford', sofascoreId: '15186501' },
  { grupo: 'I', timeA: 'Iraque', timeB: 'Noruega', dataHora: '2026-06-16T22:00:00.000Z', cidade: 'Foxborough', sofascoreId: '15186773' },
  { grupo: 'I', timeA: 'França', timeB: 'Iraque', dataHora: '2026-06-22T21:00:00.000Z', cidade: 'Philadelphia', sofascoreId: '15186769' },
  { grupo: 'I', timeA: 'Noruega', timeB: 'Senegal', dataHora: '2026-06-23T00:00:00.000Z', cidade: 'East Rutherford', sofascoreId: '15186770' },
  { grupo: 'I', timeA: 'Noruega', timeB: 'França', dataHora: '2026-06-26T19:00:00.000Z', cidade: 'Foxborough', sofascoreId: '15186537' },
  { grupo: 'I', timeA: 'Senegal', timeB: 'Iraque', dataHora: '2026-06-26T19:00:00.000Z', cidade: 'Toronto', sofascoreId: '15186771' },

  // Grupo J
  { grupo: 'J', timeA: 'Argentina', timeB: 'Argélia', dataHora: '2026-06-17T01:00:00.000Z', cidade: 'Kansas City', sofascoreId: '15186854' },
  { grupo: 'J', timeA: 'Áustria', timeB: 'Jordânia', dataHora: '2026-06-17T04:00:00.000Z', cidade: 'Santa Clara', sofascoreId: '15186751' },
  { grupo: 'J', timeA: 'Argentina', timeB: 'Áustria', dataHora: '2026-06-22T17:00:00.000Z', cidade: 'Arlington', sofascoreId: '15186502' },
  { grupo: 'J', timeA: 'Jordânia', timeB: 'Argélia', dataHora: '2026-06-23T03:00:00.000Z', cidade: 'Santa Clara', sofascoreId: '15186740' },
  { grupo: 'J', timeA: 'Argélia', timeB: 'Áustria', dataHora: '2026-06-28T02:00:00.000Z', cidade: 'Kansas City', sofascoreId: '15186747' },
  { grupo: 'J', timeA: 'Jordânia', timeB: 'Argentina', dataHora: '2026-06-28T02:00:00.000Z', cidade: 'Arlington', sofascoreId: '15186734' },

  // Grupo K
  { grupo: 'K', timeA: 'Portugal', timeB: 'Congo', dataHora: '2026-06-17T17:00:00.000Z', cidade: 'Houston', sofascoreId: '15186709' },
  { grupo: 'K', timeA: 'Uzbequistão', timeB: 'Colômbia', dataHora: '2026-06-18T02:00:00.000Z', cidade: 'Mexico City', sofascoreId: '15186722' },
  { grupo: 'K', timeA: 'Portugal', timeB: 'Uzbequistão', dataHora: '2026-06-23T17:00:00.000Z', cidade: 'Houston', sofascoreId: '15186858' },
  { grupo: 'K', timeA: 'Colômbia', timeB: 'Congo', dataHora: '2026-06-24T02:00:00.000Z', cidade: 'Guadalajara', sofascoreId: '15186713' },
  { grupo: 'K', timeA: 'Colômbia', timeB: 'Portugal', dataHora: '2026-06-27T23:30:00.000Z', cidade: 'Miami Gardens', sofascoreId: '15186696' },
  { grupo: 'K', timeA: 'Congo', timeB: 'Uzbequistão', dataHora: '2026-06-27T23:30:00.000Z', cidade: 'Atlanta', sofascoreId: '15186717' },

  // Grupo L
  { grupo: 'L', timeA: 'Inglaterra', timeB: 'Croácia', dataHora: '2026-06-17T20:00:00.000Z', cidade: 'Arlington', sofascoreId: '15186504' },
  { grupo: 'L', timeA: 'Gana', timeB: 'Panamá', dataHora: '2026-06-17T23:00:00.000Z', cidade: 'Toronto', sofascoreId: '15186687' },
  { grupo: 'L', timeA: 'Inglaterra', timeB: 'Gana', dataHora: '2026-06-23T20:00:00.000Z', cidade: 'Foxborough', sofascoreId: '15186672' },
  { grupo: 'L', timeA: 'Panamá', timeB: 'Croácia', dataHora: '2026-06-23T23:00:00.000Z', cidade: 'Toronto', sofascoreId: '15186520' },
  { grupo: 'L', timeA: 'Panamá', timeB: 'Inglaterra', dataHora: '2026-06-27T21:00:00.000Z', cidade: 'East Rutherford', sofascoreId: '15186676' },
  { grupo: 'L', timeA: 'Croácia', timeB: 'Gana', dataHora: '2026-06-27T21:00:00.000Z', cidade: 'Philadelphia', sofascoreId: '15186624' },
]

// Chaveamento mata-mata — Copa 2026 oficial
// R32: 16 jogos (28/jun - 03/jul)
// R16: 8 jogos (04-07/jul)
// QF: 4 jogos (11-12/jul)
// SF: 2 jogos (15/jul)
// 3º: 1 jogo (18/jul)
// F: 1 jogo (19/jul)
const mataMataData: Array<{
  fase: 'dezesseis_avos' | 'oitavas' | 'quartas' | 'semifinal' | 'terceiro' | 'final'
  slot: number
  dataHora: string
  cidade: string
  sofascoreId: string
}> = [
  { fase: 'dezesseis_avos', slot: 1, dataHora: '2026-06-28T19:00:00.000Z', cidade: 'Philadelphia', sofascoreId: 'R32-M1' },
  { fase: 'dezesseis_avos', slot: 2, dataHora: '2026-06-29T19:00:00.000Z', cidade: 'Houston', sofascoreId: 'R32-M2' },
  { fase: 'dezesseis_avos', slot: 3, dataHora: '2026-06-30T19:00:00.000Z', cidade: 'East Rutherford', sofascoreId: 'R32-M3' },
  { fase: 'dezesseis_avos', slot: 4, dataHora: '2026-07-01T19:00:00.000Z', cidade: 'Miami Gardens', sofascoreId: 'R32-M4' },
  { fase: 'dezesseis_avos', slot: 5, dataHora: '2026-07-01T22:00:00.000Z', cidade: 'Atlanta', sofascoreId: 'R32-M5' },
  { fase: 'dezesseis_avos', slot: 6, dataHora: '2026-07-02T19:00:00.000Z', cidade: 'Kansas City', sofascoreId: 'R32-M6' },
  { fase: 'dezesseis_avos', slot: 7, dataHora: '2026-07-02T22:00:00.000Z', cidade: 'Dallas', sofascoreId: 'R32-M7' },
  { fase: 'dezesseis_avos', slot: 8, dataHora: '2026-07-03T19:00:00.000Z', cidade: 'Inglewood', sofascoreId: 'R32-M8' },
  { fase: 'dezesseis_avos', slot: 9, dataHora: '2026-06-28T22:00:00.000Z', cidade: 'Boston', sofascoreId: 'R32-M9' },
  { fase: 'dezesseis_avos', slot: 10, dataHora: '2026-06-29T22:00:00.000Z', cidade: 'Seattle', sofascoreId: 'R32-M10' },
  { fase: 'dezesseis_avos', slot: 11, dataHora: '2026-06-30T22:00:00.000Z', cidade: 'Monterrey', sofascoreId: 'R32-M11' },
  { fase: 'dezesseis_avos', slot: 12, dataHora: '2026-07-01T01:00:00.000Z', cidade: 'Mexico City', sofascoreId: 'R32-M12' },
  { fase: 'dezesseis_avos', slot: 13, dataHora: '2026-07-01T03:00:00.000Z', cidade: 'Guadalajara', sofascoreId: 'R32-M13' },
  { fase: 'dezesseis_avos', slot: 14, dataHora: '2026-07-02T01:00:00.000Z', cidade: 'Toronto', sofascoreId: 'R32-M14' },
  { fase: 'dezesseis_avos', slot: 15, dataHora: '2026-07-02T03:00:00.000Z', cidade: 'Vancouver', sofascoreId: 'R32-M15' },
  { fase: 'dezesseis_avos', slot: 16, dataHora: '2026-07-03T22:00:00.000Z', cidade: 'Santa Clara', sofascoreId: 'R32-M16' },
  { fase: 'oitavas', slot: 1, dataHora: '2026-07-04T19:00:00.000Z', cidade: 'Philadelphia', sofascoreId: 'R16-M1' },
  { fase: 'oitavas', slot: 2, dataHora: '2026-07-05T19:00:00.000Z', cidade: 'Houston', sofascoreId: 'R16-M2' },
  { fase: 'oitavas', slot: 3, dataHora: '2026-07-06T19:00:00.000Z', cidade: 'Atlanta', sofascoreId: 'R16-M3' },
  { fase: 'oitavas', slot: 4, dataHora: '2026-07-07T19:00:00.000Z', cidade: 'Miami Gardens', sofascoreId: 'R16-M4' },
  { fase: 'oitavas', slot: 5, dataHora: '2026-07-05T22:00:00.000Z', cidade: 'Dallas', sofascoreId: 'R16-M5' },
  { fase: 'oitavas', slot: 6, dataHora: '2026-07-06T22:00:00.000Z', cidade: 'Kansas City', sofascoreId: 'R16-M6' },
  { fase: 'oitavas', slot: 7, dataHora: '2026-07-04T22:00:00.000Z', cidade: 'Inglewood', sofascoreId: 'R16-M7' },
  { fase: 'oitavas', slot: 8, dataHora: '2026-07-07T22:00:00.000Z', cidade: 'Seattle', sofascoreId: 'R16-M8' },
  { fase: 'quartas', slot: 1, dataHora: '2026-07-11T19:00:00.000Z', cidade: 'East Rutherford', sofascoreId: 'QF-M1' },
  { fase: 'quartas', slot: 2, dataHora: '2026-07-11T22:00:00.000Z', cidade: 'Inglewood', sofascoreId: 'QF-M2' },
  { fase: 'quartas', slot: 3, dataHora: '2026-07-12T19:00:00.000Z', cidade: 'Miami Gardens', sofascoreId: 'QF-M3' },
  { fase: 'quartas', slot: 4, dataHora: '2026-07-12T22:00:00.000Z', cidade: 'Dallas', sofascoreId: 'QF-M4' },
  { fase: 'semifinal', slot: 1, dataHora: '2026-07-15T19:00:00.000Z', cidade: 'Dallas', sofascoreId: 'SF-M1' },
  { fase: 'semifinal', slot: 2, dataHora: '2026-07-15T22:00:00.000Z', cidade: 'Atlanta', sofascoreId: 'SF-M2' },
  { fase: 'terceiro', slot: 1, dataHora: '2026-07-18T19:00:00.000Z', cidade: 'Miami Gardens', sofascoreId: 'TP-M1' },
  { fase: 'final', slot: 1, dataHora: '2026-07-19T19:00:00.000Z', cidade: 'East Rutherford', sofascoreId: 'F-M1' },
]

// Idempotente: pula se já existe por sofascoreId.
// Não usamos deleteMany porque Palpite.jogoId é FK sem CASCADE — apagar
// jogos com palpites relacionados daria erro. O check explícito preserva
// dados e reentrância segura do seed.
async function criarJogoSeNaoExiste(data: {
  fase: 'grupos' | 'dezesseis_avos' | 'oitavas' | 'quartas' | 'semifinal' | 'terceiro' | 'final'
  grupo?: string | null
  dataHora: Date
  timeA: string | null
  timeB: string | null
  sofascoreId: string
  cidade: string
  isBolao: boolean
}): Promise<boolean> {
  const existing = await prisma.jogo.findFirst({
    where: { sofascoreId: data.sofascoreId },
  })
  if (existing) return false
  await prisma.jogo.create({ data })
  return true
}

async function main() {
  console.log('Criando jogos da fase de grupos (idempotente)...')
  let gruposCriados = 0
  for (const jogo of jogosData) {
    const created = await criarJogoSeNaoExiste({
      fase: 'grupos',
      grupo: jogo.grupo,
      dataHora: new Date(jogo.dataHora),
      timeA: jogo.timeA,
      timeB: jogo.timeB,
      sofascoreId: jogo.sofascoreId,
      cidade: jogo.cidade,
      isBolao: JOGOS_BOLAO.has(`${jogo.timeA}|${jogo.timeB}`),
    })
    if (created) gruposCriados++
  }
  console.log(`  ${gruposCriados} jogos da fase de grupos criados (resto já existia)`)

  console.log('Criando jogos do mata-mata (idempotente)...')
  let mataMataCriados = 0
  for (const jogo of mataMataData) {
    const created = await criarJogoSeNaoExiste({
      fase: jogo.fase,
      grupo: null,
      dataHora: new Date(jogo.dataHora),
      timeA: null,
      timeB: null,
      sofascoreId: jogo.sofascoreId,
      cidade: jogo.cidade,
      isBolao: false,
    })
    if (created) mataMataCriados++
  }
  console.log(`  ${mataMataCriados} jogos do mata-mata criados (resto já existia)`)

  console.log('Configurando pontuação padrão...')

  await prisma.configuracao.upsert({
    where: { chave: CONFIG_CHAVES.PONTUACAO },
    update: {
      valor: JSON.stringify(PONTUACAO_PADRAO),
      descricao: 'Pontuação padrão para palpites',
    },
    create: {
      chave: CONFIG_CHAVES.PONTUACAO,
      valor: JSON.stringify(PONTUACAO_PADRAO),
      descricao: 'Pontuação padrão para palpites',
    },
  })

  console.log('Pontuação padrão configurada com sucesso')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
