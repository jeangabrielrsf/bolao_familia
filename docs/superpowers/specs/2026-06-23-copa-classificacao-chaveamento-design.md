# Classificação de grupos + Chaveamento mata-mata — Design

**Data:** 2026-06-23
**Status:** Design aprovado pelo usuário, aguardando revisão final
**Stack:** Next.js 16, React 19, TypeScript 5, Tailwind 4, Prisma 7.8, Python FastAPI (microserviço)

## Contexto e motivação

O bolão atual cobre 33 jogos pré-apostados (estádio+extras) + 39 jogos completados via `/completar/{token}` + 5 extras. Os participantes apostam em todos os 72 jogos da fase de grupos, mas **não há visualização** de:

1. **Classificação dos grupos** (P/J/V/E/D/SG estilo FIFA) — útil pra acompanhar a situação do seu time
2. **Chaveamento mata-mata** (32 times → final) — visual BBC-style pra entender os confrontos

A Copa 2026 tem formato **inédito** com 32 times no mata-mata (16-avos de final novos), porque passam 2 times de cada grupo (24) + os 8 melhores terceiros (8) = 32.

## Objetivos e não-objetivos

### Objetivos
- Página pública `/copa` com 3 abas: Classificação, Chaveamento, Simulador
- Classificação dos 12 grupos com tiebreakers oficiais FIFA 2026
- Chaveamento visual BBC-style com 32 slots, projetado dinamicamente a partir da classificação
- Simulador "e se" pra editar placares futuros e ver impacto em tempo real
- Admin `/admin/jogos` com filtros melhores (fase, status, grupo, busca, período)

### Não-objetivos (YAGNI)
- Palpites no mata-mata (bolão continua 77 palpites máx: 72 grupos + 5 extras)
- Critérios 6-7 de desempate (fair play, ranking FIFA) — implementar steps 1-5, resto fica `posicao=null`
- Notificação em tempo real de atualização de chaveamento
- Migrations no schema Prisma (aproveitar `Jogo` existente, sem novas colunas)

## Comportamento do usuário

### Aba Classificação
- 12 tabelas (A-L), grid 2-3-4 colunas conforme viewport
- Linhas 1-2: badge verde "Classificado"
- Linha 3: badge amarelo "Melhores 8 terceiros" se aplicável, senão badge vermelho "Eliminado"
- Times empatados sem resolução (step 5 insuficiente): highlight + tooltip "Desempate exige fair play / ranking FIFA"
- Reativo: posição atualiza conforme sync traz resultados (cache 60s no server)

### Aba Chaveamento
- Layout horizontal com 7 colunas: R32 (16 jogos) → R16 (8) → QF (4) → SF (2) → Final (1) → Título + 3º lugar (à direita)
- Cards mostram times, placar (se finalizado), badge "VENCEDOR" no time que avança
- Times "TBD" (slot depende de jogo anterior não finalizado) ficam cinza claro com "A definir"
- **Mobile (< 768px):** uma fase por vez, com `<Select>` ou barra de pílulas no topo
- **Tablet (768-1023px):** scroll horizontal com snap
- **Desktop (≥ 1024px):** layout completo visível
- Conectores SVG só aparecem do tablet pra cima

### Aba Simulador
- Banner no topo: `🎮 Modo simulação — X alterações — [Limpar simulações]`
- Cards de jogos futuros (não finalizados) mostram placar em `<input>` editável
- Jogos editados ganham fundo amarelo + badge "SIM"
- Jogos finalizados ficam travados com ícone de cadeado
- Recalcula classificação e chaveamento em tempo real (client-side)
- Estado persistido em localStorage na chave `copa_sim_<hashDosJogos>`
- Simulação **só afeta esse navegador** — outros usuários veem o real

### Admin `/admin/jogos`
- Filtros: fase, status, grupo, busca por time, período
- Filtros persistidos em URL (compartilháveis)
- Ordenação por dataHora desc/asc
- Ações rápidas: "Ir pra jogo em andamento", "Ver mata-mata"
- Paginação 25/página + "Mostrar todos"
- Linha de mata-mata com times "TBD": badge "A definir", placar desabilitado

