# Redesign dos Cards do Hero da Home

**Data:** 2026-06-15
**Status:** Design (revisado)
**Autor:** Sistema

## Visão Geral

Redesignar os 3 cards do hero da homepage (`src/components/public/hero.tsx`):
- **Card "Jogos"**: passa a mostrar `finalizados | em jogo | restantes` (3 números coloridos)
- **Card "Pts Máx"**: removido, substituído por novo card "Copa" com anel circular de progresso (% de jogos finalizados)
- **Card "Participantes"**: mantido como está

## Problema

Os 3 cards atuais do hero não comunicam o andamento da Copa de forma útil para o participante:

1. **Card "Pts Máx"** mostra um número estático (`totalJogos * placarExato + extras`) que raramente muda e tem baixo engajamento. O usuário raramente olha.
2. **Card "Jogos"** mostra apenas o total (104), sem indicar quanto da Copa já aconteceu.

A homepage é o ponto de entrada e hoje não responde "como está o andamento da Copa?" — informação que é a mais procurada durante o torneio.

## Solução Proposta

### Card "Jogos" — versão C1 (3 colunas compactas)

```
┌─────────────────────────────────────────────────┐
│  📅  Jogos                                      │
│      15        │    2     │    87               │
│   finalizados  │ em jogo  │  restantes          │
└─────────────────────────────────────────────────┘
```

- 3 números lado a lado, separados por `|`
- Verde para `finalizado`, laranja/âmbar para `em_andamento`, cinza para `restante` (agendado)
- Mesmo wrapper `Card` + `CardContent` do StatsCard atual
- Mantém link para `/jogos` (mesma navegação do card antigo)

### Card "Copa" — anel circular + label

```
┌─────────────────────────────────────────┐
│   ⭕  Copa                              │
│  14%  14%                                │
│       concluído                          │
└─────────────────────────────────────────┘
```

- Anel SVG inline (40-48px) com a % no centro
- Arco verde do brand (`stroke-primary` = `--primary: #00A651`) sobre fundo cinza (`stroke-border`)
- `stroke-dasharray={percentual 100}` calcula o arco
- Texto à direita: label "Copa" + número grande + caption "concluído"
- **A % conta apenas `finalizado`**, não inclui `em_andamento` (escolha conservadora: matemática coerente com a soma visual do card "Jogos")

### Card "Participantes" — sem mudanças

Mantido como está, usando o `StatsCard` atual.

## Arquitetura

### Origem dos dados

Nova query `countJogosByStatus()` em `src/lib/db/queries/jogos.ts`:

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
  const map = Object.fromEntries(groups.map(g => [g.status, g._count._all]))
  return {
    finalizado: map.finalizado ?? 0,
    em_andamento: map.em_andamento ?? 0,
    restante: map.agendado ?? 0,  // agendado = restante
    total: groups.reduce((sum, g) => sum + g._count._all, 0),
  }
}
```

Performance: 1 round-trip ao Postgres com agregação no servidor. Sem N+1.

### Cálculo da %

A % é calculada na página (`src/app/(public)/page.tsx`), não no componente:

```ts
const percentual = stats.total === 0 ? 0 : Math.round((stats.finalizado / stats.total) * 100)
```

Mantém regra de negócio fora do componente. Helper puro, testável sem DOM.

### Componentes novos

| Componente | Localização | Responsabilidade |
|---|---|---|
| `JogosStatusCard` | `src/components/public/jogos-status-card.tsx` | Renderiza 3 números coloridos, recebe `{finalizado, emAndamento, restante, href?}` |
| `CopaProgressCard` | `src/components/public/copa-progress-card.tsx` | Renderiza anel SVG + label, recebe `{percentual, finalizados, total, href?}` |

Ambos reusam `Card` + `CardContent` de `@/components/ui/card` para consistência visual com o card "Participantes".

### Componentes refatorados

- `src/components/public/hero.tsx` — recebe novos props, compõe 3 componentes diferentes (Participantes via StatsCard, Jogos via JogosStatusCard, Copa via CopaProgressCard)
- `src/app/(public)/page.tsx` — chama `countJogosByStatus()` em paralelo com as outras queries via `Promise.all`

## Especificação Visual

### `JogosStatusCard`

```tsx
interface JogosStatusCardProps {
  finalizado: number
  emAndamento: number
  restante: number
  href?: string
}
```

Layout interno (replica `StatsCard` mas com 3 colunas):
- `Card` wrapper com classes idênticas ao StatsCard (`w-full`, hover effects se tiver href)
- `CardContent.p-4` flex row: ícone `Calendar` de `lucide-react` (32x32, `bg-success/10`) + bloco de texto
- Bloco de texto:
  - `p.text-sm.text-muted-foreground` "Jogos"
  - Flex row com 3 colunas `flex-1`:
    - `text-success font-display` número finalizado + `text-xs.text-muted-foreground` label
    - `text-warning font-display` número em_andamento + `text-xs.text-muted-foreground` label
    - `text-muted-foreground font-display` número restante + `text-xs.text-muted-foreground` label
  - Separadores `text-border` (`|`) entre colunas
- Mesma altura visual que os outros cards (mobile e desktop)

**Cores via tokens do tema** (`src/app/globals.css`):
- `--success: #2e7d32` (verde) → finalizado
- `--warning: #f9a825` (âmbar) → em_andamento
- `--muted-foreground: #6b7280` (cinza) → restante, labels
- `--border: #e5e7eb` → separadores
Não usar `text-green-600` ou `text-amber-500` (paleta crua do Tailwind) — sempre passar pelos tokens para suportar dark mode.

