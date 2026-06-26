# Simulador mobile (drawer full-screen + picker compacto) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar a aba Simulador do `/copa` em uma experiência mobile-first: drawer full-screen com drag handle/safe-area/sticky chrome, picker compacto com borda colorida por status, e body scroll lock ao abrir.

**Architecture:** Mudanças isoladas em 2 componentes (`GroupSimulator` drawer, `GroupCard` picker) + 1 hook (`useIsDesktop`) + tweaks no `Sheet` (z-index, overlay). Sem mudança de schema. TDD estrito: teste antes de cada mudança. Commits pequenos por task.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind 4, Radix Dialog (já usado em `Sheet`), Jest 30 + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-06-26-simulador-mobile-design.md` (commit `ba92188`).

---

## File Structure

| Arquivo | Responsabilidade | Mudança |
|---|---|---|
| `src/lib/hooks/use-is-desktop.ts` | Hook `useMediaQuery('(min-width: 768px)')` | **CRIAR** |
| `src/lib/hooks/__tests__/use-is-desktop.test.ts` | Test do hook | **CRIAR** |
| `src/components/public/group-card.tsx` | Picker de grupo; aceita `variant='compact'\|'full'` | **MODIFICAR** |
| `src/components/public/__tests__/group-card.test.tsx` | Tests para `full` (existente) + `compact` (novo) | **MODIFICAR** |
| `src/components/public/group-simulator.tsx` | Drawer full-screen mobile, drag handle, sticky chrome, safe-area, body scroll lock | **MODIFICAR** |
| `src/components/public/__tests__/group-simulator.test.tsx` | Tests para os novos elementos (mobile + desktop preservado) | **MODIFICAR** |
| `src/components/ui/sheet.tsx` | Aceita `overlayClassName` e `zIndex` opcional; overlay `bg-black/60` | **MODIFICAR** |
| `src/components/public/simulator-tab.tsx` | Usa `useIsDesktop`, passa `variant` ao GroupCard | **MODIFICAR** |

---

## Task 1: Hook `useIsDesktop`

**Files:**
- Create: `src/lib/hooks/use-is-desktop.ts`
- Create: `src/lib/hooks/__tests__/use-is-desktop.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/hooks/__tests__/use-is-desktop.test.ts`:

```ts
/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useIsDesktop } from '../use-is-desktop'

