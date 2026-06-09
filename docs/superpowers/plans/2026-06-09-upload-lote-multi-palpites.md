# Upload em Lote com Múltiplos Palpites — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir upload de planilha Excel com múltiplas abas (vários participantes/palpites de uma vez), criando a entidade `PalpiteGrupo` para suportar múltiplos palpites independentes por participante.

**Architecture:** Nova tabela `palpites_grupos` como entidade intermediária entre `Participante` e `Palpite`/`PalpiteExtra`. Parser multi-abas (`parseExcelMultiSheet`) extrai dados de cada aba ignorando "Modelo". Duas rotas API novas (`/api/upload/lote` e `/api/admin/upload/confirm-lote`). Ranking passa a listar grupos individualmente. Frontend admin ganha seletor de modo (individual vs lote) e prévia com tabs.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma 7.8, PostgreSQL (Supabase), xlsx, Tailwind CSS 4, Radix UI, Jest 30

**Spec:** `docs/superpowers/specs/2026-06-09-upload-lote-multi-palpites-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/lib/services/upload/__tests__/excel-parser-multi-sheet.test.ts` | Testes do parser multi-abas |
| `src/app/api/upload/lote/route.ts` | API upload em lote (parse + preview) |
| `src/app/api/admin/upload/confirm-lote/route.ts` | API confirmação em lote (persistência) |
| `src/components/admin/BatchPreviewTabs.tsx` | Tabs de prévia para upload em lote |
| `src/components/admin/UploadModeSelector.tsx` | Seletor de modo (individual vs lote) |

### Modified Files
| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Nova tabela PalpiteGrupo, alterar Palpite/PalpiteExtra/Participante |
| `src/lib/utils/types.ts` | Novos tipos (PalpiteGrupoParsed, RankingEntry atualizado) |
| `src/lib/services/upload/excel-parser.ts` | Adicionar `parseExcelMultiSheet` |
| `src/lib/db/queries/ranking.ts` | Buscar PalpiteGrupo ao invés de Participante |
| `src/lib/db/queries/participantes.ts` | Incluir grupos nas queries |
| `src/lib/db/queries/jogos.ts` | Incluir palpiteGrupo nos palpites |
| `src/app/api/admin/upload/confirm/route.ts` | Usar PalpiteGrupo ao invés de participanteId direto |
| `src/app/admin/upload/page.tsx` | Seletor de modo + fluxo lote |
| `src/components/public/RankingTable.tsx` | Usar novo RankingEntry (nomeGrupo, apelido) |
| `src/components/public/ranking-podium.tsx` | Usar novo RankingEntry |
| `src/components/public/ParticipantCard.tsx` | Mostrar contagem de palpites |
| `src/app/(public)/ranking/page.tsx` | Ajustar stats para novo RankingEntry |
| `src/app/(public)/participantes/page.tsx` | Passar contagem de palpites |
| `src/app/(public)/participantes/[id]/page.tsx` | Tabs por grupo de palpite |
| `src/app/(public)/jogos/page.tsx` | Agrupar palpites por participante |

---

### Task 1: Schema Prisma + Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Atualizar schema.prisma**

Replace the entire file content with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

enum Fase {
  grupos
  oitavas
  quartas
  semifinal
  terceiro
  final
}

enum StatusJogo {
  agendado
  em_andamento
  finalizado
}

enum Fonte {
  excel
  foto
  pdf
}

enum TipoExtra {
  artilheiro
  campeao
  vice
  terceiro
  quarto
}

enum StatusUpload {
  sucesso
  falha
  pendente_revisao
}

model Participante {
  id          String   @id @default(uuid())
  nome        String   @unique
  fotoUrl     String?  @map("foto_url")
  criadoEm    DateTime @default(now()) @map("criado_em")
  atualizadoEm DateTime @updatedAt @map("atualizado_em")

  grupos      PalpiteGrupo[]
  uploads     UploadLog[]

  @@map("participantes")
}

model Jogo {
  id          String    @id @default(uuid())
  grupo       String?
  fase        Fase      @default(grupos)
  dataHora    DateTime  @map("data_hora")
  timeA       String    @map("time_a")
  timeB       String    @map("time_b")
  resultadoA  Int?      @map("resultado_a")
  resultadoB  Int?      @map("resultado_b")
  status      StatusJogo @default(agendado)
  sofascoreId String?   @map("sofascore_id")
  criadoEm    DateTime  @default(now()) @map("criado_em")

  palpites    Palpite[]

  @@map("jogos")
}

model PalpiteGrupo {
  id              String   @id @default(uuid())
  participanteId  String   @map("participante_id")
  nome            String
  apelido         String
  fonte           Fonte    @default(excel)
  criadoEm        DateTime @default(now()) @map("criado_em")

  participante    Participante @relation(fields: [participanteId], references: [id], onDelete: Cascade)
  palpites        Palpite[]
  extras          PalpiteExtra[]

  @@unique([participanteId, nome])
  @@map("palpites_grupos")
}

model Palpite {
  id              String      @id @default(uuid())
  palpiteGrupoId  String      @map("palpite_grupo_id")
  jogoId          String      @map("jogo_id")
  placarA         Int         @map("placar_a")
  placarB         Int         @map("placar_b")
  fonte           Fonte       @default(excel)
  criadoEm        DateTime    @default(now()) @map("criado_em")

  palpiteGrupo    PalpiteGrupo @relation(fields: [palpiteGrupoId], references: [id], onDelete: Cascade)
  jogo            Jogo         @relation(fields: [jogoId], references: [id])

  @@unique([palpiteGrupoId, jogoId])
  @@map("palpites")
}

model PalpiteExtra {
  id              String    @id @default(uuid())
  palpiteGrupoId  String    @map("palpite_grupo_id")
  tipo            TipoExtra
  valor           String
  fonte           Fonte     @default(excel)
  criadoEm        DateTime  @default(now()) @map("criado_em")

  palpiteGrupo    PalpiteGrupo @relation(fields: [palpiteGrupoId], references: [id], onDelete: Cascade)

  @@unique([palpiteGrupoId, tipo])
  @@map("palpites_extras")
}

model ResultadoExtra {
  id      String    @id @default(uuid())
  tipo    TipoExtra @unique
  valor   String

  @@map("resultados_extras")
}

model UploadLog {
  id              String      @id @default(uuid())
  participanteId  String      @map("participante_id")
  tipoArquivo     String      @map("tipo_arquivo")
  arquivoUrl      String      @map("arquivo_url")
  status          StatusUpload @default(sucesso)
  erro            String?
  criadoEm        DateTime    @default(now()) @map("criado_em")

  participante    Participante @relation(fields: [participanteId], references: [id])

  @@map("upload_logs")
}

model Configuracao {
  id      String @id @default(uuid())
  chave   String @unique
  valor   String
  descricao String?

  @@map("configuracoes")
}