## Arquitetura

### Componentes novos

**Pages/routes:**
- `src/app/(public)/copa/page.tsx` — server component, render inicial com Tabs client-side
- `src/app/(public)/copa/layout.tsx` — metadata + header

**Componentes públicos:**
- `src/components/public/group-table.tsx` — tabela de classificação (P/J/V/E/D/SG)
- `src/components/public/bracket.tsx` — container do bracket (responsivo, scroll/select por fase)
- `src/components/public/bracket-column.tsx` — coluna de N jogos por fase
- `src/components/public/bracket-match.tsx` — card individual (3 tamanhos)
- `src/components/public/copa-tabs.tsx` — Tabs client-side (Classificação | Chaveamento | Simulador)
- `src/components/public/simulator-banner.tsx` — banner com contador + botão limpar

**Componentes admin:**
- `src/components/admin/jogo-row.tsx` — linha editável (extraído de `admin/jogos/page.tsx`)
- `src/components/admin/jogo-filters.tsx` — barra de filtros
- `src/components/admin/jogo-pagination.tsx` — paginação 25/página

**Services (lógica pura):**
- `src/lib/services/bracket/standings.ts` — `getClassificacaoGrupos()` retorna `ClassificacaoGrupo[]`
- `src/lib/services/bracket/best-thirds.ts` — `getMelhores8Terceiros()` aplica tiebreakers 1-3
- `src/lib/services/bracket/matrix.ts` — constante `MATRIX_TERCEIROS` (mapeamento oficial FIFA)
- `src/lib/services/bracket/projector.ts` — `projetarChaveamento()` retorna `BracketSlot[]`
- `src/lib/services/bracket/updater.ts` — `atualizarBracket()` lê DB, calcula, escreve
- `src/lib/services/bracket/cache.ts` — cache in-memory com TTL 60s
- `src/lib/services/bracket/simulator.ts` — funções puras de classificação/chaveamento que aceitam palpites simulados (reaproveita standings.ts/projector.ts com input modificado)

**Types:**
- `src/lib/services/bracket/types.ts` — `ClassificacaoTime`, `ClassificacaoGrupo`, `BracketSlot`

### Mudanças no microserviço (Python)
- `microservice/app/services/football_data.py::match_game()` — aceitar `grupo=None`/vazio, pular filtro de group, match só por data ±1h + TLA
- `microservice/app/services/worldcup26.py::match_game()` — aceitar `grupo=None`/vazio, match só por data ±1h + times PT→EN
- `microservice/app/services/sync_runner.py:92` — `grupo = jogo["grupo"] or ""` já passa vazio corretamente

### Mudanças no seed
- `scripts/seed.ts` — adicionar bloco com 32 `Jogo` mata-mata (16 R32 + 8 R16 + 4 QF + 2 SF + 1 3º + 1 F)
  - `timeA`/`timeB`: `null` inicialmente
  - `dataHora`: baseado no calendário FIFA oficial (28/junho a 19/julho)
  - `fase`: enum correspondente
  - `grupo`: `null`
  - `isBolao`: `false`
  - `sofascoreId`: string única tipo `"R32-M1"`, `"R16-M5"`, etc. (pass-through key, não precisa ser ID real)
  - `local`/`cidade`: estádios oficiais de cada fase
- Lógica idempotente: só insere se já não existem (mesma lógica dos 72 atuais)

### Mudanças no Header
- `src/components/layout/Header.tsx` — adicionar link "Copa" no menu público

## Modelo de dados

**Schema Prisma:** **nenhuma mudança**. Reaproveita `Jogo` existente.

```prisma
// Schema atual já suporta tudo que precisamos:
// - Jogo.fase: enum (grupos, dezesseis_avos, oitavas, quartas, semifinal, terceiro, final)
// - Jogo.grupo: String? (null para mata-mata)
// - Jogo.vencedor: Int? (1=timeA, 2=timeB) — usado pra determinar quem avança
// - Jogo.placarPenaltisA/B: Int? — preenchido em mata-mata com pênaltis
// - Jogo.isBolao: Boolean — false para mata-mata
```

