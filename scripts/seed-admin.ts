import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { hashPassword } from '../src/lib/auth/password'

const adapter = new PrismaPg(process.env.DATABASE_URL!)
const prisma = new PrismaClient({ adapter })

async function main() {
  const senha = process.env.ADMIN_PASSWORD
  if (!senha) {
    console.error('ADMIN_PASSWORD não definida no .env')
    process.exit(1)
  }

  const senhaHash = await hashPassword(senha)

  await prisma.adminAuth.upsert({
    where: { id: 'admin-unico' },
    update: { senhaHash },
    create: { id: 'admin-unico', senhaHash },
  })

  console.log('Senha do admin configurada com sucesso')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
