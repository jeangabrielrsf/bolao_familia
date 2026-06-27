# Fase 2 v2 — Refino visual de Classificação + Chaveamento + dark/light

**Data:** 2026-06-26
**Branch:** `dev`
**Status:** Aprovado em brainstorming (5 features locked, m0110-m0128)

## Problema

A aba Classificação e Chaveamento de `/copa` funcionam mas faltam polimentos para uma UI acabada:

1. **Cores Classificação muito sutis** — `bg-green-50/40` quase invisíveis, hierarquia fraca
2. **Vencedor no Chaveamento** — só `font-bold`, sem destaque de fundo/cor
3. **Tooltips inacessíveis** — `title=""` em `group-table.tsx:61` (não funciona em mobile, ruim pra screen reader)
4. **Hero da página `/copa`** — só `<h1>`, sem contexto (data, sedes, fase)
5. **Tab selector do Chaveamento mobile** — visual minimalista, sem indicador
6. **Dark mode tem buracos** — `--card: rgba(26, 31, 46, 0.7)` apagado, hover sutil

Desktop e mobile funcionam. YAGNI redesign.

## Decisões locked (brainstorming)

| # | Decisão | Alternativas descartadas |
|---|---------|--------------------------|
| 1 | **Escopo: 5 features isoladas, 1 commit cada** (cores, vencedor, tooltip, header+tabs, dark polish) | B) Design tokens globais (overhead) |
| 2 | **Tooltip: Radix Tooltip primitivo** (delay 200ms, tap mobile, esc, click outside) | B) CSS-only `hover` (sem mobile) |
| 3 | **Cores Classificação: emerald/amber/rose `-100` light, `-900/60` dark** | B) Manter `-50`/`/40` |
| 4 | **Vencedor: bg + cor do nome** (fundo emerald, texto emerald-700) | B) Só negrito (atual); C) Dimmer perdedor (conflita com TBD) |
| 5 | **Dark mode: card opaco (#131826) + muted mais claro + hover visível** | B) Manter rgba (YAGNI card-glass) |

## Fora do escopo (YAGNI)

- Aba Simulador (Fase 2 v1 já cobriu)
- Hero da home, página de regras, ranking
- Refator do theme-toggle (já funciona)
- Internacionalização
- Animações elaboradas
- Card-glass effect (risco de blur feio com texto pequeno)

## Design técnico

### Feature 1: Tooltip component

**Arquivo:** `src/components/ui/tooltip.tsx` (NOVO)

Wrapper do `@radix-ui/react-tooltip` (já instalado) com:
- `TooltipProvider` — `delayDuration={200}` global
- `Tooltip`, `TooltipTrigger`, `TooltipContent` — exports
- `TooltipContent`: `bg-foreground text-background`, `px-3 py-1.5 text-xs rounded-md`, animação `fade-in-0 zoom-in-95`
- `sideOffset={4}` default
- Theme-aware (vars `--foreground` e `--background`)

**Setup no layout:**

`src/app/layout.tsx` — adicionar `<TooltipProvider>` envolvendo children.

**Migrations:**

`src/components/public/group-table.tsx:61` — `<span title="...">⚠</span>` → `<Tooltip content="..."><span>⚠</span></Tooltip>`

### Feature 2: Cores Classificação

**Arquivo:** `src/components/public/group-table.tsx`

| Status | Light (atual → novo) | Dark (atual → novo) |
|---|---|---|
| Classificado | `bg-green-50` → `bg-emerald-100` | `bg-green-950/40` → `bg-emerald-900/60` |
| 3º qualificado | `bg-amber-50` → `bg-amber-100` | `bg-amber-950/40` → `bg-amber-900/60` |
| Eliminado | `bg-red-50` → `bg-rose-100` | `bg-red-950/40` → `bg-rose-900/60` |

Borda lateral (4px) **mantém** — `border-l-emerald-500 dark:border-l-emerald-400` etc.

**Sincronizar:**
- `src/components/public/group-legend.tsx:14-31` — mesmas cores nos swatches
- `src/components/public/group-card.tsx:21-26` (já usa emerald/amber/rose-500/400 — coerente)

### Feature 3: Vencedor destaque no Chaveamento

**Arquivo:** `src/components/public/bracket-match.tsx`

Lógica por linha (A e B):

```ts
const isWinner = slot.status === 'finalizado' && slot.vencedor === lado
const isLoser  = slot.status === 'finalizado' && slot.vencedor !== null && slot.vencedor !== lado
```

**Classes winner:**
- Row: `bg-emerald-100 dark:bg-emerald-900/40 -mx-2 px-2 rounded`
- Nome: `font-bold text-emerald-700 dark:text-emerald-300`
- Placar: `font-mono font-bold text-emerald-700 dark:text-emerald-300`

**Perdedor:** sem destaque (mantém normal). Sem `opacity-50` (conflita com TBD).

**Não finalizado:** sem destaque (sem vencedor ainda).

**Cuidados:**
- `-mx-2 px-2` estica background até a borda do card
- Funciona com `size: 'sm' | 'md' | 'lg'`
- `comPenaltes` (1-1 nos pênaltis) — sem destaque especial (YAGNI)

### Feature 4a: Header `/copa`

**Arquivo:** `src/app/(public)/copa/page.tsx`

**Visual:**

```
┌─────────────────────────────────────────────────┐
│ Copa do Mundo 2026  [Fase de grupos]            │  ← h1 + Badge
│ 11 jun – 19 jul · EUA 🇺🇸 · México 🇲🇽 · Canadá 🇨🇦 │  ← subtitle
└─────────────────────────────────────────────────┘
```

**JSX:**

```tsx
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

**Decisão:** Badge "Fase de grupos" hardcoded (não dinâmico) por enquanto. YAGNI detectar fase atual — Copa inteira é fase de grupos até 2/jul, e mudar a badge dinamicamente adiciona query.

### Feature 4b: Tab selector do Bracket mobile

**Arquivo:** `src/components/public/bracket.tsx` (mobile branch only)

**Atual:** `bg-primary` sólido na ativa (dominante, pesado).

**Novo:** underline indicator (CSS-only).

```tsx
<button
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
```

**Diferenças:** sem bg-primary sólido; underline `h-0.5 bg-primary`; hover muda cor; `aria-current` para a11y.

**Não muda:** desktop grid (`<div className="hidden lg:block">`) — phase titles separados.

### Feature 5: Dark mode polish

**Arquivo:** `src/app/globals.css` (`.dark` selector)

**Vars a ajustar:**

| Var | Atual | Novo | Por quê |
|---|---|---|---|
| `--card` | `rgba(26, 31, 46, 0.7)` | `#131826` | mais opaco, fundo consistente |
| `--border` | `rgba(255, 255, 255, 0.1)` | `rgba(255, 255, 255, 0.08)` | mais sutil |
| `--muted` | `#151b2e` | `#1a2030` | um pouco mais claro, hover visível |
| `--muted-foreground` | `#8892a8` | `#94a3b8` | mais legível |

**Resto:** `--background`, `--foreground`, `--primary`, etc. **mantém**.

**Hover states (audit):**

Componentes com `hover:bg-muted/50` que precisam `dark:hover:bg-muted/80`:
- `bracket-match.tsx:56`
- `group-card.tsx:37, 65`
- (buscar com grep)

**YAGNI card-glass:** não aplicar `backdrop-filter: blur(12px)` agora. Risco de bug visual com texto pequeno.

## Arquivos a criar/modificar

**Criar:**
- `src/components/ui/tooltip.tsx` — wrapper Radix
- `src/components/ui/__tests__/tooltip.test.tsx` — 3 testes (render, hover, esc)

**Modificar:**
- `src/app/layout.tsx` — adicionar `<TooltipProvider>`
- `src/app/globals.css` — vars dark
- `src/components/public/group-table.tsx` — cores + Tooltip ⚠
- `src/components/public/group-legend.tsx` — sincronizar cores
- `src/components/public/bracket-match.tsx` — vencedor highlight + hover dark
- `src/components/public/bracket.tsx` — tab selector polido
- `src/app/(public)/copa/page.tsx` — hero com badge + subtitle
- `src/components/public/__tests__/group-table.test.tsx` — atualizar testes pra novas classes
- `src/components/public/__tests__/bracket-match.test.tsx` — testes do vencedor highlight
- `src/components/public/__tests__/bracket.test.tsx` — testes do tab selector

**Auditar (não modificar):**
- `src/components/ui/button.tsx` — provavelmente já tem dark variants

## Modelo de dados

**Sem mudanças.** Reaproveita `ClassificacaoGrupo`, `BracketSlot`, `JogoComTimes`, etc.

## Testes

### Unit/Component (novos)

| Arquivo | O que testa |
|---|---|
| `src/components/ui/__tests__/tooltip.test.tsx` | render com trigger, mostra conteúdo no hover/focus, fecha no esc |
| `src/components/public/__tests__/group-table.test.tsx` (atualizar) | cores emerald/amber/rose-100/900-60 |
| `src/components/public/__tests__/bracket-match.test.tsx` (atualizar) | vencedor tem bg-emerald + text-emerald-700, perdedor sem destaque, TBD opacity-50, não-finalizado sem destaque |
| `src/components/public/__tests__/bracket.test.tsx` (atualizar) | tab selector tem underline indicator, `aria-current="page"` na ativa |

### E2E (manual)

- Light/dark mode em mobile e desktop
- Tab selector: tap/click muda fase + indicador visual
- Tooltip: hover mostra texto, Esc fecha
- Vencedor: olho nato vê destaque no bracket

## Edge cases

| Cenário | Comportamento |
|---|---|
| Tooltip sem conteúdo (string vazia) | Não renderiza (Radix skip) |
| Tooltip em mobile (touch) | Tap mostra, segundo tap navega (Radix default) |
| Vencedor em jogo com pênaltis (1-1, decidido nos pênaltis) | Sem destaque especial (YAGNI) — só o vencedor com bg+cor normal |
| TBD (ambos null) | `opacity-50` no card inteiro (atual, mantém) |
| Header `/copa` em mobile | Quebra linha, badge ao lado do título |
| Hover em dark mode | `dark:hover:bg-muted/80` (mais visível) |
| Header com título longo | Wrap flex (testado com nome país longo) |

## Critérios de aceite

- [ ] Cores Classificação: emerald/amber/rose-100 (light) e -900/60 (dark) — contraste WCAG AA
- [ ] GroupLegend sincronizado com GroupTable
- [ ] Vencedor no Bracket: bg + texto emerald-700 — visível em light e dark
- [ ] Tooltip acessível: substitui `title=""`, funciona em mobile (tap), Esc fecha
- [ ] Header `/copa`: h1 + Badge "Fase de grupos" + subtitle com datas/sedes
- [ ] Tab selector Bracket mobile: underline indicator, sem bg-primary sólido
- [ ] Tab selector tem `aria-current="page"` na ativa
- [ ] Dark mode: card opaco, hover visível
- [ ] Testes passam (≥ 187)
- [ ] Lint clean, build OK
- [ ] Vercel preview READY
- [ ] Smoke test em ambos os temas

## Deploy

1. 5 commits temáticos em `dev`
2. Push → Vercel preview
3. Validação visual em mobile + desktop + dark/light
4. Merge dev → main

## Riscos & mitigações

| Risco | Mitigação |
|---|---|
| Cores emerald/amber/rose muito saturadas no light | Testar com texto preto — se contraste < 4.5:1, reduzir opacidade |
| Tooltip sobre inputs (z-index conflito) | Tooltip z-50 (mesmo que Sheet), funciona em modal context |
| Tab selector underline desalinhado em diferentes fontes | Usar `bottom-0` + `h-0.5` absoluto — independe de fonte |
| Dark mode vars quebram algum componente específico | Testar em todos os arquivos modificados; rodar build |
| Tooltip aparece em viewports pequenos quando conteúdo é longo | max-width + truncate? (YAGNI por enquanto) |

## Próximos passos

1. Usuário revisa este spec
2. Invocar skill `writing-plans` para criar plano
3. Implementação em 5 commits temáticos com TDD
4. Verificar no Vercel preview
5. Merge dev → main
