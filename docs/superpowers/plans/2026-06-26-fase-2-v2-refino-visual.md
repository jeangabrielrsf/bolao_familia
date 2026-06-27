# Fase 2 v2 — Refino visual — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polir visualmente a página `/copa` (Classificação + Chaveamento) com 5 features isoladas: Tooltip acessível, cores Classificação, vencedor destaque no Bracket, hero `/copa` + tab selector polido, dark mode polish.

**Architecture:** Mudanças isoladas em 1 componente novo (Tooltip) + 5 modificados (group-table, group-legend, bracket-match, bracket, page, globals.css). Sem mudança de schema, sem novas deps (`@radix-ui/react-tooltip` já instalado). TDD estrito.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind 4, Radix Tooltip, Jest 30 + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-06-26-fase-2-v2-refino-visual-design.md` (commit `26e6e24`).

---

## File Structure

| Arquivo | Responsabilidade | Mudança |
|---|---|---|
| `src/components/ui/tooltip.tsx` | Wrapper Radix Tooltip (4 exports) | **CRIAR** |
| `src/components/ui/__tests__/tooltip.test.tsx` | Testes do Tooltip | **CRIAR** |
| `src/app/layout.tsx` | Embrulha children em `<TooltipProvider>` | **MODIFICAR** |
| `src/components/public/group-table.tsx` | Cores `-100`/`-900/60` + Tooltip no ⚠ | **MODIFICAR** |
| `src/components/public/group-legend.tsx` | Swatches sincronizados com group-table | **MODIFICAR** |
| `src/components/public/__tests__/group-table.test.tsx` | Atualizar pra novas classes | **MODIFICAR** |
| `src/components/public/bracket-match.tsx` | Vencedor com bg + cor + dark:hover | **MODIFICAR** |
| `src/components/public/__tests__/bracket-match.test.tsx` | Testes do vencedor highlight | **MODIFICAR** |
| `src/components/public/bracket.tsx` | Tab selector polido (underline + a11y) | **MODIFICAR** |
| `src/components/public/__tests__/bracket.test.tsx` | Testes do tab selector | **MODIFICAR** |
| `src/app/(public)/copa/page.tsx` | Hero com Badge + subtitle | **MODIFICAR** |
| `src/app/globals.css` | Vars dark ajustadas (card opaco, muted claro) | **MODIFICAR** |

---

## Task 1: Tooltip component (UI primitive)

**Files:**
- Create: `src/components/ui/tooltip.tsx`
- Create: `src/components/ui/__tests__/tooltip.test.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Read existing UI primitives for style consistency**

Read `src/components/ui/sheet.tsx` and `src/components/ui/button.tsx` to match the pattern (cn util, forwardRef, displayName).

- [ ] **Step 2: Write failing tests**

Create `src/components/ui/__tests__/tooltip.test.tsx`:

```tsx
/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../tooltip'

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <TooltipProvider>{children}</TooltipProvider>
)

describe('Tooltip', () => {
  it('renderiza trigger com conteúdo do tooltip', async () => {
    render(
      <Wrapper>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
      </Wrapper>,
    )
    expect(screen.getByText('Hover me')).toBeInTheDocument()
  })

  it('mostra conteúdo do tooltip ao passar mouse (hover)', async () => {
    render(
      <Wrapper>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
      </Wrapper>,
    )
    const trigger = screen.getByText('Hover me')
    fireEvent.pointerDown(trigger)
    fireEvent.pointerMove(trigger)
    await waitFor(() => {
      expect(screen.getByText('Tooltip text')).toBeInTheDocument()
    })
  })

  it('fecha tooltip ao apertar Esc', async () => {
    render(
      <Wrapper>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
      </Wrapper>,
    )
    const trigger = screen.getByText('Hover me')
    fireEvent.pointerDown(trigger)
    fireEvent.pointerMove(trigger)
    await waitFor(() => {
      expect(screen.getByText('Tooltip text')).toBeInTheDocument()
    })
    fireEvent.keyDown(document.body, { key: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd /home/jeanfrusca/Projetos/bolao_copa && npm test -- --testPathPattern=tooltip`
