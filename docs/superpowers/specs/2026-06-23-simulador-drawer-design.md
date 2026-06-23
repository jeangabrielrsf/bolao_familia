# Simulador — Drawer por grupo — Design

**Data:** 2026-06-23
**Status:** Design em revisão (brainstorming concluído)
**Stack:** Next.js 16, React 19, TypeScript 5, Tailwind 4, @radix-ui/react-dialog (já instalado)

## Contexto e motivação

A aba **Simulador** da página `/copa` (entregue em `ca2decc`) já permite editar placares via `aplicarSimulacao`, mas a UI atual:

1. Não mostra **quais jogos podem ser editados** — não há lista de jogos do grupo na página
2. Não há affordance de "clica aqui pra editar" — usuário não descobre que dá pra simular
3. Não há separação visual entre **jogos finalizados** (read-only, vêm do sync) e **jogos futuros** (editáveis)

O resultado é que o simulador funciona tecnicamente mas é **invisível** pra quem chega na página pela primeira vez.

**Esta feature** adiciona drawers interativos à aba Simulador: clicar num card de grupo abre um painel com os jogos futuros daquele grupo, e o usuário digita os placares direto (sem botão "salvar" — atualiza na hora).

## Objetivos e não-objetivos

### Objetivos

- Card de grupo clicável na aba Simulador (com hover + cursor-pointer + chevron)
- Drawer lateral (desktop) / bottom sheet (mobile) abre ao clicar
- Drawer lista apenas **jogos futuros** (status !== 'finalizado') do grupo
- Inputs numéricos (placar A, placar B) editáveis — recalc em tempo real
- Acessível: ESC fecha, focus trap dentro do drawer, aria-labels nos inputs
- Responsivo: `md:` breakpoint alterna entre `side="right"` e `side="bottom"`

### Não-objetivos (YAGNI)

- **Não** mostrar jogos finalizados no drawer (são read-only, mostrados no simulador via classificação calculada)
- **Não** persistir no servidor — localStorage é a fonte de verdade (mesma key `copa_sim` já existente)
- **Não** adicionar undo/redo — botão "Limpar simulações" já existe no `SimulatorBanner`
- **Não** mostrar mata-mata no drawer — simulador cobre só grupos; mata-mata é derivado e mostrado na aba Chaveamento
- **Não** mexer nas abas Classificação / Chaveamento (esta feature é exclusivamente na aba Simulador)
- **Não** adicionar novas dependências — `@radix-ui/react-dialog` já está no `package.json` (vem do `dialog.tsx`)

## Decisões de design (locked do brainstorming)

| Pergunta | Resposta | Justificativa |
|---|---|---|
| Quais jogos mostrar no drawer? | A) Só futuros | Jogos finalizados são imutáveis; mostrá-los no drawer só polui a UI |
| Estilo do drawer? | A (side direita) + D (bottom sheet) | Combina desktop e mobile: nativo-feel no celular, foco no teclado no desktop |
| Fluxo de edição? | A) Live (sem botão) | Zero atrito; o usuário digita e vê o resultado fluir |
| Persistência? | localStorage (key `copa_sim`) | Já existe; não é recurso novo |
| Tooltip visual? | hover + cursor-pointer + chevron `›` | Padrão de "clicável" no design system |

## Arquitetura

### Componentes novos

| Componente | Localização | Responsabilidade |
|---|---|---|
| `sheet.tsx` | `src/components/ui/sheet.tsx` | UI primitive: wrapper de `@radix-ui/react-dialog` com variantes `side="right"` (desktop) e `side="bottom"` (mobile) |
| `group-card.tsx` | `src/components/public/group-card.tsx` | Substitui `GroupTable` na aba Simulador; vira clicável |
| `jogo-simulator-row.tsx` | `src/components/public/jogo-simulator-row.tsx` | 1 linha: time A + input placar A + input placar B + time B |
| `group-simulator.tsx` | `src/components/public/group-simulator.tsx` | Drawer/sheet que contém `JogoSimulatorRow`s do grupo |
| `use-simulacao.ts` (hook) | `src/lib/hooks/use-simulacao.ts` | Estado `simulacao` + localStorage + `useMemo` recalc |

### Componentes modificados

| Componente | Mudança |
|---|---|
| `simulator-tab.tsx` | Substitui `GroupTable` por `GroupCard`; gerencia qual drawer está aberto; usa `useSimulacao` |

### Estrutura de pastas

```
src/
├── components/
│   ├── ui/
│   │   └── sheet.tsx (novo)
│   └── public/
│       ├── group-card.tsx (novo)
│       ├── jogo-simulator-row.tsx (novo)
│       ├── group-simulator.tsx (novo)
│       ├── simulator-tab.tsx (refatorado)
│       ├── group-table.tsx (inalterado — ainda usado nas abas Classificação e Chaveamento)
│       └── group-legend.tsx (inalterado)
└── lib/
    └── hooks/
        └── use-simulacao.ts (novo)
```

