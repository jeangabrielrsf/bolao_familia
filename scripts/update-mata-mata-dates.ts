/**
 * Atualiza dataHora + cidade dos jogos do mata-mata com os valores oficiais
 * do FIFA 2026 (pesquisa via worldcupkickofftimes.com, FIFA.com, NBC Sports,
 * Wikipedia). NÃO TOCA EM PALPITES — só UPDATE em Jogo.
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/update-mata-mata-dates.ts
 *
 * Idempotente: rodar 2x seguidas produz o mesmo resultado.
 * Verifica contagem de palpites antes/depois; aborta se mudou.
 */
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não definida. Use --env-file=.env')
}

const adapter = new PrismaPg(process.env.DATABASE_URL)
const prisma = new PrismaClient({ adapter })

type MataMataUpdate = {
  sofascoreId: string
  dataHora: Date
  cidade: string
}

// Datas/horários em UTC, cidades conforme FIFA.com + NBC Sports.
// Fontes cruzadas: worldcupkickofftimes.com (kickoff GMT+2 → UTC),
// fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule,
// NBC Sports, Sky Sports.
const MATA_MATA: MataMataUpdate[] = [
  // Round of 32
  { sofascoreId: 'R32-M1', dataHora: new Date('2026-06-28T19:00:00.000Z'), cidade: 'Inglewood' },         // M73  Sun 28 Jun 19:00 UTC Los Angeles Stadium
  { sofascoreId: 'R32-M2', dataHora: new Date('2026-06-29T20:30:00.000Z'), cidade: 'Foxborough' },        // M74  Mon 29 Jun 20:30 UTC Boston Stadium
  { sofascoreId: 'R32-M3', dataHora: new Date('2026-06-30T03:00:00.000Z'), cidade: 'Monterrey' },          // M75  Tue 30 Jun 03:00 UTC Estadio Monterrey
  { sofascoreId: 'R32-M4', dataHora: new Date('2026-06-29T17:00:00.000Z'), cidade: 'Houston' },            // M76  Mon 29 Jun 17:00 UTC Houston Stadium
  { sofascoreId: 'R32-M5', dataHora: new Date('2026-06-30T21:00:00.000Z'), cidade: 'East Rutherford' },  // M77  Tue 30 Jun 21:00 UTC NY/NJ Stadium (MetLife)
  { sofascoreId: 'R32-M6', dataHora: new Date('2026-06-30T17:00:00.000Z'), cidade: 'Dallas' },            // M78  Tue 30 Jun 17:00 UTC Dallas Stadium (AT&T)
  { sofascoreId: 'R32-M7', dataHora: new Date('2026-07-01T03:00:00.000Z'), cidade: 'Mexico City' },       // M79  Wed 01 Jul 03:00 UTC Mexico City Stadium (Azteca)
  { sofascoreId: 'R32-M8', dataHora: new Date('2026-07-01T16:00:00.000Z'), cidade: 'Atlanta' },           // M80  Wed 01 Jul 16:00 UTC Atlanta Stadium (Mercedes-Benz)
  { sofascoreId: 'R32-M9', dataHora: new Date('2026-07-02T00:00:00.000Z'), cidade: 'Santa Clara' },        // M81  Thu 02 Jul 00:00 UTC San Francisco Bay Area (Levi's)
  { sofascoreId: 'R32-M10', dataHora: new Date('2026-07-01T20:00:00.000Z'), cidade: 'Seattle' },          // M82  Wed 01 Jul 20:00 UTC Seattle Stadium (Lumen Field)
  { sofascoreId: 'R32-M11', dataHora: new Date('2026-07-02T23:00:00.000Z'), cidade: 'Toronto' },          // M83  Fri 02 Jul 23:00 EDT = 03:00 UTC Jul 03 Toronto Stadium
  { sofascoreId: 'R32-M12', dataHora: new Date('2026-07-02T19:00:00.000Z'), cidade: 'Miami Gardens' },     // M84  Thu 02 Jul 19:00 UTC Miami Stadium
  { sofascoreId: 'R32-M13', dataHora: new Date('2026-07-03T03:00:00.000Z'), cidade: 'Vancouver' },         // M85  Fri 03 Jul 03:00 UTC BC Place Vancouver
  { sofascoreId: 'R32-M14', dataHora: new Date('2026-07-03T22:00:00.000Z'), cidade: 'Miami Gardens' },     // M86  Fri 03 Jul 22:00 UTC Miami Stadium
  { sofascoreId: 'R32-M15', dataHora: new Date('2026-07-04T01:30:00.000Z'), cidade: 'Kansas City' },      // M87  Fri 03 Jul 21:30 EDT = 01:30 UTC Jul 04 Kansas City Stadium
  { sofascoreId: 'R32-M16', dataHora: new Date('2026-07-03T18:00:00.000Z'), cidade: 'Dallas' },            // M88  Fri 03 Jul 18:00 UTC Dallas Stadium (AT&T)
  // Round of 16
  { sofascoreId: 'R16-M1', dataHora: new Date('2026-07-04T17:00:00.000Z'), cidade: 'Philadelphia' },       // M89  Sat 04 Jul 17:00 UTC Philadelphia Stadium
  { sofascoreId: 'R16-M2', dataHora: new Date('2026-07-04T21:00:00.000Z'), cidade: 'Houston' },            // M90  Sat 04 Jul 21:00 UTC Houston Stadium
  { sofascoreId: 'R16-M3', dataHora: new Date('2026-07-05T20:00:00.000Z'), cidade: 'East Rutherford' },   // M91  Sun 05 Jul 20:00 UTC NY/NJ Stadium
  { sofascoreId: 'R16-M4', dataHora: new Date('2026-07-06T02:00:00.000Z'), cidade: 'Mexico City' },       // M92  Sun 05 Jul 22:00 EDT = 02:00 UTC Jul 06 Mexico City Stadium
  { sofascoreId: 'R16-M5', dataHora: new Date('2026-07-06T19:00:00.000Z'), cidade: 'Dallas' },            // M93  Mon 06 Jul 19:00 UTC Dallas Stadium
  { sofascoreId: 'R16-M6', dataHora: new Date('2026-07-07T00:00:00.000Z'), cidade: 'Seattle' },            // M94  Mon 06 Jul 20:00 EDT = 00:00 UTC Jul 07 Seattle Stadium
  { sofascoreId: 'R16-M7', dataHora: new Date('2026-07-07T16:00:00.000Z'), cidade: 'Kansas City' },       // M95  Tue 07 Jul 16:00 UTC Kansas City Stadium
  { sofascoreId: 'R16-M8', dataHora: new Date('2026-07-07T20:00:00.000Z'), cidade: 'Atlanta' },           // M96  Tue 07 Jul 20:00 UTC Atlanta Stadium
  // Quarter-finals
  { sofascoreId: 'QF-M1', dataHora: new Date('2026-07-09T20:00:00.000Z'), cidade: 'East Rutherford' },    // M97  Thu 09 Jul 20:00 UTC NY/NJ Stadium
  { sofascoreId: 'QF-M2', dataHora: new Date('2026-07-10T19:00:00.000Z'), cidade: 'Dallas' },             // M98  Fri 10 Jul 19:00 UTC Dallas Stadium
  { sofascoreId: 'QF-M3', dataHora: new Date('2026-07-11T21:00:00.000Z'), cidade: 'Mexico City' },        // M99  Sat 11 Jul 21:00 UTC Mexico City Stadium
  { sofascoreId: 'QF-M4', dataHora: new Date('2026-07-12T01:00:00.000Z'), cidade: 'Atlanta' },            // M100 Sun 11 Jul 21:00 EDT = 01:00 UTC Jul 12 Atlanta Stadium
  // Semi-finals
  { sofascoreId: 'SF-M1', dataHora: new Date('2026-07-14T19:00:00.000Z'), cidade: 'Dallas' },             // M101 Tue 14 Jul 19:00 UTC Dallas Stadium
  { sofascoreId: 'SF-M2', dataHora: new Date('2026-07-15T19:00:00.000Z'), cidade: 'East Rutherford' },    // M102 Wed 15 Jul 19:00 UTC NY/NJ Stadium
  // Third place
  { sofascoreId: 'TP-M1', dataHora: new Date('2026-07-18T21:00:00.000Z'), cidade: 'Miami Gardens' },      // M103 Sat 18 Jul 21:00 UTC Miami Stadium
  // Final
  { sofascoreId: 'F-M1', dataHora: new Date('2026-07-19T19:00:00.000Z'), cidade: 'East Rutherford' },     // M104 Sun 19 Jul 19:00 UTC NY/NJ Stadium
]

