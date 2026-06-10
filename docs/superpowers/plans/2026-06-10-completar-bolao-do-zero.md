# Completar Bolão do Zero — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow participants without any existing palpites to fill all 72 group-stage games + 5 extras from scratch via the `/completar/{token}` link, with admin creating empty PalpiteGrupos via a "Novo Palpite" button.

**Architecture:** Zero schema changes. Mode detection is automatic: if a PalpiteGrupo has 0 palpites on `isBolao=true` games, it's "completo" mode (72 games + extras). Otherwise "restante" mode (39 games). New admin endpoints create empty groups; existing participant flow extends to support extras and full game list.

**Tech Stack:** Next.js 16, Prisma 7, React 19, TypeScript, Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-06-10-completar-bolao-do-zero-design.md`

---

### Task 1: Queries — `detectarModoGrupo` + `getJogosCompletos`

**Files:**
- Modify: `src/lib/db/queries/completar-bolao.ts`

- [ ] **Step 1: Add `detectarModoGrupo` function**

Add after `getJogosRestantes()` (line 22):

```typescript
export async function detectarModoGrupo(palpiteGrupoId: string): Promise<'completo' | 'restante'> {
  const count = await prisma.palpite.count({
    where: {
      palpiteGrupoId,
      jogo: { isBolao: true },
    },
  })
  return count === 0 ? 'completo' : 'restante'
}
```

- [ ] **Step 2: Add `getJogosCompletos` function**

Add after `getJogosRestantes()`:

```typescript
export async function getJogosCompletos() {
  return prisma.jogo.findMany({
    where: { fase: 'grupos' },
    orderBy: { dataHora: 'asc' },
  })
}
```

- [ ] **Step 3: Add `getJogosCompletosComPalpites` function**

Add after `getJogosRestantesComPalpites()` (end of file):

```typescript
export async function getJogosCompletosComPalpites(participanteId: string, palpiteGrupoId?: string) {
  const jogos = await getJogosCompletos()
  const palpitesMap = palpiteGrupoId
    ? await getPalpitesPorGrupo(palpiteGrupoId)
    : await getPalpitesParticipante(participanteId)

  return jogos.map((j) => ({
    id: j.id,
    grupo: j.grupo,
    dataHora: j.dataHora,
    timeA: j.timeA,
    timeB: j.timeB,
    palpite: palpitesMap.get(j.id) ?? null,
  }))
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to `completar-bolao.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/queries/completar-bolao.ts
git commit -m "feat: add detectarModoGrupo and getJogosCompletos queries"
```

---

### Task 2: Queries — `getExtrasPorGrupo` + `salvarExtrasCompletar`

**Files:**
- Modify: `src/lib/db/queries/completar-bolao.ts`

- [ ] **Step 1: Add `getExtrasPorGrupo` function**

Add after `getPalpitesPorGrupo()`:

```typescript
export async function getExtrasPorGrupo(palpiteGrupoId: string) {
  return prisma.palpiteExtra.findMany({
    where: { palpiteGrupoId },
    orderBy: { tipo: 'asc' },
  })
}
```

- [ ] **Step 2: Add `salvarExtrasCompletar` function**

Add after `salvarPalpitesCompletar()`:

```typescript
export async function salvarExtrasCompletar(
  palpiteGrupoId: string,
  extras: { tipo: 'artilheiro' | 'campeao' | 'vice' | 'terceiro' | 'quarto'; valor: string }[]
) {
  for (const extra of extras) {
    await prisma.palpiteExtra.upsert({
      where: {
        palpiteGrupoId_tipo: { palpiteGrupoId, tipo: extra.tipo },
      },
      update: { valor: extra.valor },
      create: {
        palpiteGrupoId,
        tipo: extra.tipo,
        valor: extra.valor,
        fonte: 'excel',
      },
    })
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/queries/completar-bolao.ts
git commit -m "feat: add getExtrasPorGrupo and salvarExtrasCompletar queries"
```

---

### Task 3: Queries — `criarNovoPalpite` + `getParticipantesElegiveis`

**Files:**
- Modify: `src/lib/db/queries/completar-bolao.ts`

- [ ] **Step 1: Add `getParticipantesElegiveis` function**

Add at end of file:

```typescript
export async function getParticipantesElegiveis() {
  const participantesComGrupos = await prisma.palpiteGrupo.findMany({
    select: { participanteId: true },
    distinct: ['participanteId'],
  })
  const idsComGrupos = new Set(participantesComGrupos.map((g) => g.participanteId))

  const todos = await prisma.participante.findMany({
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true },
  })

  return todos.filter((p) => !idsComGrupos.has(p.id))
}
```

- [ ] **Step 2: Add `criarNovoPalpite` function**

Add after `getParticipantesElegiveis`:

```typescript
export async function criarNovoPalpite(participanteId: string, apelido?: string) {
  const gruposExistentes = await prisma.palpiteGrupo.count({
    where: { participanteId },
  })

  if (gruposExistentes > 0) {
    throw new Error('Participante já possui palpites')
  }

  const participante = await prisma.participante.findUnique({
    where: { id: participanteId },
  })

  if (!participante) {
    throw new Error('Participante não encontrado')
  }

  return prisma.palpiteGrupo.create({
    data: {
      participanteId,
      nome: `completo-${Date.now()}`,
      apelido: apelido || 'Palpite 1',
      fonte: 'excel',
    },
  })
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/queries/completar-bolao.ts
git commit -m "feat: add criarNovoPalpite and getParticipantesElegiveis queries"
```

---

### Task 4: Queries — Modify `getStatusCompletarBolao` for mode detection

**Files:**
- Modify: `src/lib/db/queries/completar-bolao.ts:165-213`

- [ ] **Step 1: Replace `getStatusCompletarBolao` function**

Replace the entire function (lines 165-213) with:

```typescript
export async function getStatusCompletarBolao() {
  const participantes = await prisma.participante.findMany({
    orderBy: { nome: 'asc' },
    include: {
      grupos: {
        include: {
          palpites: {
            select: { jogoId: true, jogo: { select: { isBolao: true } } },
          },
        },
      },
    },
  })

  const totalJogosGrupos = await prisma.jogo.count({ where: { fase: 'grupos' } })
  const totalJogosRestantes = await prisma.jogo.count({ where: { isBolao: false, fase: 'grupos' } })

  const jogosGruposIds = await prisma.jogo.findMany({
    where: { fase: 'grupos' },
    select: { id: true },
  })
  const jogosGruposSet = new Set(jogosGruposIds.map((j) => j.id))

  const jogosRestantesIds = await prisma.jogo.findMany({
    where: { isBolao: false, fase: 'grupos' },
    select: { id: true },
  })
  const jogosRestantesSet = new Set(jogosRestantesIds.map((j) => j.id))

  return participantes.map((p) => {
    if (p.grupos.length === 0) {
      return {
        id: p.id,
        nome: p.nome,
        token: p.token,
        fotoUrl: p.fotoUrl,
        totalJogos: totalJogosGrupos,
        jogosCompletos: 0,
        jogosFaltando: totalJogosGrupos,
        completo: false,
        modo: 'completo' as const,
        extrasCompletos: 0,
        totalExtras: 5,
      }
    }

    let totalCompletos = 0
    let modo: 'completo' | 'restante' = 'restante'

    for (const grupo of p.grupos) {
      const temBolao = grupo.palpites.some((pal) => pal.jogo.isBolao)
      const grupoModo: 'completo' | 'restante' = temBolao ? 'restante' : 'completo'

      const targetSet = grupoModo === 'completo' ? jogosGruposSet : jogosRestantesSet
      const totalAlvo = grupoModo === 'completo' ? totalJogosGrupos : totalJogosRestantes

      const grupoCompletos = grupo.palpites.filter((pal) => targetSet.has(pal.jogoId)).length
      totalCompletos += grupoCompletos

      if (grupoModo === 'completo') modo = 'completo'
    }

    const totalAlvo = modo === 'completo' ? totalJogosGrupos * Math.max(p.grupos.length, 1) : totalJogosRestantes * Math.max(p.grupos.length, 1)
    const jogosFaltando = Math.max(0, totalAlvo - totalCompletos)

    const extrasCompletos = modo === 'completo'
      ? p.grupos.reduce((acc, g) => acc + g.extras.length, 0)
      : 0

    return {
      id: p.id,
      nome: p.nome,
      token: p.token,
      fotoUrl: p.fotoUrl,
      totalJogos: modo === 'completo' ? totalJogosGrupos : totalJogosRestantes,
      jogosCompletos: totalCompletos,
      jogosFaltando,
      completo: jogosFaltando === 0 && (modo === 'restante' || extrasCompletos >= 5 * p.grupos.length),
      modo,
      extrasCompletos,
      totalExtras: modo === 'completo' ? 5 * p.grupos.length : 0,
    }
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/queries/completar-bolao.ts
git commit -m "feat: update getStatusCompletarBolao with mode detection"
```

---

### Task 5: Queries — Modify `sortearPalpites` for mode

**Files:**
- Modify: `src/lib/db/queries/completar-bolao.ts`

- [ ] **Step 1: Replace `sortearPalpites` function**

Replace the existing function with:

```typescript
export async function sortearPalpites(participanteIds: string[]) {
  const jogosGrupos = await prisma.jogo.findMany({ where: { fase: 'grupos' } })
  const jogosRestantes = await prisma.jogo.findMany({ where: { isBolao: false, fase: 'grupos' } })

  const TIMES_EXTRA = ['Argentina', 'Brasil', 'França', 'Alemanha', 'Espanha', 'Inglaterra', 'Holanda', 'Portugal'] as const

  const resultados: { participanteId: string; totalSorteados: number }[] = []

  for (const participanteId of participanteIds) {
    const grupos = await prisma.palpiteGrupo.findMany({
      where: { participanteId },
      include: { palpites: true, extras: true },
    })

    let totalSorteados = 0

    for (const grupo of grupos) {
      const temBolao = grupo.palpites.some((pal) => {
        const jogo = jogosGrupos.find((j) => j.id === pal.jogoId)
        return jogo?.isBolao
      })
      const modo: 'completo' | 'restante' = temBolao ? 'restante' : (grupo.palpites.length === 0 ? 'completo' : 'restante')

      const jogosAlvo = modo === 'completo' ? jogosGrupos : jogosRestantes
      const palpiteJogoIds = new Set(grupo.palpites.map((p) => p.jogoId))

      const faltantes = jogosAlvo
        .filter((j) => !palpiteJogoIds.has(j.id))
        .map((j) => ({
          jogoId: j.id,
          placarA: Math.floor(Math.random() * 6),
          placarB: Math.floor(Math.random() * 6),
        }))

      if (faltantes.length > 0) {
        await prisma.palpite.createMany({
          data: faltantes.map((f) => ({
            palpiteGrupoId: grupo.id,
            jogoId: f.jogoId,
            placarA: f.placarA,
            placarB: f.placarB,
            fonte: 'excel' as const,
          })),
        })
        totalSorteados += faltantes.length
      }

      if (modo === 'completo') {
        const extrasExistentes = new Set(grupo.extras.map((e) => e.tipo))
        const tiposExtras = ['artilheiro', 'campeao', 'vice', 'terceiro', 'quarto'] as const
        const extrasFaltantes = tiposExtras.filter((t) => !extrasExistentes.has(t))

        for (const tipo of extrasFaltantes) {
          const valor = TIMES_EXTRA[Math.floor(Math.random() * TIMES_EXTRA.length)]
          await prisma.palpiteExtra.upsert({
            where: { palpiteGrupoId_tipo: { palpiteGrupoId: grupo.id, tipo } },
            update: { valor },
            create: { palpiteGrupoId: grupo.id, tipo, valor, fonte: 'excel' },
          })
        }
        totalSorteados += extrasFaltantes.length
      }
    }

    resultados.push({ participanteId, totalSorteados })
  }

  return resultados
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/queries/completar-bolao.ts
git commit -m "feat: update sortearPalpites with mode-aware logic"
```

---

### Task 6: API — `GET /api/admin/completar-bolao/participantes-elegiveis`

**Files:**
- Create: `src/app/api/admin/completar-bolao/participantes-elegiveis/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { getParticipantesElegiveis } from '@/lib/db/queries/completar-bolao'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const participantes = await getParticipantesElegiveis()
    return NextResponse.json({ participantes })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/completar-bolao/participantes-elegiveis/route.ts
git commit -m "feat: add participantes-elegiveis API endpoint"
```

---

### Task 7: API — `POST /api/admin/completar-bolao/novo-palpite`

**Files:**
- Create: `src/app/api/admin/completar-bolao/novo-palpite/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { criarNovoPalpite } from '@/lib/db/queries/completar-bolao'

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { participanteId, apelido } = body as {
      participanteId: string
      apelido?: string
    }

    if (!participanteId || typeof participanteId !== 'string') {
      return NextResponse.json({ error: 'Participante inválido' }, { status: 400 })
    }

    const grupo = await criarNovoPalpite(participanteId, apelido)

    return NextResponse.json({ success: true, grupo })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro interno do servidor'
    const status = message === 'Participante já possui palpites' ? 409 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/completar-bolao/novo-palpite/route.ts
git commit -m "feat: add novo-palpite API endpoint"
```

---

### Task 8: API — Modify `GET /api/completar/[token]/jogos` for mode + extras

**Files:**
- Modify: `src/app/api/completar/[token]/jogos/route.ts`

- [ ] **Step 1: Replace the entire route file**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import {
  getParticipanteByToken,
  getJogosRestantesComPalpites,
  getJogosCompletosComPalpites,
  getGruposParticipante,
  getExtrasPorGrupo,
  detectarModoGrupo,
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

    const gruposRaw = await getGruposParticipante(participante.id)

    const gruposComModo = await Promise.all(
      gruposRaw.map(async (g) => ({
        ...g,
        modo: await detectarModoGrupo(g.id),
      }))
    )

    const targetGrupoId = palpiteGrupoId ?? gruposComModo[0]?.id
    const modo = gruposComModo.find((g) => g.id === targetGrupoId)?.modo ?? 'restante'

    const [jogos, extras] = await Promise.all([
      modo === 'completo'
        ? getJogosCompletosComPalpites(participante.id, targetGrupoId)
        : getJogosRestantesComPalpites(participante.id, targetGrupoId),
      modo === 'completo' && targetGrupoId
        ? getExtrasPorGrupo(targetGrupoId)
        : Promise.resolve([]),
    ])

    return NextResponse.json({
      grupos: gruposComModo,
      jogos,
      extras: extras.map((e) => ({ tipo: e.tipo, valor: e.valor })),
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/completar/[token]/jogos/route.ts
git commit -m "feat: update jogos API with mode detection and extras"
```

---

### Task 9: API — Modify `POST /api/completar/[token]` for extras + mode

**Files:**
- Modify: `src/app/api/completar/[token]/route.ts`

- [ ] **Step 1: Replace the entire route file**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import {
  getParticipanteByToken,
  getConfigCompletarBolao,
  salvarPalpitesCompletar,
  salvarExtrasCompletar,
  getJogosRestantes,
  getJogosCompletos,
  detectarModoGrupo,
  getGruposParticipante,
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

    const config = await getConfigCompletarBolao()

    if (!config.habilitado) {
      return NextResponse.json(
        { error: 'A coleta de palpites está desabilitada no momento' },
        { status: 403 }
      )
    }

    if (new Date() > config.prazo) {
      return NextResponse.json(
        { error: 'O prazo para completar o bolão já foi encerrado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { palpites, extras, palpiteGrupoId } = body as {
      palpites: { jogoId: string; placarA: number; placarB: number }[]
      extras?: { tipo: string; valor: string }[]
      palpiteGrupoId?: string
    }

    if (!Array.isArray(palpites) || palpites.length === 0) {
      return NextResponse.json({ error: 'Palpites inválidos' }, { status: 400 })
    }

    const grupos = await getGruposParticipante(participante.id)
    const targetGrupoId = palpiteGrupoId ?? grupos[0]?.id
    const modo = targetGrupoId ? await detectarModoGrupo(targetGrupoId) : 'restante'

    const maxPalpites = modo === 'completo' ? 72 : 39
    if (palpites.length > maxPalpites) {
      return NextResponse.json(
        { error: `Máximo de ${maxPalpites} palpites permitidos` },
        { status: 400 }
      )
    }

    for (const p of palpites) {
      if (!p.jogoId || typeof p.placarA !== 'number' || typeof p.placarB !== 'number') {
        return NextResponse.json({ error: 'Formato de palpite inválido' }, { status: 400 })
      }
      if (p.placarA < 0 || p.placarB < 0 || p.placarA > 99 || p.placarB > 99) {
        return NextResponse.json({ error: 'Placar inválido' }, { status: 400 })
      }
    }

    const jogosValidos = modo === 'completo' ? await getJogosCompletos() : await getJogosRestantes()
    const jogosValidosIds = new Set(jogosValidos.map((j) => j.id))

    for (const p of palpites) {
      if (!jogosValidosIds.has(p.jogoId)) {
        return NextResponse.json(
          { error: `Jogo ${p.jogoId} não é um jogo válido para o modo atual` },
          { status: 400 }
        )
      }
    }

    const resultado = await salvarPalpitesCompletar(participante.id, palpites, palpiteGrupoId)

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

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/completar/[token]/route.ts
git commit -m "feat: update save API with mode-aware validation and extras"
```

---

### Task 10: API — Modify admin `palpites-restantes` and `palpites` routes

**Files:**
- Modify: `src/app/api/admin/participantes/[id]/palpites-restantes/route.ts`
- Modify: `src/app/api/admin/participantes/[id]/palpites/route.ts`

- [ ] **Step 1: Replace `palpites-restantes/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import {
  getJogosRestantesComPalpites,
  getJogosCompletosComPalpites,
  getGruposParticipante,
  getExtrasPorGrupo,
  detectarModoGrupo,
} from '@/lib/db/queries/completar-bolao'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const { id } = await params

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const palpiteGrupoId = searchParams.get('grupoId') ?? undefined

    const gruposRaw = await getGruposParticipante(id)

    const gruposComModo = await Promise.all(
      gruposRaw.map(async (g) => ({
        ...g,
        modo: await detectarModoGrupo(g.id),
      }))
    )

    const targetGrupoId = palpiteGrupoId ?? gruposComModo[0]?.id
    const modo = gruposComModo.find((g) => g.id === targetGrupoId)?.modo ?? 'restante'

    const [jogos, extras] = await Promise.all([
      modo === 'completo'
        ? getJogosCompletosComPalpites(id, targetGrupoId)
        : getJogosRestantesComPalpites(id, targetGrupoId),
      modo === 'completo' && targetGrupoId
        ? getExtrasPorGrupo(targetGrupoId)
        : Promise.resolve([]),
    ])

    return NextResponse.json({
      grupos: gruposComModo,
      jogos,
      extras: extras.map((e) => ({ tipo: e.tipo, valor: e.valor })),
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Replace `palpites/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import {
  salvarPalpitesCompletar,
  salvarExtrasCompletar,
  getJogosRestantes,
  getJogosCompletos,
  detectarModoGrupo,
  getGruposParticipante,
} from '@/lib/db/queries/completar-bolao'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const { id } = await params

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const body = await request.json()
    const { palpites, extras, palpiteGrupoId } = body as {
      palpites: { jogoId: string; placarA: number; placarB: number }[]
      extras?: { tipo: string; valor: string }[]
      palpiteGrupoId?: string
    }

    if (!Array.isArray(palpites) || palpites.length === 0) {
      return NextResponse.json({ error: 'Palpites inválidos' }, { status: 400 })
    }

    const grupos = await getGruposParticipante(id)
    const targetGrupoId = palpiteGrupoId ?? grupos[0]?.id
    const modo = targetGrupoId ? await detectarModoGrupo(targetGrupoId) : 'restante'

    const maxPalpites = modo === 'completo' ? 72 : 39
    if (palpites.length > maxPalpites) {
      return NextResponse.json(
        { error: `Máximo de ${maxPalpites} palpites permitidos` },
        { status: 400 }
      )
    }

    for (const p of palpites) {
      if (!p.jogoId || typeof p.placarA !== 'number' || typeof p.placarB !== 'number') {
        return NextResponse.json({ error: 'Formato de palpite inválido' }, { status: 400 })
      }
      if (p.placarA < 0 || p.placarB < 0 || p.placarA > 99 || p.placarB > 99) {
        return NextResponse.json({ error: 'Placar inválido' }, { status: 400 })
      }
    }

    const jogosValidos = modo === 'completo' ? await getJogosCompletos() : await getJogosRestantes()
    const jogosValidosIds = new Set(jogosValidos.map((j) => j.id))

    for (const p of palpites) {
      if (!jogosValidosIds.has(p.jogoId)) {
        return NextResponse.json(
          { error: `Jogo ${p.jogoId} não é um jogo válido para o modo atual` },
          { status: 400 }
        )
      }
    }

    const resultado = await salvarPalpitesCompletar(id, palpites, palpiteGrupoId)

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

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/participantes/[id]/palpites-restantes/route.ts src/app/api/admin/participantes/[id]/palpites/route.ts
git commit -m "feat: update admin palpites APIs with mode-aware logic"
```

---

### Task 11: Admin Page — "Novo Palpite" button + modal

**Files:**
- Modify: `src/app/admin/completar-bolao/page.tsx`

- [ ] **Step 1: Add state variables for the modal**

Add after the existing state declarations (after line 46):

```typescript
  const [modalAberto, setModalAberto] = useState(false)
  const [elegiveis, setElegiveis] = useState<{ id: string; nome: string }[]>([])
  const [participanteSelecionado, setParticipanteSelecionado] = useState('')
  const [apelidoInput, setApelidoInput] = useState('')
  const [criando, setCriando] = useState(false)
```

- [ ] **Step 2: Add functions to open modal and create palpite**

Add after the `salvarPrazo` function (after line 159):

```typescript
  async function abrirModalNovoPalpite() {
    try {
      const res = await fetch('/api/admin/completar-bolao/participantes-elegiveis')
      if (!res.ok) throw new Error('Erro ao carregar')
      const data = await res.json()
      setElegiveis(data.participantes)
      setParticipanteSelecionado('')
      setApelidoInput('')
      setModalAberto(true)
    } catch {
      toast.error('Erro ao carregar participantes elegíveis')
    }
  }

  async function criarPalpite() {
    if (!participanteSelecionado) return
    setCriando(true)
    try {
      const res = await fetch('/api/admin/completar-bolao/novo-palpite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participanteId: participanteSelecionado,
          apelido: apelidoInput || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao criar')
      }
      const nome = elegiveis.find((p) => p.id === participanteSelecionado)?.nome ?? ''
      toast.success(`Palpite criado para ${nome}!`)
      setModalAberto(false)
      fetchData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar palpite')
    } finally {
      setCriando(false)
    }
  }
```

- [ ] **Step 3: Add "Novo Palpite" button in the header area**

Replace the header section (lines 185-192) with:

```tsx
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-display tracking-wide">Completar Bolão</h1>
        <div className="flex gap-2">
          <Button onClick={abrirModalNovoPalpite} variant="secondary">
            Novo Palpite
          </Button>
          {resumo && resumo.participantesIncompletos > 0 && (
            <Button onClick={sortearTodos} disabled={sorteandoTodos} variant="secondary">
              {sorteandoTodos ? <><Loader2 className="w-4 h-4 animate-spin" /> Sorteando...</> : <><Dice5 className="w-4 h-4" /> Sortear Todos Incompletos</>}
            </Button>
          )}
        </div>
      </div>
```

- [ ] **Step 4: Update the table status column to show mode info**

Replace the status cell in the table (lines 283-288) with:

```tsx
                  <TableCell>
                    {p.completo ? (
                      <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />
                        {p.modo === 'completo' ? 'Completo (72+extras)' : 'Completo'}
                      </Badge>
                    ) : p.modo === 'completo' ? (
                      <Badge variant="warning">{p.jogosCompletos}/{p.totalJogos} jogos + {p.extrasCompletos}/{p.totalExtras} extras</Badge>
                    ) : (
                      <Badge variant="warning">{p.jogosCompletos}/{p.totalJogos} jogos</Badge>
                    )}
                  </TableCell>
```

- [ ] **Step 5: Add the modal component at the end of the page, before the closing `</div>`**

Add before the last `</div>` (before line 331):

```tsx
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-display font-bold">Novo Palpite</h2>
              <p className="text-sm text-muted-foreground">
                Crie um grupo vazio para um participante que não preencheu a planilha. Ele poderá preencher os 72 jogos + extras pelo link.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Participante</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={participanteSelecionado}
                  onChange={(e) => setParticipanteSelecionado(e.target.value)}
                >
                  <option value="">Selecione um participante</option>
                  {elegiveis.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
                {elegiveis.length === 0 && (
                  <p className="text-xs text-muted-foreground">Todos os participantes já possuem palpites.</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Apelido (opcional)</label>
                <Input
                  placeholder="Palpite 1"
                  value={apelidoInput}
                  onChange={(e) => setApelidoInput(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
                <Button onClick={criarPalpite} disabled={criando || !participanteSelecionado}>
                  {criando ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</> : 'Criar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
```

- [ ] **Step 6: Update the `ParticipanteStatus` interface**

Replace the interface (lines 14-23) with:

```typescript
interface ParticipanteStatus {
  id: string
  nome: string
  token: string | null
  fotoUrl: string | null
  totalJogos: number
  jogosCompletos: number
  jogosFaltando: number
  completo: boolean
  modo: 'completo' | 'restante'
  extrasCompletos: number
  totalExtras: number
}
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add src/app/admin/completar-bolao/page.tsx
git commit -m "feat: add Novo Palpite button and modal to admin dashboard"
```

---

### Task 12: Participant Page — Support modo completo with extras

**Files:**
- Modify: `src/app/(public)/completar/[token]/page.tsx`

- [ ] **Step 1: Add new interfaces and types**

Add after the existing interfaces (after line 44):

```typescript
interface ExtraInput {
  tipo: string
  valor: string
}

interface GrupoComModo extends PalpiteGrupo {
  modo: 'completo' | 'restante'
}
```

- [ ] **Step 2: Update state to track mode and extras**

Add after the existing state declarations (after line 128):

```typescript
  const [modo, setModo] = useState<'completo' | 'restante'>('restante')
  const [extras, setExtras] = useState<ExtraInput[]>([])
  const [extrasOriginais, setExtrasOriginais] = useState<ExtraInput[]>([])
```

- [ ] **Step 3: Update `carregarDados` to handle mode and extras**

Replace the `carregarDados` function (lines 130-167) with:

```typescript
  const carregarDados = useCallback(async () => {
    try {
      const res = await fetch(`/api/completar/${token}/jogos`)
      const data = await res.json()

      if (data.grupos) {
        setGrupos(data.grupos)
        if (data.grupos.length > 0 && !grupoAtivo) {
          setGrupoAtivo(data.grupos[0].id)
        }
        const primeiroModo = data.grupos[0]?.modo ?? 'restante'
        setModo(primeiroModo)
      }

      setJogos(data.jogos)

      if (data.extras) {
        const extrasData = data.extras.map((e: ExtraInput) => ({ ...e }))
        setExtras(extrasData)
        setExtrasOriginais(extrasData.map((e: ExtraInput) => ({ ...e })))
      }

      const inputs = inputsFromJogos(data.jogos)
      const abaId = grupoAtivo ?? data.grupos?.[0]?.id

      if (abaId) {
        const draft = loadDraft(token, abaId)
        const inputsComDraft = draft ?? inputs

        setTodasAbas((prev) => {
          const novo = new Map(prev)
          novo.set(abaId, inputsComDraft)
          return novo
        })
        setAbasOriginais((prev) => {
          const novo = new Map(prev)
          novo.set(abaId, inputs)
          return novo
        })
      }
    } catch {
      toast.error('Erro ao carregar jogos')
    } finally {
      setCarregandoInicial(false)
    }
  }, [token, grupoAtivo])
```

- [ ] **Step 4: Update `trocarGrupo` to handle mode switching**

Replace the `trocarGrupo` function (lines 201-225) with:

```typescript
  const trocarGrupo = (palpiteGrupoId: string) => {
    setGrupoAtivo(palpiteGrupoId)

    const grupoData = grupos.find((g) => g.id === palpiteGrupoId) as GrupoComModo | undefined
    if (grupoData?.modo) setModo(grupoData.modo)

    if (!todasAbas.has(palpiteGrupoId)) {
      fetch(`/api/completar/${token}/jogos?grupoId=${palpiteGrupoId}`)
        .then((r) => r.json())
        .then((data) => {
          const inputs = inputsFromJogos(data.jogos)
          const draft = loadDraft(token, palpiteGrupoId)
          const inputsComDraft = draft ?? inputs

          setTodasAbas((prev) => {
            const novo = new Map(prev)
            novo.set(palpiteGrupoId, inputsComDraft)
            return novo
          })
          setAbasOriginais((prev) => {
            const novo = new Map(prev)
            novo.set(palpiteGrupoId, inputs)
            return novo
          })

          if (data.extras) {
            const extrasData = data.extras.map((e: ExtraInput) => ({ ...e }))
            setExtras(extrasData)
            setExtrasOriginais(extrasData.map((e: ExtraInput) => ({ ...e })))
          }
        })
        .catch(() => toast.error('Erro ao carregar jogos'))
    }
  }
```

- [ ] **Step 5: Update `salvar` to include extras**

Replace the `salvar` function (lines 258-309) with:

```typescript
  const salvar = async () => {
    if (!token || !grupoAtivo) return

    const inputs = todasAbas.get(grupoAtivo) ?? new Map()
    const palpitesArray: { jogoId: string; placarA: number; placarB: number }[] = []
    for (const [jogoId, placar] of inputs.entries()) {
      if (placar.placarA !== '' && placar.placarB !== '') {
        palpitesArray.push({
          jogoId,
          placarA: parseInt(placar.placarA),
          placarB: parseInt(placar.placarB),
        })
      }
    }

    if (palpitesArray.length === 0) {
      toast.error('Preencha pelo menos um palpite completo (ambos os times)')
      return
    }

    if (modo === 'completo') {
      const extrasVazios = extras.filter((e) => !e.valor.trim())
      if (extrasVazios.length > 0) {
        toast.error('Preencha todos os palpites extras')
        return
      }
    }

    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        palpites: palpitesArray,
        palpiteGrupoId: grupoAtivo,
      }

      if (modo === 'completo') {
        body.extras = extras
      }

      const res = await fetch(`/api/completar/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Erro ao salvar palpites')
        return
      }

      const novoOriginal = new Map(inputs)
      setAbasOriginais((prev) => {
        const novo = new Map(prev)
        novo.set(grupoAtivo, novoOriginal)
        return novo
      })
      setExtrasOriginais(extras.map((e) => ({ ...e })))
      clearDraft(token, grupoAtivo)
      toast.success(`Palpites salvos com sucesso! (${data.totalSalvos} jogos)`)
    } catch {
      toast.error('Erro ao salvar palpites')
    } finally {
      setSalvando(false)
    }
  }
```

- [ ] **Step 6: Add helper for extras changes detection and update completion logic**

Add after `countFilled` function (after line 113):

```typescript
function countExtrasFilled(extrasList: ExtraInput[]): number {
  return extrasList.filter((e) => e.valor.trim() !== '').length
}

function hasExtrasChanges(current: ExtraInput[], original: ExtraInput[]): boolean {
  if (current.length !== original.length) return true
  for (let i = 0; i < current.length; i++) {
    if (current[i].valor !== original[i].valor) return true
  }
  return false
}

const EXTRAS_LABELS: Record<string, string> = {
  artilheiro: 'Artilheiro',
  campeao: 'Campeão',
  vice: 'Vice',
  terceiro: '3º Lugar',
  quarto: '4º Lugar',
}

const EXTRAS_TIPOS = ['artilheiro', 'campeao', 'vice', 'terceiro', 'quarto'] as const
```

- [ ] **Step 7: Update the completion/saved logic in the render section**

Replace the variables block (lines 381-386) with:

```typescript
  const inputsAtuais = todasAbas.get(grupoAtivo ?? '') ?? new Map()
  const inputsOriginais = abasOriginais.get(grupoAtivo ?? '') ?? new Map()
  const totalPreenchidos = countFilled(inputsAtuais)
  const totalJogos = jogos.length
  const temAlteracoesJogos = hasUnsavedChanges(inputsAtuais, inputsOriginais)
  const temAlteracoesExtras = modo === 'completo' ? hasExtrasChanges(extras, extrasOriginais) : false
  const temAlteracoes = temAlteracoesJogos || temAlteracoesExtras
  const extrasPreenchidos = modo === 'completo' ? countExtrasFilled(extras) : 0
  const estaCompleto = totalPreenchidos === totalJogos
    && (modo === 'restante' || extrasPreenchidos === 5)
    && !temAlteracoes
```

- [ ] **Step 8: Update the header text to reflect mode**

Replace the description text (line 401) with:

```tsx
        <p className="text-muted-foreground">
          Olá, <span className="font-semibold text-foreground">{tokenInfo?.nome}</span>!{' '}
          {modo === 'completo'
            ? `Preencha seus palpites para os ${totalJogos} jogos da fase de grupos e os 5 extras.`
            : `Preencha seus palpites para os ${totalJogos} jogos restantes.`}
        </p>
```

- [ ] **Step 9: Update the progress badge**

Replace the badges section (lines 403-417) with:

```tsx
        <div className="flex items-center gap-2 flex-wrap">
          {modo === 'completo' ? (
            <Badge variant="info">{totalPreenchidos}/{totalJogos} jogos + {extrasPreenchidos}/5 extras</Badge>
          ) : (
            <Badge variant="info">{totalPreenchidos}/{totalJogos} preenchidos</Badge>
          )}
          {temAlteracoes && (
            <Badge variant="warning">
              <AlertCircle className="w-3 h-3 mr-1" />
              Não salvo
            </Badge>
          )}
          {estaCompleto && (
            <Badge variant="success">
              <CheckCircle className="w-3 h-3 mr-1" />
              Palpites computados
            </Badge>
          )}
        </div>
```

- [ ] **Step 10: Add extras section before the save button**

Add before the `{temAlteracoes && (` block that contains the second "Descartar alterações" (before line 489):

```tsx
      {modo === 'completo' && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <h2 className="text-lg font-semibold">Palpites Extras</h2>
            <div className="space-y-3">
              {EXTRAS_TIPOS.map((tipo) => {
                const extra = extras.find((e) => e.tipo === tipo)
                return (
                  <div key={tipo} className="flex items-center gap-3">
                    <label className="text-sm font-medium w-28 shrink-0">{EXTRAS_LABELS[tipo]}</label>
                    <Input
                      value={extra?.valor ?? ''}
                      onChange={(e) => {
                        setExtras((prev) => {
                          const exists = prev.find((ex) => ex.tipo === tipo)
                          if (exists) {
                            return prev.map((ex) => ex.tipo === tipo ? { ...ex, valor: e.target.value } : ex)
                          }
                          return [...prev, { tipo, valor: e.target.value }]
                        })
                      }}
                      disabled={estaCompleto}
                      placeholder={`Digite o ${EXTRAS_LABELS[tipo].toLowerCase()}`}
                      className="flex-1"
                    />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
```

- [ ] **Step 11: Update save button text for modo completo**

Replace the save button content (lines 510-516) with:

```tsx
            {salvando ? (
              'Salvando...'
            ) : modo === 'completo' ? (
              <>
                <Save className="w-4 h-4" />
                Salvar{grupoAtualNome ? ` ${grupoAtualNome}` : ''} ({totalPreenchidos}/{totalJogos} jogos + {extrasPreenchidos}/5 extras)
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar{grupoAtualNome ? ` ${grupoAtualNome}` : ''} ({totalPreenchidos}/{totalJogos})
              </>
            )}
```

- [ ] **Step 12: Update save button disabled condition**

Replace the save button disabled condition (line 506) with:

```tsx
            disabled={salvando || totalPreenchidos !== totalJogos || (modo === 'completo' && extrasPreenchidos !== 5)}
```

- [ ] **Step 13: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 14: Commit**

```bash
git add src/app/\(public\)/completar/[token]/page.tsx
git commit -m "feat: support modo completo with extras on participant page"
```

---

### Task 13: Build verification + lint

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit any fixes if needed**

```bash
git add -A
git commit -m "fix: resolve lint/type issues from completar bolão do zero"
```