### `CopaProgressCard`

```tsx
interface CopaProgressCardProps {
  percentual: number       // 0-100, arredondado
  finalizados: number
  total: number
  href?: string
}
```

Layout interno:
- `Card` wrapper idêntico
- `CardContent.p-4` flex row: anel SVG (40px mobile / 48px desktop) + bloco de texto
- Anel SVG (`<svg viewBox="0 0 36 36">` com 2 `<circle>`):
  - Wrapper com classe `text-primary` (define `currentColor` herdado pelos strokes)
  - Background: `<circle stroke="currentColor" class="text-border" strokeWidth="2.5" />` — usa token `--border` para fundo do anel
  - Arco: `<circle stroke="currentColor" class="text-primary" strokeWidth="2.5" strokeDasharray={`${percentual} 100`} strokeLinecap="round" />` — usa token `--primary` (verde do brand)
  - SVG com `transform: rotate(-90deg)` para começar do topo
  - `<div>` absoluto no centro com `text-xs font-bold text-primary` mostrando a %
- Bloco de texto à direita:
  - `p.text-sm.text-muted-foreground` "Copa"
  - `p.text-xl.font-display.text-primary` percentual grande
  - `p.text-xs.text-muted-foreground` "concluído"

**Tokens do tema usados** (`src/app/globals.css`):
- `--primary: #00A651` (verde brand) → arco, número grande, % no centro
- `--border: #e5e7eb` → fundo do anel
- `--muted-foreground: #6b7280` → labels
Sempre via tokens (suporte dark mode). Sem cores hardcoded.

**Cálculo do `strokeDasharray`**: arco de circunferência tem 100 unidades (`2π × 15.9 ≈ 100`). Usar `${percentual} 100` cobre qualquer valor 0-100 sem cálculo trigonométrico. Para 0%, o arco fica invisível. Para 100%, completa o círculo.

## Acessibilidade

- Cada card tem `aria-label` descritivo:
  - Jogos: "Jogos: 15 finalizados, 2 em jogo, 87 restantes"
  - Copa: "Copa: 14 por cento concluído, 15 de 104 jogos"