**Palpites:** **inalterados**. `isBolao=false` + `fase != 'grupos'` continua excluindo mata-mata das queries de aposta.

**Sem nova tabela.** Simulação usa localStorage, não toca o banco.

## Algoritmos

### `getClassificacaoGrupos()`

**Input:** array de `Jogo` onde `fase='grupos'`.

**Output:** array `ClassificacaoGrupo[]` (um por grupo, 4 times cada):

```ts
type ClassificacaoTime = {
  time: string
  jogos: number        // 3
  vitorias: number
  empates: number
  derrotas: number
  golsPro: number
  golsContra: number
  saldo: number
  pontos: number       // vitorias*3 + empates
  posicao: number | null  // 1-4, null se empate não resolvido
}
```

**Passos:**
1. Agrupa `Jogo` por `grupo` (A-L)
2. Para cada grupo, agrega stats dos 4 times (só `status='finalizado'`)
3. Ordena por pontos desc, depois aplica tiebreakers

### Tiebreakers oficiais FIFA 2026 (steps 1-5)

| Step | Critério                                       | Implementação                                              |
| ---- | ---------------------------------------------- | ---------------------------------------------------------- |
| 1    | Pontos no confronto direto entre empatados     | Filtra jogos entre os times, soma pontos                   |
| 2    | Saldo de gols no confronto direto              | Soma `golsPro - golsContra` só nos jogos entre eles       |
| 3    | Gols pró no confronto direto                   | Soma gols feitos só nos jogos entre eles                  |
| 4    | Saldo de gols em todos os jogos do grupo       | Já temos no agregado                                       |
| 5    | Gols pró em todos os jogos do grupo            | Já temos no agregado                                       |
| 6-7  | Fair play, ranking FIFA                        | **Não implementado** — se empatados no step 5, `posicao=null` |

**Edge case:** se 2 times empatam em pontos mas o H2H entre eles terminou empatado, steps 1-3 não desempatam → cai pros steps 4-5.

### `getMelhores8Terceiros()`

**Input:** os 12 terceiros colocados (um de cada grupo).

**Output:** lista ordenada dos 8 que avançam, com a "letra" (A-L) de cada um.

**Tiebreakers (entre terceiros, grupos diferentes — sem H2H):**

| Step | Critério     |
| ---- | ------------ |
| 1    | Pontos       |
| 2    | Saldo de gols|
| 3    | Gols pró     |
| 4    | Fair play    |
| 5    | Ranking FIFA |

**Implementação:** steps 1-3 (4-5 ficam como `posicao=null` se empatados).

### `projetarChaveamento()`

**Input:**
- 1º/2º/3º de cada grupo (12 grupos)
- 8 melhores terceiros (já ranqueados)
- `MATRIX_TERCEIROS` (constante hardcoded — tabela oficial FIFA)

**Output:** array `BracketSlot[]` com 32 entradas na ordem dos jogos do R32:

```ts
type BracketSlot = {
  jogoId: string
  fase: 'dezesseis_avos' | 'oitavas' | 'quartas' | 'semifinal' | 'terceiro' | 'final'
  slot: number            // 1-16 no R32, 1-8 no R16, etc.
  timeA: string | 'TBD'
  timeB: string | 'TBD'
  placarA: number | null
  placarB: number | null
  status: StatusJogo
  vencedor?: 'A' | 'B'   // quem avança (baseado em placar ou penaltis)
  sourceGrupo?: {        // pra exibir de onde veio o time
    timeA: { grupo: string, posicao: 1 | 2 | 3 }
    timeB: { grupo: string, posicao: 1 | 2 | 3 }
  }
}
```

**Lógica:**
1. Aplica `MATRIX_TERCEIROS` pra saber quais pares `1X 2Y` formam o R32 (depende de quais 8 grupos passam)
2. Pra R16, QF, SF, F: vencedor do jogo `2N-1` vai pro slot `N` da próxima fase (mapeamento fixo)
3. Se vencedor de um jogo prévio não existe (jogo não finalizado), `timeA` ou `timeB` da próxima fase fica `'TBD'`

### `atualizarBracket()` (chamado no SSR de `/copa`)

