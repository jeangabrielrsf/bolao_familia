import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg(process.env.DATABASE_URL!)
const prisma = new PrismaClient({ adapter })

// Horários corretos em BRT (horário de Brasília, UTC-3)
// Convertidos para UTC para armazenamento no banco
const jogosCorrigidos: Array<{
  timeA: string
  timeB: string
  grupo: string
  dataHoraUTC: string
  cidade: string
}> = [
  // Grupo A
  { grupo: 'A', timeA: 'México', timeB: 'África do Sul', dataHoraUTC: '2026-06-11T19:00:00.000Z', cidade: 'Mexico City' },
  { grupo: 'A', timeA: 'Coreia do Sul', timeB: 'República Checa', dataHoraUTC: '2026-06-12T02:00:00.000Z', cidade: 'Guadalajara' },
  { grupo: 'A', timeA: 'República Checa', timeB: 'África do Sul', dataHoraUTC: '2026-06-18T16:00:00.000Z', cidade: 'Atlanta' },
  { grupo: 'A', timeA: 'México', timeB: 'Coreia do Sul', dataHoraUTC: '2026-06-19T01:00:00.000Z', cidade: 'Guadalajara' },
  { grupo: 'A', timeA: 'República Checa', timeB: 'México', dataHoraUTC: '2026-06-25T01:00:00.000Z', cidade: 'Mexico City' },
  { grupo: 'A', timeA: 'África do Sul', timeB: 'Coreia do Sul', dataHoraUTC: '2026-06-25T01:00:00.000Z', cidade: 'Monterrey' },

  // Grupo B
  { grupo: 'B', timeA: 'Canadá', timeB: 'Bósnia', dataHoraUTC: '2026-06-12T19:00:00.000Z', cidade: 'Toronto' },
  { grupo: 'B', timeA: 'Catar', timeB: 'Suíça', dataHoraUTC: '2026-06-13T19:00:00.000Z', cidade: 'Santa Clara' },
  { grupo: 'B', timeA: 'Suíça', timeB: 'Bósnia', dataHoraUTC: '2026-06-18T19:00:00.000Z', cidade: 'Inglewood' },
  { grupo: 'B', timeA: 'Canadá', timeB: 'Catar', dataHoraUTC: '2026-06-18T22:00:00.000Z', cidade: 'Vancouver' },
  { grupo: 'B', timeA: 'Suíça', timeB: 'Canadá', dataHoraUTC: '2026-06-24T19:00:00.000Z', cidade: 'Vancouver' },
  { grupo: 'B', timeA: 'Bósnia', timeB: 'Catar', dataHoraUTC: '2026-06-24T19:00:00.000Z', cidade: 'Seattle' },

  // Grupo C
  { grupo: 'C', timeA: 'Brasil', timeB: 'Marrocos', dataHoraUTC: '2026-06-13T22:00:00.000Z', cidade: 'East Rutherford' },
  { grupo: 'C', timeA: 'Haiti', timeB: 'Escócia', dataHoraUTC: '2026-06-14T01:00:00.000Z', cidade: 'Foxborough' },
  { grupo: 'C', timeA: 'Escócia', timeB: 'Marrocos', dataHoraUTC: '2026-06-19T22:00:00.000Z', cidade: 'Foxborough' },
  { grupo: 'C', timeA: 'Brasil', timeB: 'Haiti', dataHoraUTC: '2026-06-20T00:30:00.000Z', cidade: 'Philadelphia' },
  { grupo: 'C', timeA: 'Escócia', timeB: 'Brasil', dataHoraUTC: '2026-06-24T22:00:00.000Z', cidade: 'Miami Gardens' },
  { grupo: 'C', timeA: 'Marrocos', timeB: 'Haiti', dataHoraUTC: '2026-06-24T22:00:00.000Z', cidade: 'Atlanta' },

  // Grupo D
  { grupo: 'D', timeA: 'EUA', timeB: 'Paraguai', dataHoraUTC: '2026-06-13T01:00:00.000Z', cidade: 'Inglewood' },
  { grupo: 'D', timeA: 'Austrália', timeB: 'Turquia', dataHoraUTC: '2026-06-14T04:00:00.000Z', cidade: 'Vancouver' },
  { grupo: 'D', timeA: 'EUA', timeB: 'Austrália', dataHoraUTC: '2026-06-19T19:00:00.000Z', cidade: 'Seattle' },
  { grupo: 'D', timeA: 'Turquia', timeB: 'Paraguai', dataHoraUTC: '2026-06-20T03:00:00.000Z', cidade: 'Santa Clara' },
  { grupo: 'D', timeA: 'Turquia', timeB: 'EUA', dataHoraUTC: '2026-06-26T02:00:00.000Z', cidade: 'Inglewood' },
  { grupo: 'D', timeA: 'Paraguai', timeB: 'Austrália', dataHoraUTC: '2026-06-26T02:00:00.000Z', cidade: 'Santa Clara' },

  // Grupo E
  { grupo: 'E', timeA: 'Alemanha', timeB: 'Curaçao', dataHoraUTC: '2026-06-14T17:00:00.000Z', cidade: 'Houston' },
  { grupo: 'E', timeA: 'Costa do Marfim', timeB: 'Equador', dataHoraUTC: '2026-06-14T23:00:00.000Z', cidade: 'Philadelphia' },
  { grupo: 'E', timeA: 'Alemanha', timeB: 'Costa do Marfim', dataHoraUTC: '2026-06-20T20:00:00.000Z', cidade: 'Toronto' },
  { grupo: 'E', timeA: 'Equador', timeB: 'Curaçao', dataHoraUTC: '2026-06-21T00:00:00.000Z', cidade: 'Kansas City' },
  { grupo: 'E', timeA: 'Curaçao', timeB: 'Costa do Marfim', dataHoraUTC: '2026-06-25T20:00:00.000Z', cidade: 'Philadelphia' },
  { grupo: 'E', timeA: 'Equador', timeB: 'Alemanha', dataHoraUTC: '2026-06-25T20:00:00.000Z', cidade: 'East Rutherford' },

  // Grupo F
  { grupo: 'F', timeA: 'Holanda', timeB: 'Japão', dataHoraUTC: '2026-06-14T20:00:00.000Z', cidade: 'Arlington' },
  { grupo: 'F', timeA: 'Suécia', timeB: 'Tunísia', dataHoraUTC: '2026-06-15T02:00:00.000Z', cidade: 'Monterrey' },
  { grupo: 'F', timeA: 'Holanda', timeB: 'Suécia', dataHoraUTC: '2026-06-20T17:00:00.000Z', cidade: 'Houston' },
  { grupo: 'F', timeA: 'Tunísia', timeB: 'Japão', dataHoraUTC: '2026-06-21T04:00:00.000Z', cidade: 'Monterrey' },
  { grupo: 'F', timeA: 'Japão', timeB: 'Suécia', dataHoraUTC: '2026-06-25T23:00:00.000Z', cidade: 'Arlington' },
  { grupo: 'F', timeA: 'Tunísia', timeB: 'Holanda', dataHoraUTC: '2026-06-25T23:00:00.000Z', cidade: 'Kansas City' },

  // Grupo G
  { grupo: 'G', timeA: 'Bélgica', timeB: 'Egito', dataHoraUTC: '2026-06-15T19:00:00.000Z', cidade: 'Seattle' },
  { grupo: 'G', timeA: 'Irã', timeB: 'Nova Zelândia', dataHoraUTC: '2026-06-16T01:00:00.000Z', cidade: 'Inglewood' },
  { grupo: 'G', timeA: 'Bélgica', timeB: 'Irã', dataHoraUTC: '2026-06-21T19:00:00.000Z', cidade: 'Inglewood' },
  { grupo: 'G', timeA: 'Nova Zelândia', timeB: 'Egito', dataHoraUTC: '2026-06-22T01:00:00.000Z', cidade: 'Vancouver' },
  { grupo: 'G', timeA: 'Egito', timeB: 'Irã', dataHoraUTC: '2026-06-27T03:00:00.000Z', cidade: 'Seattle' },
  { grupo: 'G', timeA: 'Nova Zelândia', timeB: 'Bélgica', dataHoraUTC: '2026-06-27T03:00:00.000Z', cidade: 'Vancouver' },

  // Grupo H
  { grupo: 'H', timeA: 'Espanha', timeB: 'Cabo Verde', dataHoraUTC: '2026-06-15T16:00:00.000Z', cidade: 'Atlanta' },
  { grupo: 'H', timeA: 'Arábia Saudita', timeB: 'Uruguai', dataHoraUTC: '2026-06-15T22:00:00.000Z', cidade: 'Miami Gardens' },
  { grupo: 'H', timeA: 'Espanha', timeB: 'Arábia Saudita', dataHoraUTC: '2026-06-21T16:00:00.000Z', cidade: 'Atlanta' },
  { grupo: 'H', timeA: 'Uruguai', timeB: 'Cabo Verde', dataHoraUTC: '2026-06-21T22:00:00.000Z', cidade: 'Miami Gardens' },
  { grupo: 'H', timeA: 'Cabo Verde', timeB: 'Arábia Saudita', dataHoraUTC: '2026-06-27T00:00:00.000Z', cidade: 'Houston' },
  { grupo: 'H', timeA: 'Uruguai', timeB: 'Espanha', dataHoraUTC: '2026-06-27T00:00:00.000Z', cidade: 'Guadalajara' },

  // Grupo I
  { grupo: 'I', timeA: 'França', timeB: 'Senegal', dataHoraUTC: '2026-06-16T19:00:00.000Z', cidade: 'East Rutherford' },
  { grupo: 'I', timeA: 'Iraque', timeB: 'Noruega', dataHoraUTC: '2026-06-16T22:00:00.000Z', cidade: 'Foxborough' },
  { grupo: 'I', timeA: 'França', timeB: 'Iraque', dataHoraUTC: '2026-06-21T21:00:00.000Z', cidade: 'Philadelphia' },
  { grupo: 'I', timeA: 'Noruega', timeB: 'Senegal', dataHoraUTC: '2026-06-22T00:00:00.000Z', cidade: 'East Rutherford' },
  { grupo: 'I', timeA: 'Noruega', timeB: 'França', dataHoraUTC: '2026-06-26T19:00:00.000Z', cidade: 'Foxborough' },
  { grupo: 'I', timeA: 'Senegal', timeB: 'Iraque', dataHoraUTC: '2026-06-26T19:00:00.000Z', cidade: 'Toronto' },

  // Grupo J
  { grupo: 'J', timeA: 'Argentina', timeB: 'Argélia', dataHoraUTC: '2026-06-17T01:00:00.000Z', cidade: 'Kansas City' },
  { grupo: 'J', timeA: 'Áustria', timeB: 'Jordânia', dataHoraUTC: '2026-06-17T04:00:00.000Z', cidade: 'Santa Clara' },
  { grupo: 'J', timeA: 'Argentina', timeB: 'Áustria', dataHoraUTC: '2026-06-22T17:00:00.000Z', cidade: 'Arlington' },
  { grupo: 'J', timeA: 'Jordânia', timeB: 'Argélia', dataHoraUTC: '2026-06-23T03:00:00.000Z', cidade: 'Santa Clara' },
  { grupo: 'J', timeA: 'Argélia', timeB: 'Áustria', dataHoraUTC: '2026-06-28T02:00:00.000Z', cidade: 'Kansas City' },
  { grupo: 'J', timeA: 'Jordânia', timeB: 'Argentina', dataHoraUTC: '2026-06-28T02:00:00.000Z', cidade: 'Arlington' },

  // Grupo K
  { grupo: 'K', timeA: 'Portugal', timeB: 'Congo', dataHoraUTC: '2026-06-17T17:00:00.000Z', cidade: 'Houston' },
  { grupo: 'K', timeA: 'Uzebequistão', timeB: 'Colômbia', dataHoraUTC: '2026-06-18T02:00:00.000Z', cidade: 'Mexico City' },
  { grupo: 'K', timeA: 'Portugal', timeB: 'Uzebequistão', dataHoraUTC: '2026-06-23T17:00:00.000Z', cidade: 'Houston' },
  { grupo: 'K', timeA: 'Colômbia', timeB: 'Congo', dataHoraUTC: '2026-06-24T02:00:00.000Z', cidade: 'Guadalajara' },
  { grupo: 'K', timeA: 'Colômbia', timeB: 'Portugal', dataHoraUTC: '2026-06-27T23:30:00.000Z', cidade: 'Miami Gardens' },
  { grupo: 'K', timeA: 'Congo', timeB: 'Uzebequistão', dataHoraUTC: '2026-06-27T23:30:00.000Z', cidade: 'Atlanta' },

  // Grupo L
  { grupo: 'L', timeA: 'Inglaterra', timeB: 'Croácia', dataHoraUTC: '2026-06-17T20:00:00.000Z', cidade: 'Arlington' },
  { grupo: 'L', timeA: 'Gana', timeB: 'Panamá', dataHoraUTC: '2026-06-17T23:00:00.000Z', cidade: 'Toronto' },
  { grupo: 'L', timeA: 'Inglaterra', timeB: 'Gana', dataHoraUTC: '2026-06-23T20:00:00.000Z', cidade: 'Foxborough' },
  { grupo: 'L', timeA: 'Panamá', timeB: 'Croácia', dataHoraUTC: '2026-06-23T23:00:00.000Z', cidade: 'Toronto' },
  { grupo: 'L', timeA: 'Panamá', timeB: 'Inglaterra', dataHoraUTC: '2026-06-27T21:00:00.000Z', cidade: 'East Rutherford' },
  { grupo: 'L', timeA: 'Croácia', timeB: 'Gana', dataHoraUTC: '2026-06-27T21:00:00.000Z', cidade: 'Philadelphia' },
]

