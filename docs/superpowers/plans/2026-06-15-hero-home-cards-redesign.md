# Hero Home Cards Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o card "Pts Máx" do hero da home por um card "Copa" com anel de progresso e enriquecer o card "Jogos" com 3 categorias (finalizado / em jogo / restante).

**Architecture:** Nova query agrega `count()` por status com `prisma.groupBy` (1 round-trip). Dois componentes novos (`JogosStatusCard` + `CopaProgressCard`) seguem o padrão visual do `StatsCard` existente mas com layout próprio. O `Hero` apenas compõe 3 componentes. A página calcula a % e passa para o componente Copa.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Prisma 7 (`groupBy`), Tailwind 4, `lucide-react` (ícones), Jest 30 + RTL.

**Spec:** `docs/superpowers/specs/2026-06-15-hero-home-cards-redesign-design.md`

---

## File Structure

| Arquivo | Responsabilidade | Status |
|---|---|---|
| `src/lib/db/queries/jogos.ts` | + `countJogosByStatus()` — agrega por status | Modificado |
| `src/components/public/jogos-status-card.tsx` | Card "Jogos" com 3 colunas coloridas | Novo |
| `src/components/public/copa-progress-card.tsx` | Card "Copa" com anel SVG | Novo |
| `src/components/public/hero.tsx` | Compõe 3 componentes (Participantes / Jogos / Copa) | Refator |
| `src/app/(public)/page.tsx` | Chama nova query, calcula %, passa para Hero | Modificado |
| `src/components/public/__tests__/jogos-status-card.test.tsx` | Testes do JogosStatusCard | Novo |
| `src/components/public/__tests__/copa-progress-card.test.tsx` | Testes do CopaProgressCard | Novo |

---

## Task 1: Adicionar query `countJogosByStatus`

**Files:**
- Modify: `src/lib/db/queries/jogos.ts:1` (adicionar no final)

- [ ] **Step 1: Adicionar tipo e função no final de `src/lib/db/queries/jogos.ts`**

Abrir `src/lib/db/queries/jogos.ts` e adicionar ao final:

```ts
export type JogosCountByStatus = {
  finalizado: number
  em_andamento: number
  restante: number
  total: number
}

export async function countJogosByStatus(): Promise<JogosCountByStatus> {
  const groups = await prisma.jogo.groupBy({
    by: ['status'],
    _count: { _all: true },
  })
  const map = new Map(groups.map((g) => [g.status, g._count._all]))
  return {
    finalizado: map.get('finalizado') ?? 0,
    em_andamento: map.get('em_andamento') ?? 0,
    restante: map.get('agendado') ?? 0,
    total: groups.reduce((sum, g) => sum + g._count._all, 0),
  }
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: 0 erros

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/queries/jogos.ts
git commit -m "feat(jogos): add countJogosByStatus query"
```

---

## Task 2: Implementar `JogosStatusCard` (TDD)

**Files:**
- Create: `src/components/public/jogos-status-card.tsx`
- Create: `src/components/public/__tests__/jogos-status-card.test.tsx`

- [ ] **Step 1: Criar arquivo de teste**

Criar `src/components/public/__tests__/jogos-status-card.test.tsx`:

```tsx
/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { JogosStatusCard } from '../jogos-status-card'

describe('JogosStatusCard', () => {
  it('renderiza os 3 números nas cores corretas', () => {
    render(
      <JogosStatusCard finalizado={15} emAndamento={2} restante={87} />
    )

    const finalizado = screen.getByText('15')
    const emJogo = screen.getByText('2')
    const restante = screen.getByText('87')

    expect(finalizado).toHaveClass('text-success')
    expect(emJogo).toHaveClass('text-warning')
    expect(restante).toHaveClass('text-muted-foreground')
  })

  it('renderiza os labels abaixo dos números', () => {
    render(
      <JogosStatusCard finalizado={15} emAndamento={2} restante={87} />
    )

    expect(screen.getByText('finalizados')).toBeInTheDocument()
    expect(screen.getByText('em jogo')).toBeInTheDocument()
    expect(screen.getByText('restantes')).toBeInTheDocument()
  })

  it('renderiza o label "Jogos"', () => {
    render(
      <JogosStatusCard finalizado={15} emAndamento={2} restante={87} />
    )

    expect(screen.getByText('Jogos')).toBeInTheDocument()
  })

  it('envolve em Link quando href é fornecido', () => {
    render(
      <JogosStatusCard finalizado={15} emAndamento={2} restante={87} href="/jogos" />
    )

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/jogos')
  })

  it('não envolve em Link quando href é omitido', () => {
    render(
      <JogosStatusCard finalizado={15} emAndamento={2} restante={87} />
    )

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('tem aria-label descritivo', () => {
    render(
      <JogosStatusCard finalizado={15} emAndamento={2} restante={87} />
    )

    const card = screen.getByRole('group', { name: /15 finalizados, 2 em jogo, 87 restantes/i })
    expect(card).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar teste para verificar que falha**

Run: `npm test -- jogos-status-card.test.tsx`
Expected: FAIL — módulo `../jogos-status-card` não existe

- [ ] **Step 3: Criar componente `JogosStatusCard`**

Criar `src/components/public/jogos-status-card.tsx`:

```tsx
import Link from "next/link"
import { Calendar } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface JogosStatusCardProps {
  finalizado: number
  emAndamento: number
  restante: number
  href?: string
}

export function JogosStatusCard({ finalizado, emAndamento, restante, href }: JogosStatusCardProps) {
  const content = (
    <Card
      role="group"
      aria-label={`Jogos: ${finalizado} finalizados, ${emAndamento} em jogo, ${restante} restantes`}
      className="w-full"
    >
      <CardContent className="p-4 flex flex-row items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
          <Calendar className="w-5 h-5 text-success" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">Jogos</p>
          <div className="flex items-center justify-between gap-1">
            <div className="text-center flex-1 min-w-0">
              <p className="text-xl font-display text-success truncate">{finalizado}</p>
              <p className="text-xs text-muted-foreground">finalizados</p>
            </div>
            <span className="text-border text-sm select-none" aria-hidden="true">|</span>
            <div className="text-center flex-1 min-w-0">
              <p className="text-xl font-display text-warning truncate">{emAndamento}</p>
              <p className="text-xs text-muted-foreground">em jogo</p>
            </div>
            <span className="text-border text-sm select-none" aria-hidden="true">|</span>
            <div className="text-center flex-1 min-w-0">
              <p className="text-xl font-display text-muted-foreground truncate">{restante}</p>
              <p className="text-xs text-muted-foreground">restantes</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="block focus:outline-none focus:ring-2 focus:ring-ring rounded-lg"
      >
        {content}
      </Link>
    )
  }

  return content
}
```

- [ ] **Step 4: Rodar teste para verificar que passa**

Run: `npm test -- jogos-status-card.test.tsx`
Expected: 6 testes passam

- [ ] **Step 5: Rodar lint**

Run: `npm run lint -- src/components/public/jogos-status-card.tsx src/components/public/__tests__/jogos-status-card.test.tsx`
Expected: 0 erros

- [ ] **Step 6: Commit**

```bash
git add src/components/public/jogos-status-card.tsx src/components/public/__tests__/jogos-status-card.test.tsx
git commit -m "feat(public): add JogosStatusCard with 3 status categories"
```

---

## Task 3: Implementar `CopaProgressCard` (TDD)

**Files:**
- Create: `src/components/public/copa-progress-card.tsx`
- Create: `src/components/public/__tests__/copa-progress-card.test.tsx`

- [ ] **Step 1: Criar arquivo de teste**

Criar `src/components/public/__tests__/copa-progress-card.test.tsx`:

```tsx
/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { CopaProgressCard } from '../copa-progress-card'