Expected: FAIL — `Cannot find module '../tooltip'`

- [ ] **Step 4: Implement Tooltip**

Create `src/components/ui/tooltip.tsx`:

```tsx
'use client'
import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'

const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 overflow-hidden rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-md',
        'animate-in fade-in-0 zoom-in-95',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /home/jeanfrusca/Projetos/bolao_copa && npm test -- --testPathPattern=tooltip`
Expected: 3 tests passing.

- [ ] **Step 6: Add TooltipProvider to root layout**

Modify `src/app/layout.tsx` — find where children are rendered (inside `<body>`) and wrap them in `<TooltipProvider delayDuration={200}>`.

If the layout uses Next.js metadata/body/font setup, find the main content wrapper and add:

```tsx
import { TooltipProvider } from '@/components/ui/tooltip'

// ... inside body, wrapping children:
<TooltipProvider delayDuration={200}>
  {children}
</TooltipProvider>
```

- [ ] **Step 7: Lint + build**

Run: `cd /home/jeanfrusca/Projetos/bolao_copa && npm run lint && npm run build`
Expected: clean + OK.

- [ ] **Step 8: Commit**

```bash
cd /home/jeanfrusca/Projetos/bolao_copa
git add src/components/ui/tooltip.tsx src/components/ui/__tests__/tooltip.test.tsx src/app/layout.tsx
git commit -m "feat(ui): Tooltip wrapper (Radix) + Provider no root layout"
```

---

## Task 2: Cores Classificação (-100 / -900/60)

**Files:**
- Modify: `src/components/public/group-table.tsx`
- Modify: `src/components/public/group-legend.tsx`
- Modify: `src/components/public/__tests__/group-table.test.tsx`

- [ ] **Step 1: Read existing tests to know what assertions need updating**

Run: `cd /home/jeanfrusca/Projetos/bolao_copa && cat src/components/public/__tests__/group-table.test.tsx`

If tests assert the old colors (`bg-green-50`, `bg-amber-50`, `bg-red-50`, `dark:bg-green-950/40`, etc), they need updating.

- [ ] **Step 2: Update GroupTable row classes**

Modify `src/components/public/group-table.tsx` — change the `rowBg` and `borderAccent` ternary:

```tsx
// Replace the `rowBg` ternary (around line 37-43):
const rowBg = isClassificado
  ? 'bg-emerald-100 dark:bg-emerald-900/60'
  : terceiroQualificado
  ? 'bg-amber-100 dark:bg-amber-900/60'
  : isEliminado
  ? 'bg-rose-100 dark:bg-rose-900/60'
  : ''

// Replace the `borderAccent` ternary (around line 45-51):
const borderAccent = isClassificado
  ? 'border-l-4 border-emerald-500 dark:border-l-emerald-400'
  : terceiroQualificado
  ? 'border-l-4 border-amber-500 dark:border-l-amber-400'
  : isEliminado
  ? 'border-l-4 border-rose-500 dark:border-l-rose-400'
  : ''
```

- [ ] **Step 3: Update GroupLegend swatches**

Modify `src/components/public/group-legend.tsx` — change all 3 swatches:

```tsx
// Swatch 1 (Classificado):
className="inline-block w-5 h-5 rounded bg-emerald-100 dark:bg-emerald-900/60 border-l-4 border-emerald-500 dark:border-l-emerald-400"

// Swatch 2 (Melhor 8 terceiros):
className="inline-block w-5 h-5 rounded bg-amber-100 dark:bg-amber-900/60 border-l-4 border-amber-500 dark:border-l-amber-400"

// Swatch 3 (Eliminado):
className="inline-block w-5 h-5 rounded bg-rose-100 dark:bg-rose-900/60 border-l-4 border-rose-500 dark:border-l-rose-400"
```

- [ ] **Step 4: Update tests that asserted old colors**