### Fluxo de dados

```
[localStorage] → useSimulacao() → { simulacao, setPlacar(jogoId, a, b), clear() }
                                          ↓
                                   SimulatorTab
                                          ↓
                              GroupCard (por grupo, clickable)
                                          ↓ onClick
                              GroupSimulator (drawer)
                                          ↓
                          JogoSimulatorRow[] (por jogo futuro)
                                          ↓ onChange
                              setPlacar(jogoId, a, b)
                                          ↓
                                   recalc useMemo
                                          ↓
                          GroupTable[] + Bracket (renderizados ao vivo)
```

### `useSimulacao` hook — API

```ts
type Simulacao = Record<string, { placarA: number; placarB: number }>

export function useSimulacao(jogos: JogoComTimes[]): {
  simulacao: Simulacao
  jogosComSimulacao: JogoComTimes[]    // aplica simulacao sobre jogos
  setPlacar: (jogoId: string, placarA: number, placarB: number) => void
  clear: () => void
  count: number                         // qtd de jogos editados
}
```

**Comportamento:**
- Lazy initializer: `useState(() => loadFromLocalStorage())` (não `useEffect` — evita lint `set-state-in-effect`)
- `useEffect` de save: persiste `simulacao` no localStorage quando muda
- `jogosComSimulacao` é `useMemo([jogos, simulacao])` aplicando `aplicarSimulacao` (já existe em `src/lib/services/bracket/simulator.ts`)

### `sheet.tsx` — API

```tsx
type Side = 'right' | 'bottom'

type SheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  side?: Side                // default: 'right' (desktop)
  bottomOnMobile?: boolean   // se true, usa 'bottom' abaixo de md
  children: React.ReactNode
}
```

**Implementação:** wrapper de `<Dialog>` do `@radix-ui/react-dialog` com classes Tailwind condicionais:
- `side="right"`: `inset-y-0 right-0 w-3/4 sm:max-w-md`, animação `slide-in-from-right`
- `side="bottom"`: `inset-x-0 bottom-0 h-3/4 sm:h-auto sm:max-h-[80vh]`, animação `slide-in-from-bottom`
- Backdrop: `bg-black/40`

**Acessibilidade:**
- `aria-label` no `DialogContent` (param `title` opcional)
- `DialogTitle` (visualmente hidden se preferir)
- Focus trap nativo do Radix
- `onEscapeKeyDown` fecha
- Click outside fecha (padrão do Radix)

### `group-card.tsx` — API

```tsx
type Props = {
  grupo: ClassificacaoGrupo
  qualificadosTerceiros?: Set<string>
  onClick: () => void
}
```

**Visual:**
- Mesmo conteúdo que `GroupTable` (linhas 1-4 com pontos, J, V, E, D, SG)
- `hover:bg-muted/50`, `cursor-pointer`, `transition-colors`
- Chevron `›` à direita (ícone Lucide `ChevronRight`)
- Mesmas cores de fundo do `GroupTable` (verde/amarelo/vermelho + dark mode)
- **Diferença:** sem `border` externo, sem `shadow` — vira "card clicável" com leve hover

**Acessibilidade:**
- `<button>` wrapper (não `<div onClick>`) — keyboard accessible nativamente
- `aria-label="Editar jogos do grupo {X}"`

### `jogo-simulator-row.tsx` — API

```tsx
type Props = {
  jogo: JogoComTimes
  onPlacarChange: (placarA: number, placarB: number) => void
}
```

**Layout:**
```
[bandeira A] México    [ input 2 ]  ×  [ input 1 ]    África do Sul [bandeira]
                        placar A         placar B
```

**Inputs:**
- `<Input type="number" min="0" max="99">` com largura fixa (16)
- `onChange`: parse int, valida 0-99, chama `onPlacarChange`
- `aria-label="Placar {timeA}"`
- `aria-label="Placar {timeB}"`
- Auto-focus no placar A ao montar (UX nice-to-have)

**Disabled state:** se `jogo.status === 'finalizado'`, renderiza placar como texto (não input). **Não esperado no fluxo** (drawer só mostra futuros), mas defensivo.

### `group-simulator.tsx` — API

```tsx
type Props = {
  grupo: ClassificacaoGrupo
  jogos: JogoComTimes[]                // só futuros, já filtrado
  open: boolean
  onOpenChange: (open: boolean) => void
  onPlacarChange: (jogoId: string, placarA: number, placarB: number) => void
}
```

**Layout:**
- Header: `Grupo {X}` + subtítulo "{N} jogos futuros"
- Lista de `JogoSimulatorRow` (separadas por border-bottom)
- Footer: "Os cálculos atualizam automaticamente" (texto pequeno, muted)

## Edge cases

