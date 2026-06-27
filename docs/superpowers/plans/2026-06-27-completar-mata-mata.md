# Completar Mata-Mata — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow participants to predict knockout phase matches (R32, R16, QF, SF, 3rd, Final) via the existing `/completar/{token}` link, with per-phase config, "who advances" selector for draws, and updated scoring.

**Architecture:** Extend existing "completar bolão" flow with a phase selector segmented control. Add `vencedorPalpite` field to `Palpite` model for draw predictions. Config stored as key/value pairs in existing `configuracoes` table. Scoring adds "quem passa" bonus (+6) independent from base score.

**Tech Stack:** Next.js 16, Prisma 7, React 19, TypeScript 5, Tailwind CSS 4, Jest 30

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `prisma/schema.prisma` | Add `vencedorPalpite` field to `Palpite` |
| Modify | `src/lib/utils/constants.ts` | Add `CONFIG_CHAVES` for mata-mata phases + fix `FASE_LABELS` typo |
| Modify | `src/lib/utils/types.ts` | Add `quemPassaAcertos` to `RankingEntry` |
| Modify | `src/lib/utils/helpers.ts` | Add `calcularPontosMataMata()` |
| Modify | `src/lib/db/queries/completar-bolao.ts` | Add 7 new query functions for mata-mata |
| Modify | `src/lib/db/queries/ranking.ts` | Integrate mata-mata scoring + tiebreaker |
| Modify | `src/app/api/token/[token]/route.ts` | Return `fasesHabilitadas` |
| Modify | `src/app/api/completar/[token]/jogos/route.ts` | Accept `fase` param |
| Modify | `src/app/api/completar/[token]/route.ts` | Accept `fase` in body + validar |
| Create | `src/app/api/admin/completar-bolao/fases/route.ts` | GET + PUT for phase config |
| Modify | `src/app/admin/completar-bolao/page.tsx` | Add phase config section |
| Modify | `src/app/(public)/completar/[token]/page.tsx` | Phase selector + quem passa card |
| Create | `src/components/public/phase-selector.tsx` | Segmented control component |
| Create | `src/components/public/quem-passa-card.tsx` | Draw winner selector |
| Modify | `scripts/seed.ts` | Seed 12 config entries |
| Create | `src/lib/utils/__tests__/helpers-mata-mata.test.ts` | Tests for scoring |

---

### Task 1: Schema Migration + Types + Constants

**Files:**
- Modify: `prisma/schema.prisma:101-115`
- Modify: `src/lib/utils/types.ts:37-47`
- Modify: `src/lib/utils/constants.ts:13-17,38-46`

- [ ] **Step 1: Add `vencedorPalpite` to Palpite model**

In `prisma/schema.prisma`, add after `placarB` line (line 106):

```prisma
  vencedorPalpite Int?      @map("vencedor_palpite")
```

The full Palpite model should look like:

```prisma
model Palpite {
  id              String      @id @default(uuid())
  palpiteGrupoId  String      @map("palpite_grupo_id")
  jogoId          String      @map("jogo_id")
  placarA         Int         @map("placar_a")
  placarB         Int         @map("placar_b")
  vencedorPalpite Int?        @map("vencedor_palpite")
  fonte           Fonte       @default(excel)
  criadoEm        DateTime    @default(now()) @map("criado_em")

  palpiteGrupo    PalpiteGrupo @relation(fields: [palpiteGrupoId], references: [id], onDelete: Cascade)
  jogo            Jogo         @relation(fields: [jogoId], references: [id])

  @@unique([palpiteGrupoId, jogoId])
  @@map("palpites")
}
```

- [ ] **Step 2: Run Prisma migration**

Run: `npx prisma migrate dev --name add-vencedor-palpite`
Expected: Migration created and applied. Prisma Client regenerated.

- [ ] **Step 3: Update `RankingEntry` type**

In `src/lib/utils/types.ts`, add `quemPassaAcertos: number` to `RankingEntry`:

```typescript
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
  quemPassaAcertos: number
}
```

- [ ] **Step 4: Update constants — add config keys + fix FASE_LABELS typo**

In `src/lib/utils/constants.ts`, update `CONFIG_CHAVES`:

```typescript
export const CONFIG_CHAVES = {
  PONTUACAO: 'pontuacao',
  PRAZO_COMPLETAR_BOLAO: 'prazo_completar_bolao',
  COMPLETAR_BOLAO_HABILITADO: 'completar_bolao_habilitado',
  PRAZO_MATA_MATA_DEZESSEIS_AVOS: 'prazo_mata_mata_dezesseis_avos',
  HABILITADO_MATA_MATA_DEZESSEIS_AVOS: 'habilitado_mata_mata_dezesseis_avos',
  PRAZO_MATA_MATA_OITAVAS: 'prazo_mata_mata_oitavas',
  HABILITADO_MATA_MATA_OITAVAS: 'habilitado_mata_mata_oitavas',
  PRAZO_MATA_MATA_QUARTAS: 'prazo_mata_mata_quartas',
  HABILITADO_MATA_MATA_QUARTAS: 'habilitado_mata_mata_quartas',
  PRAZO_MATA_MATA_SEMIFINAL: 'prazo_mata_mata_semifinal',
  HABILITADO_MATA_MATA_SEMIFINAL: 'habilitado_mata_mata_semifinal',
  PRAZO_MATA_MATA_TERCEIRO: 'prazo_mata_mata_terceiro',
  HABILITADO_MATA_MATA_TERCEIRO: 'habilitado_mata_mata_terceiro',
  PRAZO_MATA_MATA_FINAL: 'prazo_mata_mata_final',
  HABILITADO_MATA_MATA_FINAL: 'habilitado_mata_mata_final',
} as const
```

Also fix the typo in `FASE_LABELS` (`dezerveis_avos` → `dezesseis_avos`):