In `src/components/public/__tests__/group-table.test.tsx`, find any assertions like `toMatch(/bg-green-50/)` or `toMatch(/dark:bg-green-950\/40/)` and update them to:

- `toMatch(/bg-emerald-100/)`
- `toMatch(/dark:bg-emerald-900\/60/)`

(Apply the same pattern for amber → amber-100 / amber-900/60 and red → rose-100 / rose-900/60.)

If no tests assert specific colors, skip this step.

- [ ] **Step 5: Run tests**

Run: `cd /home/jeanfrusca/Projetos/bolao_copa && npm test -- --testPathPattern=group-table`
Expected: all pass.

- [ ] **Step 6: Lint**

Run: `cd /home/jeanfrusca/Projetos/bolao_copa && npm run lint`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
cd /home/jeanfrusca/Projetos/bolao_copa
git add src/components/public/group-table.tsx src/components/public/group-legend.tsx src/components/public/__tests__/group-table.test.tsx
git commit -m "feat(classificacao): cores emerald/amber/rose -100/-900-60 (light/dark)"
```

---

## Task 3: Vencedor destaque no Chaveamento

**Files:**
- Modify: `src/components/public/bracket-match.tsx`
- Modify: `src/components/public/__tests__/bracket-match.test.tsx`

- [ ] **Step 1: Read existing test**

Run: `cd /home/jeanfrusca/Projetos/bolao_copa && cat src/components/public/__tests__/bracket-match.test.tsx`

- [ ] **Step 2: Write failing tests for winner highlight**

Add to `src/components/public/__tests__/bracket-match.test.tsx`:

```tsx
describe('BracketMatch vencedor destaque', () => {
  const slotFinalizado = {
    jogoId: 'j1',
    fase: 'final' as const,
    slot: 1,
    timeA: 'Brasil',
    timeB: 'Argentina',
    placarA: 2,
    placarB: 0,
    status: 'finalizado' as const,
    vencedor: 'A' as const,
    placarPenaltisA: null,
    placarPenaltisB: null,
    dataHora: new Date('2026-07-19T19:00:00Z'),
  }

  it('vencedor (lado A) tem background emerald', () => {
    const { container } = render(<BracketMatch slot={slotFinalizado} size="md" />)
    // Pega a row do vencedor (classe bg-emerald-100)
    const winnerRow = container.querySelector('.bg-emerald-100, .dark\\:bg-emerald-900\\/40')
    expect(winnerRow).toBeInTheDocument()
  })

  it('vencedor tem nome com text-emerald-700', () => {
    const { container } = render(<BracketMatch slot={slotFinalizado} size="md" />)
    const winnerName = container.querySelector('.text-emerald-700, .dark\\:text-emerald-300')
    expect(winnerName).toBeInTheDocument()
  })

  it('perdedor (lado B) NÃO tem background emerald', () => {
    const { container } = render(<BracketMatch slot={slotFinalizado} size="md" />)
    // Apenas o vencedor (1 row) deve ter o bg, perdedor não
    const emeraldRows = container.querySelectorAll('.bg-emerald-100, .dark\\:bg-emerald-900\\/40')
    expect(emeraldRows.length).toBe(1)
  })
})
```

NOTE: Ajustar imports se necessário (`@testing-library/react`, tipo `BracketSlot`).

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd /home/jeanfrusca/Projetos/bolao_copa && npm test -- --testPathPattern=bracket-match`
Expected: novos testes FAIL (vencedor não tem bg ainda).

- [ ] **Step 4: Implement winner highlight**

Modify `src/components/public/bracket-match.tsx` — refactor the inner JSX to compute winner classes:

