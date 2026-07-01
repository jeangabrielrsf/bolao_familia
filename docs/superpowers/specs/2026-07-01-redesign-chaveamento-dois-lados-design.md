# Spec: Redesign do Chaveamento — Dois Lados com Conectores

**Data:** 2026-07-01
**Branch:** `dev`
**Status:** Aprovado em brainstorming

## Problema

A aba Chaveamento do `/copa` atual usa CSS Grid posicional que alinha os confrontos por fase, mas **não mostra linhas de conexão** entre as fases. O usuário não vê visualmente de quais confrontos vieram os times. Além disso, a visualização em desktop é linear (todas as fases lado a lado) em vez de usar a divisão natural esquerda/direita do bracket da Copa 2026.

## Objetivo

Redesenhar o componente de chaveamento com:

1. **Conectores visuais** (linhas/curvas) entre fases, mostrando o caminho dos times
2. **Layout de dois lados** em desktop: esquerda (SF-1) e direita (SF-2) convergindo para Final + 3º no centro
3. **Mobile-first**: uma fase por vez com swipe
4. **Path highlighting**: hover em um time destaca todo o caminho até a final

## Decisões Locked (brainstorming)

| # | Decisão | Alternativas descartadas |
|---|---------|--------------------------|
| 1 | **Desktop: dois lados** (esquerda SF-1 + direita SF-2) convergindo para Final no centro, 3º lugar abaixo | A) Árvore horizontal linear (atual), C) Única fase por vez, D) Accordion vertical |
| 2 | **Mobile: uma fase por vez com swipe** (dots + carrossel horizontal) | B) Bracket reduzido com pinch-zoom, C) Vertical indentado |
| 3 | **Conectores SVG** com linhas de 1px entre fases, seta indicando avanço | CSS pseudo-elements (menos flexível para curvas/diagonais) |
| 4 | **5 protótipos** na pasta `prototypes/` antes da implementação | — |
| 5 | **Manter dados atuais** — `BracketSlot`, `projetarChaveamento()`, `jogosMataMata` não mudam. Só a UI é refeita. | — |

## Layout Desktop

### Estrutura

```
┌──────────────────────────────────────────────────────────────────┐
│                        LADO ESQUERDO (SF-1)                      │
│  R32(8)         Oitavas(4)       QF(2)       SF(1)              │
│  ┌────────┐                   ┌────────┐                        │
│  │ 1A 2B  │────┐          ┌───│ QF1    │───┐                    │
│  └────────┘    ├─Oit1 ────┘   └────────┘   │                    │
│  ┌────────┐    │                            ├── SF1 ──┐          │
│  │ 1C 2D  │────┘                            │         │          │
│  └────────┘                   ┌────────┐   │         │    ┌────┐│
│  ┌────────┐               ┌───│ QF2    │───┘         ├────│FINAL││
│  │ 1E 2F  │────┐          │   └────────┘             │    └────┘│
│  └────────┘    ├─Oit2 ────┘                          │          │
│  ┌────────┐    │                                      │          │
│  │ 1G 2H  │────┘                                      │          │
│  └────────┘                                           │    ┌────┐│
│  ... (4 jogos com 3rds)                               ├────│3ºL  ││
│                                                       │    └────┘│
│───────────────────────────────────────────────────────│──────────│
│                    LADO DIREITO (SF-2)                 │          │
│  R32(8)         Oitavas(4)       QF(2)       SF(1)   │          │
│  ┌────────┐                   ┌────────┐              │          │
│  │ 1I 2J  │────┐          ┌───│ QF3    │───┐          │          │
│  └────────┘    ├─Oit5 ────┘   └────────┘   │          │          │
│  ┌────────┐    │                            ├── SF2 ──┘          │
│  │ 1K 2L  │────┘                            │                    │
│  └────────┘                   ┌────────┐   │                    │
│  ┌────────┐               ┌───│ QF4    │───┘                    │
│  │ 2A 2E  │────┐          │   └────────┘                        │
│  └────────┘    ├─Oit6 ────┘                                      │
│  ┌────────┐    │                                                  │
│  │ 2G 2I  │────┘                                                  │
│  └────────┘                                                       │
│  ... (4 jogos com 3rds)                                           │
└──────────────────────────────────────────────────────────────────┘
```