```ts
async function atualizarBracket(): Promise<BracketSlot[]> {
  const jogos = await prisma.jogo.findMany({
    where: { fase: { not: 'grupos' } },
  });
  const bracket = projetarChaveamento(jogos);
  for (const slot of bracket) {
    if (slot.timeA !== 'TBD' || slot.timeB !== 'TBD') {
      await prisma.jogo.update({
        where: { id: slot.jogoId },
        data: {
          timeA: slot.timeA === 'TBD' ? null : slot.timeA,
          timeB: slot.timeB === 'TBD' ? null : slot.timeB,
        },
      });
    }
  }
  return bracket;
}
```

**Cache:** in-memory `Map<key, {value, expiresAt}>` com TTL 60s. Chave = hash da query string. Invalida após sync do cron.

### Vencedor de mata-mata

- `Jogo.vencedor` (já populado pelo sync via `score.winner` da football-data) define quem avança
- Se `placarPenaltisA != placarPenaltisB` e placar igual, vencedor = quem tem mais pênaltis
- Display mostra `1-1 (4-3 pen)` quando há pênaltis, ou só `1-0` quando decidido em tempo normal/prorrogação
- **Não adicionamos colunas de prorrogação** — `Jogo` mantém o shape atual

## Sync (microserviço)

### Mudanças

**`microservice/app/services/football_data.py::match_game()`:**

```python
def match_game(matches, group, data_hora, *, time_a_tla=None, time_b_tla=None):
    # Se group é vazio/None, pula filtro de group (match mata-mata)
    group_normalized = _normalize_group(group) if group else None

    candidatos = []
    for match in matches:
        # Pula filtro de group se mata-mata
        if group_normalized and match.get("group", "") != group_normalized:
            continue
        # ... resto do match (data + times)
```

**`microservice/app/services/worldcup26.py::match_game()`:** mesma mudança.

**`microservice/app/services/sync_runner.py:92`:** `grupo = jogo["grupo"] or ""` já passa string vazia corretamente. Sem mudança aqui.

### Janela de jogos ativos

Endpoint `/resultados/sincronizar` já busca jogos com `data_hora` nas últimas `X-Window-Hours`. Os 32 mata-mata automaticamente entram na janela quando seus `dataHora` se aproximam.

## UI

### `/copa` layout

```
┌──────────────────────────────────────────┐
│ Copa do Mundo 2026                       │
│ [Classificação] [Chaveamento] [Simulador]│
├──────────────────────────────────────────┤
│                                          │
│ (conteúdo da aba ativa)                  │
│                                          │
└──────────────────────────────────────────┘
```

### GroupTable (Classificação)

| # | Time     | P | J | V | E | D | SG  |
|---|----------|---|---|---|---|---|-----|
| 1 | 🇧🇷 Brasil | 6 | 3 | 2 | 0 | 1 | +3 [✓ Classificado] |
| 2 | 🇲🇦 Marrocos | 4 | 3 | 1 | 1 | 1 | 0 [✓ Classificado] |
| 3 | 🏴󠁧󠁢󠁳󠁣󠁴󠁿 Escócia | 4 | 3 | 1 | 1 | 1 | -1 [⚠ Melhores 8 terceiros] |
| 4 | 🇭🇹 Haiti | 2 | 3 | 0 | 2 | 1 | -2 [✗ Eliminado] |