model AdminAuth {
  id         String @id @default(uuid())
  senhaHash  String @map("senha_hash")

  @@map("admin_auth")
}
```

- [ ] **Step 2: Criar migration com dados**

Run: `npx prisma migrate dev --create-only --name add-palpite-grupo`

This creates the migration SQL file. Then edit the generated file at `prisma/migrations/YYYYMMDDHHMMSS_add_palpite_grupo/migration.sql` and **replace its entire content** with:

```sql
-- Criar tabela palpites_grupos
CREATE TABLE "palpites_grupos" (
    "id" TEXT NOT NULL,
    "participante_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "apelido" TEXT NOT NULL,
    "fonte" TEXT NOT NULL DEFAULT 'excel',
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "palpites_grupos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "palpites_grupos_participante_id_nome_key" ON "palpites_grupos"("participante_id", "nome");

-- Adicionar FK para participantes
ALTER TABLE "palpites_grupos" ADD CONSTRAINT "palpites_grupos_participante_id_fkey" FOREIGN KEY ("participante_id") REFERENCES "participantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Adicionar coluna palpite_grupo_id (nullable inicialmente para migração)
ALTER TABLE "palpites" ADD COLUMN "palpite_grupo_id" TEXT;
ALTER TABLE "palpites_extras" ADD COLUMN "palpite_grupo_id" TEXT;

-- Migrar dados existentes: criar um grupo por participante que tem palpites
INSERT INTO "palpites_grupos" ("id", "participante_id", "nome", "apelido", "fonte")
SELECT
    gen_random_uuid()::text,
    p.id,
    p.nome,
    'Palpite 1',
    COALESCE(
        (SELECT p2.fonte FROM "palpites" p2 WHERE p2.participante_id = p.id LIMIT 1),
        'excel'
    )
FROM "participantes" p
WHERE EXISTS (SELECT 1 FROM "palpites" WHERE "participante_id" = p.id)
   OR EXISTS (SELECT 1 FROM "palpites_extras" WHERE "participante_id" = p.id);

-- Vincular palpites existentes aos grupos
UPDATE "palpites" SET "palpite_grupo_id" = pg.id
FROM "palpites_grupos" pg WHERE pg.participante_id = "palpites".participante_id;

-- Vincular extras existentes aos grupos
UPDATE "palpites_extras" SET "palpite_grupo_id" = pg.id
FROM "palpites_grupos" pg WHERE pg.participante_id = "palpites_extras".participante_id;

-- Tornar palpite_grupo_id NOT NULL
ALTER TABLE "palpites" ALTER COLUMN "palpite_grupo_id" SET NOT NULL;
ALTER TABLE "palpites_extras" ALTER COLUMN "palpite_grupo_id" SET NOT NULL;

-- Remover constraints antigas
ALTER TABLE "palpites" DROP CONSTRAINT IF EXISTS "palpites_participante_id_jogo_id_key";
ALTER TABLE "palpites_extras" DROP CONSTRAINT IF EXISTS "palpites_extras_participante_id_tipo_key";

-- Remover coluna participante_id
ALTER TABLE "palpites" DROP COLUMN "participante_id";
ALTER TABLE "palpites_extras" DROP COLUMN "participante_id";

-- Criar novas unique constraints
CREATE UNIQUE INDEX "palpites_palpite_grupo_id_jogo_id_key" ON "palpites"("palpite_grupo_id", "jogo_id");
CREATE UNIQUE INDEX "palpites_extras_palpite_grupo_id_tipo_key" ON "palpites_extras"("palpite_grupo_id", "tipo");

-- Criar FKs
ALTER TABLE "palpites" ADD CONSTRAINT "palpites_palpite_grupo_id_fkey" FOREIGN KEY ("palpite_grupo_id") REFERENCES "palpites_grupos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "palpites_extras" ADD CONSTRAINT "palpites_extras_palpite_grupo_id_fkey" FOREIGN KEY ("palpite_grupo_id") REFERENCES "palpites_grupos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 3: Aplicar migration**

Run: `npx prisma migrate dev`
Expected: Migration applied successfully

- [ ] **Step 4: Regenerate Prisma Client**

Run: `npx prisma generate`
Expected: Generated Prisma Client

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add PalpiteGrupo model and migrate schema"
```

---

### Task 2: Tipos para Batch Upload

**Files:**
- Modify: `src/lib/utils/types.ts`

- [ ] **Step 1: Atualizar types.ts**

Replace the entire file with:

```typescript
export interface PalpiteDTO {
  jogoId: string
  placarA: number
  placarB: number
}

export interface PalpiteOCR {
  timeA: string
  timeB: string
  placarA: number
  placarB: number
}

export interface PalpiteExtraDTO {
  tipo: 'artilheiro' | 'campeao' | 'vice' | 'terceiro' | 'quarto'
  valor: string
}

export interface UploadResult {
  palpites: PalpiteDTO[]
  extras: PalpiteExtraDTO[]
  fonte: 'excel' | 'foto' | 'pdf'
}

export interface UploadResultOCR {
  palpites: PalpiteOCR[]
  extras: PalpiteExtraDTO[]
  fonte: 'foto' | 'pdf'
}

export interface ValidationResult {
  valido: boolean
  erros: string[]
  alertas: string[]
}

export interface RankingEntry {
  palpiteGrupoId: string
  participanteId: string
  nomeParticipante: string
  nomeGrupo: string
  apelido: string
  fotoUrl: string | null
  pontos: number
  placaresExatos: number
  vencedoresCorretos: number
}

export interface ResultadoJogo {
  jogoId: string
  resultadoA: number
  resultadoB: number
}

export interface ConfiguracaoPontuacao {
  placarExato: number
  vencedorCorreto: number
  campeao: number
  vice: number
  terceiro: number
  quarto: number
  artilheiro: number
}

export interface PalpiteGrupoParsed {
  nomeParticipante: string
  apelido: string
  nomeCompleto: string
  palpites: PalpiteDTO[]
  extras: PalpiteExtraDTO[]
}

export interface BatchGrupoPreview {
  nomeParticipante: string
  apelido: string
  nomeCompleto: string
  participanteId: string | null
  palpites: PalpiteDTO[]
  extras: PalpiteExtraDTO[]
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/utils/types.ts
git commit -m "feat: add batch upload types and update RankingEntry"
```

---

### Task 3: Parser Multi-Abas (TDD)

**Files:**
- Create: `src/lib/services/upload/__tests__/excel-parser-multi-sheet.test.ts`
- Modify: `src/lib/services/upload/excel-parser.ts`

- [ ] **Step 1: Escrever testes para parseExcelMultiSheet**

Create `src/lib/services/upload/__tests__/excel-parser-multi-sheet.test.ts`:

```typescript
import * as XLSX from 'xlsx'
import { parseExcelMultiSheet } from '../excel-parser'

function createMultiSheetExcel(
  sheets: Array<{
    name: string
    jogos: Array<{ placarA: number; placarB: number }>
    extras: Record<string, string>
  }>
): Buffer {
  const wb = XLSX.utils.book_new()

  for (const sheet of sheets) {
    const data: Array<Array<string | number | undefined>> = []
    for (let i = 0; i < 50; i++) {
      data.push([undefined, undefined, undefined, undefined, undefined, undefined])
    }

    const gameRows = [
      5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
      27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
    ]

    for (let i = 0; i < gameRows.length; i++) {
      const row = gameRows[i]
      data[row][3] = 'x'
      if (sheet.jogos[i]) {
        data[row][2] = sheet.jogos[i].placarA
        data[row][4] = sheet.jogos[i].placarB
      }
    }

    const extraRows: Array<[number, string]> = [
      [42, 'artilheiro'],
      [43, 'quarto'],
      [44, 'terceiro'],
      [45, 'vice'],
      [46, 'campeao'],
    ]
    for (const [row, tipo] of extraRows) {
      if (sheet.extras[tipo]) {
        data[row][2] = sheet.extras[tipo]
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, sheet.name)
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return Buffer.from(buf)
}

function makeJogosIds(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `jogo-id-${i + 1}`)
}

const defaultExtras = {
  artilheiro: 'Mbappé',
  quarto: 'Canadá',
  terceiro: 'Brasil',
  vice: 'Argentina',
  campeao: 'França',
}

const defaultJogos = Array.from({ length: 33 }, (_, i) => ({
  placarA: i + 1,
  placarB: (i + 1) * 2,
}))

describe('parseExcelMultiSheet', () => {
  it('parses multiple sheets, skipping "Modelo"', () => {
    const buffer = createMultiSheetExcel([
      { name: 'Modelo', jogos: defaultJogos, extras: defaultExtras },
      { name: 'Leo', jogos: defaultJogos, extras: defaultExtras },
      { name: 'Maria', jogos: defaultJogos, extras: defaultExtras },
    ])

    const result = parseExcelMultiSheet(buffer, makeJogosIds(33))

    expect(result).toHaveLength(2)
    expect(result[0].nomeParticipante).toBe('Leo')
    expect(result[0].apelido).toBe('Palpite 1')
    expect(result[0].nomeCompleto).toBe('Leo')
    expect(result[1].nomeParticipante).toBe('Maria')
  })

  it('detects suffix "1" as "Palpite 1"', () => {
    const buffer = createMultiSheetExcel([
      { name: 'Leo 1', jogos: defaultJogos, extras: defaultExtras },
    ])

    const result = parseExcelMultiSheet(buffer, makeJogosIds(33))

    expect(result).toHaveLength(1)
    expect(result[0].nomeParticipante).toBe('Leo')
    expect(result[0].apelido).toBe('Palpite 1')
    expect(result[0].nomeCompleto).toBe('Leo - Palpite 1')
  })

  it('detects suffix "(2)" as "Palpite 2"', () => {
    const buffer = createMultiSheetExcel([
      { name: 'Leo (2)', jogos: defaultJogos, extras: defaultExtras },
    ])

    const result = parseExcelMultiSheet(buffer, makeJogosIds(33))

    expect(result).toHaveLength(1)
    expect(result[0].nomeParticipante).toBe('Leo')
    expect(result[0].apelido).toBe('Palpite 2')
    expect(result[0].nomeCompleto).toBe('Leo - Palpite 2')
  })

  it('detects suffix "- Palpite 3" as "Palpite 3"', () => {
    const buffer = createMultiSheetExcel([
      { name: 'João - Palpite 3', jogos: defaultJogos, extras: defaultExtras },
    ])

    const result = parseExcelMultiSheet(buffer, makeJogosIds(33))

    expect(result).toHaveLength(1)
    expect(result[0].nomeParticipante).toBe('João')
    expect(result[0].apelido).toBe('Palpite 3')
    expect(result[0].nomeCompleto).toBe('João - Palpite 3')
  })

  it('extracts 33 palpites and 5 extras from each sheet', () => {
    const buffer = createMultiSheetExcel([
      { name: 'Leo', jogos: defaultJogos, extras: defaultExtras },
      { name: 'Maria', jogos: defaultJogos, extras: defaultExtras },
    ])

    const result = parseExcelMultiSheet(buffer, makeJogosIds(33))

    for (const grupo of result) {
      expect(grupo.palpites).toHaveLength(33)
      expect(grupo.extras).toHaveLength(5)
      expect(grupo.palpites[0]).toEqual({ jogoId: 'jogo-id-1', placarA: 1, placarB: 2 })
      expect(grupo.extras[0]).toEqual({ tipo: 'artilheiro', valor: 'Mbappé' })
    }
  })

  it('handles sheet without suffix as single palpite', () => {
    const buffer = createMultiSheetExcel([
      { name: 'Maria', jogos: defaultJogos, extras: defaultExtras },
    ])

    const result = parseExcelMultiSheet(buffer, makeJogosIds(33))

    expect(result).toHaveLength(1)
    expect(result[0].nomeParticipante).toBe('Maria')
    expect(result[0].apelido).toBe('Palpite 1')
    expect(result[0].nomeCompleto).toBe('Maria')
  })

  it('throws for empty workbook', () => {
    const wb = XLSX.utils.book_new()
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    expect(() => parseExcelMultiSheet(Buffer.from(buf), makeJogosIds(33))).toThrow('Planilha vazia')
  })

  it('is case-insensitive for "Modelo" filter', () => {
    const buffer = createMultiSheetExcel([
      { name: 'modelo', jogos: defaultJogos, extras: defaultExtras },
      { name: 'MODELO', jogos: defaultJogos, extras: defaultExtras },
      { name: 'Leo', jogos: defaultJogos, extras: defaultExtras },
    ])

    const result = parseExcelMultiSheet(buffer, makeJogosIds(33))

    expect(result).toHaveLength(1)
    expect(result[0].nomeParticipante).toBe('Leo')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/lib/services/upload/__tests__/excel-parser-multi-sheet.test.ts --no-coverage`
Expected: FAIL — `parseExcelMultiSheet` is not defined

- [ ] **Step 3: Implementar parseExcelMultiSheet**

Add to the end of `src/lib/services/upload/excel-parser.ts`:

```typescript
import type { PalpiteGrupoParsed } from '@/lib/utils/types'

const SUFIXO_REGEX = /^(.+?)\s*(?:[-–—]\s*(?:Palpite\s*)?\d+|\(\d+\)|\d+)$/i

function extrairNomeEApelido(nomeAba: string): { nomeParticipante: string; apelido: string; nomeCompleto: string } {
  const match = nomeAba.match(SUFIXO_REGEX)
  if (match) {
    const nomeBase = match[1].trim()
    const sufixo = nomeAba.slice(match[1].length).trim()
    let numero = sufixo.replace(/^[(-–—\s]+/, '').replace(/[)\s]+$/, '').replace(/^palpite\s*/i, '').trim()
    if (!numero) numero = '1'
    const apelido = `Palpite ${numero}`
    return {
      nomeParticipante: nomeBase,
      apelido,
      nomeCompleto: `${nomeBase} - ${apelido}`,
    }
  }
  return {
    nomeParticipante: nomeAba.trim(),
    apelido: 'Palpite 1',
    nomeCompleto: nomeAba.trim(),
  }
}

function parseSheet(sheet: XLSX.WorkSheet, jogosIds: string[]): { palpites: PalpiteDTO[]; extras: PalpiteExtraDTO[] } {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')

  const gameRows: number[] = []
  for (let r = 0; r <= range.e.r; r++) {
    const cell = sheet[XLSX.utils.encode_cell({ r, c: 3 })]
    if (cell?.v != null && String(cell.v).toLowerCase() === 'x') {
      gameRows.push(r)
    }
  }

  const palpites: PalpiteDTO[] = []
  const count = Math.min(gameRows.length, jogosIds.length)
  for (let i = 0; i < count; i++) {
    const row = gameRows[i]
    const placarACell = sheet[XLSX.utils.encode_cell({ r: row, c: 2 })]
    const placarBCell = sheet[XLSX.utils.encode_cell({ r: row, c: 4 })]

    if (placarACell?.v === undefined || placarBCell?.v === undefined) {
      throw new Error(`Palpite em branco no jogo ${i + 1}`)
    }

    const placarA = Number(placarACell.v)
    const placarB = Number(placarBCell.v)

    if (!Number.isInteger(placarA) || placarA < 0) {
      throw new Error(`Placar inválido no jogo ${i + 1}`)
    }
    if (!Number.isInteger(placarB) || placarB < 0) {
      throw new Error(`Placar inválido no jogo ${i + 1}`)
    }

    palpites.push({ jogoId: jogosIds[i], placarA, placarB })
  }

  const tiposExtra = ['artilheiro', 'quarto', 'terceiro', 'vice', 'campeao'] as const
  const extras: PalpiteExtraDTO[] = []
  for (let i = 0; i < 5; i++) {
    const row = 42 + i
    const cell = sheet[XLSX.utils.encode_cell({ r: row, c: 2 })]

    if (cell?.v == null || cell.v === '') {
      throw new Error(`Extra '${tiposExtra[i]}' em branco`)
    }

    extras.push({ tipo: tiposExtra[i], valor: String(cell.v).trim() })
  }

  return { palpites, extras }
}

export function parseExcelMultiSheet(buffer: Buffer, jogosIds: string[]): PalpiteGrupoParsed[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' })

  if (!workbook.SheetNames.length) {
    throw new Error('Planilha vazia')
  }

  const resultados: PalpiteGrupoParsed[] = []

  for (const sheetName of workbook.SheetNames) {
    if (sheetName.toLowerCase() === 'modelo') continue

    const sheet = workbook.Sheets[sheetName]
    if (!sheet) continue

    const { nomeParticipante, apelido, nomeCompleto } = extrairNomeEApelido(sheetName)
    const { palpites, extras } = parseSheet(sheet, jogosIds)

    resultados.push({
      nomeParticipante,
      apelido,
      nomeCompleto,
      palpites,
      extras,
    })
  }

  return resultados
}
```

Also add the necessary import at the top of the file. The imports section should be:

```typescript
import * as XLSX from 'xlsx'
import type { UploadResult, PalpiteDTO, PalpiteExtraDTO, PalpiteGrupoParsed } from '@/lib/utils/types'
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/lib/services/upload/__tests__/excel-parser-multi-sheet.test.ts --no-coverage`
Expected: All 8 tests PASS

- [ ] **Step 5: Run existing tests to verify no regression**

Run: `npx jest src/lib/services/upload/__tests__/excel-parser.test.ts --no-coverage`
Expected: All 8 existing tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/upload/excel-parser.ts src/lib/services/upload/__tests__/excel-parser-multi-sheet.test.ts
git commit -m "feat: add parseExcelMultiSheet for multi-tab Excel parsing"
```

---

### Task 4: API Upload em Lote

**Files:**
- Create: `src/app/api/upload/lote/route.ts`

- [ ] **Step 1: Criar rota POST /api/upload/lote**

Create `src/app/api/upload/lote/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { getTodosJogos } from '@/lib/db/queries/jogos'
import { parseExcelMultiSheet } from '@/lib/services/upload/excel-parser'
import { validateUpload } from '@/lib/services/upload/validator'
import { prisma } from '@/lib/db/client'
import type { BatchGrupoPreview } from '@/lib/utils/types'

const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const MAX_FILE_SIZE = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Arquivo ausente' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Arquivo muito grande (máximo 10MB)' }, { status: 413 })
    }

    if (file.type !== EXCEL_MIME) {
      return NextResponse.json({ error: 'Upload em lote suporta apenas .xlsx' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const jogos = await getTodosJogos()
    const jogosIds = jogos.map((j) => j.id)
    const timesJogos = jogos.map((j) => ({ timeA: j.timeA, timeB: j.timeB }))

    const grupos = parseExcelMultiSheet(buffer, jogosIds)

    if (grupos.length === 0) {
      return NextResponse.json({ error: 'Nenhuma aba de participante encontrada na planilha' }, { status: 400 })
    }

    const participantesExistentes = await prisma.participante.findMany({ select: { id: true, nome: true } })
    const participantesMap = new Map(participantesExistentes.map(p => [p.nome.toLowerCase(), p.id]))

    const preview: BatchGrupoPreview[] = grupos.map(grupo => ({
      nomeParticipante: grupo.nomeParticipante,
      apelido: grupo.apelido,
      nomeCompleto: grupo.nomeCompleto,
      participanteId: participantesMap.get(grupo.nomeParticipante.toLowerCase()) ?? null,
      palpites: grupo.palpites,
      extras: grupo.extras,
    }))

    const todosErros: string[] = []
    const todosAlertas: string[] = []
    for (const grupo of grupos) {
      const uploadResult = { palpites: grupo.palpites, extras: grupo.extras, fonte: 'excel' as const }
      const validacao = validateUpload(uploadResult, timesJogos)
      todosErros.push(...validacao.erros.map(e => `[${grupo.nomeCompleto}] ${e}`))
      todosAlertas.push(...validacao.alertas.map(a => `[${grupo.nomeCompleto}] ${a}`))
    }

    const novosParticipantes = new Set(
      preview.filter(g => g.participanteId === null).map(g => g.nomeParticipante)
    )

    return NextResponse.json({
      grupos: preview,
      validacao: {
        valido: todosErros.length === 0,
        erros: todosErros,
        alertas: todosAlertas,
      },
      resumo: {
        totalGrupos: preview.length,
        participantesExistentes: preview.length - novosParticipantes.size,
        novosParticipantes: novosParticipantes.size,
      },
    })
  } catch (error) {
    console.error('[upload-lote] Erro:', error)
    const message = error instanceof Error ? error.message : 'Erro interno do servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/upload/lote/route.ts
git commit -m "feat: add batch upload API endpoint"
```

---

### Task 5: API Confirmação em Lote

**Files:**
- Create: `src/app/api/admin/upload/confirm-lote/route.ts`

- [ ] **Step 1: Criar rota POST /api/admin/upload/confirm-lote**

Create `src/app/api/admin/upload/confirm-lote/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'

interface GrupoConfirm {
  nomeParticipante: string
  apelido: string
  nomeCompleto: string
  palpites: Array<{ jogoId: string; placarA: number; placarB: number }>
  extras: Array<{ tipo: string; valor: string }>
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { grupos } = body as { grupos: GrupoConfirm[] }

    if (!Array.isArray(grupos) || grupos.length === 0) {
      return NextResponse.json({ error: 'grupos deve ser um array não vazio' }, { status: 400 })
    }

    for (const g of grupos) {
      if (!g.nomeParticipante || typeof g.nomeParticipante !== 'string') {
        return NextResponse.json({ error: 'nomeParticipante inválido' }, { status: 400 })
      }
      if (!g.apelido || typeof g.apelido !== 'string') {
        return NextResponse.json({ error: 'apelido inválido' }, { status: 400 })
      }
      if (!g.nomeCompleto || typeof g.nomeCompleto !== 'string') {
        return NextResponse.json({ error: 'nomeCompleto inválido' }, { status: 400 })
      }
      if (!Array.isArray(g.palpites) || g.palpites.length === 0) {
        return NextResponse.json({ error: `palpites vazio para ${g.nomeCompleto}` }, { status: 400 })
      }
      if (!Array.isArray(g.extras) || g.extras.length === 0) {
        return NextResponse.json({ error: `extras vazio para ${g.nomeCompleto}` }, { status: 400 })
      }
    }

    let gruposCriados = 0
    let participantesCriados = 0

    await prisma.$transaction(async (tx) => {
      for (const grupo of grupos) {
        let participante = await tx.participante.findFirst({
          where: { nome: { equals: grupo.nomeParticipante, mode: 'insensitive' } },
        })

        if (!participante) {
          participante = await tx.participante.create({
            data: { nome: grupo.nomeParticipante },
          })
          participantesCriados++
        }

        let palpiteGrupo = await tx.palpiteGrupo.findUnique({
          where: {
            participanteId_nome: {
              participanteId: participante.id,
              nome: grupo.nomeCompleto,
            },
          },
        })

        if (palpiteGrupo) {
          await tx.palpite.deleteMany({ where: { palpiteGrupoId: palpiteGrupo.id } })
          await tx.palpiteExtra.deleteMany({ where: { palpiteGrupoId: palpiteGrupo.id } })
        } else {
          palpiteGrupo = await tx.palpiteGrupo.create({
            data: {
              participanteId: participante.id,
              nome: grupo.nomeCompleto,
              apelido: grupo.apelido,
              fonte: 'excel',
            },
          })
          gruposCriados++
        }

        await tx.palpite.createMany({
          data: grupo.palpites.map(p => ({
            palpiteGrupoId: palpiteGrupo!.id,
            jogoId: p.jogoId,
            placarA: p.placarA,
            placarB: p.placarB,
            fonte: 'excel' as const,
          })),
        })

        await tx.palpiteExtra.createMany({
          data: grupo.extras.map(e => ({
            palpiteGrupoId: palpiteGrupo!.id,
            tipo: e.tipo as 'artilheiro' | 'campeao' | 'vice' | 'terceiro' | 'quarto',
            valor: e.valor,
            fonte: 'excel' as const,
          })),
        })
      }
    })

    return NextResponse.json({ success: true, gruposCriados, participantesCriados })
  } catch (error) {
    console.error('[confirm-lote] Erro:', error)
    return NextResponse.json({ error: 'Erro ao confirmar upload em lote' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/upload/confirm-lote/route.ts
git commit -m "feat: add batch upload confirmation API endpoint"
```

---

### Task 6: Atualizar API Confirm Individual

**Files:**
- Modify: `src/app/api/admin/upload/confirm/route.ts`

- [ ] **Step 1: Atualizar confirm para usar PalpiteGrupo**

Replace the entire file with:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { participanteId, palpites, extras, fonte, arquivoUrl, arquivoBase64, arquivoNome, arquivoContentType } = body

    if (!participanteId || typeof participanteId !== 'string' || participanteId.trim() === '') {
      return NextResponse.json({ error: 'participanteId inválido' }, { status: 400 })
    }

    if (!Array.isArray(palpites)) {
      return NextResponse.json({ error: 'palpites deve ser um array' }, { status: 400 })
    }
    for (const p of palpites) {
      if (!p.jogoId || typeof p.jogoId !== 'string' || p.jogoId.trim() === '') {
        return NextResponse.json({ error: 'jogoId inválido em palpites' }, { status: 400 })
      }
      if (!Number.isInteger(p.placarA) || p.placarA < 0) {
        return NextResponse.json({ error: 'placarA deve ser um inteiro não negativo' }, { status: 400 })
      }
      if (!Number.isInteger(p.placarB) || p.placarB < 0) {
        return NextResponse.json({ error: 'placarB deve ser um inteiro não negativo' }, { status: 400 })
      }
    }

    if (!Array.isArray(extras)) {
      return NextResponse.json({ error: 'extras deve ser um array' }, { status: 400 })
    }
    const validTipos = ['artilheiro', 'campeao', 'vice', 'terceiro', 'quarto'] as const
    for (const e of extras) {
      if (!validTipos.includes(e.tipo)) {
        return NextResponse.json({ error: `tipo inválido em extras: ${e.tipo}` }, { status: 400 })
      }
      if (!e.valor || typeof e.valor !== 'string' || e.valor.trim() === '') {
        return NextResponse.json({ error: 'valor inválido em extras' }, { status: 400 })
      }
    }

    if (fonte !== 'excel' && fonte !== 'foto' && fonte !== 'pdf') {
      return NextResponse.json({ error: 'fonte deve ser "excel", "foto" ou "pdf"' }, { status: 400 })
    }

    const participante = await prisma.participante.findUnique({ where: { id: participanteId } })
    if (!participante) {
      return NextResponse.json({ error: 'Participante não encontrado' }, { status: 404 })
    }

    let finalArquivoUrl = arquivoUrl || ''

    if (arquivoBase64 && arquivoNome) {
      const { uploadFile } = await import('@/lib/services/storage/supabase')
      const buffer = Buffer.from(arquivoBase64, 'base64')
      const sanitizedNome = arquivoNome
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9.-]/g, '-')
      const path = `uploads/${participanteId}/${Date.now()}-${sanitizedNome}`
      finalArquivoUrl = await uploadFile('palpites', path, buffer, arquivoContentType || 'application/octet-stream')
    }

    const nomeGrupo = participante.nome

    await prisma.$transaction(async (tx) => {
      let palpiteGrupo = await tx.palpiteGrupo.findUnique({
        where: {
          participanteId_nome: {
            participanteId,
            nome: nomeGrupo,
          },
        },
      })

      if (palpiteGrupo) {
        await tx.palpite.deleteMany({ where: { palpiteGrupoId: palpiteGrupo.id } })
        await tx.palpiteExtra.deleteMany({ where: { palpiteGrupoId: palpiteGrupo.id } })
      } else {
        palpiteGrupo = await tx.palpiteGrupo.create({
          data: {
            participanteId,
            nome: nomeGrupo,
            apelido: 'Palpite 1',
            fonte,
          },
        })
      }

      await tx.palpite.createMany({
        data: palpites.map((p: { jogoId: string; placarA: number; placarB: number }) => ({
          palpiteGrupoId: palpiteGrupo!.id,
          jogoId: p.jogoId,
          placarA: p.placarA,
          placarB: p.placarB,
          fonte,
        })),
      })

      await tx.palpiteExtra.createMany({
        data: extras.map((e: { tipo: string; valor: string }) => ({
          palpiteGrupoId: palpiteGrupo!.id,
          tipo: e.tipo as 'artilheiro' | 'campeao' | 'vice' | 'terceiro' | 'quarto',
          valor: e.valor,
          fonte,
        })),
      })

      await tx.uploadLog.create({
        data: {
          participanteId,
          tipoArquivo: fonte,
          arquivoUrl: finalArquivoUrl,
          status: 'sucesso',
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Upload confirm error:', error)
    return NextResponse.json({ error: 'Erro ao confirmar upload' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/upload/confirm/route.ts
git commit -m "feat: update individual upload confirm to use PalpiteGrupo"
```

---

### Task 7: Atualizar Queries (Ranking, Participantes, Jogos)

**Files:**
- Modify: `src/lib/db/queries/ranking.ts`
- Modify: `src/lib/db/queries/participantes.ts`
- Modify: `src/lib/db/queries/jogos.ts`

- [ ] **Step 1: Atualizar ranking.ts**

Replace the entire file with:

```typescript
import { prisma } from '../client'
import { getConfiguracao } from './config'
import { calcularPontosJogo, calcularPontosExtra } from '@/lib/utils/helpers'
import type { RankingEntry } from '@/lib/utils/types'

export async function getRanking(): Promise<RankingEntry[]> {
  const config = await getConfiguracao()

  const grupos = await prisma.palpiteGrupo.findMany({
    include: {
      participante: true,
      palpites: {
        include: { jogo: true },
      },
      extras: true,
    },
  })

  const resultadosExtras = await prisma.resultadoExtra.findMany()
  const extrasMap = Object.fromEntries(resultadosExtras.map(r => [r.tipo, r.valor]))

  const ranking = grupos.map(g => {
    let pontos = 0
    let placaresExatos = 0
    let vencedoresCorretos = 0

    for (const palpite of g.palpites) {
      if (palpite.jogo.status !== 'finalizado') continue
      if (palpite.jogo.resultadoA === null || palpite.jogo.resultadoB === null) continue

      const resultado = calcularPontosJogo(
        palpite.placarA, palpite.placarB,
        palpite.jogo.resultadoA, palpite.jogo.resultadoB,
        config
      )

      pontos += resultado.pontos
      if (resultado.tipo === 'exato') placaresExatos++
      if (resultado.tipo === 'vencedor' || resultado.tipo === 'exato') vencedoresCorretos++
    }

    for (const extra of g.extras) {
      const valorReal = extrasMap[extra.tipo]
      if (valorReal) {
        pontos += calcularPontosExtra(extra.valor, valorReal, config, extra.tipo)
      }
    }

    return {
      palpiteGrupoId: g.id,
      participanteId: g.participanteId,
      nomeParticipante: g.participante.nome,
      nomeGrupo: g.nome,
      apelido: g.apelido,
      fotoUrl: g.participante.fotoUrl,
      pontos,
      placaresExatos,
      vencedoresCorretos,
    }
  })

  return ranking.sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos
    if (b.placaresExatos !== a.placaresExatos) return b.placaresExatos - a.placaresExatos
    return b.vencedoresCorretos - a.vencedoresCorretos
  })
}
```

- [ ] **Step 2: Atualizar participantes.ts**

Replace the entire file with:

```typescript
import { prisma } from '../client'

export async function getTodosParticipantes() {
  return prisma.participante.findMany({
    orderBy: { nome: 'asc' },
    include: {
      grupos: {
        select: { id: true },
      },
    },
  })
}

export async function getParticipanteById(id: string) {
  return prisma.participante.findUnique({
    where: { id },
    include: {
      grupos: {
        include: {
          palpites: {
            include: { jogo: true },
            orderBy: { jogo: { dataHora: 'asc' } },
          },
          extras: true,
        },
        orderBy: { apelido: 'asc' },
      },
    },
  })
}

export async function createParticipante(nome: string, fotoUrl?: string) {
  return prisma.participante.create({
    data: { nome, fotoUrl },
  })
}

export async function updateParticipante(id: string, data: { nome?: string; fotoUrl?: string }) {
  return prisma.participante.update({ where: { id }, data })
}

export async function deleteParticipante(id: string) {
  return prisma.participante.delete({ where: { id } })
}
```

- [ ] **Step 3: Atualizar jogos.ts**

Replace the entire file with:

```typescript
import { prisma } from '../client'

export async function getJogosDoDia() {
  const inicio = new Date()
  inicio.setHours(0, 0, 0, 0)
  const fim = new Date()
  fim.setHours(23, 59, 59, 999)

  return prisma.jogo.findMany({
    where: {
      dataHora: { gte: inicio, lte: fim },
    },
    orderBy: { dataHora: 'asc' },
  })
}

export async function getTodosJogos() {
  return prisma.jogo.findMany({ orderBy: { dataHora: 'asc' } })
}

export async function getJogoById(id: string) {
  return prisma.jogo.findUnique({
    where: { id },
    include: {
      palpites: {
        include: {
          palpiteGrupo: {
            include: { participante: true },
          },
        },
      },
    },
  })
}

export async function updateResultado(id: string, resultadoA: number, resultadoB: number) {
  return prisma.jogo.update({
    where: { id },
    data: {
      resultadoA,
      resultadoB,
      status: 'finalizado',
    },
  })
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/queries/ranking.ts src/lib/db/queries/participantes.ts src/lib/db/queries/jogos.ts
git commit -m "feat: update queries for PalpiteGrupo model"
```

---

### Task 8: Atualizar Componentes de Ranking

**Files:**
- Modify: `src/components/public/RankingTable.tsx`
- Modify: `src/components/public/ranking-podium.tsx`

- [ ] **Step 1: Atualizar RankingTable.tsx**

Replace the entire file with:

```typescript
import Image from "next/image"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import type { RankingEntry } from "@/lib/utils/types"

interface RankingTableProps { ranking: RankingEntry[] }

const posicaoBadges: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" }

export function RankingTable({ ranking }: RankingTableProps) {
  if (ranking.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <span className="text-6xl mb-4">⚽</span>
        <h3 className="text-xl font-semibold mb-2">Nenhum participante ainda</h3>
        <p className="text-muted-foreground text-center max-w-md">Os participantes aparecerão aqui quando cadastrados.</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Participante</TableHead>
          <TableHead className="text-right">Pts</TableHead>
          <TableHead className="text-center">Exatas</TableHead>
          <TableHead className="text-center">Vencedores</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ranking.map((entry, index) => {
          const posicao = index + 1
          return (
            <TableRow key={entry.palpiteGrupoId}>
              <TableCell>{posicaoBadges[posicao] ? <span className="text-lg">{posicaoBadges[posicao]}</span> : <span className="text-muted-foreground font-medium">{posicao}</span>}</TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  {entry.fotoUrl ? (
                    <Image src={entry.fotoUrl} alt={entry.nomeGrupo} width={32} height={32} className="rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">{entry.nomeParticipante.charAt(0).toUpperCase()}</div>
                  )}
                  <div className="flex flex-col">
                    <span className="font-medium">{entry.nomeGrupo}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right"><span className="font-display text-xl text-primary">{entry.pontos}</span></TableCell>
              <TableCell className="text-center">{entry.placaresExatos}</TableCell>
              <TableCell className="text-center">{entry.vencedoresCorretos}</TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
```

- [ ] **Step 2: Atualizar ranking-podium.tsx**

Replace the entire file with:

```typescript
import Image from "next/image"
import type { RankingEntry } from "@/lib/utils/types"

interface RankingPodiumProps { ranking: RankingEntry[] }

const podiumStyles = [
  { border: "border-t-4 border-t-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/10", label: "1º", size: "w-20 h-20" },
  { border: "border-t-4 border-t-gray-300", bg: "bg-gray-50 dark:bg-gray-800/30", label: "2º", size: "w-16 h-16" },
  { border: "border-t-4 border-t-amber-600", bg: "bg-amber-50 dark:bg-amber-900/10", label: "3º", size: "w-16 h-16" },
]

export function RankingPodium({ ranking }: RankingPodiumProps) {
  const top3 = ranking.slice(0, 3)
  if (top3.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {top3.map((entry, index) => {
        const style = podiumStyles[index]
        return (
          <div key={entry.palpiteGrupoId} className={`rounded-lg border border-border ${style.border} ${style.bg} p-6 flex flex-col items-center gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}>
            <span className="text-sm font-medium text-muted-foreground">{style.label}</span>
            <div className={`${style.size} rounded-full overflow-hidden bg-background flex items-center justify-center ring-2 ring-border relative`}>
              {entry.fotoUrl ? (
                <Image src={entry.fotoUrl} alt={entry.nomeGrupo} fill className="object-cover" />
              ) : (
                <span className="text-2xl font-display font-bold text-primary">{entry.nomeParticipante.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <span className="font-semibold text-center">{entry.nomeGrupo}</span>
            <span className="text-2xl font-display font-bold text-primary">{entry.pontos} pts</span>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/public/RankingTable.tsx src/components/public/ranking-podium.tsx
git commit -m "feat: update ranking components for PalpiteGrupo"
```

---

### Task 9: Atualizar Páginas Públicas (Ranking, Participantes, Perfil)

**Files:**
- Modify: `src/app/(public)/ranking/page.tsx`
- Modify: `src/app/(public)/participantes/page.tsx`
- Modify: `src/components/public/ParticipantCard.tsx`
- Modify: `src/app/(public)/participantes/[id]/page.tsx`

- [ ] **Step 1: Atualizar ranking/page.tsx**

Replace the entire file with:

```typescript
import { getRanking } from '@/lib/db/queries/ranking'
import { RankingTable } from '@/components/public/RankingTable'
import { RankingPodium } from '@/components/public/ranking-podium'
import { StatsCard } from '@/components/public/stats-card'
import { Card } from '@/components/ui/card'
import { Trophy, Target, BarChart3 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function RankingPage() {
  const ranking = await getRanking()

  const maiorPontuacao = ranking.length > 0 ? ranking[0].pontos : 0
  const mediaPontos = ranking.length > 0 ? Math.round(ranking.reduce((sum, r) => sum + r.pontos, 0) / ranking.length) : 0
  const totalExatos = ranking.reduce((sum, r) => sum + r.placaresExatos, 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in-up">
      <h1 className="text-3xl font-display tracking-wide">Ranking</h1>

      {ranking.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <span className="text-6xl mb-4">🏆</span>
            <h3 className="text-xl font-semibold mb-2">Nenhum participante ainda</h3>
            <p className="text-muted-foreground text-center max-w-md">Os participantes aparecerão aqui quando cadastrados.</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatsCard label="Maior pontuação" value={`${maiorPontuacao} pts`} icon={Trophy} />
            <StatsCard label="Média de pontos" value={`${mediaPontos} pts`} icon={BarChart3} iconColor="text-secondary" iconBg="bg-secondary/10" />
            <StatsCard label="Placares exatos" value={totalExatos} icon={Target} iconColor="text-green-600 dark:text-green-400" iconBg="bg-green-100 dark:bg-green-900/20" />
          </div>

          <RankingPodium ranking={ranking} />

          <Card>
            <RankingTable ranking={ranking} />
          </Card>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Atualizar ParticipantCard.tsx**

Replace the entire file with:

```typescript
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'

interface ParticipantCardProps {
  id: string
  nome: string
  fotoUrl: string | null
  totalPalpites: number
}

export function ParticipantCard({ id, nome, fotoUrl, totalPalpites }: ParticipantCardProps) {
  return (
    <Link href={`/participantes/${id}`} className="rounded-lg focus:ring-2 focus:ring-ring focus:outline-none block">
      <Card className="group hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg transition-all duration-300">
        <CardContent className="flex flex-col items-center gap-3 p-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-muted flex items-center justify-center ring-2 ring-border group-hover:ring-primary/30 transition-all relative">
            {fotoUrl ? (
              <Image src={fotoUrl} alt={nome} fill className="object-cover" />
            ) : (
              <span className="text-2xl font-display font-bold text-primary">{nome.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <span className="font-semibold text-sm text-center">{nome}</span>
          <span className="text-xs text-muted-foreground">{totalPalpites} palpite{totalPalpites !== 1 ? 's' : ''}</span>
        </CardContent>
      </Card>
    </Link>
  )
}
```

- [ ] **Step 3: Atualizar participantes/page.tsx**

Replace the entire file with:

```typescript
import { getTodosParticipantes } from '@/lib/db/queries/participantes'
import { ParticipantCard } from '@/components/public/ParticipantCard'
import { Card, CardContent } from '@/components/ui/card'
import { Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ParticipantesPage() {
  const participantes = await getTodosParticipantes()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-display tracking-wide">Participantes</h1>
        <p className="text-muted-foreground mt-1">{participantes.length} participante{participantes.length !== 1 ? 's' : ''} cadastrado{participantes.length !== 1 ? 's' : ''}</p>
      </div>

      {participantes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum participante</h3>
            <p className="text-muted-foreground text-center max-w-md">Os participantes aparecerão aqui quando cadastrados.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {participantes.map((p) => (
            <ParticipantCard key={p.id} id={p.id} nome={p.nome} fotoUrl={p.fotoUrl} totalPalpites={p.grupos.length} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Atualizar participantes/[id]/page.tsx**

Replace the entire file with:

```typescript
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getParticipanteById } from '@/lib/db/queries/participantes'
import { getRanking } from '@/lib/db/queries/ranking'
import { getConfiguracao } from '@/lib/db/queries/config'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { PalpitesTable } from '@/components/public/PalpitesTable'
import { FASE_LABELS } from '@/lib/utils/constants'
import { Trophy, Award } from 'lucide-react'

export const dynamic = 'force-dynamic'

const tipoExtraLabels: Record<string, string> = {
  artilheiro: 'Artilheiro',
  campeao: 'Campeão',
  vice: 'Vice-campeão',
  terceiro: '3º Colocado',
  quarto: '4º Colocado',
}

export default async function ParticipanteProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [participante, ranking, config] = await Promise.all([
    getParticipanteById(id),
    getRanking(),
    getConfiguracao(),
  ])

  if (!participante) notFound()

  const rankingEntries = ranking.filter((r) => r.participanteId === id)
  const totalPontos = rankingEntries.reduce((sum, r) => sum + r.pontos, 0)
  const melhorPosicao = rankingEntries.length > 0
    ? Math.min(...rankingEntries.map(r => ranking.indexOf(r) + 1))
    : null

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in-up">
      <Card>
        <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-28 h-28 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 ring-4 ring-border relative">
            {participante.fotoUrl ? (
              <Image src={participante.fotoUrl} alt={participante.nome} fill className="object-cover" />
            ) : (
              <span className="text-4xl font-display font-bold text-primary">{participante.nome.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="text-center sm:text-left space-y-2">
            <h1 className="text-2xl font-display tracking-wide">{participante.nome}</h1>
            <div className="flex items-center gap-3 justify-center sm:justify-start">
              <div className="flex items-center gap-1"><Trophy className="w-4 h-4 text-primary" /><Badge variant="success">{totalPontos} pts</Badge></div>
              {melhorPosicao && <div className="flex items-center gap-1"><Award className="w-4 h-4 text-secondary" /><Badge variant="info">{melhorPosicao}º no ranking</Badge></div>}
            </div>
            <p className="text-sm text-muted-foreground">{participante.grupos.length} palpite{participante.grupos.length !== 1 ? 's' : ''}</p>
          </div>
        </CardContent>
      </Card>

      {participante.grupos.length > 1 && (
        <Tabs defaultValue={participante.grupos[0]?.nome ?? ''}>
          <TabsList className="flex-wrap">
            {participante.grupos.map(grupo => (
              <TabsTrigger key={grupo.id} value={grupo.nome}>{grupo.apelido}</TabsTrigger>
            ))}
          </TabsList>

          {participante.grupos.map(grupo => {
            const palpitesGrupos = grupo.palpites.filter((p) => p.jogo.fase === 'grupos')
            const palpitesEliminatorias = grupo.palpites.filter((p) => p.jogo.fase !== 'grupos')

            const gruposMap = new Map<string, typeof grupo.palpites>()
            for (const palpite of palpitesGrupos) {
              const grupoName = palpite.jogo.grupo ?? '?'
              if (!gruposMap.has(grupoName)) gruposMap.set(grupoName, [])
              gruposMap.get(grupoName)!.push(palpite)
            }

            const fasesMap = new Map<string, typeof grupo.palpites>()
            for (const palpite of palpitesEliminatorias) {
              const fase = palpite.jogo.fase
              if (!fasesMap.has(fase)) fasesMap.set(fase, [])
              fasesMap.get(fase)!.push(palpite)
            }

            return (
              <TabsContent key={grupo.id} value={grupo.nome} className="space-y-6">
                {gruposMap.size > 0 && (
                  <section className="space-y-4">
                    <h2 className="text-2xl font-display tracking-wide">Fase de Grupos</h2>
                    {Array.from(gruposMap.entries())
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([grupoNome, palpites]) => (
                        <PalpitesTable key={grupoNome} titulo={`Grupo ${grupoNome}`} palpites={palpites} config={config} />
                      ))}
                  </section>
                )}

                {fasesMap.size > 0 && (
                  <section className="space-y-4">
                    <h2 className="text-2xl font-display tracking-wide">Eliminatórias</h2>
                    {Array.from(fasesMap.entries()).map(([fase, palpites]) => (
                      <PalpitesTable key={fase} titulo={FASE_LABELS[fase] ?? fase} palpites={palpites} config={config} />
                    ))}
                  </section>
                )}

                {grupo.extras.length > 0 && (
                  <section className="space-y-4">
                    <h2 className="text-2xl font-display tracking-wide">Extras</h2>
                    <Card>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Categoria</TableHead>
                            <TableHead>Palpite</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {grupo.extras.map((extra) => (
                            <TableRow key={extra.id}>
                              <TableCell>{tipoExtraLabels[extra.tipo] ?? extra.tipo}</TableCell>
                              <TableCell className="font-semibold">{extra.valor}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Card>
                  </section>
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      )}

      {participante.grupos.length === 1 && (
        <>
          {(() => {
            const grupo = participante.grupos[0]
            const palpitesGrupos = grupo.palpites.filter((p) => p.jogo.fase === 'grupos')
            const palpitesEliminatorias = grupo.palpites.filter((p) => p.jogo.fase !== 'grupos')

            const gruposMap = new Map<string, typeof grupo.palpites>()
            for (const palpite of palpitesGrupos) {
              const grupoName = palpite.jogo.grupo ?? '?'
              if (!gruposMap.has(grupoName)) gruposMap.set(grupoName, [])
              gruposMap.get(grupoName)!.push(palpite)
            }

            const fasesMap = new Map<string, typeof grupo.palpites>()
            for (const palpite of palpitesEliminatorias) {
              const fase = palpite.jogo.fase
              if (!fasesMap.has(fase)) fasesMap.set(fase, [])
              fasesMap.get(fase)!.push(palpite)
            }

            return (
              <>
                {gruposMap.size > 0 && (
                  <section className="space-y-4">
                    <h2 className="text-2xl font-display tracking-wide">Palpites - Fase de Grupos</h2>
                    {Array.from(gruposMap.entries())
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([grupoNome, palpites]) => (
                        <PalpitesTable key={grupoNome} titulo={`Grupo ${grupoNome}`} palpites={palpites} config={config} />
                      ))}
                  </section>
                )}

                {fasesMap.size > 0 && (
                  <section className="space-y-4">
                    <h2 className="text-2xl font-display tracking-wide">Palpites - Eliminatórias</h2>
                    {Array.from(fasesMap.entries()).map(([fase, palpites]) => (
                      <PalpitesTable key={fase} titulo={FASE_LABELS[fase] ?? fase} palpites={palpites} config={config} />
                    ))}
                  </section>
                )}

                {grupo.extras.length > 0 && (
                  <section className="space-y-4">
                    <h2 className="text-2xl font-display tracking-wide">Palpites Extras</h2>
                    <Card>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Categoria</TableHead>
                            <TableHead>Palpite</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {grupo.extras.map((extra) => (
                            <TableRow key={extra.id}>
                              <TableCell>{tipoExtraLabels[extra.tipo] ?? extra.tipo}</TableCell>
                              <TableCell className="font-semibold">{extra.valor}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Card>
                  </section>
                )}
              </>
            )
          })()}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(public\)/ranking/page.tsx src/app/\(public\)/participantes/page.tsx src/components/public/ParticipantCard.tsx src/app/\(public\)/participantes/\[id\]/page.tsx
git commit -m "feat: update public pages for PalpiteGrupo model"
```

---

### Task 10: Frontend Admin — Seletor de Modo e BatchPreviewTabs

**Files:**
- Create: `src/components/admin/UploadModeSelector.tsx`
- Create: `src/components/admin/BatchPreviewTabs.tsx`

- [ ] **Step 1: Criar UploadModeSelector.tsx**

Create `src/components/admin/UploadModeSelector.tsx`:

```typescript
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { FileText, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

export type UploadMode = 'individual' | 'lote'

interface UploadModeSelectorProps {
  value: UploadMode
  onChange: (mode: UploadMode) => void
}

export function UploadModeSelector({ value, onChange }: UploadModeSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <button
        type="button"
        onClick={() => onChange('individual')}
        className={cn(
          'rounded-lg border-2 p-4 text-left transition-all hover:shadow-md',
          value === 'individual' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        )}
      >
        <CardContent className="p-0 space-y-2">
          <FileText className={cn('w-8 h-8', value === 'individual' ? 'text-primary' : 'text-muted-foreground')} />
          <h3 className="font-semibold">Upload Individual</h3>
          <p className="text-sm text-muted-foreground">Um participante por vez</p>
        </CardContent>
      </button>

      <button
        type="button"
        onClick={() => onChange('lote')}
        className={cn(
          'rounded-lg border-2 p-4 text-left transition-all hover:shadow-md',
          value === 'lote' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        )}
      >
        <CardContent className="p-0 space-y-2">
          <Layers className={cn('w-8 h-8', value === 'lote' ? 'text-primary' : 'text-muted-foreground')} />
          <h3 className="font-semibold">Upload em Lote</h3>
          <p className="text-sm text-muted-foreground">Múltiplos participantes de uma vez</p>
        </CardContent>
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Criar BatchPreviewTabs.tsx**

Create `src/components/admin/BatchPreviewTabs.tsx`:

```typescript
'use client'

import { useState, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PreviewTable } from '@/components/admin/PreviewTable'
import type { PalpiteDTO, PalpiteExtraDTO, ValidationResult } from '@/lib/utils/types'

interface BatchGrupo {
  nomeParticipante: string
  apelido: string
  nomeCompleto: string
  participanteId: string | null
  palpites: PalpiteDTO[]
  extras: PalpiteExtraDTO[]
}

interface BatchPreviewTabsProps {
  grupos: BatchGrupo[]
  validacao: ValidationResult
  jogos: Array<{ id: string; timeA: string; timeB: string; grupo?: string | null; fase: string }>
  onEdit: (grupos: BatchGrupo[]) => void
}

export function BatchPreviewTabs({ grupos, validacao, jogos, onEdit }: BatchPreviewTabsProps) {
  const [editedGrupos, setEditedGrupos] = useState<BatchGrupo[]>(grupos)

  const handleGrupoEdit = useCallback((index: number, palpites: PalpiteDTO[], extras: PalpiteExtraDTO[]) => {
    setEditedGrupos(prev => {
      const next = [...prev]
      next[index] = { ...next[index], palpites, extras }
      onEdit(next)
      return next
    })
  }, [onEdit])

  if (editedGrupos.length === 0) return null

  return (
    <div className="space-y-4">
      {validacao.alertas.length > 0 && (
        <div className="space-y-2">
          {validacao.alertas.map((alerta, i) => <Badge key={i} variant="warning">{alerta}</Badge>)}
        </div>
      )}

      <Tabs defaultValue={editedGrupos[0].nomeCompleto}>
        <TabsList className="flex-wrap">
          {editedGrupos.map((grupo, index) => (
            <TabsTrigger key={index} value={grupo.nomeCompleto} className="gap-2">
              {grupo.nomeCompleto}
              {grupo.participanteId ? (
                <Badge variant="success" className="text-[10px] px-1 py-0">existente</Badge>
              ) : (
                <Badge variant="warning" className="text-[10px] px-1 py-0">novo</Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {editedGrupos.map((grupo, index) => (
          <TabsContent key={index} value={grupo.nomeCompleto}>
            <PreviewTable
              preview={{ palpites: grupo.palpites, extras: grupo.extras, fonte: 'excel' }}
              validacao={validacao}
              jogos={jogos}
              onEdit={(palpites, extras) => handleGrupoEdit(index, palpites, extras)}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/UploadModeSelector.tsx src/components/admin/BatchPreviewTabs.tsx
git commit -m "feat: add UploadModeSelector and BatchPreviewTabs components"
```

---

### Task 11: Atualizar Página Admin Upload

**Files:**
- Modify: `src/app/admin/upload/page.tsx`

- [ ] **Step 1: Atualizar página admin/upload**

Replace the entire file with:

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { UploadForm } from '@/components/admin/UploadForm'
import { PreviewTable } from '@/components/admin/PreviewTable'
import { UploadModeSelector, type UploadMode } from '@/components/admin/UploadModeSelector'
import { BatchPreviewTabs } from '@/components/admin/BatchPreviewTabs'
import { toast } from 'sonner'
import { Loader2, ChevronLeft } from 'lucide-react'
import type { PalpiteDTO, PalpiteExtraDTO, ValidationResult } from '@/lib/utils/types'

interface Participante { id: string; nome: string }
interface Jogo { id: string; timeA: string; timeB: string; grupo?: string | null; fase: string }

interface BatchGrupo {
  nomeParticipante: string
  apelido: string
  nomeCompleto: string
  participanteId: string | null
  palpites: PalpiteDTO[]
  extras: PalpiteExtraDTO[]
}

type Step = 'select-mode' | 'select' | 'upload' | 'preview' | 'upload-lote' | 'preview-lote' | 'confirming' | 'success' | 'error'

export default function AdminUploadPage() {
  const [step, setStep] = useState<Step>('select-mode')
  const [mode, setMode] = useState<UploadMode>('individual')
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [participanteId, setParticipanteId] = useState('')
  const [preview, setPreview] = useState<{ palpites: PalpiteDTO[]; extras: PalpiteExtraDTO[]; fonte: 'excel' | 'foto' | 'pdf' } | null>(null)
  const [validacao, setValidacao] = useState<ValidationResult | null>(null)
  const [editedPalpites, setEditedPalpites] = useState<PalpiteDTO[]>([])
  const [editedExtras, setEditedExtras] = useState<PalpiteExtraDTO[]>([])
  const [showReplaceDialog, setShowReplaceDialog] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fetchError, setFetchError] = useState('')
  const [batchGrupos, setBatchGrupos] = useState<BatchGrupo[]>([])
  const [batchValidacao, setBatchValidacao] = useState<ValidationResult | null>(null)
  const [batchResumo, setBatchResumo] = useState<{ totalGrupos: number; participantesExistentes: number; novosParticipantes: number } | null>(null)
  const [editedBatchGrupos, setEditedBatchGrupos] = useState<BatchGrupo[]>([])
  const [loteFile, setLoteFile] = useState<File | null>(null)
  const [loteUploading, setLoteUploading] = useState(false)
  const [loteProgress, setLoteProgress] = useState(0)
  const [loteError, setLoteError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/participantes').then((r) => r.json()).then((data) => setParticipantes(data)).catch(() => setFetchError('Erro ao carregar participantes'))
    fetch('/api/jogos').then((r) => r.json()).then((data) => setJogos(data)).catch(() => setFetchError((prev) => prev ? prev + ' e jogos' : 'Erro ao carregar jogos'))
  }, [])

  const handleUploadSuccess = useCallback(
    (previewData: { palpites: PalpiteDTO[]; extras: PalpiteExtraDTO[]; fonte: 'excel' | 'foto' | 'pdf' }, validacaoData: ValidationResult) => {
      setPreview(previewData); setValidacao(validacaoData)
      setEditedPalpites(previewData.palpites); setEditedExtras(previewData.extras)
      setStep('preview')
    }, []
  )

  async function handleConfirmClick() {
    if (!participanteId) return
    try {
      const res = await fetch(`/api/participantes?id=${participanteId}`)
      if (res.ok) { const data = await res.json(); if (data.grupos && data.grupos.length > 0) { setShowReplaceDialog(true); return } }
      else { setShowReplaceDialog(true); return }
    } catch { setShowReplaceDialog(true); return }
    await doConfirm()
  }

  async function doConfirm() {
    if (!preview || !participanteId) return
    setConfirming(true); setStep('confirming'); setShowReplaceDialog(false)
    try {
      let arquivoBase64 = ''; let arquivoNome = ''; let arquivoContentType = ''
      if (selectedFile) {
        arquivoNome = selectedFile.name; arquivoContentType = selectedFile.type
        const arrayBuffer = await selectedFile.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer); let binary = ''
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
        arquivoBase64 = btoa(binary)
      }
      const res = await fetch('/api/admin/upload/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participanteId, palpites: editedPalpites, extras: editedExtras, fonte: preview.fonte, arquivoBase64, arquivoNome, arquivoContentType }),
      })
      if (!res.ok) { const data = await res.json(); setErrorMessage(data.error || 'Erro ao confirmar upload'); setStep('error'); return }
      setStep('success'); toast.success('Palpites salvos com sucesso!')
    } catch { setErrorMessage('Erro de conexão ao confirmar'); setStep('error') }
    finally { setConfirming(false) }
  }

  async function doConfirmLote() {
    setConfirming(true); setStep('confirming')
    try {
      const res = await fetch('/api/admin/upload/confirm-lote', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grupos: editedBatchGrupos.map(g => ({
            nomeParticipante: g.nomeParticipante,
            apelido: g.apelido,
            nomeCompleto: g.nomeCompleto,
            palpites: g.palpites,
            extras: g.extras,
          })),
        }),
      })
      if (!res.ok) { const data = await res.json(); setErrorMessage(data.error || 'Erro ao confirmar upload em lote'); setStep('error'); return }
      const data = await res.json()
      setStep('success')
      toast.success(`${data.gruposCriados} grupo(s) criado(s), ${data.participantesCriados} participante(s) novo(s)!`)
    } catch { setErrorMessage('Erro de conexão ao confirmar'); setStep('error') }
    finally { setConfirming(false) }
  }

  function handleUploadLote() {
    if (!loteFile) return
    setLoteUploading(true); setLoteError(null); setLoteProgress(0)
    const formData = new FormData()
    formData.append('file', loteFile)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/upload/lote')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setLoteProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      setLoteUploading(false)
      if (xhr.status >= 200 && xhr.status < 300) {
        setLoteProgress(100)
        try {
          const data = JSON.parse(xhr.responseText)
          setBatchGrupos(data.grupos)
          setEditedBatchGrupos(data.grupos)
          setBatchValidacao(data.validacao)
          setBatchResumo(data.resumo)
          setStep('preview-lote')
        } catch { setLoteError('Erro ao processar resposta do servidor') }
      } else {
        try {
          const data = JSON.parse(xhr.responseText)
          setLoteError(data.error || 'Erro ao processar arquivo')
        } catch { setLoteError('Erro de conexão ao enviar arquivo') }
      }
    }
    xhr.onerror = () => { setLoteUploading(false); setLoteError('Erro de conexão ao enviar arquivo') }
    xhr.send(formData)
  }

  function handleReset() {
    setStep('select-mode'); setParticipanteId(''); setPreview(null); setValidacao(null)
    setEditedPalpites([]); setEditedExtras([]); setErrorMessage(''); setSelectedFile(null)
    setBatchGrupos([]); setBatchValidacao(null); setBatchResumo(null); setEditedBatchGrupos([])
    setLoteFile(null); setLoteError(null); setLoteProgress(0)
  }

  const handleEdit = useCallback((palpites: PalpiteDTO[], extras: PalpiteExtraDTO[]) => {
    setEditedPalpites(palpites); setEditedExtras(extras)
  }, [])

  const handleBatchEdit = useCallback((grupos: BatchGrupo[]) => {
    setEditedBatchGrupos(grupos)
  }, [])

  if (step === 'success') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in-up">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin"><ChevronLeft className="w-4 h-4" /> Voltar ao Dashboard</Link>
        </Button>
        <h1 className="text-3xl font-display tracking-wide">Upload de Palpites</h1>
        <Card><CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <Badge variant="success">Sucesso</Badge>
          <p>Palpites salvos com sucesso!</p>
          <Button onClick={handleReset}>Novo Upload</Button>
        </CardContent></Card>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in-up">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin"><ChevronLeft className="w-4 h-4" /> Voltar ao Dashboard</Link>
        </Button>
        <h1 className="text-3xl font-display tracking-wide">Upload de Palpites</h1>
        <Card><CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <Badge variant="destructive">Erro</Badge>
          <p>{errorMessage}</p>
          <Button onClick={handleReset}>Tentar Novamente</Button>
        </CardContent></Card>
      </div>
    )
  }

  if (step === 'preview-lote' && batchGrupos.length > 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in-up">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin"><ChevronLeft className="w-4 h-4" /> Voltar ao Dashboard</Link>
        </Button>
        <h1 className="text-3xl font-display tracking-wide">Upload em Lote — Prévia</h1>

        {batchResumo && (
          <Card>
            <CardContent className="p-4 flex flex-wrap gap-4">
              <Badge variant="info">{batchResumo.totalGrupos} grupo(s)</Badge>
              <Badge variant="success">{batchResumo.participantesExistentes} existente(s)</Badge>
              {batchResumo.novosParticipantes > 0 && <Badge variant="warning">{batchResumo.novosParticipantes} novo(s)</Badge>}
            </CardContent>
          </Card>
        )}

        <BatchPreviewTabs grupos={batchGrupos} validacao={batchValidacao!} jogos={jogos} onEdit={handleBatchEdit} />

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleReset}>Cancelar</Button>
          <Button onClick={doConfirmLote} disabled={confirming}>
            {confirming ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Confirmar Tudo'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in-up">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin"><ChevronLeft className="w-4 h-4" /> Voltar ao Dashboard</Link>
      </Button>
      <h1 className="text-3xl font-display tracking-wide">Upload de Palpites</h1>

      {fetchError && (
        <Card><CardContent className="p-4 flex items-center gap-2">
          <Badge variant="destructive">{fetchError}</Badge>
          <Button variant="secondary" onClick={() => window.location.reload()}>Tentar Novamente</Button>
        </CardContent></Card>
      )}

      <UploadModeSelector value={mode} onChange={(m) => { setMode(m); setStep('select-mode') }} />

      {mode === 'individual' && (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="participante" className="text-sm font-medium">Participante</label>
                <Select id="participante" value={participanteId} onChange={(e) => setParticipanteId(e.target.value)}>
                  <option value="">Selecione um participante</option>
                  {participantes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </Select>
              </div>
            </CardContent>
          </Card>

          {participanteId && (
            <UploadForm participanteId={participanteId} onUploadSuccess={handleUploadSuccess} onFileSelect={setSelectedFile} />
          )}

          {step === 'preview' && preview && (
            <div className="space-y-6">
              <PreviewTable preview={preview} validacao={validacao!} jogos={jogos} onEdit={handleEdit} />
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={handleReset}>Cancelar</Button>
                <Button onClick={handleConfirmClick} disabled={confirming}>
                  {confirming ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Confirmar e Salvar'}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {mode === 'lote' && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div
              onClick={() => document.getElementById('lote-file-input')?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files[0]; if (f) { setLoteFile(f); setLoteError(null) } }}
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors border-border hover:border-primary"
            >
              <input id="lote-file-input" type="file" accept=".xlsx" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setLoteFile(f); setLoteError(null) } }} className="hidden" />
              {loteFile ? (
                <div className="space-y-2">
                  <p className="font-medium">{loteFile.name}</p>
                  <p className="text-sm text-muted-foreground">{(loteFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-muted-foreground">Arraste a planilha Excel aqui ou clique para selecionar</p>
                  <p className="text-sm text-muted-foreground">.xlsx com múltiplas abas (máx. 10MB)</p>
                </div>
              )}
            </div>

            {loteError && <p className="text-sm text-danger">{loteError}</p>}

            {loteUploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Enviando...</span>
                  <span>{loteProgress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${loteProgress}%` }} />
                </div>
              </div>
            )}

            {loteFile && !loteUploading && (
              <div className="flex justify-end">
                <Button onClick={handleUploadLote}>Enviar e Processar</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Substituir Palpites</DialogTitle>
            <DialogDescription>
              Este participante já possui palpites salvos. Deseja substituir todos os palpites existentes? Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReplaceDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={doConfirm}>Substituir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds with no type errors

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/upload/page.tsx
git commit -m "feat: add batch upload mode to admin upload page"
```

---

### Task 12: Atualizar Página de Detalhe de Jogo

**Files:**
- Modify: `src/app/(public)/jogos/[id]/page.tsx`

- [ ] **Step 1: Atualizar jogos/[id]/page.tsx**

The `getJogoById` query (Task 7) now includes `palpiteGrupo.participante` instead of `participante` directly. Update the detail page to use the new structure.

Replace the entire file with:

```typescript
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getJogoById } from '@/lib/db/queries/jogos'
import { getConfiguracao } from '@/lib/db/queries/config'
import { getRanking } from '@/lib/db/queries/ranking'
import { calcularPontosJogo } from '@/lib/utils/helpers'
import { FASE_LABELS } from '@/lib/utils/constants'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Calendar, ChevronLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

const statusLabels: Record<string, string> = {
  agendado: 'Agendado',
  em_andamento: 'Em andamento',
  finalizado: 'Finalizado',
}

const statusVariants: Record<string, 'default' | 'warning' | 'success'> = {
  agendado: 'default',
  em_andamento: 'warning',
  finalizado: 'success',
}

export default async function JogoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [jogo, config, ranking] = await Promise.all([
    getJogoById(id),
    getConfiguracao(),
    getRanking(),
  ])

  if (!jogo) notFound()

  const rankingMap = new Map(ranking.map((r, idx) => [r.palpiteGrupoId, { ...r, posicao: idx + 1 }]))

  const palpitesComPontos = jogo.palpites.map((palpite) => {
    let pontos = 0
    let tipo: 'exato' | 'vencedor' | 'erro' = 'erro'

    if (jogo.status === 'finalizado' && jogo.resultadoA !== null && jogo.resultadoB !== null) {
      const resultado = calcularPontosJogo(
        palpite.placarA,
        palpite.placarB,
        jogo.resultadoA,
        jogo.resultadoB,
        config
      )
      pontos = resultado.pontos
      tipo = resultado.tipo
    }

    const rankingEntry = rankingMap.get(palpite.palpiteGrupoId)
    const posicaoRanking = rankingEntry?.posicao ?? null

    return { ...palpite, pontos, tipo, posicaoRanking }
  })

  palpitesComPontos.sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos
    return a.palpiteGrupo.participante.nome.localeCompare(b.palpiteGrupo.participante.nome)
  })

  const dataFormatada = jogo.dataHora.toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  const horaFormatada = jogo.dataHora.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in-up">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/jogos"><ChevronLeft className="w-4 h-4" /> Voltar aos jogos</Link>
      </Button>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {jogo.grupo ? <Badge variant="info">Grupo {jogo.grupo}</Badge> : <Badge variant="info">{FASE_LABELS[jogo.fase] ?? jogo.fase}</Badge>}
              <Badge variant={statusVariants[jogo.status] ?? 'default'}>{statusLabels[jogo.status] ?? jogo.status}</Badge>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {dataFormatada} · {horaFormatada}
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 py-4">
            <div className="flex-1 text-right">
              <span className="text-xl sm:text-2xl font-display tracking-wide">{jogo.timeA}</span>
            </div>
            <div className="shrink-0">
              {jogo.status === 'finalizado' ? (
                <span className="text-3xl sm:text-4xl font-display font-bold text-primary tabular-nums">{jogo.resultadoA} - {jogo.resultadoB}</span>
              ) : (
                <span className="text-lg font-medium text-muted-foreground">vs</span>
              )}
            </div>
            <div className="flex-1 text-left">
              <span className="text-xl sm:text-2xl font-display tracking-wide">{jogo.timeB}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-2xl font-display tracking-wide">Palpites ({palpitesComPontos.length})</h2>

        {palpitesComPontos.length > 0 ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participante</TableHead>
                  <TableHead>Palpite</TableHead>
                  <TableHead className="text-right">Pontos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {palpitesComPontos.map((palpite) => (
                  <TableRow key={palpite.id}>
                    <TableCell>
                      <Link href={`/participantes/${palpite.palpiteGrupo.participante.id}`} className="flex items-center gap-3 hover:text-primary transition-colors">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
                          {palpite.palpiteGrupo.participante.fotoUrl ? (
                            <Image src={palpite.palpiteGrupo.participante.fotoUrl} alt={palpite.palpiteGrupo.participante.nome} width={32} height={32} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-muted-foreground">{palpite.palpiteGrupo.participante.nome.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{palpite.palpiteGrupo.nome}</span>
                          {palpite.posicaoRanking && <span className="text-xs text-muted-foreground">{palpite.posicaoRanking}º no ranking</span>}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell><span className="font-semibold tabular-nums">{palpite.placarA} x {palpite.placarB}</span></TableCell>
                    <TableCell className="text-right">
                      {jogo.status === 'finalizado' ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-display text-lg text-primary">{palpite.pontos}</span>
                          {palpite.tipo === 'exato' && <Badge variant="success">Exato</Badge>}
                          {palpite.tipo === 'vencedor' && <Badge variant="info">Vencedor</Badge>}
                          {palpite.tipo === 'erro' && <Badge variant="destructive">Erro</Badge>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <span className="text-6xl mb-4">⚽</span>
              <h3 className="text-xl font-semibold mb-2">Nenhum palpite registrado</h3>
              <p className="text-muted-foreground text-center max-w-md">Os palpites aparecerão aqui quando cadastrados.</p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/\(public\)/jogos/\[id\]/page.tsx
git commit -m "feat: update jogo detail page for PalpiteGrupo model"
```

---

### Task 13: Run All Tests and Lint

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass (existing + new)

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No lint errors

- [ ] **Step 3: Fix any issues found**

If tests or lint fail, fix the issues and re-run until clean.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: fix lint and test issues"
```