```typescript
export const FASE_LABELS: Record<string, string> = {
  grupos: 'Fase de Grupos',
  dezesseis_avos: '16avos de Final',
  oitavas: 'Oitavas de Final',
  quartas: 'Quartas de Final',
  semifinal: 'Semifinal',
  terceiro: 'Disputa pelo 3º Lugar',
  final: 'Final',
}

export const FASES_MATA_MATA = ['dezesseis_avos', 'oitavas', 'quartas', 'semifinal', 'terceiro', 'final'] as const
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds with no type errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(schema): add vencedorPalpite to Palpite + constants for mata-mata phases"
```

---

### Task 2: Scoring Function + Tests

**Files:**
- Create: `src/lib/utils/__tests__/helpers-mata-mata.test.ts`
- Modify: `src/lib/utils/helpers.ts`

- [ ] **Step 1: Write failing tests for `calcularPontosMataMata`**

Create `src/lib/utils/__tests__/helpers-mata-mata.test.ts`:

```typescript
import { calcularPontosMataMata } from '@/lib/utils/helpers'
import { PONTUACAO_PADRAO } from '@/lib/utils/constants'

describe('calcularPontosMataMata', () => {
  it('cenário 1: placar exato + quem passa correto = 16', () => {
    expect(calcularPontosMataMata(1, 1, 1, 1, 1, 1, PONTUACAO_PADRAO))
      .toEqual({ pontos: 16, tipo: 'exato', quemPassa: true })
  })

  it('cenário 2: placar exato + quem passa errado = 10', () => {
    expect(calcularPontosMataMata(1, 1, 1, 1, 1, 2, PONTUACAO_PADRAO))
      .toEqual({ pontos: 10, tipo: 'exato', quemPassa: false })
  })

  it('cenário 3: placar exato empate + quem passa correto = 16', () => {
    expect(calcularPontosMataMata(2, 2, 2, 2, 2, 2, PONTUACAO_PADRAO))
      .toEqual({ pontos: 16, tipo: 'exato', quemPassa: true })
  })

  it('cenário 4: placar exato empate + quem passa errado = 10', () => {
    expect(calcularPontosMataMata(0, 0, 1, 0, 0, 2, PONTUACAO_PADRAO))
      .toEqual({ pontos: 10, tipo: 'exato', quemPassa: false })
  })

  it('cenário 5: empate correto + quem passa correto = 12', () => {
    expect(calcularPontosMataMata(1, 1, 1, 2, 2, 1, PONTUACAO_PADRAO))
      .toEqual({ pontos: 12, tipo: 'empate', quemPassa: true })
  })

  it('cenário 6: empate correto + quem passa errado = 6', () => {
    expect(calcularPontosMataMata(1, 1, 1, 2, 2, 2, PONTUACAO_PADRAO))
      .toEqual({ pontos: 6, tipo: 'empate', quemPassa: false })
  })

  it('cenário 7: vencedor correto (sem empate) = 6', () => {
    expect(calcularPontosMataMata(2, 1, null, 2, 1, 1, PONTUACAO_PADRAO))
      .toEqual({ pontos: 6, tipo: 'vencedor', quemPassa: false })
  })

  it('cenário 8: placar exato sem empate = 10', () => {
    expect(calcularPontosMataMata(3, 1, null, 3, 1, 1, PONTUACAO_PADRAO))
      .toEqual({ pontos: 10, tipo: 'exato', quemPassa: false })
  })

  it('cenário 9: errou tudo = 0', () => {
    expect(calcularPontosMataMata(1, 0, null, 0, 2, 2, PONTUACAO_PADRAO))
      .toEqual({ pontos: 0, tipo: 'erro', quemPassa: false })
  })

  it('empate previsto sem resultado de empate = 0 (erro)', () => {
    expect(calcularPontosMataMata(1, 1, 1, 2, 0, 1, PONTUACAO_PADRAO))
      .toEqual({ pontos: 0, tipo: 'erro', quemPassa: false })
  })

  it('vencedor correto com vencedorPalpite null = 6 (sem bônus)', () => {
    expect(calcularPontosMataMata(2, 1, null, 2, 1, 1, PONTUACAO_PADRAO))
      .toEqual({ pontos: 6, tipo: 'vencedor', quemPassa: false })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/lib/utils/__tests__/helpers-mata-mata.test.ts --no-coverage`
Expected: FAIL — `calcularPontosMataMata` is not defined.

- [ ] **Step 3: Implement `calcularPontosMataMata`**

In `src/lib/utils/helpers.ts`, add after the existing `calcularPontosJogo` function:

```typescript
export function calcularPontosMataMata(
  palpiteA: number,
  palpiteB: number,
  vencedorPalpite: number | null,
  resultadoA: number,
  resultadoB: number,
  vencedor: number,
  config: ConfiguracaoPontuacao
): { pontos: number; tipo: 'exato' | 'empate' | 'vencedor' | 'erro'; quemPassa: boolean } {
  const palpiteEmpate = palpiteA === palpiteB
  const resultadoEmpate = resultadoA === resultadoB

  let pontosBase = 0
  let tipo: 'exato' | 'empate' | 'vencedor' | 'erro' = 'erro'

  if (palpiteA === resultadoA && palpiteB === resultadoB) {
    pontosBase = config.placarExato
    tipo = 'exato'
  } else if (palpiteEmpate && resultadoEmpate) {
    pontosBase = config.vencedorCorreto
    tipo = 'empate'
  } else if (Math.sign(palpiteA - palpiteB) === Math.sign(resultadoA - resultadoB)) {
    pontosBase = config.vencedorCorreto
    tipo = 'vencedor'
  }

  let quemPassa = false
  if (palpiteEmpate && resultadoEmpate && vencedorPalpite !== null && vencedorPalpite === vencedor) {
    quemPassa = true
  }

  return {
    pontos: pontosBase + (quemPassa ? config.vencedorCorreto : 0),
    tipo,
    quemPassa,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/lib/utils/__tests__/helpers-mata-mata.test.ts --no-coverage`
Expected: All 11 tests PASS.

- [ ] **Step 5: Run existing tests to verify no regression**