### Bracket (Chaveamento) — desktop

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ R32-1    │  │ R16-1    │  │ QF-1     │  │ SF-1     │  │ Final    │  │ Campeão  │  │ 3º lugar │
│ ──────── │  │ ──────── │  │ ──────── │  │ ──────── │  │ ──────── │  │ ──────── │  │ ──────── │
│ BRA 1    │─▶│ BRA 2    │─▶│ BRA 3    │─▶│ BRA 1    │─▶│ BRA 2    │─▶│ 🇧🇷 Brasil│  │ ARG 0    │
│ MAR 0    │  │ URU 1    │  │ USA 2    │  │ ARG 0    │  │ ARG 1    │  │          │  │ FRA 2    │
└──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘
```

### Bracket — mobile

```
┌──────────────────────────────┐
│ [R32] [R16] [QF] [SF] [Final]│
├──────────────────────────────┤
│                              │
│ R32 - Jogo 1                 │
│ 🇧🇷 Brasil 1  ✓             │
│ 🇲🇦 Marrocos 0              │
│                              │
│ R32 - Jogo 2                 │
│ A definir vs A definir       │
│ (aguarda: 1ºB x 3ºA/C/D/E)  │
│                              │
└──────────────────────────────┘
```

### Simulator banner

```
┌────────────────────────────────────────┐
│ 🎮 Modo simulação — 3 alterações       │
│                              [Limpar]  │
└────────────────────────────────────────┘
```

### Admin `/admin/jogos` filtros

```
┌────────────────────────────────────────────────────────────┐
│ Fase: [✓ Grupos ✓ Mata-mata]  Status: [✓ Agendado ✓ Em andamento ✓ Finalizado] │
│ Grupo: [A B C D E F G H I J K L]  Time: [____]  De: [__/__] Até: [__/__]  │
│                                                                    [Limpar]   │
├────────────────────────────────────────────────────────────┤
│ Jogo                              Status   Grupo   Placar  Ação    │
│ 🇧🇷 Brasil 1 × 🇲🇦 Marrocos 0    [Final.]  A       1-0     [Editar]│
│ 🇧🇷 Brasil ? × A definir          [A def.]  --      TBD     [Editar]│
└────────────────────────────────────────────────────────────┘
```

## Testes

### Unit tests

| Arquivo                                            | O que testa                                                  |
| -------------------------------------------------- | ------------------------------------------------------------ |
| `src/lib/services/bracket/__tests__/standings.test.ts` | Agregação de stats + tiebreakers steps 1-5                |
| `src/lib/services/bracket/__tests__/best-thirds.test.ts` | Seleção dos 8 melhores terceiros                            |
| `src/lib/services/bracket/__tests__/projector.test.ts`   | Mapeamento R32 com `MATRIX_TERCEIROS` + propagação de vencedor + TBD |
| `microservice/tests/test_football_data_mata_mata.py`     | `match_game` com `grupo=None`                            |
| `microservice/tests/test_worldcup26_mata_mata.py`        | Mesmo pra worldcup26 fallback                              |
| `microservice/tests/test_sync_writer_penaltis.py`         | Vencedor decidido por pênaltis                             |

### Component tests

| Arquivo                                            | O que testa                                                  |
| -------------------------------------------------- | ------------------------------------------------------------ |
| `src/components/public/__tests__/group-table.test.tsx` | Renderiza 0/3/6 jogos + badges verde/amarelo/vermelho       |
| `src/components/public/__tests__/bracket.test.tsx`    | Renderiza com TBDs + jogos finalizados + SVG connectors    |
| `src/components/public/__tests__/simulator.test.tsx`  | Edit placar → recalcula; "Limpar" volta estado; localStorage persiste |

### Integration

- `atualizarBracket()` end-to-end com DB de teste (baseado no `test-sync.sh` existente)
- Admin `/admin/jogos` com filtros aplicados via URL

## Edge cases principais

| Cenário                                              | Comportamento                                               |
| ---------------------------------------------------- | ----------------------------------------------------------- |
| 3 times empatados em pontos (triple tie)             | Aplica tiebreakers 1-5 entre os 3, com mini-tabela H2H      |
| 2 times empatados + H2H entre eles foi empate         | Steps 1-3 empatam → cai pra steps 4-5                        |
| Empate persiste até step 5                           | `posicao=null` + tooltip                                     |
| 12 grupos terminados, 8 3rds com mesma pontuação     | `posicao=null` pros 3rds empatados, afeta a matriz           |
| Bracket: jogo anterior não finalizado                | Próximo slot fica "TBD — aguarda jogo anterior"             |
| Jogo mata-mata cancelado                             | Status fica "agendado" eternamente, vencedor `null`         |
| Admin edita placar de jogo finalizado via API        | Admin permite override; sync do cron não sobrescreve        |
| Simulador: usuário edita, depois jogo real termina   | Próxima visita: estado real prevalece (sim não mexe no DB)  |
| localStorage cheio / desabilitado                    | Banner mostra aviso, sim roda só em memória                  |
| Mobile: usuário gira tela durante simulação           | Estado preservado (localStorage)                             |

## Deploy

### Ordem

1. **Atualizar seed** com bloco dos 32 mata-mata. Rodar `npx tsx --env-file=.env scripts/seed.ts` em prod (idempotente).
2. **Deploy do microserviço** com mudanças em `match_game`. `fly deploy`.
3. **Deploy do Next.js** com páginas `/copa`, componentes, services. Push normal → Vercel.
4. **Adicionar link "Copa" no Header** — atualizar `src/components/layout/Header.tsx`.
5. **Smoke test em prod:**
   - Abrir `/copa`, verificar que 3 abas funcionam
   - Aba Classificação renderiza as 12 tabelas
   - Aba Chaveamento mostra 32 slots "A definir"
   - Aba Simulador permite editar placar futuro
6. **Monitorar logs do cron** por 24h.

### Rollback

- **Seed:** trivial (re-roda seed). Pra remover os 32 novos, deletar manualmente `WHERE fase != 'grupos'`.
- **Microserviço:** `fly releases rollback`.
- **Next.js:** revert no Vercel.

## Riscos & mitigações

| Risco                                                 | Mitigação                                                   |
| ----------------------------------------------------- | ----------------------------------------------------------- |
| Cron começa a matchar mata-mata errado (times invertidos) | `_teams_match` já trata home/away em qualquer ordem       |
| `MATRIX_TERCEIROS` com typo passa batido              | Unit test com snapshot da matriz contra documento FIFA      |
| Sync pesado ao processar 32 mata-mata a cada janela   | 32 é pequeno vs 72 grupos; sem impacto                     |
| Seed idempotente pode duplicar em rerun               | Lógica: só inserir se `sofascoreId` não existe             |
| localStorage crescer demais com sims                  | Limpar chaves antigas no boot se > 100 entries             |
| Cache de 60s no SSR mostrar bracket defasado          | Documentar: máximo 60s de defasagem após sync do cron      |

## Arquivos a criar/modificar

**Criar:**
- `src/lib/services/bracket/types.ts`
- `src/lib/services/bracket/standings.ts`
- `src/lib/services/bracket/best-thirds.ts`
- `src/lib/services/bracket/matrix.ts`
- `src/lib/services/bracket/projector.ts`
- `src/lib/services/bracket/updater.ts`
- `src/lib/services/bracket/cache.ts`
- `src/lib/services/bracket/simulator.ts`
- `src/lib/services/bracket/__tests__/{standings,best-thirds,projector}.test.ts`
- `src/app/(public)/copa/page.tsx`
- `src/app/(public)/copa/layout.tsx`
- `src/components/public/group-table.tsx`
- `src/components/public/bracket.tsx`
- `src/components/public/bracket-column.tsx`
- `src/components/public/bracket-match.tsx`
- `src/components/public/copa-tabs.tsx`
- `src/components/public/simulator-banner.tsx`
- `src/components/public/__tests__/{group-table,bracket,simulator}.test.tsx`
- `src/components/admin/jogo-row.tsx`
- `src/components/admin/jogo-filters.tsx`
- `src/components/admin/jogo-pagination.tsx`
- `microservice/tests/test_football_data_mata_mata.py`
- `microservice/tests/test_worldcup26_mata_mata.py`
- `microservice/tests/test_sync_writer_penaltis.py`

**Modificar:**
- `scripts/seed.ts` (adicionar 32 mata-mata)
- `src/app/admin/jogos/page.tsx` (extrair componentes + usar novos filtros)
- `src/components/layout/Header.tsx` (link "Copa")
- `microservice/app/services/football_data.py::match_game()` (suporte a `grupo=None`)
- `microservice/app/services/worldcup26.py::match_game()` (suporte a `grupo=None`)

## Próximos passos

1. Usuário revisa este spec
2. Invocar skill `writing-plans` pra criar plano de implementação
3. Implementação em worktree isolado
4. PR + code review
5. Deploy em prod seguindo ordem da seção "Deploy"
