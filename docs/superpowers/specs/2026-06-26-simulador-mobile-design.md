# Simulador mobile (drawer full-screen + picker compacto)

**Data:** 2026-06-26
**Branch:** `dev`
**Status:** Aprovado em brainstorming (4 decisões locked, m0044-m0060)

## Problema

A aba Simulador do `/copa` tem UX ruim em mobile:

1. **Picker (12 GroupCards) ocupa muito scroll.** Cada card é um `GroupTable` completo (5 linhas grossas com colunas P/J/V/E/D/SG) dentro de um botão. Em 1 coluna no mobile, são ~3.360px de scroll só nos cards.
2. **Drawer (GroupSimulator) não aproveita a tela.** Usa `max-h-[90vh]` com padding 24px; o conteúdo (`JogoSimulatorRow` × N) fica apertado, sem feedback visual claro de "isto é um modal full-screen".
3. **Sem affordances mobile nativos:** drag handle, safe-area iOS, body scroll lock, sticky header/footer.

Desktop funciona. YAGNI redo.

## Decisões locked (brainstorming)

| # | Decisão | Alternativas descartadas |
|---|---------|--------------------------|
| 1 | **Escopo: só aba Simulador** (mobile) | B) Toda a página `/copa` (Fase 2 v2) |
| 2 | **Drawer full-screen mobile** (`max-h-[100dvh]`) + drag handle visual + sticky header/footer + safe-area | B) Drawer mantido 90vh; C) Accordion inline (sem modal) |
| 3 | **Picker compacto: 4 linhas finas (time+pts), sem colunas P/J/V/E/D/SG, 1-2 colunas mobile** | B) Manter GroupTable dentro do card; C) Picker em `<Select>` (sem preview) |
| 4 | **Indicador de status do grupo: borda lateral 2px colorida** (verde/amarelo/vermelho) | B) Badge na linha do 3º; C) Background tint (atual no GroupTable) |

## Fora do escopo (YAGNI)

- Aba Classificação e Chaveamento (Fase 2 v2)
- Refino dark/light (Fase 2 v2; theme-toggle já existe, contraste será validado)
- Drag-to-dismiss gesture (precisa lib ou implementação manual complexa; sem tempo)
- Animações elaboradas no drawer (apenas slide do Radix já basta)
- Reescrita do `useSimulacao` (funciona, não muda)
- Mudanças no `Bracket` ou `BracketMatch`

## Design técnico

### Componente 1: `GroupSimulator` (drawer)

**Arquivo:** `src/components/public/group-simulator.tsx`
**Mudanças:** markup novo quando `isDesktop === false`.

#### Layout (mobile < 768px)

```
┌─────────────────────────────────────┐
│   ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔    │  drag handle (32×4, bg-muted, rounded-full, mx-auto)
│                                     │
│   Grupo A                    [X]   │  sticky top-0, bg-background
│   3 jogos futuros                  │
├─────────────────────────────────────┤
│                                     │
│   🇲🇽 México     [0] × [0]  🇿🇦 África Sul  │  JogoSimulatorRow
│   ─────────────────────────────────  │
│   🇲🇽 México     [0] × [0]  🇸🇪 Suécia     │
│   ─────────────────────────────────  │
│   🇿🇦 África Sul [0] × [0]  🇸🇪 Suécia     │
│   (overflow-y-auto, flex-1)         │
│                                     │
├─────────────────────────────────────┤
│   [              Fechar            ] │  sticky bottom-0, bg-background, h-12
└─────────────────────────────────────┘
   ↑ pb-[env(safe-area-inset-bottom)]
```

#### Estrutura JSX (mobile)

```tsx
<SheetContent
  side="bottom"
  className="
    flex flex-col gap-0 p-0
    max-h-[100dvh] h-[100dvh]
    rounded-t-2xl border-t
    shadow-2xl
    pb-[max(0.5rem,env(safe-area-inset-bottom))]
  "
>
  {/* drag handle */}
  <div aria-hidden className="pt-2 pb-1">
    <div className="mx-auto h-1 w-8 rounded-full bg-muted" />
  </div>

  {/* sticky header */}
  <div className="sticky top-0 z-10 bg-background px-4 py-3 border-b">
    <div className="flex items-center justify-between">
      <div>
        <SheetTitle>Grupo {grupo.grupo}</SheetTitle>
        <SheetDescription>{jogos.length} jogo(s) futuro(s)</SheetDescription>
      </div>
      <DialogPrimitive.Close aria-label="Fechar">
        <X className="h-5 w-5" />
      </DialogPrimitive.Close>
    </div>
  </div>

  {/* scroll area */}
  <div className="flex-1 overflow-y-auto divide-y px-4">
    {jogos.map(jogo => <JogoSimulatorRow key={jogo.id} jogo={jogo} ... />)}
  </div>

  {/* sticky footer */}
  <div className="sticky bottom-0 bg-background border-t p-4">
    <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
      Fechar
    </Button>
  </div>
</SheetContent>
```

