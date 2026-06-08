import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { PONTUACAO_PADRAO, CONFIG_CHAVES } from '../src/lib/utils/constants'

const adapter = new PrismaPg(process.env.DATABASE_URL!)
const prisma = new PrismaClient({ adapter })

const jogosData: Array<{
  grupo: string
  timeA: string
  timeB: string
  dataHora: string
  sofascoreId: string
}> = [
  { grupo: 'A', timeA: 'México', timeB: 'África do Sul', dataHora: '2026-06-11T19:00:00.000Z', sofascoreId: '15186710' },
  { grupo: 'A', timeA: 'Coreia do Sul', timeB: 'República Checa', dataHora: '2026-06-12T02:00:00.000Z', sofascoreId: '15186720' },
  { grupo: 'B', timeA: 'Canadá', timeB: 'Bósnia', dataHora: '2026-06-12T19:00:00.000Z', sofascoreId: '15186836' },
  { grupo: 'D', timeA: 'EUA', timeB: 'Paraguai', dataHora: '2026-06-13T01:00:00.000Z', sofascoreId: '15186873' },
  { grupo: 'B', timeA: 'Catar', timeB: 'Suíça', dataHora: '2026-06-13T19:00:00.000Z', sofascoreId: '15186526' },
  { grupo: 'C', timeA: 'Brasil', timeB: 'Marrocos', dataHora: '2026-06-13T22:00:00.000Z', sofascoreId: '15186850' },
  { grupo: 'C', timeA: 'Haiti', timeB: 'Escócia', dataHora: '2026-06-14T01:00:00.000Z', sofascoreId: '15186853' },
  { grupo: 'D', timeA: 'Austrália', timeB: 'Turquia', dataHora: '2026-06-14T04:00:00.000Z', sofascoreId: '15186874' },
  { grupo: 'E', timeA: 'Alemanha', timeB: 'Curaçao', dataHora: '2026-06-14T17:00:00.000Z', sofascoreId: '15186899' },
  { grupo: 'F', timeA: 'Holanda', timeB: 'Japão', dataHora: '2026-06-14T20:00:00.000Z', sofascoreId: '15186945' },
  { grupo: 'E', timeA: 'Costa do Marfim', timeB: 'Equador', dataHora: '2026-06-14T23:00:00.000Z', sofascoreId: '15186904' },
  { grupo: 'F', timeA: 'Suécia', timeB: 'Tunísia', dataHora: '2026-06-15T02:00:00.000Z', sofascoreId: '15186951' },
  { grupo: 'H', timeA: 'Espanha', timeB: 'Cabo Verde', dataHora: '2026-06-15T16:00:00.000Z', sofascoreId: '15186783' },
  { grupo: 'G', timeA: 'Bélgica', timeB: 'Egito', dataHora: '2026-06-15T19:00:00.000Z', sofascoreId: '15186837' },
  { grupo: 'H', timeA: 'Arábia Saudita', timeB: 'Uruguai', dataHora: '2026-06-15T22:00:00.000Z', sofascoreId: '15186811' },
  { grupo: 'G', timeA: 'Irã', timeB: 'Nova Zelândia', dataHora: '2026-06-16T01:00:00.000Z', sofascoreId: '15186832' },
  { grupo: 'I', timeA: 'França', timeB: 'Senegal', dataHora: '2026-06-16T19:00:00.000Z', sofascoreId: '15186501' },
  { grupo: 'I', timeA: 'Iraque', timeB: 'Noruega', dataHora: '2026-06-16T22:00:00.000Z', sofascoreId: '15186773' },
  { grupo: 'J', timeA: 'Argentina', timeB: 'Argélia', dataHora: '2026-06-17T01:00:00.000Z', sofascoreId: '15186854' },
  { grupo: 'J', timeA: 'Áustria', timeB: 'Jordânia', dataHora: '2026-06-17T04:00:00.000Z', sofascoreId: '15186751' },
  { grupo: 'K', timeA: 'Portugal', timeB: 'Congo', dataHora: '2026-06-17T17:00:00.000Z', sofascoreId: '15186709' },
  { grupo: 'L', timeA: 'Inglaterra', timeB: 'Croácia', dataHora: '2026-06-17T20:00:00.000Z', sofascoreId: '15186504' },
  { grupo: 'L', timeA: 'Gana', timeB: 'Panamá', dataHora: '2026-06-17T23:00:00.000Z', sofascoreId: '15186687' },
  { grupo: 'K', timeA: 'Uzebequistão', timeB: 'Colômbia', dataHora: '2026-06-18T02:00:00.000Z', sofascoreId: '15186722' },
  { grupo: 'A', timeA: 'República Checa', timeB: 'África do Sul', dataHora: '2026-06-18T16:00:00.000Z', sofascoreId: '15186731' },
  { grupo: 'B', timeA: 'Suíça', timeB: 'Bósnia', dataHora: '2026-06-18T19:00:00.000Z', sofascoreId: '15186806' },
  { grupo: 'B', timeA: 'Canadá', timeB: 'Catar', dataHora: '2026-06-18T22:00:00.000Z', sofascoreId: '15186798' },
  { grupo: 'A', timeA: 'México', timeB: 'Coreia do Sul', dataHora: '2026-06-19T01:00:00.000Z', sofascoreId: '15186490' },
  { grupo: 'D', timeA: 'EUA', timeB: 'Austrália', dataHora: '2026-06-19T19:00:00.000Z', sofascoreId: '15186878' },
  { grupo: 'C', timeA: 'Escócia', timeB: 'Marrocos', dataHora: '2026-06-19T22:00:00.000Z', sofascoreId: '15186859' },
  { grupo: 'C', timeA: 'Brasil', timeB: 'Haiti', dataHora: '2026-06-20T00:30:00.000Z', sofascoreId: '15186856' },
  { grupo: 'D', timeA: 'Turquia', timeB: 'Paraguai', dataHora: '2026-06-20T03:00:00.000Z', sofascoreId: '15186879' },
  { grupo: 'F', timeA: 'Holanda', timeB: 'Suécia', dataHora: '2026-06-20T17:00:00.000Z', sofascoreId: '15186957' },
  { grupo: 'E', timeA: 'Alemanha', timeB: 'Costa do Marfim', dataHora: '2026-06-20T20:00:00.000Z', sofascoreId: '15186905' },
  { grupo: 'E', timeA: 'Equador', timeB: 'Curaçao', dataHora: '2026-06-21T00:00:00.000Z', sofascoreId: '15186906' },
  { grupo: 'F', timeA: 'Tunísia', timeB: 'Japão', dataHora: '2026-06-21T04:00:00.000Z', sofascoreId: '15186963' },
  { grupo: 'H', timeA: 'Espanha', timeB: 'Arábia Saudita', dataHora: '2026-06-21T16:00:00.000Z', sofascoreId: '15186840' },
  { grupo: 'G', timeA: 'Bélgica', timeB: 'Irã', dataHora: '2026-06-21T19:00:00.000Z', sofascoreId: '15186499' },
  { grupo: 'H', timeA: 'Uruguai', timeB: 'Cabo Verde', dataHora: '2026-06-21T22:00:00.000Z', sofascoreId: '15186800' },
  { grupo: 'G', timeA: 'Nova Zelândia', timeB: 'Egito', dataHora: '2026-06-22T01:00:00.000Z', sofascoreId: '15186827' },
  { grupo: 'J', timeA: 'Argentina', timeB: 'Áustria', dataHora: '2026-06-22T17:00:00.000Z', sofascoreId: '15186502' },
  { grupo: 'I', timeA: 'França', timeB: 'Iraque', dataHora: '2026-06-22T21:00:00.000Z', sofascoreId: '15186769' },
  { grupo: 'I', timeA: 'Noruega', timeB: 'Senegal', dataHora: '2026-06-23T00:00:00.000Z', sofascoreId: '15186770' },
  { grupo: 'J', timeA: 'Jordânia', timeB: 'Argélia', dataHora: '2026-06-23T03:00:00.000Z', sofascoreId: '15186740' },
  { grupo: 'K', timeA: 'Portugal', timeB: 'Uzebequistão', dataHora: '2026-06-23T17:00:00.000Z', sofascoreId: '15186858' },
  { grupo: 'L', timeA: 'Inglaterra', timeB: 'Gana', dataHora: '2026-06-23T20:00:00.000Z', sofascoreId: '15186672' },
  { grupo: 'L', timeA: 'Panamá', timeB: 'Croácia', dataHora: '2026-06-23T23:00:00.000Z', sofascoreId: '15186520' },
  { grupo: 'K', timeA: 'Colômbia', timeB: 'Congo', dataHora: '2026-06-24T02:00:00.000Z', sofascoreId: '15186713' },
  { grupo: 'B', timeA: 'Bósnia', timeB: 'Catar', dataHora: '2026-06-24T19:00:00.000Z', sofascoreId: '15186829' },
  { grupo: 'B', timeA: 'Suíça', timeB: 'Canadá', dataHora: '2026-06-24T19:00:00.000Z', sofascoreId: '15186821' },
  { grupo: 'C', timeA: 'Marrocos', timeB: 'Haiti', dataHora: '2026-06-24T22:00:00.000Z', sofascoreId: '15186864' },
  { grupo: 'C', timeA: 'Escócia', timeB: 'Brasil', dataHora: '2026-06-24T22:00:00.000Z', sofascoreId: '15186861' },
  { grupo: 'A', timeA: 'República Checa', timeB: 'México', dataHora: '2026-06-25T01:00:00.000Z', sofascoreId: '15186732' },
  { grupo: 'A', timeA: 'África do Sul', timeB: 'Coreia do Sul', dataHora: '2026-06-25T01:00:00.000Z', sofascoreId: '15186744' },
  { grupo: 'E', timeA: 'Curaçao', timeB: 'Costa do Marfim', dataHora: '2026-06-25T20:00:00.000Z', sofascoreId: '15186908' },
  { grupo: 'E', timeA: 'Equador', timeB: 'Alemanha', dataHora: '2026-06-25T20:00:00.000Z', sofascoreId: '15186907' },
  { grupo: 'F', timeA: 'Japão', timeB: 'Suécia', dataHora: '2026-06-25T23:00:00.000Z', sofascoreId: '15186972' },
  { grupo: 'F', timeA: 'Tunísia', timeB: 'Holanda', dataHora: '2026-06-25T23:00:00.000Z', sofascoreId: '15186973' },
  { grupo: 'D', timeA: 'Paraguai', timeB: 'Austrália', dataHora: '2026-06-26T02:00:00.000Z', sofascoreId: '15186891' },
  { grupo: 'D', timeA: 'Turquia', timeB: 'EUA', dataHora: '2026-06-26T02:00:00.000Z', sofascoreId: '15186887' },
  { grupo: 'I', timeA: 'Noruega', timeB: 'França', dataHora: '2026-06-26T19:00:00.000Z', sofascoreId: '15186537' },
  { grupo: 'I', timeA: 'Senegal', timeB: 'Iraque', dataHora: '2026-06-26T19:00:00.000Z', sofascoreId: '15186771' },
  { grupo: 'H', timeA: 'Cabo Verde', timeB: 'Arábia Saudita', dataHora: '2026-06-27T00:00:00.000Z', sofascoreId: '15186803' },
  { grupo: 'H', timeA: 'Uruguai', timeB: 'Espanha', dataHora: '2026-06-27T00:00:00.000Z', sofascoreId: '15186841' },
  { grupo: 'G', timeA: 'Egito', timeB: 'Irã', dataHora: '2026-06-27T03:00:00.000Z', sofascoreId: '15186828' },
  { grupo: 'G', timeA: 'Nova Zelândia', timeB: 'Bélgica', dataHora: '2026-06-27T03:00:00.000Z', sofascoreId: '15186822' },
  { grupo: 'L', timeA: 'Croácia', timeB: 'Gana', dataHora: '2026-06-27T21:00:00.000Z', sofascoreId: '15186624' },
  { grupo: 'L', timeA: 'Panamá', timeB: 'Inglaterra', dataHora: '2026-06-27T21:00:00.000Z', sofascoreId: '15186676' },
  { grupo: 'K', timeA: 'Colômbia', timeB: 'Portugal', dataHora: '2026-06-27T23:30:00.000Z', sofascoreId: '15186696' },
  { grupo: 'K', timeA: 'Congo', timeB: 'Uzebequistão', dataHora: '2026-06-27T23:30:00.000Z', sofascoreId: '15186717' },
  { grupo: 'J', timeA: 'Argélia', timeB: 'Áustria', dataHora: '2026-06-28T02:00:00.000Z', sofascoreId: '15186747' },
  { grupo: 'J', timeA: 'Jordânia', timeB: 'Argentina', dataHora: '2026-06-28T02:00:00.000Z', sofascoreId: '15186734' },
]

async function main() {
  console.log('Limpando jogos existentes...')
  await prisma.jogo.deleteMany({})

  console.log(`Criando ${jogosData.length} jogos da fase de grupos...`)

  await prisma.$transaction(
    jogosData.map((jogo) =>
      prisma.jogo.create({
        data: {
          fase: 'grupos',
          grupo: jogo.grupo,
          dataHora: new Date(jogo.dataHora),
          timeA: jogo.timeA,
          timeB: jogo.timeB,
          sofascoreId: jogo.sofascoreId,
          status: 'agendado',
        },
      })
    )
  )

  console.log(`${jogosData.length} jogos criados com sucesso`)

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