async function main() {
  console.log('Iniciando correção de horários dos jogos...')
  console.log(`Total de jogos a corrigir: ${jogosCorrigidos.length}`)

  let atualizados = 0
  let naoEncontrados = 0

  for (const jogo of jogosCorrigidos) {
    const resultado = await prisma.jogo.updateMany({
      where: {
        timeA: jogo.timeA,
        timeB: jogo.timeB,
        grupo: jogo.grupo,
      },
      data: {
        dataHora: new Date(jogo.dataHoraUTC),
        cidade: jogo.cidade,
      },
    })

    if (resultado.count > 0) {
      atualizados++
      const dataBRT = new Date(jogo.dataHoraUTC)
      dataBRT.setHours(dataBRT.getHours() - 3) // UTC-3
      console.log(`✓ ${jogo.timeA} vs ${jogo.timeB} → ${dataBRT.toLocaleString('pt-BR')} BRT (${jogo.cidade})`)
    } else {
      naoEncontrados++
      console.log(`✗ NÃO ENCONTRADO: ${jogo.timeA} vs ${jogo.timeB} (Grupo ${jogo.grupo})`)
    }
  }

  console.log('\n=== RESUMO ===')
  console.log(`Atualizados: ${atualizados}`)
  console.log(`Não encontrados: ${naoEncontrados}`)
  console.log(`Total processado: ${atualizados + naoEncontrados}`)

  if (naoEncontrados > 0) {
    console.log('\n⚠️  Alguns jogos não foram encontrados. Verifique se os nomes dos times estão corretos.')
  }
}

main()
  .catch((err) => {
    console.error('Erro ao corrigir horários:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