Run: `npx jest src/lib/services/scoring/__tests__/calculator.test.ts --no-coverage`
Expected: All existing tests still PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(scoring): calcularPontosMataMata with quem passa bonus (+6)"
```

---

### Task 3: Queries for Mata-Mata

**Files:**
- Modify: `src/lib/db/queries/completar-bolao.ts`

- [ ] **Step 1: Add new query functions**

Add the following functions to `src/lib/db/queries/completar-bolao.ts`:

```typescript
import { FASES_MATA_MATA } from '@/lib/utils/constants'
import type { Fase } from '@prisma/client'

const FASES_MATA_MATA_SET = new Set<string>(FASES_MATA_MATA)

export function isFaseMataMata(fase: string): boolean {
  return FASES_MATA_MATA_SET.has(fase)
}

export async function getFasesHabilitadas() {
  const chaves = FASES_MATA_MATA.flatMap(fase => [
    `prazo_mata_mata_${fase}`,
    `habilitado_mata_mata_${fase}`,
  ])

  const configs = await prisma.configuracao.findMany({
    where: { chave: { in: chaves } },
  })

  const configMap = new Map(configs.map(c => [c.chave, c.valor]))

  return FASES_MATA_MATA.map(fase => ({
    fase,
    habilitado: configMap.get(`habilitado_mata_mata_${fase}`) === 'true',
    prazo: configMap.get(`prazo_mata_mata_${fase}`) ?? null,
  }))
}

export async function getConfigFaseMataMata(fase: string) {
  const configs = await prisma.configuracao.findMany({
    where: {
      chave: {
        in: [`prazo_mata_mata_${fase}`, `habilitado_mata_mata_${fase}`],
      },
    },
  })

  const prazo = configs.find(c => c.chave === `prazo_mata_mata_${fase}`)
  const habilitado = configs.find(c => c.chave === `habilitado_mata_mata_${fase}`)

  return {
    prazo: prazo?.valor ? new Date(prazo.valor) : null,
    habilitado: habilitado?.valor === 'true',
  }
}

export async function setConfigFaseMataMata(fase: string, habilitado: boolean, prazo: string | null) {
  await prisma.configuracao.upsert({
    where: { chave: `habilitado_mata_mata_${fase}` },
    update: { valor: String(habilitado) },
    create: {
      chave: `habilitado_mata_mata_${fase}`,
      valor: String(habilitado),
      descricao: `Habilita/desabilita coleta de palpites para ${fase}`,
    },
  })

  if (prazo) {
    await prisma.configuracao.upsert({
      where: { chave: `prazo_mata_mata_${fase}` },
      update: { valor: prazo },
      create: {
        chave: `prazo_mata_mata_${fase}`,
        valor: prazo,
        descricao: `Prazo para palpites de ${fase} (ISO 8601)`,
      },
    })
  }
}

export async function getJogosFase(fase: string) {
  return prisma.jogo.findMany({
    where: { fase: fase as Fase },
    orderBy: { dataHora: 'asc' },
  })
}

export async function getJogosFaseComPalpites(participanteId: string, fase: string, palpiteGrupoId?: string) {
  const jogos = await getJogosFase(fase)
  const palpitesMap = palpiteGrupoId
    ? await getPalpitesPorGrupo(palpiteGrupoId)
    : await getPalpitesParticipante(participanteId)

  return jogos.map(j => ({
    id: j.id,
    fase: j.fase,
    dataHora: j.dataHora,
    timeA: j.timeA,
    timeB: j.timeB,
    status: j.status,
    resultadoA: j.resultadoA,
    resultadoB: j.resultadoB,
    palpite: palpitesMap.get(j.id) ?? null,
  }))
}

export async function salvarPalpitesFase(
  participanteId: string,
  palpites: { jogoId: string; placarA: number; placarB: number; vencedorPalpite?: number | null }[],
  palpiteGrupoId: string
) {
  const jogoIds = palpites.map(p => p.jogoId)

  await prisma.palpite.deleteMany({
    where: {
      palpiteGrupoId,
      jogoId: { in: jogoIds },
    },
  })

  await prisma.palpite.createMany({
    data: palpites.map(p => ({
      palpiteGrupoId,
      jogoId: p.jogoId,
      placarA: p.placarA,
      placarB: p.placarB,
      vencedorPalpite: p.vencedorPalpite ?? null,
      fonte: 'excel' as const,
    })),
  })

  return { totalSalvos: palpites.length, palpiteGrupoId }
}