#### Body scroll lock

Quando `open === true`, travar scroll do body:

```tsx
useEffect(() => {
  if (open) {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }
}, [open])
```

Aplica em **mobile only** (`isDesktop === false`).

#### Z-index

Drawer mobile usa `z-[60]` para ficar acima do `<Header>` (`z-50`). Componente `SheetContent` ganha prop opcional `zIndex` ou `className` override.

#### Backdrop

`SheetOverlay` ganha classe `bg-black/60` (atual `bg-black/40`).

#### Props inalteradas

`{ grupo, jogos, open, onOpenChange, onPlacarChange }` — não muda.

### Componente 2: `GroupCard` (picker)

**Arquivo:** `src/components/public/group-card.tsx`
**Mudanças:** adicionar prop `variant?: 'compact' | 'full'` (default `'full'`). `SimulatorTab` passa `variant="compact"` no mobile.

#### Layout (mobile compact)

```
┌──┬────────────────────────────┐
│▌ │ GRUPO A                ›   │
│▌ │ 1  🇲🇽 México       6     │
│▌ │ 2  🇿🇦 África Sul  4     │
│▌ │ 3  🇸🇪 Suécia       4  │  ← borda amarela se terceiro qualificado
│▌ │ 4  🇩🇪 Alemanha     0     │
└──┴────────────────────────────┘
```

#### Borda lateral colorida (status)

Lógica:
- Se algum dos 2 primeiros classificados → borda verde
- Senão, se 3º está em `qualificadosTerceiros` → borda amarela
- Senão → borda vermelha

**Implementação:** `border-l-4` com classe dinâmica:
- Verde: `border-l-emerald-500` (light) / `border-l-emerald-400` (dark)
- Amarelo: `border-l-amber-500` / `border-l-amber-400`
- Vermelho: `border-l-rose-500` / `border-l-rose-400`

**Computação:** helper puro no próprio componente:

```ts
function getStatusClass(grupo: ClassificacaoGrupo, qualificadosTerceiros?: Set<string>) {
  const primeiro = grupo.times.find(t => t.posicao === 1)
  const segundo = grupo.times.find(t => t.posicao === 2)
  const terceiro = grupo.times.find(t => t.posicao === 3)
  if (primeiro && segundo) return 'border-l-emerald-500 dark:border-l-emerald-400'
  if (terceiro && qualificadosTerceiros?.has(grupo.grupo)) return 'border-l-amber-500 dark:border-l-amber-400'
  return 'border-l-rose-500 dark:border-l-rose-400'
}
```

**Nota:** enquanto grupos estão sem jogos finalizados, todos os times têm `posicao === null`. Nesse caso, `primeiro` e `segundo` são `undefined`, cai pra amarelo/vermelho. Aceitável para estado inicial.

#### Truncamento de nome

`truncate` ou `line-clamp-1` com `min-w-0` no container flex.

```tsx
<span className="truncate min-w-0 flex-1">{jogo.timeA}</span>
```

#### JSX (compact)

```tsx
<button
  onClick={onClick}
  aria-label={`Editar jogos do grupo ${grupo.grupo}`}
  className={cn(
    "block w-full text-left rounded-lg border-l-4 bg-card",
    "hover:bg-muted/50 active:bg-muted",
    "transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    statusClass
  )}
>
  <div className="px-3 py-2 flex items-center justify-between">
    <span className="font-display text-sm tracking-wide">GRUPO {grupo.grupo}</span>
    <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
  </div>
  <div className="px-3 pb-2 space-y-0.5">
    {grupo.times.slice(0, 4).map((t, i) => (
      <div key={t.time} className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground w-3 text-right tabular-nums">{t.posicao ?? '-'}</span>
        <span className="truncate min-w-0 flex-1">{t.time}</span>
        <span className="tabular-nums text-muted-foreground">{t.pontos}</span>
      </div>
    ))}
  </div>
</button>
```