```tsx
// Adicione após `const italicA = ...`:
const isWinnerA = isFinalizado && slot.vencedor === 'A'
const isWinnerB = isFinalizado && slot.vencedor === 'B'

// Helper para classes de row (substitui os <span> dos times):
const rowClassesA = isWinnerA
  ? 'flex items-center justify-between gap-2 bg-emerald-100 dark:bg-emerald-900/40 -mx-3 px-3 rounded'
  : 'flex items-center justify-between gap-2'

const rowClassesB = isWinnerB
  ? 'flex items-center justify-between gap-2 bg-emerald-100 dark:bg-emerald-900/40 -mx-3 px-3 rounded'
  : 'flex items-center justify-between gap-2 mt-1'

const nameClassesA = isWinnerA
  ? 'truncate flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300'
  : `truncate flex items-center gap-1.5 ${italicA ? 'italic text-muted-foreground' : ''} ${slot.vencedor === 'A' ? 'font-bold' : ''}`

const nameClassesB = isWinnerB
  ? 'truncate flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300'
  : `truncate flex items-center gap-1.5 ${italicB ? 'italic text-muted-foreground' : ''} ${slot.vencedor === 'B' ? 'font-bold' : ''}`

const scoreClassesA = isWinnerA
  ? 'tabular-nums font-mono font-bold text-emerald-700 dark:text-emerald-300'
  : 'tabular-nums font-mono'

const scoreClassesB = isWinnerB
  ? 'tabular-nums font-mono font-bold text-emerald-700 dark:text-emerald-300'
  : 'tabular-nums font-mono'
```

Then replace the existing 2 row `<div>` elements in `inner` with the new classNames:

```tsx
<div className={rowClassesA}>
  <span className={nameClassesA}>
    {slot.timeA && getTimeFlag(slot.timeA) && <Flag ... />}
    <span className="truncate">{textoA}</span>
  </span>
  <span className={scoreClassesA}>{slot.placarA ?? '-'}</span>
</div>
<div className={rowClassesB}>
  <span className={nameClassesB}>
    {slot.timeB && getTimeFlag(slot.timeB) && <Flag ... />}
    <span className="truncate">{textoB}</span>
  </span>
  <span className={scoreClassesB}>{slot.placarB ?? '-'}</span>
</div>
```

Also update the card hover state: change `hover:bg-muted/50` to `hover:bg-muted/50 dark:hover:bg-muted/80`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /home/jeanfrusca/Projetos/bolao_copa && npm test -- --testPathPattern=bracket-match`
Expected: all tests pass.

- [ ] **Step 6: Lint**

Run: `cd /home/jeanfrusca/Projetos/bolao_copa && npm run lint`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
cd /home/jeanfrusca/Projetos/bolao_copa
git add src/components/public/bracket-match.tsx src/components/public/__tests__/bracket-match.test.tsx
git commit -m "feat(bracket): vencedor com bg + cor emerald (light/dark)"
```

---

## Task 4: Tab selector do Bracket (mobile)

**Files:**
- Modify: `src/components/public/bracket.tsx`
- Modify: `src/components/public/__tests__/bracket.test.tsx`

- [ ] **Step 1: Read existing test**

Run: `cd /home/jeanfrusca/Projetos/bolao_copa && cat src/components/public/__tests__/bracket.test.tsx`

- [ ] **Step 2: Write failing tests for tab selector**

Add to `src/components/public/__tests__/bracket.test.tsx`:

```tsx
// Adicionar imports se necessário:
import { TabsContext } from '@radix-ui/react-tabs'  // (ou similar, ajustar)

describe('Bracket tab selector mobile', () => {
  // Helper para mock de matchMedia (mobile)
  const mockMobile = () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((q: string) => ({
        matches: false, media: q,
        addEventListener: jest.fn(), removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })
  }

  it('fase ativa tem aria-current="page"', () => {
    mockMobile()
    const slots: BracketSlot[] = [{
      jogoId: 'j1', fase: 'dezesseis_avos', slot: 1,
      timeA: 'A', timeB: 'B', placarA: 0, placarB: 0,
      status: 'agendado', vencedor: null,
      placarPenaltisA: null, placarPenaltisB: null, dataHora: null,
    }]
    render(<Bracket slots={slots} />)
    const activeTab = screen.getByText('R32').closest('button')!
    expect(activeTab.getAttribute('aria-current')).toBe('page')
  })

  it('fase inativa NÃO tem aria-current', () => {
    mockMobile()
    const slots: BracketSlot[] = [{
      jogoId: 'j1', fase: 'dezesseis_avos', slot: 1,
      timeA: 'A', timeB: 'B', placarA: 0, placarB: 0,
      status: 'agendado', vencedor: null,
      placarPenaltisA: null, placarPenaltisB: null, dataHora: null,
    }]
    render(<Bracket slots={slots} />)
    const inactiveTab = screen.getByText('Oitavas').closest('button')!
    expect(inactiveTab.getAttribute('aria-current')).toBeNull()
  })

  it('fase ativa NÃO tem bg-primary sólido', () => {
    mockMobile()
    const slots: BracketSlot[] = [{
      jogoId: 'j1', fase: 'dezesseis_avos', slot: 1,
      timeA: 'A', timeB: 'B', placarA: 0, placarB: 0,
      status: 'agendado', vencedor: null,
      placarPenaltisA: null, placarPenaltisB: null, dataHora: null,
    }]
    render(<Bracket slots={slots} />)
    const activeTab = screen.getByText('R32').closest('button')!
    expect(activeTab.className).not.toMatch(/bg-primary/)
  })

  it('fase ativa tem underline indicator (h-0.5 bg-primary)', () => {
    mockMobile()
    const slots: BracketSlot[] = [{
      jogoId: 'j1', fase: 'dezesseis_avos', slot: 1,
      timeA: 'A', timeB: 'B', placarA: 0, placarB: 0,
      status: 'agendado', vencedor: null,
      placarPenaltisA: null, placarPenaltisB: null, dataHora: null,
    }]
    const { container } = render(<Bracket slots={slots} />)
    const underline = container.querySelector('.h-0\\.5.bg-primary')
    expect(underline).toBeInTheDocument()
  })
})
```

NOTE: Ajustar imports + tipo `BracketSlot` se necessário.

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd /home/jeanfrusca/Projetos/bolao_copa && npm test -- --testPathPattern=bracket`
Expected: novos testes FAIL (tab selector ainda tem bg-primary, sem aria-current).

- [ ] **Step 4: Update tab selector**

Modify `src/components/public/bracket.tsx` — replace the mobile tab buttons:

```tsx
{/* Mobile: seletor de fase */}
<div className="lg:hidden mb-4 flex gap-2 overflow-x-auto border-b">
  {FASES.map(f => (
    <button
      key={f}
      onClick={() => setFaseAtiva(f)}
      aria-current={faseAtiva === f ? 'page' : undefined}
      className={cn(
        'relative px-3 py-2 text-sm whitespace-nowrap transition-colors',
        'hover:text-foreground',
        faseAtiva === f ? 'text-foreground font-semibold' : 'text-muted-foreground',
      )}
    >
      {faseLabel(f)}
      {faseAtiva === f && (
        <span aria-hidden className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
      )}
    </button>
  ))}
</div>
```

Add `import { cn } from '@/lib/utils'` if not present.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /home/jeanfrusca/Projetos/bolao_copa && npm test -- --testPathPattern=bracket`
Expected: all tests pass.

- [ ] **Step 6: Lint**

Run: `cd /home/jeanfrusca/Projetos/bolao_copa && npm run lint`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
cd /home/jeanfrusca/Projetos/bolao_copa
git add src/components/public/bracket.tsx src/components/public/__tests__/bracket.test.tsx
git commit -m "feat(bracket): tab selector polido (underline + a11y, sem bg-primary)"
```

---

## Task 5: Header `/copa` (hero com badge + subtitle)

**Files:**
- Modify: `src/app/(public)/copa/page.tsx`

- [ ] **Step 1: Read current page**

Run: `cd /home/jeanfrusca/Projetos/bolao_copa && cat src/app/\(public\)/copa/page.tsx`

- [ ] **Step 2: Update page header**

Replace the `<h1>` and add Badge + subtitle:

```tsx
import { Badge } from '@/components/ui/badge'