export async function isFaseEditavel(fase: string): Promise<boolean> {
  const config = await getConfigFaseMataMata(fase)
  if (!config.habilitado) return false
  if (config.prazo && new Date() > config.prazo) return false

  const primeiroJogo = await prisma.jogo.findFirst({
    where: { fase: fase as Fase },
    orderBy: { dataHora: 'asc' },
    select: { dataHora: true },
  })

  if (primeiroJogo && new Date() >= primeiroJogo.dataHora) return false

  return true
}
```

Also update `getPalpitesPorGrupo` to include `vencedorPalpite` in the return:

```typescript
export async function getPalpitesPorGrupo(palpiteGrupoId: string) {
  const grupo = await prisma.palpiteGrupo.findUnique({
    where: { id: palpiteGrupoId },
    include: { palpites: true },
  })

  const palpitesMap = new Map<string, { placarA: number; placarB: number; vencedorPalpite: number | null }>()
  if (grupo) {
    for (const palpite of grupo.palpites) {
      palpitesMap.set(palpite.jogoId, {
        placarA: palpite.placarA,
        placarB: palpite.placarB,
        vencedorPalpite: palpite.vencedorPalpite,
      })
    }
  }

  return palpitesMap
}
```

Also update `getPalpitesParticipante` similarly:

```typescript
export async function getPalpitesParticipante(participanteId: string) {
  const grupos = await prisma.palpiteGrupo.findMany({
    where: { participanteId },
    include: { palpites: true },
  })

  const palpitesMap = new Map<string, { placarA: number; placarB: number; vencedorPalpite: number | null }>()
  for (const grupo of grupos) {
    for (const palpite of grupo.palpites) {
      palpitesMap.set(palpite.jogoId, {
        placarA: palpite.placarA,
        placarB: palpite.placarB,
        vencedorPalpite: palpite.vencedorPalpite,
      })
    }
  }

  return palpitesMap
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(queries): add mata-mata phase queries (getFasesHabilitadas, salvarPalpitesFase, etc.)"
```

---

### Task 4: Ranking Integration

**Files:**
- Modify: `src/lib/db/queries/ranking.ts`

- [ ] **Step 1: Update ranking query to use `calcularPontosMataMata` for knockout games**

Replace `src/lib/db/queries/ranking.ts` with:

```typescript
import { prisma } from '../client'
import { getConfiguracao } from './config'
import { calcularPontosJogo, calcularPontosMataMata, calcularPontosExtra } from '@/lib/utils/helpers'
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
    let quemPassaAcertos = 0

    for (const palpite of g.palpites) {
      if (palpite.jogo.status !== 'finalizado') continue
      if (palpite.jogo.resultadoA === null || palpite.jogo.resultadoB === null) continue

      const isMataMata = palpite.jogo.fase !== 'grupos'

      if (isMataMata && palpite.jogo.vencedor !== null) {
        const resultado = calcularPontosMataMata(
          palpite.placarA, palpite.placarB,
          palpite.vencedorPalpite,
          palpite.jogo.resultadoA, palpite.jogo.resultadoB,
          palpite.jogo.vencedor,
          config
        )
        pontos += resultado.pontos
        if (resultado.tipo === 'exato') placaresExatos++
        if (resultado.tipo === 'vencedor' || resultado.tipo === 'exato') vencedoresCorretos++
        if (resultado.quemPassa) quemPassaAcertos++
      } else {
        const resultado = calcularPontosJogo(
          palpite.placarA, palpite.placarB,
          palpite.jogo.resultadoA, palpite.jogo.resultadoB,
          config
        )
        pontos += resultado.pontos
        if (resultado.tipo === 'exato') placaresExatos++
        if (resultado.tipo === 'vencedor' || resultado.tipo === 'exato') vencedoresCorretos++
      }
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
      quemPassaAcertos,
    }
  })

  return ranking.sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos
    if (b.placaresExatos !== a.placaresExatos) return b.placaresExatos - a.placaresExatos
    if (b.vencedoresCorretos !== a.vencedoresCorretos) return b.vencedoresCorretos - a.vencedoresCorretos
    return b.quemPassaAcertos - a.quemPassaAcertos
  })
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ranking): integrate mata-mata scoring with quemPassa tiebreaker"
```

---

### Task 5: API Routes

**Files:**
- Modify: `src/app/api/token/[token]/route.ts`
- Modify: `src/app/api/completar/[token]/jogos/route.ts`
- Modify: `src/app/api/completar/[token]/route.ts`
- Create: `src/app/api/admin/completar-bolao/fases/route.ts`

- [ ] **Step 1: Update `GET /api/token/{token}` to return `fasesHabilitadas`**

Replace `src/app/api/token/[token]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getParticipanteByToken, getConfigCompletarBolao, getFasesHabilitadas } from '@/lib/db/queries/completar-bolao'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
    }

    const participante = await getParticipanteByToken(token)

    if (!participante) {
      return NextResponse.json({ valido: false, erro: 'Token inválido' }, { status: 404 })
    }

    const [config, fasesHabilitadas] = await Promise.all([
      getConfigCompletarBolao(),
      getFasesHabilitadas(),
    ])

    return NextResponse.json({
      valido: true,
      participanteId: participante.id,
      nome: participante.nome,
      fotoUrl: participante.fotoUrl,
      prazo: config.prazo.toISOString(),
      habilitado: config.habilitado,
      fasesHabilitadas: [
        { fase: 'grupos', habilitado: config.habilitado, prazo: config.prazo.toISOString() },
        ...fasesHabilitadas.map(f => ({
          fase: f.fase,
          habilitado: f.habilitado,
          prazo: f.prazo,
        })),
      ],
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Update `GET /api/completar/{token}/jogos` to accept `fase` param**

Replace `src/app/api/completar/[token]/jogos/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import {
  getParticipanteByToken,
  getJogosRestantesComPalpites,
  getJogosCompletosComPalpites,
  getJogosFaseComPalpites,
  getGruposParticipante,
  getExtrasPorGrupo,
  detectarModoGrupo,
  getFasesHabilitadas,
  isFaseMataMata,
} from '@/lib/db/queries/completar-bolao'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
    }

    const participante = await getParticipanteByToken(token)

    if (!participante) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const palpiteGrupoId = searchParams.get('grupoId') ?? undefined
    const fase = searchParams.get('fase') ?? 'grupos'

    const gruposRaw = await getGruposParticipante(participante.id)
    const gruposComModo = await Promise.all(
      gruposRaw.map(async (g) => ({
        ...g,
        modo: await detectarModoGrupo(g.id),
      }))
    )

    const targetGrupoId = palpiteGrupoId ?? gruposComModo[0]?.id

    if (isFaseMataMata(fase)) {
      const jogos = await getJogosFaseComPalpites(participante.id, fase, targetGrupoId)
      const fasesHabilitadas = await getFasesHabilitadas()
      return NextResponse.json({
        fase,
        jogos,
        fasesHabilitadas: [
          { fase: 'grupos', habilitado: true, prazo: null },
          ...fasesHabilitadas,
        ],
      })
    }

    const modo = gruposComModo.find((g) => g.id === targetGrupoId)?.modo ?? 'restante'

    const [jogos, extras] = await Promise.all([
      modo === 'completo'
        ? getJogosCompletosComPalpites(participante.id, targetGrupoId)
        : getJogosRestantesComPalpites(participante.id, targetGrupoId),
      modo === 'completo' && targetGrupoId
        ? getExtrasPorGrupo(targetGrupoId)
        : Promise.resolve([]),
    ])

    const fasesHabilitadas = await getFasesHabilitadas()

    return NextResponse.json({
      fase: 'grupos',
      grupos: gruposComModo,
      jogos,
      extras: extras.map((e) => ({ tipo: e.tipo, valor: e.valor })),
      fasesHabilitadas: [
        { fase: 'grupos', habilitado: true, prazo: null },
        ...fasesHabilitadas,
      ],
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Update `POST /api/completar/{token}` to handle `fase`**

Replace `src/app/api/completar/[token]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import {
  getParticipanteByToken,
  getConfigCompletarBolao,
  getConfigFaseMataMata,
  salvarPalpitesCompletar,
  salvarPalpitesFase,
  salvarExtrasCompletar,
  getJogosRestantes,
  getJogosCompletos,
  getJogosFase,
  detectarModoGrupo,
  getGruposParticipante,
  isFaseMataMata,
} from '@/lib/db/queries/completar-bolao'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
    }

    const participante = await getParticipanteByToken(token)

    if (!participante) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 404 })
    }

    const body = await request.json()
    const { palpites, extras, palpiteGrupoId, fase = 'grupos' } = body as {
      palpites: { jogoId: string; placarA: number; placarB: number; vencedorPalpite?: number | null }[]
      extras?: { tipo: string; valor: string }[]
      palpiteGrupoId?: string
      fase?: string
    }

    if (!Array.isArray(palpites) || palpites.length === 0) {
      return NextResponse.json({ error: 'Palpites inválidos' }, { status: 400 })
    }

    for (const p of palpites) {
      if (!p.jogoId || typeof p.placarA !== 'number' || typeof p.placarB !== 'number') {
        return NextResponse.json({ error: 'Formato de palpite inválido' }, { status: 400 })
      }
      if (p.placarA < 0 || p.placarB < 0 || p.placarA > 99 || p.placarB > 99) {
        return NextResponse.json({ error: 'Placar inválido' }, { status: 400 })
      }
    }

    if (isFaseMataMata(fase)) {
      const configFase = await getConfigFaseMataMata(fase)

      if (!configFase.habilitado) {
        return NextResponse.json({ error: 'Fase não habilitada para palpites' }, { status: 403 })
      }

      if (configFase.prazo && new Date() > configFase.prazo) {
        return NextResponse.json({ error: 'Prazo da fase encerrado' }, { status: 403 })
      }

      const jogosFase = await getJogosFase(fase)
      const jogosFaseIds = new Set(jogosFase.map(j => j.id))
      const jogosFaseMap = new Map(jogosFase.map(j => [j.id, j]))

      for (const p of palpites) {
        if (!jogosFaseIds.has(p.jogoId)) {
          return NextResponse.json({ error: `Jogo ${p.jogoId} não pertence a esta fase` }, { status: 400 })
        }
        const jogo = jogosFaseMap.get(p.jogoId)!
        if (new Date() >= jogo.dataHora) {
          return NextResponse.json({ error: `Jogo ${p.jogoId} já começou` }, { status: 400 })
        }
        if (p.placarA === p.placarB && (p.vencedorPalpite !== 1 && p.vencedorPalpite !== 2)) {
          return NextResponse.json({ error: 'Empate: escolha qual time passa' }, { status: 400 })
        }
      }

      const grupos = await getGruposParticipante(participante.id)
      const targetGrupoId = palpiteGrupoId ?? grupos[0]?.id
      if (!targetGrupoId) {
        return NextResponse.json({ error: 'Grupo de palpites não encontrado' }, { status: 404 })
      }

      const resultado = await salvarPalpitesFase(participante.id, palpites, targetGrupoId)
      return NextResponse.json({ success: true, ...resultado })
    }

    const config = await getConfigCompletarBolao()

    if (!config.habilitado) {
      return NextResponse.json({ error: 'A coleta de palpites está desabilitada no momento' }, { status: 403 })
    }

    if (new Date() > config.prazo) {
      return NextResponse.json({ error: 'O prazo para completar o bolão já foi encerrado' }, { status: 403 })
    }

    const grupos = await getGruposParticipante(participante.id)
    const targetGrupoId = palpiteGrupoId ?? grupos[0]?.id
    const modo = targetGrupoId ? await detectarModoGrupo(targetGrupoId) : 'restante'

    const maxPalpites = modo === 'completo' ? 72 : 39
    if (palpites.length > maxPalpites) {
      return NextResponse.json({ error: `Máximo de ${maxPalpites} palpites permitidos` }, { status: 400 })
    }

    const jogosValidos = modo === 'completo' ? await getJogosCompletos() : await getJogosRestantes()
    const jogosValidosIds = new Set(jogosValidos.map(j => j.id))

    for (const p of palpites) {
      if (!jogosValidosIds.has(p.jogoId)) {
        return NextResponse.json({ error: `Jogo ${p.jogoId} não é um jogo válido para o modo atual` }, { status: 400 })
      }
    }

    const resultado = await salvarPalpitesCompletar(participante.id, palpites.map(p => ({
      jogoId: p.jogoId,
      placarA: p.placarA,
      placarB: p.placarB,
    })), palpiteGrupoId)

    if (modo === 'completo' && Array.isArray(extras) && extras.length > 0) {
      const tiposValidos = ['artilheiro', 'campeao', 'vice', 'terceiro', 'quarto']
      for (const e of extras) {
        if (!tiposValidos.includes(e.tipo) || !e.valor || typeof e.valor !== 'string') {
          return NextResponse.json({ error: 'Extra inválido' }, { status: 400 })
        }
      }
      await salvarExtrasCompletar(
        resultado.palpiteGrupoId,
        extras as { tipo: 'artilheiro' | 'campeao' | 'vice' | 'terceiro' | 'quarto'; valor: string }[]
      )
    }

    return NextResponse.json({ success: true, ...resultado })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Create admin API route `GET/PUT /api/admin/completar-bolao/fases`**