### Mudança em `simulator-tab.tsx`

Adicionar `variant="compact"` no mobile:

```tsx
const [isDesktop, setIsDesktop] = useState(false)
useEffect(() => { /* mesmo matchMedia do GroupSimulator */ }, [])

<GroupCard
  variant={isDesktop ? 'full' : 'compact'}
  ...
/>
```

**Refator:** extrair o matchMedia para um hook `useIsDesktop()` em `src/lib/hooks/use-is-desktop.ts` (reutilizável).

## Arquivos a criar/modificar

**Criar:**
- `src/lib/hooks/use-is-desktop.ts` — hook reutilizável `useMediaQuery('(min-width: 768px)')`
- `src/lib/hooks/__tests__/use-is-desktop.test.ts` — test do hook
- `src/components/public/__tests__/group-card-compact.test.tsx` — render variant compact

**Modificar:**
- `src/components/public/group-simulator.tsx` — full-screen mobile, drag handle, sticky header/footer, safe-area, body scroll lock
- `src/components/public/group-card.tsx` — nova prop `variant`, helper `getStatusClass`
- `src/components/ui/sheet.tsx` — aceita `className` adicional no `SheetContent` (já aceita), z-index configurável, overlay com `bg-black/60` opcional via prop ou global
- `src/components/public/simulator-tab.tsx` — usa `useIsDesktop`, passa `variant`
- `src/components/public/__tests__/group-simulator.test.tsx` — testes pros novos elementos
- `src/components/public/__tests__/group-card.test.tsx` — testes pra variant compact

## Modelo de dados

**Sem mudanças.** Reaproveita `ClassificacaoGrupo`, `JogoComTimes`, etc. do `types.ts`.

## Algoritmos

### `getStatusClass(grupo, qualificadosTerceiros?)`

Pura, sem side effects. Computa classe Tailwind baseada em:

1. Se `grupo.times` tem 2 com `posicao` 1 e 2 → verde (classificado)
2. Senão, se existe time com `posicao === 3` E `qualificadosTerceiros.has(grupo.grupo)` → amarelo (3º qualificado)
3. Senão → vermelho (eliminado, incluindo estado inicial sem jogos)

### `useIsDesktop()` (hook)

```ts
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = () => setIsDesktop(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}
```

### Body scroll lock

Implementado direto no `GroupSimulator` via `useEffect([open])`. Toggle `document.body.style.overflow`. Cleanup restaura valor anterior.

## UI/Visual design

### Animações (já existentes, sem mudança)

- Sheet slide-in-from-bottom / slide-out-to-bottom (Radix)
- SheetOverlay fade-in / fade-out (Radix)
- Hover/active em GroupCard via Tailwind transitions

### Estados

| Estado | Visual |
|---|---|
| Drawer fechado | (invisível) |
| Drawer aberto mobile | Full-screen, drag handle visível, header sticky, scroll area |
| Drawer aberto desktop | Side right, w-3/4 (atual) |
| GroupCard hover (desktop) | bg-muted/50 |
| GroupCard active (mobile tap) | bg-muted |
| GroupCard disabled (futuro) | opacity-50, pointer-events-none |

### Acessibilidade

- SheetTitle / SheetDescription (já existem)
- Foco trap (Radix Dialog)
- Esc key fecha (Radix)
- Click outside fecha (Radix `onPointerDownOutside`)
- ARIA label no botão do GroupCard
- Drag handle é `aria-hidden` (visual apenas)
- Contraste: cores das bordas validadas (WCAG AA contra bg-card)

### Modo escuro

- `border-l-emerald-500 dark:border-l-emerald-400` (paleta 500 light / 400 dark)
- SheetContent usa `bg-background` que já respeita o tema
- Drag handle usa `bg-muted` (tema-aware)

## Edge cases

| Cenário | Comportamento |
|---|---|
| Mobile landscape (altura < 400px) | Drawer cobre tudo (100dvh), scroll interno funciona |
| iOS Safari: zoom/dynamic toolbar | `100dvh` (não `100vh`) ajusta dinamicamente |
| Grupo com 0 jogos futuros | Drawer mostra "Nenhum jogo futuro neste grupo" (descrição já trata) |
| Estado inicial: 0 jogos finalizados | Borda vermelha em todos os grupos (classificação indefinida) |
| Tap em card durante transição do drawer | Ignorado (drawer em animação) |
| 2x tap rápido no mesmo card | Não causa flicker (state já é o mesmo) |
| Tap em card de grupo + tap em outro grupo antes de fechar | Drawer troca de grupo (Radix suporta via key change) — comportamento atual |
| localStorage cheio + drawer abre | Simulação já existente não mexe; drawer abre normal |
| Tela muito estreita (< 360px) | Grid vira 1 coluna, cards ficam compactos, OK |