describe('CopaProgressCard', () => {
  it('renderiza o percentual arredondado no anel e no label grande', () => {
    render(
      <CopaProgressCard percentual={14} finalizados={15} total={104} />
    )

    const percentualElements = screen.getAllByText('14%')
    expect(percentualElements.length).toBeGreaterThanOrEqual(2)
  })

  it('renderiza o label "Copa" e o caption "concluído"', () => {
    render(
      <CopaProgressCard percentual={14} finalizados={15} total={104} />
    )

    expect(screen.getByText('Copa')).toBeInTheDocument()
    expect(screen.getByText('concluído')).toBeInTheDocument()
  })

  it('SVG do anel tem stroke-dasharray correspondente ao percentual', () => {
    const { container } = render(
      <CopaProgressCard percentual={25} finalizados={26} total={104} />
    )

    const arc = container.querySelector('circle[stroke-dasharray]')
    expect(arc).toBeInTheDocument()
    expect(arc).toHaveAttribute('stroke-dasharray', '25 100')
  })

  it('tem aria-label descritivo', () => {
    render(
      <CopaProgressCard percentual={14} finalizados={15} total={104} />
    )

    const card = screen.getByRole('group', { name: /Copa: 14 por cento concluído, 15 de 104 jogos/i })
    expect(card).toBeInTheDocument()
  })

  it('envolve em Link quando href é fornecido', () => {
    render(
      <CopaProgressCard percentual={14} finalizados={15} total={104} href="/jogos" />
    )

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/jogos')
  })

  it('não envolve em Link quando href é omitido', () => {
    render(
      <CopaProgressCard percentual={14} finalizados={15} total={104} />
    )

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('edge case: total=0 mostra 0% sem arco (dasharray="0 100")', () => {
    const { container } = render(
      <CopaProgressCard percentual={0} finalizados={0} total={0} />
    )

    const arc = container.querySelector('circle[stroke-dasharray]')
    expect(arc).toHaveAttribute('stroke-dasharray', '0 100')
    expect(screen.getAllByText('0%').length).toBeGreaterThanOrEqual(2)
  })

  it('edge case: 100% mostra arco completo (dasharray="100 100")', () => {
    const { container } = render(
      <CopaProgressCard percentual={100} finalizados={104} total={104} />
    )

    const arc = container.querySelector('circle[stroke-dasharray]')
    expect(arc).toHaveAttribute('stroke-dasharray', '100 100')
  })
})
```

- [ ] **Step 2: Rodar teste para verificar que falha**

Run: `npm test -- copa-progress-card.test.tsx`
Expected: FAIL — módulo `../copa-progress-card` não existe

- [ ] **Step 3: Criar componente `CopaProgressCard`**

Criar `src/components/public/copa-progress-card.tsx`:

```tsx
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"

interface CopaProgressCardProps {
  percentual: number
  finalizados: number
  total: number
  href?: string
}

export function CopaProgressCard({ percentual, finalizados, total, href }: CopaProgressCardProps) {
  const dasharray = `${percentual} 100`

  const content = (
    <Card
      role="group"
      aria-label={`Copa: ${percentual} por cento concluído, ${finalizados} de ${total} jogos`}
      className="w-full"
    >
      <CardContent className="p-4 flex flex-row items-center gap-3">
        <div className="relative w-10 h-10 sm:w-12 sm:h-12 shrink-0 text-primary">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90" aria-hidden="true">
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              className="text-border"
              stroke="currentColor"
              strokeWidth="2.5"
            />
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              className="text-primary"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeDasharray={dasharray}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-[0.6rem] sm:text-xs font-bold text-primary">
            {percentual}%
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Copa</p>
          <p className="text-xl font-display text-primary truncate">{percentual}%</p>
          <p className="text-xs text-muted-foreground">concluído</p>
        </div>
      </CardContent>
    </Card>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="block focus:outline-none focus:ring-2 focus:ring-ring rounded-lg"
      >
        {content}
      </Link>
    )
  }

  return content
}
```

- [ ] **Step 4: Rodar teste para verificar que passa**

Run: `npm test -- copa-progress-card.test.tsx`
Expected: 8 testes passam

- [ ] **Step 5: Rodar lint**

Run: `npm run lint -- src/components/public/copa-progress-card.tsx src/components/public/__tests__/copa-progress-card.test.tsx`
Expected: 0 erros

- [ ] **Step 6: Commit**

```bash
git add src/components/public/copa-progress-card.tsx src/components/public/__tests__/copa-progress-card.test.tsx
git commit -m "feat(public): add CopaProgressCard with circular progress ring"
```

---

## Task 4: Refatorar `Hero` para usar 3 componentes

**Files:**
- Modify: `src/components/public/hero.tsx:1` (refator completo)

- [ ] **Step 1: Substituir o conteúdo de `src/components/public/hero.tsx`**

Sobrescrever o arquivo inteiro com:

```tsx
import { Users, Trophy } from "lucide-react"
import { StatsCard } from "@/components/public/stats-card"
import { JogosStatusCard } from "@/components/public/jogos-status-card"
import { CopaProgressCard } from "@/components/public/copa-progress-card"

interface HeroProps {
  totalParticipantes: number
  jogosStatus: {
    finalizado: number
    emAndamento: number
    restante: number
  }
  percentualCopa: number
}

export function Hero({ totalParticipantes, jogosStatus, percentualCopa }: HeroProps) {
  return (
    <section className="relative overflow-hidden py-12 sm:py-16">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/20 border border-secondary/30">
          <Trophy className="w-4 h-4 text-secondary" />
          <span className="text-sm font-medium text-secondary-foreground">Copa do Mundo 2026</span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display tracking-wide text-foreground">BOLÃO DA "FAMÍLIA"</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Faça seus palpites e dispute o ranking com a família!</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto pt-4">
          <StatsCard label="Participantes" value={totalParticipantes} icon={Users} href="/participantes" />
          <JogosStatusCard
            finalizado={jogosStatus.finalizado}
            emAndamento={jogosStatus.emAndamento}
            restante={jogosStatus.restante}
            href="/jogos"
          />
          <CopaProgressCard
            percentual={percentualCopa}
            finalizados={jogosStatus.finalizado}
            total={jogosStatus.finalizado + jogosStatus.emAndamento + jogosStatus.restante}
            href="/jogos"
          />
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verificar typecheck (vai falhar — `page.tsx` ainda passa props antigos)**

Run: `npx tsc --noEmit`
Expected: erros de tipo em `page.tsx` (props incompatíveis) — esperado, corrigimos na próxima task

- [ ] **Step 3: Commit**

```bash
git add src/components/public/hero.tsx
git commit -m "refactor(public): hero composes 3 card components"
```

---

## Task 5: Atualizar `page.tsx` para chamar nova query e passar dados

**Files:**
- Modify: `src/app/(public)/page.tsx:1` (refator do carregamento de dados)

- [ ] **Step 1: Substituir o conteúdo de `src/app/(public)/page.tsx`**

Sobrescrever o arquivo inteiro com:

```tsx
import { getProximosJogos, countJogosByStatus } from "@/lib/db/queries/jogos"
import { getRanking } from "@/lib/db/queries/ranking"
import { getTodosParticipantes } from "@/lib/db/queries/participantes"
import { ProximosJogosTabs } from "@/components/public/proximos-jogos-tabs"
import { RankingCard } from "@/components/public/ranking-card"
import { Hero } from "@/components/public/hero"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const [proximos, ranking, jogosStatus, participantes] = await Promise.all([
    getProximosJogos(),
    getRanking(),
    countJogosByStatus(),
    getTodosParticipantes(),
  ])

  const percentualCopa =
    jogosStatus.total === 0
      ? 0
      : Math.round((jogosStatus.finalizado / jogosStatus.total) * 100)

  return (
    <div className="space-y-10">
      <Hero
        totalParticipantes={participantes.length}
        jogosStatus={jogosStatus}
        percentualCopa={percentualCopa}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <ProximosJogosTabs
          jogosHoje={proximos.hoje}
          jogosAmanha={proximos.amanha}
          jogosDepois={proximos.depois}
        />
        <RankingCard
          ranking={ranking}
          title="Top 5 participantes"
          maxItems={5}
          showViewAll
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: 0 erros

- [ ] **Step 3: Rodar lint**

Run: `npm run lint -- src/app/(public)/page.tsx`
Expected: 0 erros

- [ ] **Step 4: Rodar todos os testes**

Run: `npm test`
Expected: todos os testes existentes + os 2 novos passam (14 testes novos = 6 + 8)

- [ ] **Step 5: Commit**

```bash
git add "src/app/(public)/page.tsx"
git commit -m "feat(public): wire countJogosByStatus into homepage"
```

---

## Task 6: Verificação visual manual

**Files:** Nenhum — verificação via dev server

- [ ] **Step 1: Subir dev server**

Run: `npm run dev`
Expected: servidor roda em `http://localhost:3000`

- [ ] **Step 2: Verificar visual no desktop**

Abrir `http://localhost:3000` no navegador. Conferir:
- 3 cards lado a lado
- Card "Jogos" mostra 3 números (finalizado / em jogo / restantes) com cores corretas
- Card "Copa" mostra anel circular com % no centro
- Ambos clicáveis (cursor pointer, hover effect)

- [ ] **Step 3: Verificar visual no mobile**

DevTools → modo responsivo (≤640px). Conferir:
- 3 cards empilham em 1 coluna
- Todos os 3 cards mantêm altura similar
- Nenhum texto estoura do card

- [ ] **Step 4: Verificar edge case `total=0` (banco vazio)**

Se o banco local estiver vazio, conferir que o anel renderiza vazio (sem arco) e todos os números são 0. Para testar sem esvaziar o banco, criar teste pontual:

```bash
npx tsx --env-file=.env -e "
import { countJogosByStatus } from './src/lib/db/queries/jogos'
countJogosByStatus().then(console.log)
"
```

Expected: objeto com 4 números inteiros, sem erro

- [ ] **Step 5: Parar dev server**

`Ctrl+C` no terminal do `npm run dev`

---

## Resumo de Commits

| # | Mensagem | Arquivos |
|---|---|---|
| 1 | `feat(jogos): add countJogosByStatus query` | `src/lib/db/queries/jogos.ts` |
| 2 | `feat(public): add JogosStatusCard with 3 status categories` | `jogos-status-card.tsx` + test |
| 3 | `feat(public): add CopaProgressCard with circular progress ring` | `copa-progress-card.tsx` + test |
| 4 | `refactor(public): hero composes 3 card components` | `hero.tsx` |
| 5 | `feat(public): wire countJogosByStatus into homepage` | `page.tsx` |

Verificação visual manual ao final (sem commit).

---

## Notas para o Executor

- **NÃO** usar `text-green-600` ou `text-amber-500` (paleta crua). Usar tokens `text-success`, `text-warning`, `text-primary`, `text-muted-foreground`, `text-border` (do tema em `src/app/globals.css`).
- **NÃO** adicionar lib externa para o anel. SVG inline com `currentColor` é o padrão.
- **NÃO** modificar `StatsCard` — Participantes continua usando.
- **NÃO** modificar `getTodosJogos()` — `page.tsx` não usa mais, mas outros lugares podem usar.
- **NÃO** mexer em `scripts/seed.ts` — status default já é `agendado`.
- Testes usam `@jest-environment jsdom` (não Docker Postgres). Factory functions para mock data.
- Cada task termina com `git commit`. Não acumular mudanças entre tasks.