Create `src/app/api/admin/completar-bolao/fases/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getFasesHabilitadas, setConfigFaseMataMata, isFaseMataMata } from '@/lib/db/queries/completar-bolao'
import { requireAdmin } from '@/lib/auth/middleware'

export async function GET() {
  try {
    await requireAdmin()
    const fases = await getFasesHabilitadas()
    return NextResponse.json({ fases })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const { fase, habilitado, prazo } = body as {
      fase: string
      habilitado: boolean
      prazo?: string | null
    }

    if (!fase || !isFaseMataMata(fase)) {
      return NextResponse.json({ error: 'Fase inválida' }, { status: 400 })
    }

    if (typeof habilitado !== 'boolean') {
      return NextResponse.json({ error: 'Campo habilitado é obrigatório' }, { status: 400 })
    }

    await setConfigFaseMataMata(fase, habilitado, prazo ?? null)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(api): add fase param to completar routes + admin fases config endpoint"
```

---

### Task 6: Seed Config + Admin Page

**Files:**
- Modify: `scripts/seed.ts`
- Modify: `src/app/admin/completar-bolao/page.tsx`

- [ ] **Step 1: Add seed for 12 config entries**

In `scripts/seed.ts`, add after the "Pontuação padrão configurada" section (before `}` closing `main()`):

