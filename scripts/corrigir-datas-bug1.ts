/**
 * scripts/corrigir-datas-bug1.ts
 *
 * Correção one-off do Bug 1: 2 jogos do seed com `dataHora` UTC off-by-1-day.
 *
 * Causa raiz: autor escreveu data BRT no campo UTC e esqueceu de ajustar fuso.
 * Afetados: França x Iraque (Grupo I) e Noruega x Senegal (Grupo I).
 *
 * - Idempotente: rodar 2x = no-op (segundo updateMany encontra 0 rows).
 * - Não toca em palpites (palpites.jogoId é FK pra Jogo.id, não pra dataHora).
 * - Imprime audit log + salva tmp/audit_datas_bug1.csv.
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/corrigir-datas-bug1.ts
 *   DATABASE_URL=postgresql://postgres:test@localhost:5433/bolao_test \
 *     npx tsx scripts/corrigir-datas-bug1.ts
 */
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { writeFileSync, mkdirSync } from 'node:fs'

const adapter = new PrismaPg(process.env.DATABASE_URL!)
const prisma = new PrismaClient({ adapter })

const CORRECOES: Array<{
  grupo: string
  timeA: string
  timeB: string
  dataHoraUTC: string
  motivo: string
}> = [
  {
    grupo: 'I',
    timeA: 'França',
    timeB: 'Iraque',
    dataHoraUTC: '2026-06-22T21:00:00.000Z',
    motivo: 'Estava 2026-06-21T21:00:00Z (= 18:00 BRT 21/06). FIFA: 18:00 BRT 22/06.',
  },
  {
    grupo: 'I',
    timeA: 'Noruega',
    timeB: 'Senegal',
    dataHoraUTC: '2026-06-23T00:00:00.000Z',
    motivo: 'Estava 2026-06-22T00:00:00Z (= 21:00 BRT 21/06). FIFA: 21:00 BRT 22/06.',
  },
]

async function main() {
  console.log('=== Correção Bug 1: datas off-by-1-day no seed ===\n')

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não definida. Use --env-file=.env ou export.')
  }

  const palpites_antes = await prisma.palpite.count()
  const jogos_antes = await prisma.jogo.count({ where: { fase: 'grupos' } })
  console.log(
    `Estado inicial: ${jogos_antes} jogos de grupos, ${palpites_antes} palpites no DB`,
  )
  console.log()

  const auditRows: string[] = [
    'jogoId,timeA,timeB,grupo,dataHoraAntes,dataHoraDepois,mudou,motivo',
  ]

  let totalAtualizados = 0

  for (const c of CORRECOES) {
    const dataHoraNova = new Date(c.dataHoraUTC)

    const jogosExistentes = await prisma.jogo.findMany({
      where: { timeA: c.timeA, timeB: c.timeB, grupo: c.grupo },
      select: { id: true, dataHora: true, fase: true, timeA: true, timeB: true },
    })

    if (jogosExistentes.length === 0) {
      console.log(`✗ NÃO ENCONTRADO: ${c.timeA} vs ${c.timeB} (Grupo ${c.grupo})`)
      auditRows.push(
        `,${c.timeA},${c.timeB},${c.grupo},,${c.dataHoraUTC},NAO_ENCONTRADO,${c.motivo}`,
      )
      continue
    }

    for (const jogo of jogosExistentes) {
      const mesmo = jogo.dataHora.getTime() === dataHoraNova.getTime()
      if (mesmo) {
        console.log(
          `= ${c.timeA} vs ${c.timeB} já está com a data correta (${c.dataHoraUTC})`,
        )
        auditRows.push(
          `${jogo.id},${c.timeA},${c.timeB},${c.grupo},${jogo.dataHora.toISOString()},${dataHoraNova.toISOString()},NAO,${c.motivo}`,
        )
        continue
      }

      const dataHoraAntes = jogo.dataHora
      const atualizado = await prisma.jogo.update({
        where: { id: jogo.id },
        data: { dataHora: dataHoraNova },
        select: { id: true, dataHora: true },
      })

      totalAtualizados++
      console.log(
        `✓ ${c.timeA} vs ${c.timeB} (Grupo ${c.grupo}) | ${dataHoraAntes.toISOString()} → ${atualizado.dataHora.toISOString()}`,
      )
      auditRows.push(
        `${jogo.id},${c.timeA},${c.timeB},${c.grupo},${dataHoraAntes.toISOString()},${atualizado.dataHora.toISOString()},SIM,${c.motivo}`,
      )
    }
  }

  const palpites_depois = await prisma.palpite.count()
  const jogos_depois = await prisma.jogo.count({ where: { fase: 'grupos' } })

  console.log('\n=== Resumo ===')
  console.log(`Jogos de grupos:  ${jogos_antes} → ${jogos_depois}`)
  console.log(`Palpites no DB:   ${palpites_antes} → ${palpites_depois}`)
  console.log(`Jogos corrigidos: ${totalAtualizados}`)

  if (palpites_antes !== palpites_depois) {
    throw new Error(
      `INCONSISTÊNCIA: palpites mudou (${palpites_antes} → ${palpites_depois}). Abortar.`,
    )
  }

  mkdirSync('tmp', { recursive: true })
  const csvPath = 'tmp/audit_datas_bug1.csv'
  writeFileSync(csvPath, auditRows.join('\n') + '\n')
  console.log(`\nAudit log: ${csvPath}`)
  console.log('\n✓ Concluído com sucesso.')
}

main()
  .catch((err) => {
    console.error('Erro ao corrigir datas:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
