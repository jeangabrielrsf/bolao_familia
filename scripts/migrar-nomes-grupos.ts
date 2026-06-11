import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg(process.env.DATABASE_URL!)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Buscando grupos de palpites com nome "completo-*"...')

  const grupos = await prisma.palpiteGrupo.findMany({
    where: {
      nome: {
        startsWith: 'completo-',
      },
    },
    include: {
      participante: true,
    },
  })

  console.log(`Encontrados ${grupos.length} grupos para atualizar`)

  let atualizados = 0
  let erros = 0

  for (const grupo of grupos) {
    try {
      await prisma.palpiteGrupo.update({
        where: { id: grupo.id },
        data: {
          nome: grupo.participante.nome,
        },
      })
      atualizados++
      console.log(`✓ ${grupo.id}: "${grupo.nome}" → "${grupo.participante.nome}"`)
    } catch (err) {
      erros++
      console.error(` Erro ao atualizar ${grupo.id}:`, err)
    }
  }

  console.log('\n=== RESUMO ===')
  console.log(`Atualizados: ${atualizados}`)
  console.log(`Erros: ${erros}`)
  console.log(`Total processado: ${atualizados + erros}`)
}

main()
  .catch((err) => {
    console.error('Erro ao executar migração:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