```typescript
  console.log('Configurando fases do mata-mata...')

  const fasesMataMata = ['dezesseis_avos', 'oitavas', 'quartas', 'semifinal', 'terceiro', 'final']
  for (const fase of fasesMataMata) {
    await prisma.configuracao.upsert({
      where: { chave: `habilitado_mata_mata_${fase}` },
      update: {},
      create: {
        chave: `habilitado_mata_mata_${fase}`,
        valor: 'false',
        descricao: `Habilita/desabilita coleta de palpites para ${fase}`,
      },
    })
    await prisma.configuracao.upsert({
      where: { chave: `prazo_mata_mata_${fase}` },
      update: {},
      create: {
        chave: `prazo_mata_mata_${fase}`,
        valor: '',
        descricao: `Prazo para palpites de ${fase} (ISO 8601)`,
      },
    })
  }

  console.log('Fases do mata-mata configuradas')
```

- [ ] **Step 2: Run seed**

Run: `npx tsx --env-file=.env scripts/seed.ts`
Expected: "Fases do mata-mata configuradas"

- [ ] **Step 3: Add phase config section to admin page**

In `src/app/admin/completar-bolao/page.tsx`, add a new section after the existing "Configurações" card. Add state and fetch logic:

Add to the interface section:

```typescript
interface FaseConfig {
  fase: string
  habilitado: boolean
  prazo: string | null
}
```

Add state:

```typescript
const [fases, setFases] = useState<FaseConfig[]>([])
```

Add to `fetchData`:

```typescript
const fasesRes = await fetch('/api/admin/completar-bolao/fases')
if (fasesRes.ok) {
  const fasesData = await fasesRes.json()
  setFases(fasesData.fases)
}
```

Add the phase config section after the existing Configurações card, before the participants table:

```tsx
<Card>
  <CardContent className="p-4 space-y-4">
    <div className="flex items-center gap-2">
      <Settings className="w-5 h-5" />
      <h2 className="text-lg font-semibold">Fases do Mata-Mata</h2>
    </div>
    <div className="space-y-3">
      {fases.map((f) => (
        <FaseConfigCard
          key={f.fase}
          fase={f}
          onUpdate={(updated) => {
            setFases(prev => prev.map(pf => pf.fase === updated.fase ? updated : pf))
          }}
        />
      ))}
    </div>
  </CardContent>
</Card>
```

Add the `FaseConfigCard` component (can be inline in the same file or extracted):

```tsx
function FaseConfigCard({ fase, onUpdate }: { fase: FaseConfig; onUpdate: (f: FaseConfig) => void }) {
  const [editando, setEditando] = useState(false)
  const [prazoInput, setPrazoInput] = useState('')
  const [salvando, setSalvando] = useState(false)

  const FASE_LABELS_MAP: Record<string, string> = {
    dezesseis_avos: '16avos de Final',
    oitavas: 'Oitavas de Final',
    quartas: 'Quartas de Final',
    semifinal: 'Semifinal',
    terceiro: 'Disputa 3º Lugar',
    final: 'Final',
  }

  const status = !fase.habilitado
    ? { label: 'Fechada', variant: 'secondary' as const }
    : fase.prazo && new Date(fase.prazo) < new Date()
      ? { label: 'Encerrada', variant: 'warning' as const }
      : { label: 'Aberta', variant: 'success' as const }

  async function toggle() {
    setSalvando(true)
    try {
      const res = await fetch('/api/admin/completar-bolao/fases', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fase: fase.fase, habilitado: !fase.habilitado, prazo: fase.prazo }),
      })
      if (!res.ok) throw new Error('Erro')
      onUpdate({ ...fase, habilitado: !fase.habilitado })
    } catch {
      toast.error('Erro ao atualizar')
    } finally {
      setSalvando(false)
    }
  }

  async function salvarPrazo() {
    setSalvando(true)
    try {
      const prazoISO = new Date(prazoInput).toISOString()
      const res = await fetch('/api/admin/completar-bolao/fases', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fase: fase.fase, habilitado: fase.habilitado, prazo: prazoISO }),
      })
      if (!res.ok) throw new Error('Erro')
      onUpdate({ ...fase, prazo: prazoISO })
      setEditando(false)
    } catch {
      toast.error('Erro ao atualizar prazo')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-lg border">
      <div className="flex items-center gap-3">
        <span className="font-medium text-sm">{FASE_LABELS_MAP[fase.fase] ?? fase.fase}</span>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
      <div className="flex items-center gap-2">
        {editando ? (
          <>
            <Input
              type="datetime-local"
              value={prazoInput}
              onChange={(e) => setPrazoInput(e.target.value)}
              className="h-8 text-sm"
            />
            <Button size="sm" onClick={salvarPrazo} disabled={salvando}>Salvar</Button>
            <Button size="sm" variant="outline" onClick={() => setEditando(false)}>Cancelar</Button>
          </>
        ) : (
          <>
            <span className="text-xs text-muted-foreground">
              {fase.prazo ? formatarDataHoraCompleta(new Date(fase.prazo)) : 'Sem prazo'}
            </span>
            <Button variant="outline" size="sm" onClick={() => {
              if (fase.prazo) {
                const d = new Date(fase.prazo)
                setPrazoInput(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16))
              }
              setEditando(true)
            }}>Prazo</Button>
            <Button variant="outline" size="sm" onClick={toggle} disabled={salvando}>
              {fase.habilitado ? 'Desabilitar' : 'Habilitar'}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(admin): phase config UI for mata-mata (toggle + deadline per phase)"
```