async function main() {
  // Snapshot: quantos palpites existem ANTES
  const palpitesAntes = await prisma.palpite.count()
  const jogosMataMataAntes = await prisma.jogo.count({
    where: {
      OR: MATA_MATA.map(j => ({ sofascoreId: j.sofascoreId })),
    },
  })
  console.log(`Palpites antes: ${palpitesAntes}`)
  console.log(`Jogos do mata-mata a atualizar: ${jogosMataMataAntes}`)

  let atualizados = 0
  let naoEncontrados = 0
  const naoEncontradosIds: string[] = []

  for (const jogo of MATA_MATA) {
    const result = await prisma.jogo.updateMany({
      where: { sofascoreId: jogo.sofascoreId },
      data: { dataHora: jogo.dataHora, cidade: jogo.cidade },
    })
    if (result.count === 0) {
      naoEncontrados++
      naoEncontradosIds.push(jogo.sofascoreId)
    } else {
      atualizados += result.count
    }
  }

  // Validação: palpites não podem ter mudado
  const palpitesDepois = await prisma.palpite.count()
  console.log(`Palpites depois: ${palpitesDepois}`)
  if (palpitesAntes !== palpitesDepois) {
    throw new Error(
      `❌ PALPITES MUDARAM! antes=${palpitesAntes} depois=${palpitesDepois}. Abortando.`,
    )
  }

  console.log(`✅ ${atualizados} jogos do mata-mata atualizados (dataHora + cidade)`)
  if (naoEncontrados > 0) {
    console.log(`⚠️  ${naoEncontrados} jogos não encontrados no DB (rode seed primeiro?):`)
    for (const id of naoEncontradosIds) console.log(`     - ${id}`)
  }
}

main()
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