### Dimensões

- **Scroll horizontal** no container do bracket (`overflow-x-auto`)
- Largura mínima estimada: ~900px (8 cols × ~110px de match card + gaps)
- Cada card de confronto: `min-width: 110px`, padding 8px
- Colunas: R32 (2 colunas lado a lado por lado, 4 linhas cada) → Oitavas (1 coluna, 4 linhas) → QF (1 coluna, 2 linhas) → SF (1 coluna, 1 linha) → Final (1 coluna central)

### Conectores

- **SVG overlay** ou **canvas** desenhando linhas entre os cards
- Linhas horizontais dos cards até o ponto de junção, depois verticais unindo pares
- Espessura: 1px, cor `#475569` (slate-600)
- Seta triangular (`▶`) na ponta da linha que entra no próximo round
- **Hover highlight**: ao passar o mouse sobre um time, todas as linhas do caminho dele ficam verdes (`#10b981`) com espessura 1.5px

### Estados do Card de Confronto

| Estado | Visual |
|--------|--------|
| **Agendado** (times conhecidos) | Card normal, scores vazios (`—`), data/hora abaixo |
| **Agendado** (times a definir) | `opacity-50`, texto italic "1A vs 2B", subtítulo "Grupo A (1º) vs Grupo B (2º)" |
| **Finalizado** (com vencedor) | Vencedor com bg `#064e3b` (emerald-900), score em negrito verde `#10b981` |
| **Finalizado** (pênaltis) | Igual finalizado + texto `(4-3 pen)` abaixo dos scores |
| **Em andamento** | Badge `AO VIVO` ou ícone de pulso, scores atuais |

Cada card contém:
- Data/hora (topo, `text-[10px] text-muted-foreground`)
- Time A (flag + nome + score)
- Time B (flag + nome + score)
- Rodapé: cidade/local ou "FT" (full time)

### Destaque do Caminho (Path Highlighting)

- **Hover** sobre um nome de time → todas as linhas e cards no caminho daquele time até a final ficam com borda/stroke verde
- **Click** → navega para a página do jogo daquela fase (se disponível)
- Times eliminados ficam em opacidade reduzida (`opacity-60`) quando há hover no vencedor

### Cabecalho de Fase

Cada coluna de fase tem um header com:
```
16 AVOS
8 jogos
```
Estilo: `text-xs text-muted-foreground uppercase tracking-wider`

## Layout Mobile

### Navegação

- **Carrossel horizontal** com 6 slides (16 avos, Oitavas, Quartas, Semi, Final, 3º)
- **Dots** no topo indicam posição atual (6 bolinhas)
- **Swipe** (touch) ou **setas** (← →) para navegar
- Fase ativa destacada com cor primária

### Cards

- Ocupam largura quase total da tela (padding lateral 16px)
- Agrupados visualmente: lado esquerdo (título azul `#60a5fa`) e lado direito (título roxo `#a78bfa`)
- Cada card mostra: data/hora, times, placar, indicador "→ Oitavas J1" no canto inferior direito
- Scroll vertical dentro de cada fase (especialmente 16 avos com 16 cards)

### Swipe

- Usar `touch-action: pan-y` + event listeners (ou biblioteca como `embla-carousel-react` se já usada no projeto)
- Transição suave entre fases com `transform: translateX()`
- Fallback: setas/botões de navegação para acessibilidade

## Componentes Novos