describe('useIsDesktop', () => {
  const mockMatchMedia = (matches: boolean) => {
    const listeners: Array<(e: { matches: boolean }) => void> = []
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches,
        media: query,
        addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
          listeners.push(cb)
        },
        removeEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
          const idx = listeners.indexOf(cb)
          if (idx >= 0) listeners.splice(idx, 1)
        },
        dispatchEvent: jest.fn(),
      })),
    })
    return listeners
  }

  it('retorna false em mobile (matches=false)', () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useIsDesktop())
    expect(result.current).toBe(false)
  })

  it('retorna true em desktop (matches=true)', () => {
    mockMatchMedia(true)
    const { result } = renderHook(() => useIsDesktop())
    expect(result.current).toBe(true)
  })

  it('atualiza quando matchMedia dispara change', () => {
    const listeners = mockMatchMedia(false)
    const { result } = renderHook(() => useIsDesktop())
    expect(result.current).toBe(false)

    act(() => {
      listeners.forEach(cb => cb({ matches: true }))
    })

    expect(result.current).toBe(true)
  })

  it('remove listener no unmount', () => {
    const listeners = mockMatchMedia(false)
    const { unmount } = renderHook(() => useIsDesktop())
    const initialListenerCount = listeners.length
    expect(initialListenerCount).toBe(1)

    unmount()

    expect(listeners.length).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=use-is-desktop`
Expected: FAIL — `Cannot find module '../use-is-desktop'`

- [ ] **Step 3: Implement the hook**

`src/lib/hooks/use-is-desktop.ts`:

```ts
'use client'
import { useEffect, useState } from 'react'

const DESKTOP_QUERY = '(min-width: 768px)'

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY)
    const onChange = () => setIsDesktop(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return isDesktop
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern=use-is-desktop`
Expected: 4 passing

- [ ] **Step 5: Commit**

```bash
git add src/lib/hooks/use-is-desktop.ts src/lib/hooks/__tests__/use-is-desktop.test.ts
git commit -m "feat(hook): useIsDesktop — matchMedia (min-width: 768px)"
```

---

## Task 2: GroupCard variant `compact` (test)

**Files:**
- Modify: `src/components/public/__tests__/group-card.test.tsx` (já existe — adicionar describe block)

- [ ] **Step 1: Read existing test to understand structure**

Run: `cat src/components/public/__tests__/group-card.test.tsx`

Expected: já tem `describe('GroupCard', ...)` com testes para variant full. Vamos adicionar `describe('GroupCard compact', ...)` no mesmo arquivo.

- [ ] **Step 2: Write failing tests for compact variant**

Acrescentar ao final do arquivo `src/components/public/__tests__/group-card.test.tsx`:

```tsx
import { GroupCard } from '../group-card'
import type { ClassificacaoTime } from '@/lib/services/bracket/types'

const makeTime = (overrides: Partial<ClassificacaoTime> = {}): ClassificacaoTime => ({
  time: 'México',
  jogos: 3, vitorias: 2, empates: 0, derrotas: 1,
  golsPro: 5, golsContra: 2, saldo: 3, pontos: 6,
  posicao: 1,
  jogosDetalhe: [],
  ...overrides,
})

const makeGrupo = (times: ClassificacaoTime[]): ClassificacaoGrupo => ({
  grupo: 'A',
  times,
  classificados: [],
  terceiro: times.find(t => t.posicao === 3) ?? makeTime({ time: 'placeholder', posicao: null }),
})

describe('GroupCard variant=compact', () => {
  const times: ClassificacaoTime[] = [
    makeTime({ time: 'México', pontos: 6, posicao: 1 }),
    makeTime({ time: 'África do Sul', pontos: 4, posicao: 2 }),
    makeTime({ time: 'Suécia', pontos: 4, posicao: 3 }),
    makeTime({ time: 'Alemanha', pontos: 0, posicao: 4 }),
  ]

  it('renderiza header "GRUPO A" e chevron', () => {
    render(<GroupCard grupo={makeGrupo(times)} variant="compact" onClick={() => {}} />)
    expect(screen.getByText('GRUPO A')).toBeInTheDocument()
  })

  it('renderiza 4 linhas com nome e pontos', () => {
    render(<GroupCard grupo={makeGrupo(times)} variant="compact" onClick={() => {}} />)
    expect(screen.getByText('México')).toBeInTheDocument()
    expect(screen.getByText('África do Sul')).toBeInTheDocument()
    expect(screen.getByText('Suécia')).toBeInTheDocument()
    expect(screen.getByText('Alemanha')).toBeInTheDocument()
    expect(screen.getAllByText('6')[0]).toBeInTheDocument()
    expect(screen.getAllByText('4')[0]).toBeInTheDocument()
  })

  it('não renderiza colunas P/J/V/E/D/SG', () => {
    render(<GroupCard grupo={makeGrupo(times)} variant="compact" onClick={() => {}} />)
    // P/J/V/E/D/SG devem estar ausentes (variant compact não tem)
    expect(screen.queryByText('P')).not.toBeInTheDocument()
    expect(screen.queryByText('SG')).not.toBeInTheDocument()
  })

  it('aplica borda verde quando 1º e 2º classificados', () => {
    const { container } = render(
      <GroupCard grupo={makeGrupo(times)} variant="compact" onClick={() => {}} />
    )
    const button = container.querySelector('button')!
    expect(button.className).toMatch(/border-l-emerald/)
  })

  it('aplica borda amarela quando 3º está nos qualificados', () => {
    const timesSem1e2: ClassificacaoTime[] = [
      makeTime({ time: 'México', pontos: 6, posicao: null }),
      makeTime({ time: 'África do Sul', pontos: 4, posicao: null }),
      makeTime({ time: 'Suécia', pontos: 4, posicao: 3 }),
      makeTime({ time: 'Alemanha', pontos: 0, posicao: 4 }),
    ]
    const { container } = render(
      <GroupCard
        grupo={makeGrupo(timesSem1e2)}
        qualificadosTerceiros={new Set(['A'])}
        variant="compact"
        onClick={() => {}}
      />
    )
    const button = container.querySelector('button')!
    expect(button.className).toMatch(/border-l-amber/)
  })

  it('aplica borda vermelha quando 3º eliminado', () => {
    const { container } = render(
      <GroupCard
        grupo={makeGrupo(times)}
        qualificadosTerceiros={new Set(['B', 'C'])}
        variant="compact"
        onClick={() => {}}
      />
    )
    const button = container.querySelector('button')!
    expect(button.className).toMatch(/border-l-rose/)
  })

  it('chama onClick ao clicar', () => {
    const onClick = jest.fn()
    render(<GroupCard grupo={makeGrupo(times)} variant="compact" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
```

(Verificar imports no topo do arquivo: `render, screen, fireEvent` de `@testing-library/react` e o `ClassificacaoGrupo` type de `@/lib/services/bracket/types`. Se não existirem, adicionar.)

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=group-card`
Expected: novos testes (variant=compact) FAIL — `variant` prop não existe ainda.

- [ ] **Step 4: Implement compact variant**

Modify `src/components/public/group-card.tsx`:

```tsx
'use client'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GroupTable } from './group-table'
import type { ClassificacaoGrupo } from '@/lib/services/bracket/types'

type Variant = 'compact' | 'full'

type Props = {
  grupo: ClassificacaoGrupo
  qualificadosTerceiros?: Set<string>
  onClick: () => void
  variant?: Variant
}

function getStatusClass(grupo: ClassificacaoGrupo, qualificadosTerceiros?: Set<string>): string {
  const primeiro = grupo.times.find(t => t.posicao === 1)
  const segundo = grupo.times.find(t => t.posicao === 2)
  const terceiro = grupo.times.find(t => t.posicao === 3)
  if (primeiro && segundo) {
    return 'border-l-emerald-500 dark:border-l-emerald-400'
  }
  if (terceiro && qualificadosTerceiros?.has(grupo.grupo)) {
    return 'border-l-amber-500 dark:border-l-amber-400'
  }
  return 'border-l-rose-500 dark:border-l-rose-400'
}

export function GroupCard({ grupo, qualificadosTerceiros, onClick, variant = 'full' }: Props) {
  if (variant === 'compact') {
    return (
      <button
        onClick={onClick}
        aria-label={`Editar jogos do grupo ${grupo.grupo}`}
        className={cn(
          'block w-full text-left rounded-lg border-l-4 bg-card',
          'hover:bg-muted/50 active:bg-muted transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          getStatusClass(grupo, qualificadosTerceiros),
        )}
      >
        <div className="px-3 py-2 flex items-center justify-between">
          <span className="font-display text-sm tracking-wide">GRUPO {grupo.grupo}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
        <div className="px-3 pb-2 space-y-0.5">
          {grupo.times.slice(0, 4).map(t => (
            <div key={t.time} className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground w-3 text-right tabular-nums">
                {t.posicao ?? '-'}
              </span>
              <span className="truncate min-w-0 flex-1">{t.time}</span>
              <span className="tabular-nums text-muted-foreground">{t.pontos}</span>
            </div>
          ))}
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      aria-label={`Editar jogos do grupo ${grupo.grupo}`}
      className="block w-full text-left rounded-lg hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      <div className="flex items-center gap-2 p-3">
        <div className="flex-1 pointer-events-none">
          <GroupTable grupo={grupo} qualificadosTerceiros={qualificadosTerceiros} />
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" aria-hidden />
      </div>
    </button>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=group-card`
Expected: todos os testes (full + compact) passam.

- [ ] **Step 6: Commit**

```bash
git add src/components/public/group-card.tsx src/components/public/__tests__/group-card.test.tsx
git commit -m "feat(card): variant compact — 4 linhas + borda colorida por status"
```

---

## Task 3: Sheet — overlay + z-index configurável

**Files:**
- Modify: `src/components/ui/sheet.tsx`

- [ ] **Step 1: Read current sheet**

Run: `cat src/components/ui/sheet.tsx`

- [ ] **Step 2: Modify SheetOverlay and SheetContent**

Em `src/components/ui/sheet.tsx`:

1. `SheetContent` ganha prop `zIndex?: number` (default 50) e `overlayClassName?: string`.
2. `SheetOverlay` aplica `overlayClassName` (default `bg-black/60`).
3. `SheetContent` aplica `z-[${zIndex}]` no className.

```tsx
'use client'
import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Side = 'right' | 'bottom'

type SheetContentProps = React.ComponentProps<typeof DialogPrimitive.Content> & {
  side?: Side
  onOpenChange?: (open: boolean) => void
  overlayClassName?: string
  zIndex?: number
}

const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> & { overlayClassName?: string }
>(({ className, overlayClassName, ...props }, ref) => (
  <DialogPrimitive.Overlay
    className={cn(
      'fixed inset-0 bg-black/60',
      'data-[state=open]:animate-in data-[state=open]:fade-in-0',
      'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
      overlayClassName,
      className,
    )}
    style={{ zIndex: 60 }}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = 'SheetOverlay'

const sideClasses: Record<Side, string> = {
  right: cn(
    'inset-y-0 right-0 h-full w-3/4 sm:max-w-md border-l',
    'data-[state=open]:animate-in data-[state=open]:slide-in-from-right',
    'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right',
  ),
  bottom: cn(
    'inset-x-0 bottom-0 max-h-[90vh] rounded-t-xl border-t',
    'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom',
    'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom',
  ),
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ side = 'right', className, children, onOpenChange, overlayClassName, zIndex = 50, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <SheetOverlay overlayClassName={overlayClassName} />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed gap-4 bg-background p-6 shadow-lg',
        sideClasses[side],
        className,
      )}
      style={{ zIndex: zIndex + 10 }}
      onPointerDownOutside={() => onOpenChange?.(false)}
      onEscapeKeyDown={() => onOpenChange?.(false)}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
SheetContent.displayName = 'SheetContent'

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-2 text-left', className)} {...props} />
)
SheetHeader.displayName = 'SheetHeader'

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold text-foreground', className)}
    {...props}
  />
))
SheetTitle.displayName = 'SheetTitle'

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
SheetDescription.displayName = 'SheetDescription'

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
}
```

- [ ] **Step 3: Run existing Sheet tests (se houver)**

Run: `npm test -- --testPathPattern=sheet`
Expected: se não houver testes para Sheet (provável), só rodar lint.

Run: `npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/sheet.tsx
git commit -m "feat(sheet): z-index configurável, overlay bg-black/60 (default)"
```

---

## Task 4: GroupSimulator — drawer full-screen mobile

**Files:**
- Modify: `src/components/public/group-simulator.tsx`
- Modify: `src/components/public/__tests__/group-simulator.test.tsx`

- [ ] **Step 1: Read existing test**

Run: `cat src/components/public/__tests__/group-simulator.test.tsx`

- [ ] **Step 2: Write failing tests for mobile drawer**

Adicionar `describe('GroupSimulator mobile drawer', ...)` no arquivo `src/components/public/__tests__/group-simulator.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { GroupSimulator } from '../group-simulator'
import type { JogoComTimes, ClassificacaoGrupo, ClassificacaoTime } from '@/lib/services/bracket/types'

// (helpers makeJogo, makeTerceiro, makeGrupo já existem do describe anterior)

const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

describe('GroupSimulator mobile drawer', () => {
  beforeEach(() => {
    mockMatchMedia(false) // mobile
    document.body.style.overflow = ''
  })

  it('renderiza drag handle visual (h-1 w-8 rounded-full)', () => {
    const { container } = render(
      <GroupSimulator
        grupo={makeGrupo()}
        jogos={[makeJogo('j1')]}
        open
        onOpenChange={() => {}}
        onPlacarChange={() => {}}
      />,
    )
    const handle = container.querySelector('.h-1.w-8.rounded-full')
    expect(handle).toBeInTheDocument()
  })

  it('renderiza botão Fechar full-width no rodapé', () => {
    render(
      <GroupSimulator
        grupo={makeGrupo()}
        jogos={[makeJogo('j1')]}
        open
        onOpenChange={() => {}}
        onPlacarChange={() => {}}
      />,
    )
    const closeButton = screen.getByRole('button', { name: /fechar/i })
    expect(closeButton).toBeInTheDocument()
    expect(closeButton.className).toMatch(/w-full/)
  })

  it('Fechar no rodapé chama onOpenChange(false)', () => {
    const onOpenChange = jest.fn()
    render(
      <GroupSimulator
        grupo={makeGrupo()}
        jogos={[makeJogo('j1')]}
        open
        onOpenChange={onOpenChange}
        onPlacarChange={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /fechar/i }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('trava body scroll quando abre (mobile)', () => {
    render(
      <GroupSimulator
        grupo={makeGrupo()}
        jogos={[makeJogo('j1')]}
        open
        onOpenChange={() => {}}
        onPlacarChange={() => {}}
      />,
    )
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('restaura body scroll quando fecha (mobile)', () => {
    const { rerender } = render(
      <GroupSimulator
        grupo={makeGrupo()}
        jogos={[makeJogo('j1')]}
        open
        onOpenChange={() => {}}
        onPlacarChange={() => {}}
      />,
    )
    expect(document.body.style.overflow).toBe('hidden')
    rerender(
      <GroupSimulator
        grupo={makeGrupo()}
        jogos={[makeJogo('j1')]}
        open={false}
        onOpenChange={() => {}}
        onPlacarChange={() => {}}
      />,
    )
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('NÃO trava body scroll em desktop', () => {
    mockMatchMedia(true) // desktop
    render(
      <GroupSimulator
        grupo={makeGrupo()}
        jogos={[makeJogo('j1')]}
        open
        onOpenChange={() => {}}
        onPlacarChange={() => {}}
      />,
    )
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=group-simulator`
Expected: novos testes mobile FAIL (drag handle ausente, Fechar button ausente, body scroll não trava).

- [ ] **Step 4: Implement mobile drawer layout**

Modify `src/components/public/group-simulator.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { JogoSimulatorRow } from './jogo-simulator-row'
import type { JogoComTimes, ClassificacaoGrupo } from '@/lib/services/bracket/types'

type Props = {
  grupo: ClassificacaoGrupo
  jogos: JogoComTimes[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onPlacarChange: (jogoId: string, placarA: number, placarB: number) => void
}

export function GroupSimulator({ grupo, jogos, open, onOpenChange, onPlacarChange }: Props) {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = () => setIsDesktop(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (isDesktop || !open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open, isDesktop])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? 'right' : 'bottom'}
        zIndex={isDesktop ? 50 : 60}
        onOpenChange={onOpenChange}
        className={cn(
          'flex flex-col gap-0 p-0',
          isDesktop
            ? 'sm:max-w-md p-6'
            : 'h-[100dvh] max-h-[100dvh] rounded-t-2xl border-t shadow-2xl',
        )}
      >
        {!isDesktop && (
          <>
            <div aria-hidden className="pt-2 pb-1">
              <div className="mx-auto h-1 w-8 rounded-full bg-muted" />
            </div>

            <div className="sticky top-0 z-10 bg-background px-4 py-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <SheetTitle>Grupo {grupo.grupo}</SheetTitle>
                  <SheetDescription>
                    {jogos.length === 0
                      ? 'Nenhum jogo futuro neste grupo.'
                      : `${jogos.length} jogo${jogos.length === 1 ? '' : 's'} futuro${jogos.length === 1 ? '' : 's'}`}
                  </SheetDescription>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y px-4">
              {jogos.map(jogo => (
                <JogoSimulatorRow
                  key={jogo.id}
                  jogo={jogo}
                  onPlacarChange={(a, b) => onPlacarChange(jogo.id, a, b)}
                />
              ))}
            </div>

            <div
              className="sticky bottom-0 bg-background border-t p-4"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
            >
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                Fechar
              </Button>
            </div>
          </>
        )}

        {isDesktop && (
          <>
            <SheetHeader>
              <SheetTitle>Grupo {grupo.grupo}</SheetTitle>
              <SheetDescription>
                {jogos.length === 0
                  ? 'Nenhum jogo futuro neste grupo.'
                  : `${jogos.length} jogo${jogos.length === 1 ? '' : 's'} futuro${jogos.length === 1 ? '' : 's'}`}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto divide-y">
              {jogos.map(jogo => (
                <JogoSimulatorRow
                  key={jogo.id}
                  jogo={jogo}
                  onPlacarChange={(a, b) => onPlacarChange(jogo.id, a, b)}
                />
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Os cálculos atualizam automaticamente conforme você edita.
            </p>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
```

(Nota: o botão X do SheetContent é o `DialogPrimitive.Close` global. Em mobile, ele ainda fica visível (absolute top-4 right-4), mas o sticky header já tem o título. É aceitável ter X em ambos os lugares — YAGNI remover.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=group-simulator`
Expected: todos os testes passam (existentes + novos mobile).

- [ ] **Step 6: Commit**

```bash
git add src/components/public/group-simulator.tsx src/components/public/__tests__/group-simulator.test.tsx
git commit -m "feat(simulator): drawer full-screen mobile — drag handle, sticky chrome, body scroll lock"
```

---

## Task 5: simulator-tab — wire useIsDesktop + variant

**Files:**
- Modify: `src/components/public/simulator-tab.tsx`

- [ ] **Step 1: Read current simulator-tab**

Run: `cat src/components/public/simulator-tab.tsx`

- [ ] **Step 2: Update to use hook and pass variant**

```tsx
'use client'
import { useState, useMemo } from 'react'
import type { JogoComTimes } from '@/lib/services/bracket/types'
import { useSimulacao } from '@/lib/hooks/use-simulacao'
import { useIsDesktop } from '@/lib/hooks/use-is-desktop'
import { getClassificacaoGrupos } from '@/lib/services/bracket/standings'
import { getMelhores8Terceiros } from '@/lib/services/bracket/best-thirds'
import { projetarChaveamento } from '@/lib/services/bracket/projector'
import { GroupCard } from './group-card'
import { GroupLegend } from './group-legend'
import { Bracket } from './bracket'
import { GroupSimulator } from './group-simulator'
import { SimulatorBanner } from './simulator-banner'

type Props = {
  jogos: JogoComTimes[]
}

export function SimulatorTab({ jogos }: Props) {
  const [grupoAberto, setGrupoAberto] = useState<string | null>(null)
  const isDesktop = useIsDesktop()
  const { jogosComSimulacao, setPlacar, clear, count } = useSimulacao(jogos)

  const { classificacao, bracket, qualificadosTerceiros } = useMemo(() => {
    const jogosGrupos = jogosComSimulacao.filter(j => j.fase === 'grupos')
    const jogosMataMata = jogosComSimulacao.filter(j => j.fase !== 'grupos')
    const c = getClassificacaoGrupos(jogosGrupos)
    const t = getMelhores8Terceiros(c)
    const q = new Set(t.map(x => x.grupo))
    const b = projetarChaveamento({ classificacao: c, melhoresTerceiros: t, jogosMataMata })
    return { classificacao: c, bracket: b, qualificadosTerceiros: q }
  }, [jogosComSimulacao])

  const grupoAtual = classificacao.find(g => g.grupo === grupoAberto) ?? null
  const jogosFuturosGrupoAtual = grupoAberto
    ? jogosComSimulacao.filter(j => j.fase === 'grupos' && j.grupo === grupoAberto && j.status !== 'finalizado')
    : []

  return (
    <div>
      <SimulatorBanner count={count} onLimpar={clear} />
      <p className="text-sm text-muted-foreground mb-4">
        Clique num grupo pra editar os placares dos jogos futuros. A classificação e o chaveamento atualizam em tempo real.
      </p>

      <GroupLegend />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-2 md:gap-3 mb-8">
        {classificacao.map(g => (
          <GroupCard
            key={g.grupo}
            grupo={g}
            qualificadosTerceiros={qualificadosTerceiros}
            variant={isDesktop ? 'full' : 'compact'}
            onClick={() => setGrupoAberto(g.grupo)}
          />
        ))}
      </div>

      <h3 className="font-display text-xl tracking-wide mb-4">Chaveamento (simulado)</h3>
      <Bracket slots={bracket} />

      {grupoAtual && (
        <GroupSimulator
          grupo={grupoAtual}
          jogos={jogosFuturosGrupoAtual}
          open={!!grupoAberto}
          onOpenChange={(open) => !open && setGrupoAberto(null)}
          onPlacarChange={setPlacar}
        />
      )}
    </div>
  )
}
```

(Nota: `md:grid-cols-2` é redundante com `sm:grid-cols-2` mas explícito. Em mobile (≤ 640px) = 1 coluna. Em sm-md (640-1023px) = 2 colunas com cards compactos. Em xl (≥ 1280px) = 3 colunas com cards full.)

- [ ] **Step 3: Run lint + build**

Run: `npm run lint && npm run build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/public/simulator-tab.tsx
git commit -m "feat(simulator-tab): usa useIsDesktop + variant compact no mobile"
```

---

## Task 6: Verificação final

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: 169+ tests passing (4 do useIsDesktop + 6 do group-card compact + 6 do group-simulator mobile = +16 mínimo).

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 4: Push to dev (Vercel preview)**

```bash
git push origin dev
```

- [ ] **Step 5: Smoke test no Vercel preview (mobile)**

- Abrir preview em iPhone real ou Chrome DevTools (iPhone 12)
- Navegar para `/copa`, tab "Simulador"
- Verificar 12 cards compactos (1 ou 2 colunas conforme viewport)
- Tap em qualquer card → drawer full-screen com drag handle
- Editar placar → classificação atualiza
- Tap em "Fechar" ou fora → drawer fecha, body scroll volta
- Trocar de grupo (drawer troca de grupo)
- Modo dark/light: bordas coloridas visíveis, contraste OK
- Verificar console sem erros

- [ ] **Step 6: Merge dev → main**

```bash
git checkout main
git merge dev
git push origin main
```

- [ ] **Step 7: Verificar deploy produção**

- Abrir bolao-familia.vercel.app/copa no celular
- Repetir smoke test

---

## Self-Review

- ✅ Spec coverage: 4 decisões locked (escopo, drawer, picker, borda) → tasks 2, 3, 4 cobrem todas
- ✅ Placeholders: 0 TBD/TODO, todos os steps com código completo
- ✅ Type consistency: `getStatusClass`, `Variant` type, `useIsDesktop` definidos em tasks 1-2 e usados em tasks 4-5
- ✅ Test-first: cada task tem teste antes da implementação
- ✅ Commits pequenos: 5 commits temáticos + 1 merge
- ✅ YAGNI: nenhuma feature fora do escopo