---

### Task 7: Phase Selector + Quem Passa Components

**Files:**
- Create: `src/components/public/phase-selector.tsx`
- Create: `src/components/public/quem-passa-card.tsx`

- [ ] **Step 1: Create `PhaseSelector` component**

Create `src/components/public/phase-selector.tsx`:

```tsx
'use client'

import { FASE_LABELS } from '@/lib/utils/constants'
import { cn } from '@/lib/utils'

interface FaseInfo {
  fase: string
  habilitado: boolean
  prazo: string | null
}

interface PhaseSelectorProps {
  fases: FaseInfo[]
  faseAtiva: string
  onFaseChange: (fase: string) => void
}

export function PhaseSelector({ fases, faseAtiva, onFaseChange }: PhaseSelectorProps) {
  function getStatus(f: FaseInfo) {
    if (f.fase === 'grupos') return { label: 'Grupos', disabled: false, active: faseAtiva === 'grupos' }
    if (!f.habilitado) return { label: FASE_LABELS[f.fase] ?? f.fase, disabled: true, active: false }
    const encerrada = f.prazo && new Date(f.prazo) < new Date()
    return {
      label: FASE_LABELS[f.fase] ?? f.fase,
      disabled: false,
      active: faseAtiva === f.fase,
      encerrada: !!encerrada,
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Fases do campeonato">
      {fases.map((f) => {
        const s = getStatus(f)
        return (
          <button
            key={f.fase}
            role="tab"
            aria-selected={s.active}
            disabled={s.disabled}
            onClick={() => !s.disabled && onFaseChange(f.fase)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              s.active && 'bg-primary text-primary-foreground',
              !s.active && !s.disabled && 'bg-muted hover:bg-muted/80 cursor-pointer',
              s.disabled && 'bg-muted/40 text-muted-foreground/50 cursor-not-allowed',
            )}
          >
            {s.label}
            {s.encerrada && !s.active && (
              <span className="ml-1 text-xs opacity-70">✓</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Create `QuemPassaCard` component**

Create `src/components/public/quem-passa-card.tsx`:

```tsx
'use client'

import { cn } from '@/lib/utils'

interface QuemPassaCardProps {
  timeA: string
  timeB: string
  selecionado: number | null
  onSelect: (time: 1 | 2) => void
  disabled?: boolean
}