## Testes

### Unit (novos)

| Arquivo | O que testa |
|---|---|
| `src/lib/hooks/__tests__/use-is-desktop.test.ts` | matchMedia listener, default `false`, toggle em `change` |
| `src/components/public/__tests__/group-card-compact.test.tsx` | Render compact: 4 linhas + header + borda colorida; variant full não muda |

### Component (atualizar)

| Arquivo | O que testa |
|---|---|
| `src/components/public/__tests__/group-simulator.test.tsx` | Drag handle presente (mobile); sticky header/footer; safe-area padding; body scroll lock ativa/desativa; Fechar button chama `onOpenChange(false)` |
| `src/components/public/__tests__/group-card.test.tsx` | variant compact renderiza corretamente; borda colorida muda por status |

### E2E (manual)

- Mobile (Chrome DevTools, iPhone 12):
  1. Abrir `/copa`, tab "Simulador"
  2. Ver 12 cards compactos em 2 colunas (≥ 640px) ou 1 coluna
  3. Tap em card → drawer full-screen abre com animação
  4. Editar placar → classificação atualiza
  5. Fechar via X, Fechar, Esc, ou tap fora — body scroll volta
  6. Trocar de grupo (fecha + abre em outro grupo) — sem flicker
- Mobile landscape: drawer full-screen, scroll interno funciona
- Desktop (≥ 768px): comportamento atual mantido (drawer right, cards full)

### Critérios de aceite

- [ ] Mobile: 12 GroupCards em grid `grid-cols-1 sm:grid-cols-2`, total scroll < 1500px
- [ ] Mobile: GroupCard variant compact mostra 4 linhas (time + pontos), sem P/J/V/E/D/SG
- [ ] Mobile: GroupCard tem borda lateral 2-4px colorida por status
- [ ] Mobile: Tap em GroupCard abre drawer full-screen (`100dvh`)
- [ ] Mobile: Drawer tem drag handle visual no topo
- [ ] Mobile: Drawer tem sticky header (título + X) e sticky footer (Fechar)
- [ ] Mobile: Drawer respeita `pb-[env(safe-area-inset-bottom)]`
- [ ] Mobile: Body scroll trava quando drawer abre, destrava ao fechar
- [ ] Mobile: z-index 60 (acima do Header)
- [ ] Mobile: Backdrop `bg-black/60`
- [ ] Desktop (≥ 768px): zero mudança visual
- [ ] Modo dark/light: cores das bordas validadas
- [ ] Testes passam (todos os novos + atualizados)
- [ ] Lint clean, build OK, 169+ testes passando
- [ ] Acessibilidade: foco trap, Esc, click outside continuam funcionando

## Deploy

1. Branch `dev`, commits pequenos e descritivos (conventional commits)
2. Push → Vercel preview automática
3. Testar em preview no celular real (iPhone + Android)
4. Merge `dev → main` quando aprovado
5. Sem mudança de schema, sem migration, sem env vars

## Riscos & mitigações

| Risco | Mitigação |
|---|---|
| `100dvh` não suportado em browsers antigos (Safari < 15.4) | Fallback: `@supports not (height: 100dvh)` → `100vh`. OU aceitar degradação graceful (drawer fica com 90vh nesses casos) |
| Body scroll lock quebrar em iOS com bounce | Aceitável; testar em iPhone real |
| Drag handle visual confundido com "swipe to dismiss" | Tooltip? Não. Aria-hidden. Documentar no commit. |
| Borda colorida no GroupCard conflitar com `border-l` padrão | Tailwind `border-l-4` + classe custom sobrescreve; sem conflito |
| GroupCard compact fica ilegível com nomes longos | `truncate` + tooltip opcional? Não (YAGNI); times Copa 2026 são curtos o suficiente |

## Próximos passos

1. Usuário revisa este spec
2. Invocar skill `writing-plans` para criar plano de implementação
3. Implementação em commits pequenos (variant compact + drawer full-screen são commits separados)
4. Testes escritos antes da implementação (TDD)
5. Verificar no Vercel preview em mobile real