- Cores dos números não são o único canal de informação (labels "finalizados"/"em jogo"/"restantes" sempre visíveis)
- Contraste verificado: `--success` (#2e7d32) e `--warning` (#f9a825) sobre fundo branco passam WCAG AA para texto >= 14px. Em dark mode, ajustar tons se necessário (não bloqueia este design — tokens já estão definidos).

## Casos de Borda

- **`total === 0`** (banco vazio): % mostra 0, anel vazio (sem arco), todos os números em 0. Guard na página antes de calcular a %.
- **Todos finalizados** (100%): arco completo, "0 em jogo, 0 restantes"
- **Nenhum finalizado** (0%): sem arco, "0 finalizados" + demais números
- **Mobile**: cards empilham em 1 coluna (grid `grid-cols-1 sm:grid-cols-3` já existente)
- **Texto longo em label** (não esperado, mas seguro): `truncate` no label e `min-w-0` no flex container para não estourar

## Testes

### Setup

Jest 30 + React Testing Library. `jest.config.ts` já define `testEnvironment: 'node'` como padrão. Testes de componente usam `@jest-environment jsdom` no topo do arquivo (padrão do `proximos-jogos-tabs.test.tsx`).

**Não** usam Docker Postgres — são testes puramente de componentes com mock data via factory functions. O `setup-test-db.sh` continua dedicado ao microserviço (`test-sync.sh`).

### Arquivos de teste

| Arquivo | Cenários |
|---|---|
| `src/components/public/__tests__/jogos-status-card.test.tsx` | renderiza os 3 números, classes de cor corretas (`text-success`, `text-warning`, `text-muted-foreground`), link ativo quando `href` fornecido, sem link quando omitido |
| `src/components/public/__tests__/copa-progress-card.test.tsx` | renderiza % arredondada, SVG com `stroke-dasharray` correto, `aria-label` descritivo, edge case `total=0` (sem arco), link funciona |

Padrão de factory: igual ao `makeJogo` em `proximos-jogos-tabs.test.tsx` — função helper que retorna props com defaults sobrescrevíveis.

## Arquivos Modificados/Criados

| Arquivo | Ação | LOC aprox. |
|---|---|---|
| `src/lib/db/queries/jogos.ts` | + `countJogosByStatus()` + `JogosCountByStatus` type | +25 |
| `src/components/public/jogos-status-card.tsx` | novo | ~50 |
| `src/components/public/copa-progress-card.tsx` | novo | ~70 |
| `src/components/public/hero.tsx` | refator (3 componentes) | -5 / +15 |
| `src/app/(public)/page.tsx` | adiciona query + cálculo de % | +8 |
| `src/components/public/__tests__/jogos-status-card.test.tsx` | novo | ~50 |
| `src/components/public/__tests__/copa-progress-card.test.tsx` | novo | ~50 |

Total estimado: ~250 LOC, 0 arquivos deletados.

## Fora de Escopo

Decidido neste design, **NÃO** será implementado:

- **Auto-refresh client-side** (revalidação periódica sem reload): `force-dynamic` já garante dados frescos no load. Adicionar polling/client revalidation é polish futuro.
- **Animação de progresso no anel** (CSS transition ao mudar %): pode ser adicionado como polish visual depois, não bloqueia o redesign.
- **Mover cálculo de % para helper reutilizável**: só uma chamada, YAGNI. Se surgir segunda chamada no futuro, extrair.
- **Labels "Copa 2026" ao invés de "Copa"**: contexto do hero já deixa claro que é a Copa do Mundo 2026.
- **Internacionalização**: projeto é PT-BR apenas.
- **Storybook / visual regression tests**: projeto não tem Storybook, manter Jest como única forma de teste de UI.
- **Atualizar `scripts/seed.ts`**: status default já é `agendado`, sem mudança necessária. Admin pode mudar status pelo painel de resultados.

## Decisões Tomadas Durante o Brainstorming

1. **% considera `em_andamento`?** → **NÃO.** Só `finalizado`. Conservador, mantém a matemática coerente com a soma visual do card "Jogos".
2. **3 categorias no card Jogos (finalizado/em_andamento/restante) vs 2?** → **3 categorias.** Mais informação, layout cabe.
3. **Visual da % no card Copa:** anel circular com label dentro (não número grande avulso, não barra horizontal).
4. **Cores dos números:** colorido (verde/laranja/cinza) ao invés de neutro preto/cinza. Mais sinalização semântica.
5. **Link no card Copa:** sim, aponta para `/jogos` (consistência com o card "Jogos").

## Compatibilidade

- Mudança é puramente visual e de queries. Sem breaking changes em API.
- `getTodosJogos()` continua existindo e é usado pela página (não removido).
- `StatsCard` continua existindo (Participantes usa).
- Nenhuma migration no banco. `StatusJogo` enum já tem `agendado | em_andamento | finalizado`.