export function QuemPassaCard({ timeA, timeB, selecionado, onSelect, disabled }: QuemPassaCardProps) {
  return (
    <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
      <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
        Empate! Quem passa?
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelect(1)}
          className={cn(
            'flex items-center justify-center gap-2 h-14 rounded-lg border-2 text-sm font-medium transition-all',
            selecionado === 1
              ? 'border-green-500 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200'
              : 'border-muted bg-background hover:border-blue-300',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          {timeA}
          {selecionado === 1 && <span className="text-green-600">✓</span>}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelect(2)}
          className={cn(
            'flex items-center justify-center gap-2 h-14 rounded-lg border-2 text-sm font-medium transition-all',
            selecionado === 2
              ? 'border-green-500 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200'
              : 'border-muted bg-background hover:border-blue-300',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          {timeB}
          {selecionado === 2 && <span className="text-green-600">✓</span>}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(components): PhaseSelector + QuemPassaCard for knockout predictions"
```

---

### Task 8: Completar Page — Phase Integration

**Files:**
- Modify: `src/app/(public)/completar/[token]/page.tsx`

This is the largest change. The existing page (734 lines) needs:
1. Phase selector at top
2. Conditional rendering based on selected phase
3. QuemPassaCard for knockout draws
4. Per-phase draft keys
5. Phase-aware save logic

- [ ] **Step 1: Add phase state and data fetching**

At the top of the component, add phase state:

```typescript
const [faseAtiva, setFaseAtiva] = useState('grupos')
const [fasesHabilitadas, setFasesHabilitadas] = useState<{ fase: string; habilitado: boolean; prazo: string | null }[]>([])
const [jogosMataMata, setJogosMataMata] = useState<any[]>([])
```

- [ ] **Step 2: Update initial data fetch to include fasesHabilitadas**

In the existing `carregarDados()` function, the response from `/api/completar/{token}/jogos` now includes `fasesHabilitadas`. Add:

```typescript
if (data.fasesHabilitadas) {
  setFasesHabilitadas(data.fasesHabilitadas)
}
```

- [ ] **Step 3: Add function to load mata-mata phase data**

```typescript
async function carregarFase(fase: string) {
  if (fase === 'grupos') return
  const res = await fetch(`/api/completar/${token}/jogos?fase=${fase}`)
  if (!res.ok) return
  const data = await res.json()
  setJogosMataMata(data.jogos)
}
```

Call this when `faseAtiva` changes:

```typescript
useEffect(() => {
  if (faseAtiva !== 'grupos') {
    carregarFase(faseAtiva)
  }
}, [faseAtiva, token])
```

- [ ] **Step 4: Add PhaseSelector to the page layout**

After the header section (participant name + badges), add:

```tsx
{fasesHabilitadas.length > 0 && (
  <PhaseSelector
    fases={fasesHabilitadas}
    faseAtiva={faseAtiva}
    onFaseChange={setFaseAtiva}
  />
)}
```

- [ ] **Step 5: Conditional rendering for grupos vs mata-mata**

Wrap the existing game list in a condition:

```tsx
{faseAtiva === 'grupos' ? (
  // ... existing game list code (unchanged)
) : (
  <MataMataGames
    jogos={jogosMataMata}
    fase={faseAtiva}
    token={token}
    targetGrupoId={targetGrupoId}
    onSalvo={carregarDados}
  />
)}
```

- [ ] **Step 6: Create MataMataGames inline component**

This renders the knockout games for the selected phase, with QuemPassaCard integration:

```tsx
function MataMataGames({ jogos, fase, token, targetGrupoId, onSalvo }: {
  jogos: any[]
  fase: string
  token: string
  targetGrupoId: string | undefined
  onSalvo: () => void
}) {
  const [palpites, setPalpites] = useState<Map<string, { placarA: number | null; placarB: number | null; vencedorPalpite: number | null }>>(new Map())
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    const map = new Map()
    for (const j of jogos) {
      map.set(j.id, {
        placarA: j.palpite?.placarA ?? null,
        placarB: j.palpite?.placarB ?? null,
        vencedorPalpite: j.palpite?.vencedorPalpite ?? null,
      })
    }
    setPalpites(map)
  }, [jogos])

  function atualizar(jogoId: string, campo: string, valor: number | null) {
    setPalpites(prev => {
      const next = new Map(prev)
      const atual = next.get(jogoId) ?? { placarA: null, placarB: null, vencedorPalpite: null }
      const novo = { ...atual, [campo]: valor }
      if (campo === 'placarA' || campo === 'placarB') {
        if (novo.placarA !== novo.placarB) {
          novo.vencedorPalpite = null
        }
      }
      next.set(jogoId, novo)
      return next
    })
    setSucesso(false)
  }

  async function salvar() {
    setSalvando(true)
    try {
      const payload = Array.from(palpites.entries())
        .filter(([, p]) => p.placarA !== null && p.placarB !== null)
        .map(([jogoId, p]) => ({
          jogoId,
          placarA: p.placarA!,
          placarB: p.placarB!,
          vencedorPalpite: p.placarA === p.placarB ? p.vencedorPalpite : null,
        }))

      const res = await fetch(`/api/completar/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fase, palpites: payload, palpiteGrupoId: targetGrupoId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao salvar')
      }

      setSucesso(true)
      onSalvo()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  const preenchidos = Array.from(palpites.values()).filter(p => p.placarA !== null && p.placarB !== null).length
  const total = jogos.length
  const todosPreenchidos = preenchidos === total && total > 0
  const temEmpateSemQuemPassa = Array.from(palpites.entries()).some(([jogoId, p]) => {
    if (p.placarA === null || p.placarB === null) return false
    const jogo = jogos.find(j => j.id === jogoId)
    if (!jogo || jogo.status === 'finalizado') return false
    return p.placarA === p.placarB && p.vencedorPalpite === null
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{FASE_LABELS[fase]}</h2>
        <Badge variant="secondary">{preenchidos}/{total} preenchidos</Badge>
      </div>

      {sucesso && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
          <CardContent className="p-4 text-center text-green-700 dark:text-green-300">
            Palpites salvos com sucesso!
          </CardContent>
        </Card>
      )}

      {jogos.map((jogo) => {
        const p = palpites.get(jogo.id) ?? { placarA: null, placarB: null, vencedorPalpite: null }
        const travado = jogo.status === 'finalizado' || new Date() >= new Date(jogo.dataHora)

        return (
          <Card key={jogo.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-sm font-medium truncate">{jogo.timeA ?? 'TBD'}</span>
                  <span className="text-xs text-muted-foreground">vs</span>
                  <span className="text-sm font-medium truncate">{jogo.timeB ?? 'TBD'}</span>
                </div>
                {jogo.status === 'finalizado' && (
                  <Badge variant="outline" className="text-xs">
                    {jogo.resultadoA} x {jogo.resultadoB}
                  </Badge>
                )}
              </div>
              {!travado && (
                <>
                  <div className="flex items-center gap-2 mt-3">
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={p.placarA ?? ''}
                      onChange={(e) => atualizar(jogo.id, 'placarA', e.target.value === '' ? null : parseInt(e.target.value))}
                      className="w-16 h-10 text-center rounded-md border text-lg font-display"
                      placeholder="-"
                    />
                    <span className="text-muted-foreground font-bold">×</span>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={p.placarB ?? ''}
                      onChange={(e) => atualizar(jogo.id, 'placarB', e.target.value === '' ? null : parseInt(e.target.value))}
                      className="w-16 h-10 text-center rounded-md border text-lg font-display"
                      placeholder="-"
                    />
                  </div>
                  {p.placarA !== null && p.placarB !== null && p.placarA === p.placarB && (
                    <QuemPassaCard
                      timeA={jogo.timeA ?? 'TBD'}
                      timeB={jogo.timeB ?? 'TBD'}
                      selecionado={p.vencedorPalpite}
                      onSelect={(v) => atualizar(jogo.id, 'vencedorPalpite', v)}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )
      })}

      {todosPreenchidos && (
        <Button
          onClick={salvar}
          disabled={salvando || temEmpateSemQuemPassa}
          className="w-full"
        >
          {salvando ? 'Salvando...' : 'Salvar Palpites'}
        </Button>
      )}

      {temEmpateSemQuemPassa && todosPreenchidos && (
        <p className="text-sm text-amber-600 text-center">
          Escolha qual time passa em cada empate
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Add imports**

At the top of the page file, add:

```typescript
import { PhaseSelector } from '@/components/public/phase-selector'
import { QuemPassaCard } from '@/components/public/quem-passa-card'
import { FASE_LABELS } from '@/lib/utils/constants'
```

- [ ] **Step 8: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: Build and lint succeed.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(completar): phase selector + knockout predictions with quem passa"
```

---

### Task 9: Final Verification

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass (including new `helpers-mata-mata.test.ts`).

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Manual verification checklist**

- [ ] Admin can enable/disable each phase in `/admin/completar-bolao`
- [ ] Admin can set deadline per phase
- [ ] Participant sees phase selector in `/completar/{token}`
- [ ] Participant can enter scores for knockout games
- [ ] "Quem passa?" card appears when score is a draw
- [ ] Save fails if draw without selecting who advances
- [ ] Locked games show as read-only
- [ ] Ranking includes mata-mata points with quemPassa tiebreaker

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: final adjustments for mata-mata feature"
```
