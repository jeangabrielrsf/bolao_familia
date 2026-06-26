# Simulador — Drawer por grupo — Plano de implementação

**Data:** 2026-06-23
**Spec:** `docs/superpowers/specs/2026-06-23-simulador-drawer-design.md`
**Abordagem:** Subagent-Driven (TDD por tarefa, fresh subagent + 2 reviews)

---

## Pré-requisitos

Antes de começar:
- Branch atual: `main` (38 commits ahead de origin)
- Spec revisada e aprovada pelo usuário
- Stack: Next.js 16, React 19, TS 5, Tailwind 4, Jest 30
- `@radix-ui/react-dialog@1.1.16` instalado
- `tailwindcss-animate@1.0.7` instalado
- `aplicarSimulacao` já existe em `src/lib/services/bracket/simulator.ts`

---

## Tarefa 1: Hook `useSimulacao`

**Files:**
- Create: `src/lib/hooks/use-simulacao.ts`
- Create: `src/lib/hooks/__tests__/use-simulacao.test.ts`

- [ ] **Step 1: Escrever teste falhando**

Criar `src/lib/hooks/__tests__/use-simulacao.test.ts`:

```tsx
/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useSimulacao } from '../use-simulacao'
import type { JogoComTimes } from '@/lib/services/bracket/types'

const makeJogo = (id: string, overrides: Partial<JogoComTimes> = {}): JogoComTimes => ({
  id, fase: 'grupos', grupo: 'A', timeA: 'A', timeB: 'B',
  resultadoA: null, resultadoB: null, status: 'agendado',
  placarPenaltisA: null, placarPenaltisB: null, vencedor: null,
  sofascoreId: id, dataHora: new Date(),
  ...overrides,
})

const STORAGE_KEY = 'copa_sim'

beforeEach(() => {
  localStorage.clear()
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation((k) => {
    if (k === STORAGE_KEY) return localStorageMock[k as keyof typeof localStorageMock] ?? null
    return null
  })
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation((k, v) => {
    ;(localStorageMock as Record<string, string>)[k] = v
  })
  jest.spyOn(Storage.prototype, 'removeItem').mockImplementation((k) => {
    delete localStorageMock[k as keyof typeof localStorageMock]
  })
})

const localStorageMock: Record<string, string> = {}

describe('useSimulacao', () => {
  const jogos = [makeJogo('j1'), makeJogo('j2')]

  it('inicia com simulacao vazia', () => {
    const { result } = renderHook(() => useSimulacao(jogos))
    expect(result.current.simulacao).toEqual({})
    expect(result.current.count).toBe(0)
  })

  it('carrega do localStorage no mount', () => {
    localStorageMock[STORAGE_KEY] = JSON.stringify({ j1: { placarA: 2, placarB: 1 } })
    const { result } = renderHook(() => useSimulacao(jogos))
    expect(result.current.simulacao).toEqual({ j1: { placarA: 2, placarB: 1 } })
  })

  it('setPlacar atualiza state', () => {
    const { result } = renderHook(() => useSimulacao(jogos))
    act(() => result.current.setPlacar('j1', 3, 0))
    expect(result.current.simulacao.j1).toEqual({ placarA: 3, placarB: 0 })
    expect(result.current.count).toBe(1)
  })

  it('setPlacar persiste no localStorage', () => {
    const { result } = renderHook(() => useSimulacao(jogos))
    act(() => result.current.setPlacar('j1', 3, 0))
    expect(JSON.parse(localStorageMock[STORAGE_KEY])).toEqual({
      j1: { placarA: 3, placarB: 0 },
    })
  })

  it('jogosComSimulacao aplica simulacao via aplicarSimulacao', () => {
    const { result } = renderHook(() => useSimulacao(jogos))
    act(() => result.current.setPlacar('j1', 3, 0))
    const updated = result.current.jogosComSimulacao
    expect(updated.find(j => j.id === 'j1')?.resultadoA).toBe(3)
    expect(updated.find(j => j.id === 'j1')?.status).toBe('finalizado')
    expect(updated.find(j => j.id === 'j2')?.status).toBe('agendado')
  })

  it('clear reseta state e localStorage', () => {
    const { result } = renderHook(() => useSimulacao(jogos))
    act(() => result.current.setPlacar('j1', 3, 0))
    act(() => result.current.clear())
    expect(result.current.simulacao).toEqual({})
    expect(localStorageMock[STORAGE_KEY]).toBeUndefined()
  })
})
```