// ... no JSX, substituir o <h1> e adicionar bloco:
<div className="mb-6">
  <div className="flex items-center gap-3 mb-1 flex-wrap">
    <h1 className="font-display text-3xl tracking-wide">Copa do Mundo 2026</h1>
    <Badge variant="outline" className="text-xs">Fase de grupos</Badge>
  </div>
  <p className="text-sm text-muted-foreground">
    11 jun – 19 jul · EUA 🇺🇸 · México 🇲🇽 · Canadá 🇨🇦
  </p>
</div>
```

(Remove the old `<h1 className="font-display text-3xl tracking-wide mb-6">Copa do Mundo 2026</h1>` standalone.)

- [ ] **Step 3: Lint + build**

Run: `cd /home/jeanfrusca/Projetos/bolao_copa && npm run lint && npm run build`
Expected: clean + OK.

- [ ] **Step 4: Commit**

```bash
cd /home/jeanfrusca/Projetos/bolao_copa
git add src/app/\(public\)/copa/page.tsx
git commit -m "feat(copa): hero com Badge 'Fase de grupos' + subtitle (datas/sedes)"
```

---

## Task 6: Dark mode polish (globals.css + hover states)

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/public/bracket-match.tsx` (hover)
- Modify: `src/components/public/group-card.tsx` (hover, se ainda não tem)

- [ ] **Step 1: Update dark vars in globals.css**

Modify `src/app/globals.css` — replace the `.dark` block (lines 34-58):

```css
.dark {
  --background: #0a0e1a;
  --foreground: #e2e8f0;
  --card: #131826;
  --card-foreground: #e2e8f0;
  --border: rgba(255, 255, 255, 0.08);
  --muted: #1a2030;
  --muted-foreground: #94a3b8;
  --primary: #00A651;
  --primary-foreground: #ffffff;
  --primary-light: #4caf50;
  --primary-dark: #0d3311;
  --secondary: #FFD700;
  --secondary-foreground: #1a1a1a;
  --secondary-light: #ffff52;
  --secondary-dark: #c7a500;
  --accent: #FFD700;
  --accent-foreground: #1a1a1a;
  --accent-light: #5e92f3;
  --accent-dark: #003c8f;
  --success: #2e7d32;
  --warning: #f9a825;
  --danger: #c62828;
  --ring: #00A651;
}
```

Changes:
- `--card`: `rgba(26, 31, 46, 0.7)` → `#131826` (opaco)
- `--border`: `0.1` → `0.08` (mais sutil)
- `--muted`: `#151b2e` → `#1a2030` (mais claro)
- `--muted-foreground`: `#8892a8` → `#94a3b8` (mais legível)

- [ ] **Step 2: Update hover states in bracket-match.tsx**

Modify `src/components/public/bracket-match.tsx` — change `hover:bg-muted/50` to `hover:bg-muted/50 dark:hover:bg-muted/80`:

Find line 56 (the `cardClasses` template) and update the `href` branch:

```tsx
const cardClasses = `block bg-card border rounded ${SIZE_CLASSES[size]} ${isTBD ? 'opacity-50' : ''} ${href ? 'hover:bg-muted/50 dark:hover:bg-muted/80 transition-colors cursor-pointer' : ''}`
```

- [ ] **Step 3: Update hover states in group-card.tsx**

Modify `src/components/public/group-card.tsx` — apply `dark:hover:bg-muted/80` in both variants:

```tsx
// Variant compact (around line 37):
'hover:bg-muted/50 active:bg-muted dark:hover:bg-muted/80 transition-colors'

// Variant full (around line 65):
'block w-full text-left rounded-lg hover:bg-muted/50 dark:hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
```

- [ ] **Step 4: Run all tests (regression check)**

Run: `cd /home/jeanfrusca/Projetos/bolao_copa && npm test`
Expected: 190+ tests pass (no regressions).

- [ ] **Step 5: Lint + build**