| Caso | Comportamento |
|---|---|
| Grupo sem jogos futuros (todos finalizados) | Drawer abre com mensagem "Nenhum jogo futuro neste grupo" |
| `localStorage` desabilitado / quota cheia | try/catch no load/save; simulação funciona em memória |
| Time com nome `null` (mata-mata) | Drawer não chega a mostrar — só renderiza jogos `fase === 'grupos'` |
| Usuário digita valor não-numérico | Input `type="number"` filtra no browser; onChange nunca recebe string |
| Usuário digita placar inválido (negativo, > 99) | min=0 max=99; browser bloqueia |
| Drawer já aberto, user clica em outro grupo | Fecha o atual e abre o novo (controlled `open` prop) |
| User navega pra outra aba e volta | `simulacao` é preservado (localStorage) |
| User limpa localStorage manualmente | Drawer abre, vê jogos sem placares; pode começar do zero |
| Hidratação SSR | `useSimulacao` usa lazy initializer com `typeof window !== 'undefined'` guard |

## Testes

### Unit (`useSimulacao`)

- Carrega do localStorage no mount
- `setPlacar` atualiza state + localStorage
- `clear` reseta state + remove do localStorage
- `jogosComSimulacao` aplica `aplicarSimulacao` corretamente
- Lazy initializer funciona (sem `set-state-in-effect`)

### Unit (`sheet.tsx`)

- Renderiza children quando `open=true`
- Não renderiza quando `open=false`
- Chama `onOpenChange(false)` ao pressionar ESC
- `side="bottom"` aplica classes corretas
- `side="right"` aplica classes corretas

### Component (`group-card.tsx`)

- Renderiza times do grupo
- Cores de fundo corretas (verde/amarelo/vermelho)
- `onClick` é chamado ao clicar
- `aria-label` correto

### Component (`jogo-simulator-row.tsx`)

- Renderiza nomes dos times
- Renderiza inputs com placares iniciais
- `onPlacarChange` é chamado ao digitar
- Disabled quando `status === 'finalizado'`

### Component (`group-simulator.tsx`)

- Renderiza header com nome do grupo
- Renderiza um `JogoSimulatorRow` por jogo futuro
- Mensagem "nenhum jogo futuro" quando lista vazia

### Integration (`simulator-tab.tsx`)

- Renderiza 12 `GroupCard`s
- Clicar num card abre `GroupSimulator`
- Editar placar reflete em classificação + bracket sem reload

## Critérios de aceite

- [ ] `npm run lint` clean
- [ ] `npm test` 100% green (todos os testes existentes + novos)
- [ ] `npm run build` succeeds
- [ ] `npx tsc --noEmit` zero erros
- [ ] Smoke test manual:
  - Abrir `/copa` → aba Simulador
  - Clicar num `GroupCard` → drawer abre pela direita (desktop) ou de baixo (mobile)
  - Digitar num placar → classificação do grupo recalcula ao vivo
  - Digitar placares de vários jogos → bracket (abaixo) atualiza em tempo real
  - ESC fecha o drawer; placares permanecem salvos
  - Reload da página → simulação preservada (localStorage)
  - Botão "Limpar simulações" → reseta tudo

## Notas de implementação

- **`@radix-ui/react-dialog` v1.1.16** já está no `package.json` (vem do `dialog.tsx` atual). Zero novas deps.
- **Tamanhos:** side drawer `w-3/4 sm:max-w-md` (50% no sm+), bottom sheet `h-3/4 sm:h-auto sm:max-h-[80vh]`
- **Animações Tailwind:** `data-[state=open]:animate-in data-[state=open]:slide-in-from-right` (já configurado em shadcn/ui; pode precisar adicionar `tailwindcss-animate` se não estiver — verificar)
- **Testes:** mocks de `@radix-ui/react-dialog` não devem ser necessários — Radix é compatível com jsdom. Usar `fireEvent.keyDown` com `key="Escape"` para testar ESC.
- **Hidratação:** `useSimulacao` precisa do guard `typeof window !== 'undefined'` no lazy initializer pra evitar erro de SSR.

## Riscos conhecidos

1. **Drawer e keyboard nav no mobile:** focus trap funciona, mas em mobile o teclado virtual pode cobrir metade do drawer. Mitigação: testar em viewport real, ajustar altura se necessário.
2. **Testes de componente do drawer:** Radix Dialog pode ter issues com jsdom em versões antigas. Mitigação: testar primeiro; se quebrar, mockar Radix.

> **`tailwindcss-animate` já está instalado** (`package.json:1.0.7`), então animações `data-[state=open]:slide-in-from-*` funcionam nativamente.

## Ordem de execução

1. Hook `useSimulacao` + testes (TDD)
2. UI primitive `sheet.tsx` + testes
3. `jogo-simulator-row.tsx` + testes
4. `group-card.tsx` + testes
5. `group-simulator.tsx` + testes
6. Refatorar `simulator-tab.tsx` (integração)
7. Teste de integração
8. Smoke test manual
9. Commit único ou granular (decidir após smoke)
