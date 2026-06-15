import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { randomUUID } from 'crypto'

const adapter = new PrismaPg(process.env.DATABASE_URL!)
const prisma = new PrismaClient({ adapter })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Variáveis de ambiente Supabase não configuradas (SUPABASE_URL, SUPABASE_SERVICE_KEY)')
}
const supabase = createClient(supabaseUrl, supabaseKey)

const FOTO_SIZE = 512
const FOTO_QUALITY = 85
const FOTO_MIN_SIZE = 100
const BUCKET = 'fotos'

const isDryRun = process.argv.includes('--dry-run')

function extractStoragePath(url: string): string {
  const marker = `/${BUCKET}/`
  const idx = url.indexOf(marker)
  return idx === -1 ? url : url.slice(idx + marker.length)
}

async function main() {
  console.log(isDryRun ? '=== DRY RUN — nenhuma alteração será persistida ===' : '=== NORMALIZE PHOTOS ===')

  const participantes = await prisma.participante.findMany({
    where: { fotoUrl: { not: null } },
    select: { id: true, nome: true, fotoUrl: true },
  })

  console.log(`Encontrados ${participantes.length} participantes com foto\n`)

  let success = 0
  let skipped = 0
  let errors = 0
  const errorList: string[] = []

  for (const p of participantes) {
    if (!p.fotoUrl) continue
    const shortName = p.nome.length > 30 ? p.nome.slice(0, 27) + '...' : p.nome

    try {
      const response = await fetch(p.fotoUrl)
      if (!response.ok) throw new Error(`HTTP ${response.status} ao baixar`)
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const oldSize = buffer.length

      const metadata = await sharp(buffer).metadata()
      if ((metadata.width ?? 0) < FOTO_MIN_SIZE || (metadata.height ?? 0) < FOTO_MIN_SIZE) {
        throw new Error(`Dimensões ${metadata.width}x${metadata.height} abaixo do mínimo ${FOTO_MIN_SIZE}x${FOTO_MIN_SIZE}`)
      }

      if (metadata.format === 'webp' && metadata.width === FOTO_SIZE && metadata.height === FOTO_SIZE) {
        console.log(`  ⏭ ${shortName}: já normalizado (WebP ${FOTO_SIZE}x${FOTO_SIZE})`)
        skipped++
        continue
      }

      const processed = await sharp(buffer)
        .resize(FOTO_SIZE, FOTO_SIZE, { fit: 'cover', position: 'center' })
        .webp({ quality: FOTO_QUALITY })
        .toBuffer()
      const newSize = processed.length

      if (isDryRun) {
        console.log(`  ✓ ${shortName}: ${metadata.format} ${metadata.width}x${metadata.height} (${(oldSize / 1024).toFixed(1)}KB) → WebP ${FOTO_SIZE}x${FOTO_SIZE} (${(newSize / 1024).toFixed(1)}KB)`)
        success++
        continue
      }

      const oldPath = extractStoragePath(p.fotoUrl)
      const newPath = `participantes/${Date.now()}-${randomUUID()}.webp`

      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(newPath, processed, {
        contentType: 'image/webp',
        upsert: false,
      })
      if (uploadError) throw new Error(`Upload: ${uploadError.message}`)

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(newPath)
      const newUrl = urlData.publicUrl

      await prisma.participante.update({
        where: { id: p.id },
        data: { fotoUrl: newUrl },
      })

      try {
        await supabase.storage.from(BUCKET).remove([oldPath])
      } catch { /* ignore delete errors */ }

      console.log(`  ✓ ${shortName}: ${metadata.format} ${metadata.width}x${metadata.height} (${(oldSize / 1024).toFixed(1)}KB) → WebP ${FOTO_SIZE}x${FOTO_SIZE} (${(newSize / 1024).toFixed(1)}KB)`)
      success++
    } catch (err) {
      errors++
      const msg = err instanceof Error ? err.message : String(err)
      errorList.push(`${p.nome}: ${msg}`)
      console.error(`  ✗ ${shortName}: ${msg}`)
    }
  }

  console.log('\n=== RESUMO ===')
  console.log(`Sucesso: ${success}`)
  console.log(`Pulados (já normalizados): ${skipped}`)
  console.log(`Erros: ${errors}`)
  if (errorList.length > 0) {
    console.log('\nErros detalhados:')
    errorList.forEach(e => console.log(`  - ${e}`))
  }
  if (isDryRun) {
    console.log('\n(DRY RUN — nada foi alterado. Rode sem --dry-run para aplicar)')
  }
}

main()
  .catch((err) => {
    console.error('Erro fatal:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