- [ ] **Step 2: Rodar teste, esperar falha**

```bash
npm test -- use-simulacao.test.ts
```

- [ ] **Step 3: Implementar `useSimulacao`**

Criar `src/lib/hooks/use-simulacao.ts`:

```ts
'use client'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { aplicarSimulacao } from '@/lib/services/bracket/simulator'
import type { JogoComTimes } from '@/lib/services/bracket/types'

const STORAGE_KEY = 'copa_sim'

type Simulacao = Record<string, { placarA: number; placarB: number }>

type UseSimulacaoReturn = {
  simulacao: Simulacao
  jogosComSimulacao: JogoComTimes[]
  setPlacar: (jogoId: string, placarA: number, placarB: number) => void
  clear: () => void
  count: number
}

function loadFromStorage(): Simulacao {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function useSimulacao(jogos: JogoComTimes[]): UseSimulacaoReturn {
  const [simulacao, setSimulacao] = useState<Simulacao>(loadFromStorage)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (Object.keys(simulacao).length === 0) {
      window.localStorage.removeItem(STORAGE_KEY)
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(simulacao))
    }
  }, [simulacao])

  const setPlacar = useCallback((jogoId: string, placarA: number, placarB: number) => {
    setSimulacao(prev => ({ ...prev, [jogoId]: { placarA, placarB } }))
  }, [])

  const clear = useCallback(() => {
    setSimulacao({})
  }, [])

  const jogosComSimulacao = useMemo(
    () => aplicarSimulacao(jogos, simulacao),
    [jogos, simulacao],
  )

  return {
    simulacao,
    jogosComSimulacao,
    setPlacar,
    clear,
    count: Object.keys(simulacao).length,
  }
}
```

- [ ] **Step 4: Rodar testes, esperar sucesso**

```bash
npm test -- use-simulacao.test.ts
```

Esperado: 6/6 PASS.

- [ ] **Step 5: Verificar lint**

```bash
npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/hooks/use-simulacao.ts src/lib/hooks/__tests__/use-simulacao.test.ts
git commit -m "feat(simulator): useSimulacao hook (state + localStorage + recalc)"
```

---

## Tarefa 2: UI primitive `sheet.tsx`

**Files:**
- Create: `src/components/ui/sheet.tsx`
- Create: `src/components/ui/__tests__/sheet.test.tsx`

- [ ] **Step 1: Escrever teste falhando**

Criar `src/components/ui/__tests__/sheet.test.tsx`:

```tsx
/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../sheet'

describe('Sheet', () => {
  it('renderiza children quando open=true', () => {
    render(
      <Sheet open onOpenChange={() => {}}>
        <SheetContent>
          <SheetTitle>Test</SheetTitle>
          <p>Content here</p>
        </SheetContent>
      </Sheet>
    )
    expect(screen.getByText('Test')).toBeInTheDocument()
    expect(screen.getByText('Content here')).toBeInTheDocument()
  })

  it('chama onOpenChange(false) ao pressionar ESC', () => {
    const onOpenChange = jest.fn()
    render(
      <Sheet open onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetTitle>Test</SheetTitle>
        </SheetContent>
      </Sheet>
    )
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('aplica classes de side="right" por padrão', () => {
    render(
      <Sheet open onOpenChange={() => {}}>
        <SheetContent>
          <SheetTitle>Right</SheetTitle>
        </SheetContent>
      </Sheet>
    )
    const content = screen.getByText('Right').closest('[role="dialog"]')!
    expect(content.className).toMatch(/right-0|inset-y-0/)
  })

  it('aplica classes de side="bottom" quando especificado', () => {
    render(
      <Sheet open onOpenChange={() => {}}>
        <SheetContent side="bottom">
          <SheetTitle>Bottom</SheetTitle>
        </SheetContent>
      </Sheet>
    )
    const content = screen.getByText('Bottom').closest('[role="dialog"]')!
    expect(content.className).toMatch(/bottom-0|inset-x-0/)
  })
})
```