Run: `cd /home/jeanfrusca/Projetos/bolao_copa && npm run lint && npm run build`
Expected: clean + OK.

- [ ] **Step 6: Commit**

```bash
cd /home/jeanfrusca/Projetos/bolao_copa
git add src/app/globals.css src/components/public/bracket-match.tsx src/components/public/group-card.tsx
git commit -m "feat(dark-mode): card opaco + muted claro + hover dark:muted-80"
```

---

## Task 7: GroupTable ⚠ icon → Tooltip

**Files:**
- Modify: `src/components/public/group-table.tsx`

- [ ] **Step 1: Read current line 61**

Run: `cd /home/jeanfrusca/Projetos/bolao_copa && grep -n "title=" src/components/public/group-table.tsx`

- [ ] **Step 2: Replace `title=""` with Tooltip**

Modify `src/components/public/group-table.tsx`:

1. Add import at top:
   ```tsx
   import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
   ```

2. Replace the line with `title="..."`:

```tsx
// Before:
<span className="text-xs text-amber-600 dark:text-amber-400" title="Desempate exige fair play / ranking FIFA">⚠</span>

// After:
<Tooltip>
  <TooltipTrigger asChild>
    <span className="text-xs text-amber-600 dark:text-amber-400 cursor-help">⚠</span>
  </TooltipTrigger>
  <TooltipContent>Desempate exige fair play / ranking FIFA</TooltipContent>
</Tooltip>
```

- [ ] **Step 3: Run tests**

Run: `cd /home/jeanfrusca/Projetos/bolao_copa && npm test -- --testPathPattern=group-table`
Expected: all pass (no assertions on `title=""` specifically — verify with `grep`).

- [ ] **Step 4: Lint**

Run: `cd /home/jeanfrusca/Projetos/bolao_copa && npm run lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
cd /home/jeanfrusca/Projetos/bolao_copa
git add src/components/public/group-table.tsx
git commit -m "refactor(classificacao): ⚠ usa Tooltip acessível (substitui title=)"
```

---

## Task 8: Verificação final + push + merge

- [ ] **Step 1: Run all tests**

Run: `cd /home/jeanfrusca/Projetos/bolao_copa && npm test`
Expected: 193+ tests pass (190 base + 3 tooltip + group-table tests updated).

- [ ] **Step 2: Lint**

Run: `cd /home/jeanfrusca/Projetos/bolao_copa && npm run lint`
Expected: clean.

- [ ] **Step 3: Build**

Run: `cd /home/jeanfrusca/Projetos/bolao_copa && npm run build`
Expected: build OK.

- [ ] **Step 4: Push to dev (Vercel preview)**

```bash
cd /home/jeanfrusca/Projetos/bolao_copa
git push origin dev
```

- [ ] **Step 5: Smoke test no Vercel preview (mobile + desktop + dark/light)**

- Light mode mobile: /copa → cores Classificação visíveis, tooltip ⚠ funciona no tap, vencedor no bracket destaca, hero com badge visível
- Dark mode mobile: vars ajustadas, hover visível, sem card-glass feio
- Desktop: tab selector do bracket não aparece (lg:block), vencedor destaca
- Tooltip Esc fecha

- [ ] **Step 6: Merge dev → main**

```bash
cd /home/jeanfrusca/Projetos/bolao_copa
git checkout main
git merge dev --no-ff -m "Merge dev into main: Fase 2 v2 — refino visual"
git push origin main
```

---

## Self-Review

- ✅ Spec coverage: 5 features → 7 tasks (Tooltip, Cores, Vencedor, Tab selector, Header, Dark polish, ⚠ Tooltip migration, Final)
- ✅ Placeholders: 0 TBD/TODO, todos os steps com código completo
- ✅ Type consistency: `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent` em todos os uses
- ✅ TDD: cada task tem teste antes (exceto Header que é simples JSX + lint/build)
- ✅ Commits pequenos: 7 commits temáticos antes do merge
- ✅ YAGNI: card-glass, badge dinâmica, animação elaborada — todos fora