| Componente | Localização | Descrição |
|-----------|-------------|-----------|
| `BracketTwoSided` | `src/components/public/bracket-two-sided.tsx` | Container desktop com dois lados + centro |
| `BracketSide` | `src/components/public/bracket-side.tsx` | Um lado (esquerdo ou direito) com R32 → Oitavas → QF → SF |
| `BracketCenter` | `src/components/public/bracket-center.tsx` | Final + 3º lugar no centro |
| `BracketConnectors` | `src/components/public/bracket-connectors.tsx` | SVG overlay com todas as linhas de conexão |
| `BracketMobile` | `src/components/public/bracket-mobile.tsx` | Carrossel de fases para mobile |
| `BracketMatchCard` | `src/components/public/bracket-match-card.tsx` | Card de confronto (substitui `BracketMatch` atual) |
| `BracketPhaseDots` | `src/components/public/bracket-phase-dots.tsx` | Indicador de fase atual (dots) |

## Componentes Existentes Afetados

| Componente | Ação |
|-----------|------|
| `bracket.tsx` | Refatorar: renderiza `BracketTwoSided` (desktop) ou `BracketMobile` (mobile) |
| `bracket-grid.tsx` | Remover ou arquivar |
| `bracket-column.tsx` | Remover ou arquivar |
| `bracket-match.tsx` | Substituir por `BracketMatchCard` |
| `copa/page.tsx` | Sem alterações (dados já vêm prontos do server) |
| `simulator-tab.tsx` | Adaptar para usar novo `BracketTwoSided`/`BracketMobile` |

## Dados

**Nenhuma mudança nos dados.** O `BracketSlot[]` já contém:
- `sourceGrupo` com informações de origem (grupo, posição, grupos alternativos)
- `timeA`, `timeB`, `placarA`, `placarB`, `status`, `vencedor`
- `fase`, `slot`, `dataHora`

O mapeamento para "lado" (esquerdo/direito) é **derivado dos pareamentos reais do projector** (`PAREAMENTO_R32_PARA_R16` + `PAREAMENTO_R16_PARA_QF`):

- **SF-1** = QF [1,2] = Oit [1,2] + Oit [5,6]
- **SF-2** = QF [3,4] = Oit [3,4] + Oit [7,8]

Expandindo para R32 (via `PAREAMENTO_R32_PARA_R16`):

- **Lado Esquerdo (SF-1)**: R32 slots {1, 2, 3, 5, 9, 10, 11, 12}
- **Lado Direito (SF-2)**: R32 slots {4, 6, 7, 8, 13, 14, 15, 16}

Uma função utilitária `getLadoSlot(slot: number): 'left' | 'right'` será criada no componente para agrupar os slots visualmente. A ordem visual dos cards em cada lado pode ser reorganizada para clareza (ex: lado esquerdo mostra slots 1,2,3,5 e 9,10,11,12 em sequência vertical).

## Protótipos (pasta `prototypes/`)

Criar 5 variações explorando diferentes aspectos visuais:

| # | Nome | Foco |
|---|------|------|
| 1 | `01-straight-lines.html` | Conectores retos (linhas horizontais + verticais), minimalista |
| 2 | `02-curved-lines.html` | Conectores com curvas bezier, visual mais orgânico |
| 3 | `03-dark-themed.html` | Tema escuro completo (como o app), match cards polidos |
| 4 | `04-compact-mobile.html` | Versão mobile otimizada, cards maiores, swipe funcional |
| 5 | `05-animated.html` | Transições animadas entre fases e path highlighting interativo |

Cada protótipo é um HTML standalone com CSS inline/Tailwind CDN, auto-contido.

## Fora do Escopo

- Alterar a lógica de `projetarChaveamento()` ou `MATA_MATA_SLOTS`
- Adicionar novas queries ou APIs
- Modificar o simulador (será adaptado depois)
- Internacionalização (já existe, só manter compatibilidade)

## Testes

- Manter testes existentes de `bracket-match.test.tsx` e `bracket.test.tsx` (adaptar para novos componentes)
- Adicionar teste: `BracketConnectors` renderiza SVG com coordenadas corretas
- Adicionar teste: `BracketMobile` navega entre fases com swipe/click
- Adicionar teste: path highlighting aplica classes corretas no hover