- [ ] **Step 2: Rodar teste, esperar falha**

- [ ] **Step 3: Implementar `sheet.tsx`**

Criar `src/components/ui/sheet.tsx`:

```tsx
'use client'
import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Side = 'right' | 'bottom'

type SheetProps = React.ComponentProps<typeof DialogPrimitive.Root>

type SheetContentProps = React.ComponentProps<typeof DialogPrimitive.Content> & {
  side?: Side
  onOpenChange?: (open: boolean) => void
}

const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    className={cn(
      'fixed inset-0 z-50 bg-black/40',
      'data-[state=open]:animate-in data-[state=open]:fade-in-0',
      'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
      className,
    )}
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
>(({ side = 'right', className, children, onOpenChange, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50 gap-4 bg-background p-6 shadow-lg',
        sideClasses[side],
        className,
      )}
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

- [ ] **Step 4: Rodar testes, esperar sucesso**

```bash
npm test -- sheet.test.tsx
```

Esperado: 4/4 PASS.

- [ ] **Step 5: Verificar lint + typecheck**

```bash
npm run lint && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/sheet.tsx src/components/ui/__tests__/sheet.test.tsx
git commit -m "feat(ui): Sheet primitive (side/bottom variants via Radix Dialog)"
```

---

## Tarefa 3: `JogoSimulatorRow`

**Files:**
- Create: `src/components/public/jogo-simulator-row.tsx`
- Create: `src/components/public/__tests__/jogo-simulator-row.test.tsx`

- [ ] **Step 1: Escrever teste falhando**

Criar `src/components/public/__tests__/jogo-simulator-row.test.tsx`:

```tsx
/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { JogoSimulatorRow } from '../jogo-simulator-row'
import type { JogoComTimes } from '@/lib/services/bracket/types'

const makeJogo = (overrides: Partial<JogoComTimes> = {}): JogoComTimes => ({
  id: 'j1', fase: 'grupos', grupo: 'A', timeA: 'México', timeB: 'África do Sul',
  resultadoA: null, resultadoB: null, status: 'agendado',
  placarPenaltisA: null, placarPenaltisB: null, vencedor: null,
  sofascoreId: 'j1', dataHora: new Date(),
  ...overrides,
})

describe('JogoSimulatorRow', () => {
  it('renderiza nomes dos times', () => {
    render(<JogoSimulatorRow jogo={makeJogo()} onPlacarChange={() => {}} />)
    expect(screen.getByText('México')).toBeInTheDocument()
    expect(screen.getByText('África do Sul')).toBeInTheDocument()
  })

  it('renderiza inputs com placares iniciais', () => {
    render(<JogoSimulatorRow jogo={makeJogo({ resultadoA: 2, resultadoB: 1 })} onPlacarChange={() => {}} />)
    const inputA = screen.getByLabelText('Placar México') as HTMLInputElement
    const inputB = screen.getByLabelText('Placar África do Sul') as HTMLInputElement
    expect(inputA.value).toBe('2')
    expect(inputB.value).toBe('1')
  })

  it('inputs começam vazios quando placar é null', () => {
    render(<JogoSimulatorRow jogo={makeJogo()} onPlacarChange={() => {}} />)
    const inputA = screen.getByLabelText('Placar México') as HTMLInputElement
    expect(inputA.value).toBe('')
  })

  it('chama onPlacarChange ao digitar', () => {
    const onPlacarChange = jest.fn()
    render(<JogoSimulatorRow jogo={makeJogo()} onPlacarChange={onPlacarChange} />)
    const inputA = screen.getByLabelText('Placar México')
    fireEvent.change(inputA, { target: { value: '3' } })
    expect(onPlacarChange).toHaveBeenCalledWith(3, 0)
  })

  it('renderiza placares como texto quando jogo finalizado', () => {
    render(
      <JogoSimulatorRow
        jogo={makeJogo({ status: 'finalizado', resultadoA: 2, resultadoB: 1 })}
        onPlacarChange={() => {}}
      />
    )
    expect(screen.queryByLabelText('Placar México')).not.toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar teste, esperar falha**

- [ ] **Step 3: Implementar `JogoSimulatorRow`**

Criar `src/components/public/jogo-simulator-row.tsx`:

```tsx
'use client'
import { Input } from '@/components/ui/input'
import { Flag } from '@/components/ui/flag'
import { getTimeFlag } from '@/lib/utils/flags'
import type { JogoComTimes } from '@/lib/services/bracket/types'

type Props = {
  jogo: JogoComTimes
  onPlacarChange: (placarA: number, placarB: number) => void
}

export function JogoSimulatorRow({ jogo, onPlacarChange }: Props) {
  const finalizado = jogo.status === 'finalizado'

  if (finalizado && jogo.resultadoA !== null && jogo.resultadoB !== null) {
    return (
      <div className="flex items-center gap-3 py-2 opacity-60">
        {jogo.timeA && getTimeFlag(jogo.timeA) && (
          <Flag codigoIso={getTimeFlag(jogo.timeA)!} size={20} />
        )}
        <span className="flex-1 font-medium">{jogo.timeA}</span>
        <span className="font-mono tabular-nums">{jogo.resultadoA}</span>
        <span className="text-muted-foreground">×</span>
        <span className="font-mono tabular-nums">{jogo.resultadoB}</span>
        <span className="flex-1 font-medium text-right">{jogo.timeB}</span>
        {jogo.timeB && getTimeFlag(jogo.timeB) && (
          <Flag codigoIso={getTimeFlag(jogo.timeB)!} size={20} />
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 py-2">
      {jogo.timeA && getTimeFlag(jogo.timeA) && (
        <Flag codigoIso={getTimeFlag(jogo.timeA)!} size={20} />
      )}
      <span className="flex-1 font-medium">{jogo.timeA}</span>
      <Input
        type="number"
        min="0"
        max="99"
        value={jogo.resultadoA ?? ''}
        onChange={e => onPlacarChange(parseInt(e.target.value) || 0, jogo.resultadoB ?? 0)}
        aria-label={`Placar ${jogo.timeA}`}
        className="w-16 text-center"
      />
      <span className="text-muted-foreground">×</span>
      <Input
        type="number"
        min="0"
        max="99"
        value={jogo.resultadoB ?? ''}
        onChange={e => onPlacarChange(jogo.resultadoA ?? 0, parseInt(e.target.value) || 0)}
        aria-label={`Placar ${jogo.timeB}`}
        className="w-16 text-center"
      />
      <span className="flex-1 font-medium text-right">{jogo.timeB}</span>
      {jogo.timeB && getTimeFlag(jogo.timeB) && (
        <Flag codigoIso={getTimeFlag(jogo.timeB)!} size={20} />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Rodar testes, esperar sucesso**

```bash
npm test -- jogo-simulator-row.test.tsx
```

Esperado: 5/5 PASS.

- [ ] **Step 5: Verificar lint**

- [ ] **Step 6: Commit**

```bash
git add src/components/public/jogo-simulator-row.tsx src/components/public/__tests__/jogo-simulator-row.test.tsx
git commit -m "feat(simulator): JogoSimulatorRow com inputs numéricos + Flag"
```

---

## Tarefa 4: `GroupCard`

**Files:**
- Create: `src/components/public/group-card.tsx`
- Create: `src/components/public/__tests__/group-card.test.tsx`

- [ ] **Step 1: Escrever teste falhando**

Criar `src/components/public/__tests__/group-card.test.tsx`:

```tsx
/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { GroupCard } from '../group-card'
import type { ClassificacaoGrupo } from '@/lib/services/bracket/types'

// Nota: `terceiro: null` é workaround histórico — o tipo atual exige `ClassificacaoTime` não-null.
// Em produção o implementador precisou construir um ClassificacaoTime válido (ex: 3º colocado do grupo).
// Para o plano, mantemos a forma antiga; testes que precisarem de `terceiro` válido devem montar um.
const makeGrupo = (overrides: Partial<ClassificacaoGrupo> = {}): ClassificacaoGrupo => ({
  grupo: 'A',
  times: [
    { time: 'México', posicao: 1, pontos: 6, jogos: 2, vitorias: 2, empates: 0, derrotas: 0, golsPro: 4, golsContra: 1, saldo: 3, jogosDetalhe: [] },
    { time: 'Coreia do Sul', posicao: 2, pontos: 3, jogos: 2, vitorias: 1, empates: 0, derrotas: 1, golsPro: 2, golsContra: 2, saldo: 0, jogosDetalhe: [] },
    { time: 'África do Sul', posicao: 3, pontos: 3, jogos: 2, vitorias: 1, empates: 0, derrotas: 1, golsPro: 1, golsContra: 2, saldo: -1, jogosDetalhe: [] },
    { time: 'Alemanha', posicao: 4, pontos: 0, jogos: 2, vitorias: 0, empates: 0, derrotas: 2, golsPro: 0, golsContra: 2, saldo: -2, jogosDetalhe: [] },
  ],
  classificados: [],
  terceiro: null,
  ...overrides,
})

describe('GroupCard', () => {
  it('renderiza nome do grupo e times', () => {
    render(<GroupCard grupo={makeGrupo()} onClick={() => {}} />)
    expect(screen.getByText('Grupo A')).toBeInTheDocument()
    expect(screen.getByText('México')).toBeInTheDocument()
  })

  it('chama onClick ao clicar', () => {
    const onClick = jest.fn()
    render(<GroupCard grupo={makeGrupo()} onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: /editar jogos do grupo a/i }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('tem aria-label correto', () => {
    render(<GroupCard grupo={makeGrupo()} onClick={() => {}} />)
    expect(screen.getByRole('button', { name: 'Editar jogos do grupo A' })).toBeInTheDocument()
  })

  it('renderiza chevron à direita', () => {
    const { container } = render(<GroupCard grupo={makeGrupo()} onClick={() => {}} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar teste, esperar falha**

- [ ] **Step 3: Implementar `GroupCard`**

Criar `src/components/public/group-card.tsx`:

```tsx
'use client'
import { ChevronRight } from 'lucide-react'
import { GroupTable } from './group-table'
import type { ClassificacaoGrupo } from '@/lib/services/bracket/types'

type Props = {
  grupo: ClassificacaoGrupo
  qualificadosTerceiros?: Set<string>
  onClick: () => void
}

export function GroupCard({ grupo, qualificadosTerceiros, onClick }: Props) {
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

> **Nota:** `GroupTable` é usado com `pointer-events-none` no wrapper interno pra evitar que o cursor-pointer do card interfira com interações futuras. Se a tabela tiver elementos clicáveis no futuro, isso precisará mudar.

- [ ] **Step 4: Rodar testes, esperar sucesso**

```bash
npm test -- group-card.test.tsx
```

Esperado: 4/4 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/public/group-card.tsx src/components/public/__tests__/group-card.test.tsx
git commit -m "feat(simulator): GroupCard clicável com chevron e aria-label"
```

---

## Tarefa 5: `GroupSimulator`

**Files:**
- Create: `src/components/public/group-simulator.tsx`
- Create: `src/components/public/__tests__/group-simulator.test.tsx`

- [ ] **Step 1: Escrever teste falhando**

Criar `src/components/public/__tests__/group-simulator.test.tsx`:

```tsx
/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { GroupSimulator } from '../group-simulator'
import type { JogoComTimes, ClassificacaoGrupo } from '@/lib/services/bracket/types'

const makeJogo = (id: string, overrides: Partial<JogoComTimes> = {}): JogoComTimes => ({
  id, fase: 'grupos', grupo: 'A', timeA: 'México', timeB: 'África do Sul',
  resultadoA: null, resultadoB: null, status: 'agendado',
  placarPenaltisA: null, placarPenaltisB: null, vencedor: null,
  sofascoreId: id, dataHora: new Date(),
  ...overrides,
})

// Nota: `terceiro: null` é workaround — o tipo atual exige `ClassificacaoTime` não-null.
// O implementador precisará construir um ClassificacaoTime válido quando o componente for usar esse campo.
const makeGrupo = (): ClassificacaoGrupo => ({
  grupo: 'A',
  times: [],
  classificados: [],
  terceiro: null,
})

describe('GroupSimulator', () => {
  it('renderiza header com nome do grupo', () => {
    render(
      <GroupSimulator
        grupo={makeGrupo()}
        jogos={[makeJogo('j1')]}
        open
        onOpenChange={() => {}}
        onPlacarChange={() => {}}
      />
    )
    expect(screen.getByText('Grupo A')).toBeInTheDocument()
  })

  it('renderiza um row por jogo futuro', () => {
    render(
      <GroupSimulator
        grupo={makeGrupo()}
        jogos={[makeJogo('j1'), makeJogo('j2'), makeJogo('j3')]}
        open
        onOpenChange={() => {}}
        onPlacarChange={() => {}}
      />
    )
    expect(screen.getAllByLabelText(/Placar/)).toHaveLength(6) // 2 inputs por row
  })

  it('mostra mensagem quando não há jogos futuros', () => {
    render(
      <GroupSimulator
        grupo={makeGrupo()}
        jogos={[]}
        open
        onOpenChange={() => {}}
        onPlacarChange={() => {}}
      />
    )
    expect(screen.getByText(/nenhum jogo futuro/i)).toBeInTheDocument()
  })

  it('chama onPlacarChange ao editar', () => {
    const onPlacarChange = jest.fn()
    render(
      <GroupSimulator
        grupo={makeGrupo()}
        jogos={[makeJogo('j1')]}
        open
        onOpenChange={() => {}}
        onPlacarChange={onPlacarChange}
      />
    )
    fireEvent.change(screen.getByLabelText('Placar México'), { target: { value: '3' } })
    expect(onPlacarChange).toHaveBeenCalledWith('j1', 3, 0)
  })
})
```

- [ ] **Step 2: Rodar teste, esperar falha**

- [ ] **Step 3: Implementar `GroupSimulator`**

Criar `src/components/public/group-simulator.tsx`:

```tsx
'use client'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { JogoSimulatorRow } from './jogo-simulator-row'
import type { JogoComTimes, ClassificacaoGrupo } from '@/lib/services/bracket/types'

type Props = {
  grupo: ClassificacaoGrupo
  jogos: JogoComTimes[]                // só futuros (já filtrado pelo caller)
  open: boolean
  onOpenChange: (open: boolean) => void
  onPlacarChange: (jogoId: string, placarA: number, placarB: number) => void
}

export function GroupSimulator({ grupo, jogos, open, onOpenChange, onPlacarChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        onOpenChange={onOpenChange}
        className="flex flex-col gap-4"
        aria-label={`Simulador do grupo ${grupo.grupo}`}
      >
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
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 4: Rodar testes, esperar sucesso**

```bash
npm test -- group-simulator.test.tsx
```

Esperado: 4/4 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/public/group-simulator.tsx src/components/public/__tests__/group-simulator.test.tsx
git commit -m "feat(simulator): GroupSimulator (Sheet com lista de JogoSimulatorRow)"
```

---

## Tarefa 6: Refatorar `SimulatorTab` (integração)

**Files:**
- Modify: `src/components/public/simulator-tab.tsx`
- Modify (test): `src/components/public/__tests__/simulator-tab.test.tsx`

- [ ] **Step 1: Refatorar `simulator-tab.tsx`**

Substituir o uso de `GroupTable` por `GroupCard` + gerenciar drawer aberto + usar `useSimulacao`:

```tsx
'use client'
import { useState, useMemo } from 'react'
import type { ClassificacaoGrupo, BracketSlot, JogoComTimes } from '@/lib/services/bracket/types'
import { useSimulacao } from '@/lib/hooks/use-simulacao'
import { getClassificacaoGrupos } from '@/lib/services/bracket/standings'
import { getMelhores8Terceiros } from '@/lib/services/bracket/best-thirds'
import { projetarChaveamento } from '@/lib/services/bracket/projector'
import { GroupCard } from './group-card'
import { GroupLegend } from './group-legend'
import { Bracket } from './bracket'
import { GroupSimulator } from './group-simulator'
import { SimulatorBanner } from './simulator-banner'

type Props = {
  classificacaoInicial: ClassificacaoGrupo[]
  bracketInicial: BracketSlot[]
  jogos: JogoComTimes[]
}

export function SimulatorTab({ classificacaoInicial, bracketInicial, jogos }: Props) {
  const [grupoAberto, setGrupoAberto] = useState<string | null>(null)
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mb-8">
        {classificacao.map(g => (
          <GroupCard
            key={g.grupo}
            grupo={g}
            qualificadosTerceiros={qualificadosTerceiros}
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

- [ ] **Step 2: Verificar testes existentes**

O teste de `simulator-banner` (2 testes) deve continuar passando — `SimulatorBanner` não mudou.

- [ ] **Step 3: Rodar build pra detectar erros de import**

```bash
npm run build
```

- [ ] **Step 4: Smoke test manual**

```bash
npm run dev
```

Abrir `http://localhost:3000/copa` → aba Simulador:
- [ ] Cards de grupo aparecem clicáveis (hover muda cor)
- [ ] Clicar num card abre drawer pela direita
- [ ] Drawer mostra só jogos futuros (não-finalizados)
- [ ] Digitar placar atualiza classificação ao vivo
- [ ] Fechar com ESC
- [ ] Reload preserva simulação

- [ ] **Step 5: Rodar suite completa**

```bash
npm test
```

Esperado: 100% green (todos os testes + novos das tarefas 1-5).

- [ ] **Step 6: Verificar lint + typecheck**

```bash
npm run lint && npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/components/public/simulator-tab.tsx
git commit -m "feat(simulator): integrar useSimulacao + GroupCard + GroupSimulator na aba"
```

---

## Critérios de aceite (Definition of Done)

- [ ] Todos os commits feitos com mensagem conventional
- [ ] `npm run lint` clean
- [ ] `npm test` 100% green
- [ ] `npm run build` succeeds
- [ ] `npx tsc --noEmit` zero erros
- [ ] Smoke test manual OK (todos os 6 itens do Step 4 da Tarefa 6)
- [ ] Mobile: bottom sheet (testar redimensionando window)
- [ ] Dark mode: drawer funciona em dark mode (cores de Sheet Content adaptam)
- [ ] Acessibilidade: Tab navega, ESC fecha, focus volta pro card que abriu

---

## Notas de implementação

### Tarefas sequenciais

T1 → T2 → T3 → T4 → T5 → T6 são estritamente sequenciais (cada uma depende da anterior).

### Edge cases a testar (manualmente)

- 12 grupos, alguns com 0 jogos futuros (já finalizados): card ainda aparece, drawer mostra "nenhum jogo futuro"
- Clicar em 2 grupos seguidos: drawer troca de grupo
- 3+ jogos editados no mesmo grupo: classificação muda de ordem, bracket reflete
- localStorage cheio: simulação funciona em memória, save dá warning no console
- Navegar pra `/copa` direto (deep link): simulação preservada

### Riscos conhecidos (da spec)

1. **Mobile keyboard cobrindo drawer:** testar em viewport real (DevTools device emulation). Se for problema, ajustar `h-3/4` para `h-[60vh]` em mobile.
2. **Testes jsdom + Radix Dialog:** se `sheet.test.tsx` falhar por causa do Radix, mockar com `jest.mock('@radix-ui/react-dialog', ...)`.

### Ordem sugerida de execução

Subagent por tarefa (6 tarefas), com 2 reviews cada:
1. Subagent implementa T1 (com TDD)
2. Review spec-compliance + code-quality
3. Subagent implementa T2
4. ... e assim por diante

Tempo estimado: 30-45 min por tarefa (TDD + 2 reviews) = 3-4h total.
