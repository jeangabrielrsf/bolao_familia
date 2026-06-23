# Copa 2026 — Classificação + Chaveamento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar página pública `/copa` com 3 abas (Classificação, Chaveamento, Simulador) e melhorar filtros do admin `/admin/jogos`, reaproveitando a infraestrutura de sync existente.

**Architecture:** Server component `/copa` orquestra funções puras de classificação/projeção que rodam em ambos contextos (server e client). Bracket é projetado a partir de `Jogo` da fase de grupos. Simulador edita placares futuros em localStorage e recalcula via mesmas funções puras. 32 Jogo mata-mata são pré-criados no seed, atualizados on-demand pelo `atualizarBracket()`. Microserviço é estendido pra fazer match mata-mata (sem group, só data+times).

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind 4, Prisma 7.8, Python FastAPI (microserviço), Jest 30, React Testing Library.

**Pré-requisitos:** este plano assume que você está num worktree isolado em `main` (ou branch `feature/copa-classificacao-chaveamento`).

---

## Índice

**Fase 1 — Fundação (dados + sync)**
- Tarefa 1: Adicionar 32 `Jogo` mata-mata no seed
- Tarefa 2: Microserviço — match mata-mata (football_data)
- Tarefa 3: Microserviço — match mata-mata (worldcup26)

**Fase 2 — Lógica pura (TDD)**
- Tarefa 4: Types compartilhados
- Tarefa 5: `getClassificacaoGrupos` com TDD
- Tarefa 6: Tiebreakers (steps 1-5) com TDD
- Tarefa 7: `getMelhores8Terceiros` com TDD
- Tarefa 8: `MATRIX_TERCEIROS` constante
- Tarefa 9: `projetarChaveamento` com TDD
- Tarefa 10: `atualizarBracket` com TDD
- Tarefa 11: Cache in-memory

**Fase 3 — UI pública**
- Tarefa 12: `GroupTable` component
- Tarefa 13: `BracketMatch` component
- Tarefa 14: `BracketColumn` component
- Tarefa 15: `Bracket` container responsivo
- Tarefa 16: `CopaTabs` (3 abas)
- Tarefa 17: Page `/copa` (server component)

**Fase 4 — Simulador**
- Tarefa 18: Lógica pura do simulador
- Tarefa 19: `SimulatorBanner` + integração no `CopaTabs`

**Fase 5 — Admin refactor**
- Tarefa 20: Extrair `JogoRow`
- Tarefa 21: `JogoFilters` com TDD
- Tarefa 22: `JogoPagination` + integração `/admin/jogos`

**Fase 6 — Polish**
- Tarefa 23: Link "Copa" no Header

---

## Fase 1 — Fundação

### Tarefa 1: Adicionar 32 `Jogo` mata-mata no seed

**Files:**
- Modify: `scripts/seed.ts`

- [ ] **Step 1: Adicionar array `mataMataData` no seed**

Em `scripts/seed.ts`, depois do array `jogosData` (linha ~148) e antes de `async function main()`, adicionar:

```ts
// Chaveamento mata-mata — Copa 2026 oficial
// R32: 16 jogos (28/jun - 03/jul)
// R16: 8 jogos (04-07/jul)
// QF: 4 jogos (11-12/jul)
// SF: 2 jogos (15/jul)
// 3º: 1 jogo (18/jul)
// F: 1 jogo (19/jul)
const mataMataData: Array<{
  fase: 'dezesseis_avos' | 'oitavas' | 'quartas' | 'semifinal' | 'terceiro' | 'final'
  slot: number
  dataHora: string
  cidade: string
  sofascoreId: string
}> = [
  { fase: 'dezesseis_avos', slot: 1, dataHora: '2026-06-28T19:00:00.000Z', cidade: 'Philadelphia', sofascoreId: 'R32-M1' },
  { fase: 'dezesseis_avos', slot: 2, dataHora: '2026-06-29T19:00:00.000Z', cidade: 'Houston', sofascoreId: 'R32-M2' },
  { fase: 'dezesseis_avos', slot: 3, dataHora: '2026-06-30T19:00:00.000Z', cidade: 'East Rutherford', sofascoreId: 'R32-M3' },
  { fase: 'dezesseis_avos', slot: 4, dataHora: '2026-07-01T19:00:00.000Z', cidade: 'Miami Gardens', sofascoreId: 'R32-M4' },
  { fase: 'dezesseis_avos', slot: 5, dataHora: '2026-07-01T22:00:00.000Z', cidade: 'Atlanta', sofascoreId: 'R32-M5' },
  { fase: 'dezesseis_avos', slot: 6, dataHora: '2026-07-02T19:00:00.000Z', cidade: 'Kansas City', sofascoreId: 'R32-M6' },
  { fase: 'dezesseis_avos', slot: 7, dataHora: '2026-07-02T22:00:00.000Z', cidade: 'Dallas', sofascoreId: 'R32-M7' },
  { fase: 'dezesseis_avos', slot: 8, dataHora: '2026-07-03T19:00:00.000Z', cidade: 'Inglewood', sofascoreId: 'R32-M8' },
  { fase: 'dezesseis_avos', slot: 9, dataHora: '2026-06-28T22:00:00.000Z', cidade: 'Boston', sofascoreId: 'R32-M9' },
  { fase: 'dezesseis_avos', slot: 10, dataHora: '2026-06-29T22:00:00.000Z', cidade: 'Seattle', sofascoreId: 'R32-M10' },
  { fase: 'dezesseis_avos', slot: 11, dataHora: '2026-06-30T22:00:00.000Z', cidade: 'Monterrey', sofascoreId: 'R32-M11' },
  { fase: 'dezesseis_avos', slot: 12, dataHora: '2026-07-01T01:00:00.000Z', cidade: 'Mexico City', sofascoreId: 'R32-M12' },
  { fase: 'dezesseis_avos', slot: 13, dataHora: '2026-07-01T03:00:00.000Z', cidade: 'Guadalajara', sofascoreId: 'R32-M13' },
  { fase: 'dezesseis_avos', slot: 14, dataHora: '2026-07-02T01:00:00.000Z', cidade: 'Toronto', sofascoreId: 'R32-M14' },
  { fase: 'dezesseis_avos', slot: 15, dataHora: '2026-07-02T03:00:00.000Z', cidade: 'Vancouver', sofascoreId: 'R32-M15' },
  { fase: 'dezesseis_avos', slot: 16, dataHora: '2026-07-03T22:00:00.000Z', cidade: 'Santa Clara', sofascoreId: 'R32-M16' },
  { fase: 'oitavas', slot: 1, dataHora: '2026-07-04T19:00:00.000Z', cidade: 'Philadelphia', sofascoreId: 'R16-M1' },
  { fase: 'oitavas', slot: 2, dataHora: '2026-07-05T19:00:00.000Z', cidade: 'Houston', sofascoreId: 'R16-M2' },
  { fase: 'oitavas', slot: 3, dataHora: '2026-07-06T19:00:00.000Z', cidade: 'Atlanta', sofascoreId: 'R16-M3' },
  { fase: 'oitavas', slot: 4, dataHora: '2026-07-07T19:00:00.000Z', cidade: 'Miami Gardens', sofascoreId: 'R16-M4' },
  { fase: 'oitavas', slot: 5, dataHora: '2026-07-05T22:00:00.000Z', cidade: 'Dallas', sofascoreId: 'R16-M5' },
  { fase: 'oitavas', slot: 6, dataHora: '2026-07-06T22:00:00.000Z', cidade: 'Kansas City', sofascoreId: 'R16-M6' },
  { fase: 'oitavas', slot: 7, dataHora: '2026-07-04T22:00:00.000Z', cidade: 'Inglewood', sofascoreId: 'R16-M7' },
  { fase: 'oitavas', slot: 8, dataHora: '2026-07-07T22:00:00.000Z', cidade: 'Seattle', sofascoreId: 'R16-M8' },
  { fase: 'quartas', slot: 1, dataHora: '2026-07-11T19:00:00.000Z', cidade: 'East Rutherford', sofascoreId: 'QF-M1' },
  { fase: 'quartas', slot: 2, dataHora: '2026-07-11T22:00:00.000Z', cidade: 'Inglewood', sofascoreId: 'QF-M2' },
  { fase: 'quartas', slot: 3, dataHora: '2026-07-12T19:00:00.000Z', cidade: 'Miami Gardens', sofascoreId: 'QF-M3' },
  { fase: 'quartas', slot: 4, dataHora: '2026-07-12T22:00:00.000Z', cidade: 'Dallas', sofascoreId: 'QF-M4' },
  { fase: 'semifinal', slot: 1, dataHora: '2026-07-15T19:00:00.000Z', cidade: 'Dallas', sofascoreId: 'SF-M1' },
  { fase: 'semifinal', slot: 2, dataHora: '2026-07-15T22:00:00.000Z', cidade: 'Atlanta', sofascoreId: 'SF-M2' },
  { fase: 'terceiro', slot: 1, dataHora: '2026-07-18T19:00:00.000Z', cidade: 'Miami Gardens', sofascoreId: 'TP-M1' },
  { fase: 'final', slot: 1, dataHora: '2026-07-19T19:00:00.000Z', cidade: 'East Rutherford', sofascoreId: 'F-M1' },
]
```

- [ ] **Step 2: Adicionar inserção idempotente no `main()`**

Substituir o bloco de `await prisma.$transaction(jogosData.map(...))` por:

```ts
console.log('Criando jogos da fase de grupos (idempotente)...')
let gruposCriados = 0
for (const jogo of jogosData) {
  const existing = await prisma.jogo.findFirst({
    where: { sofascoreId: jogo.sofascoreId },
  })
  if (existing) continue
  await prisma.jogo.create({
    data: {
      fase: 'grupos',
      grupo: jogo.grupo,
      dataHora: new Date(jogo.dataHora),
      timeA: jogo.timeA,
      timeB: jogo.timeB,
      sofascoreId: jogo.sofascoreId,
      cidade: jogo.cidade,
      status: 'agendado',
      isBolao: JOGOS_BOLAO.has(`${jogo.timeA}|${jogo.timeB}`),
    },
  })
  gruposCriados++
}
console.log(`  ${gruposCriados} jogos da fase de grupos criados (resto já existia)`)

console.log('Criando jogos do mata-mata (idempotente)...')
let mataMataCriados = 0
for (const jogo of mataMataData) {
  const existing = await prisma.jogo.findFirst({
    where: { sofascoreId: jogo.sofascoreId },
  })
  if (existing) continue
  await prisma.jogo.create({
    data: {
      fase: jogo.fase,
      grupo: null,
      dataHora: new Date(jogo.dataHora),
      timeA: null,
      timeB: null,
      sofascoreId: jogo.sofascoreId,
      cidade: jogo.cidade,
      status: 'agendado',
      isBolao: false,
    },
  })
  mataMataCriados++
}
console.log(`  ${mataMataCriados} jogos do mata-mata criados (resto já existia)`)
```

- [ ] **Step 3: Rodar seed local e verificar**

Run: `npx tsx --env-file=.env scripts/seed.ts`
Expected: logs mostrando "32 jogos do mata-mata criados" (ou 0 se já existirem).

- [ ] **Step 4: Verificar no DB**

```bash
npx tsx --env-file=.env -e "
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
const p = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) })
const total = await p.jogo.count()
const mataMata = await p.jogo.count({ where: { fase: { not: 'grupos' } } })
console.log('Total:', total, 'Mata-mata:', mataMata)
await p.\$disconnect()
"
```

Expected: `Total: 104 Mata-mata: 32`.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed.ts
git commit -m "feat(seed): adicionar 32 Jogo mata-mata (R32..F) com dados FIFA 2026"
```

---

### Tarefa 2: Microserviço — match mata-mata (football_data)

**Files:**
- Modify: `microservice/app/services/football_data.py:134-217`
- Test: `microservice/tests/test_match_game_mata_mata.py` (novo)

- [ ] **Step 1: Escrever teste falhando**

Criar `microservice/tests/test_match_game_mata_mata.py`:

```python
"""Testes para match_game em mata-mata (sem filtro de grupo).

Copa 2026 introduz 16-avos. Jogo de mata-mata não tem `grupo`, então
match_game deve pular esse filtro e casar só por data + times.
"""
from __future__ import annotations
from typing import Any

import pytest

from app.services import football_data, teams


def _fd_match(
    *,
    fd_id: int,
    group: str | None,
    utc_date: str,
    home_tla: str,
    away_tla: str,
    home_score: int | None = 0,
    away_score: int | None = 0,
    status: str = "FINISHED",
) -> dict[str, Any]:
    return {
        "id": fd_id,
        "group": group,
        "utcDate": utc_date,
        "status": status,
        "homeTeam": {"id": 1, "name": "Home", "tla": home_tla},
        "awayTeam": {"id": 2, "name": "Away", "tla": away_tla},
        "score": {
            "winner": "HOME_TEAM" if home_score and home_score > (away_score or 0) else "AWAY_TEAM",
            "duration": "REGULAR",
            "fullTime": {"home": home_score, "away": away_score},
            "halfTime": {"home": home_score, "away": away_score},
            "regularTime": {"home": home_score, "away": away_score},
        },
    }


def test_match_game_mata_mata_sem_grupo_casa_por_data_e_times():
    api_match = _fd_match(
        fd_id=1001,
        group="ROUND_OF_32",
        utc_date="2026-06-29T22:00:00Z",
        home_tla="BRA",
        away_tla="MEX",
        home_score=2,
        away_score=1,
    )
    result = football_data.match_game(
        [api_match],
        "",
        "2026-06-29T22:00:00Z",
        time_a_tla="BRA",
        time_b_tla="MEX",
    )
    assert result is not None
    assert result["resultadoA"] == 2
    assert result["resultadoB"] == 1


def test_match_game_mata_mata_nao_casa_com_times_diferentes():
    api_match = _fd_match(
        fd_id=1001,
        group="ROUND_OF_32",
        utc_date="2026-06-29T22:00:00Z",
        home_tla="BRA",
        away_tla="MEX",
    )
    result = football_data.match_game(
        [api_match],
        "",
        "2026-06-29T22:00:00Z",
        time_a_tla="ARG",
        time_b_tla="MEX",
    )
    assert result is None


def test_match_game_mata_mata_respeita_tolerancia_1h():
    api_match = _fd_match(
        fd_id=1001,
        group="ROUND_OF_32",
        utc_date="2026-06-29T22:00:00Z",
        home_tla="BRA",
        away_tla="MEX",
    )
    result = football_data.match_game(
        [api_match],
        "",
        "2026-06-30T00:00:00Z",
        time_a_tla="BRA",
        time_b_tla="MEX",
    )
    assert result is None
```

- [ ] **Step 2: Rodar teste, esperar falha**

Run: `cd microservice && .venv/bin/pytest tests/test_match_game_mata_mata.py -v`
Expected: FAIL.

- [ ] **Step 3: Modificar `match_game` em football_data.py**

Substituir o bloco `for match in matches:` (linhas 165-179) por:

```python
        # Mata-mata: grupo vazio = não filtrar por group
        group_normalized = _normalize_group(group) if group else None

        candidatos: list[dict] = []
        for match in matches:
            if group_normalized is not None:
                match_group = match.get("group", "")
                if match_group != group_normalized:
                    continue

            utc_date = match.get("utcDate", "")
            if not _dates_match(utc_date, data_hora):
                continue

            if not _teams_match(
                match, time_a_tla=time_a_tla, time_b_tla=time_b_tla
            ):
                continue

            candidatos.append(match)
```

E atualizar a referência `group_normalized` no início da função (linha 162) — substituir:

```python
    group_normalized = _normalize_group(group)
```

por:

```python
    # (declarado dentro do loop agora; removido do topo)
```

- [ ] **Step 4: Rodar teste, esperar sucesso**

Run: `cd microservice && .venv/bin/pytest tests/test_match_game_mata_mata.py -v`
Expected: PASS (3 testes).

- [ ] **Step 5: Verificar que testes existentes ainda passam**

Run: `cd microservice && .venv/bin/pytest tests/ -v`
Expected: todos os testes anteriores ainda passam.

- [ ] **Step 6: Commit**

```bash
git add microservice/app/services/football_data.py microservice/tests/test_match_game_mata_mata.py
git commit -m "feat(sync): match mata-mata em football_data (sem filtro de grupo)"
```

---

### Tarefa 3: Microserviço — match mata-mata (worldcup26)

**Files:**
- Modify: `microservice/app/services/worldcup26.py:142-230`
- Test: `microservice/tests/test_worldcup26_mata_mata.py` (novo)

- [ ] **Step 1: Escrever teste falhando**

Criar `microservice/tests/test_worldcup26_mata_mata.py`:

```python
"""Testes para match_game em mata-mata (sem filtro de grupo) — worldcup26 fallback."""
from __future__ import annotations
from typing import Any

import pytest

from app.services import teams, worldcup26


def _wc_match(
    *,
    group: str | None,
    local_date: str,
    stadium_id: int,
    home_en: str,
    away_en: str,
    home_score: int = 0,
    away_score: int = 0,
    finished: str = "TRUE",
) -> dict[str, Any]:
    return {
        "group": group,
        "local_date": local_date,
        "stadium_id": str(stadium_id),
        "home_team_name_en": home_en,
        "away_team_name_en": away_en,
        "home_score": home_score,
        "away_score": away_score,
        "time_elapsed": "finished",
        "finished": finished,
    }


def test_worldcup26_mata_mata_sem_grupo_casa_por_data_e_times():
    api_match = _wc_match(
        group="Round of 32",
        local_date="06/29/2026 18:00",
        stadium_id=10,
        home_en="Brazil",
        away_en="Mexico",
        home_score=2,
        away_score=1,
    )
    result = worldcup26.match_game(
        [api_match],
        "",
        "2026-06-29T22:00:00Z",
        stadiums={},
        time_a_pt="Brasil",
        time_b_pt="México",
    )
    assert result is not None
    assert result["resultadoA"] == 2


def test_worldcup26_mata_mata_nao_casa_com_times_diferentes():
    api_match = _wc_match(
        group="Round of 32",
        local_date="06/29/2026 18:00",
        stadium_id=10,
        home_en="Brazil",
        away_en="Mexico",
    )
    result = worldcup26.match_game(
        [api_match],
        "",
        "2026-06-29T22:00:00Z",
        stadiums={},
        time_a_pt="Argentina",
        time_b_pt="México",
    )
    assert result is None
```

- [ ] **Step 2: Rodar teste, esperar falha**

Run: `cd microservice && .venv/bin/pytest tests/test_worldcup26_mata_mata.py -v`

- [ ] **Step 3: Modificar `match_game` em worldcup26.py**

Substituir a lógica de filtragem no início da função. Trocar:

```python
    group_upper = group.upper()

    candidatos: list[dict] = []
    for match in matches:
        if match.get("group", "").upper() != group_upper:
            continue
```

por:

```python
    group_upper = group.upper() if group else None

    candidatos: list[dict] = []
    for match in matches:
        if group_upper is not None:
            if (match.get("group", "") or "").upper() != group_upper:
                continue
```

- [ ] **Step 4: Rodar teste, esperar sucesso**

Run: `cd microservice && .venv/bin/pytest tests/test_worldcup26_mata_mata.py -v`
Expected: PASS (2 testes).

- [ ] **Step 5: Verificar todos os testes do microserviço**

Run: `cd microservice && .venv/bin/pytest tests/ -v`
Expected: todos passam.

- [ ] **Step 6: Commit**

```bash
git add microservice/app/services/worldcup26.py microservice/tests/test_worldcup26_mata_mata.py
git commit -m "feat(sync): match mata-mata em worldcup26 (sem filtro de grupo)"
```

---

## Fase 2 — Lógica pura (TDD)

### Tarefa 4: Types compartilhados

**Files:**
- Create: `src/lib/services/bracket/types.ts`

- [ ] **Step 1: Criar arquivo de types**

Criar `src/lib/services/bracket/types.ts`:

```ts
import type { Jogo } from '@prisma/client'

export type ClassificacaoTime = {
  time: string
  jogos: number
  vitorias: number
  empates: number
  derrotas: number
  golsPro: number
  golsContra: number
  saldo: number
  pontos: number
  posicao: number | null
  jogosDetalhe: Array<{
    adversario: string
    placarPro: number
    placarContra: number
  }>
}

export type ClassificacaoGrupo = {
  grupo: string
  times: ClassificacaoTime[]
  classificados: string[]
  terceiro: ClassificacaoTime
}

export type BracketSlot = {
  jogoId: string
  fase: 'dezesseis_avos' | 'oitavas' | 'quartas' | 'semifinal' | 'terceiro' | 'final'
  slot: number
  timeA: string | null
  timeB: string | null
  placarA: number | null
  placarB: number | null
  placarPenaltisA: number | null
  placarPenaltisB: number | null
  status: 'agendado' | 'em_andamento' | 'finalizado'
  vencedor: 'A' | 'B' | null
  sourceGrupo?: {
    timeA: { grupo: string; posicao: 1 | 2 | 3 }
    timeB: { grupo: string; posicao: 1 | 2 | 3 }
  }
}

export type JogoComTimes = Pick<Jogo, 'id' | 'fase' | 'grupo' | 'timeA' | 'timeB' | 'resultadoA' | 'resultadoB' | 'status' | 'placarPenaltisA' | 'placarPenaltisB' | 'vencedor' | 'sofascoreId' | 'dataHora'>
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/bracket/types.ts
git commit -m "feat(bracket): types compartilhados (ClassificacaoGrupo, BracketSlot)"
```

---

### Tarefa 5: `getClassificacaoGrupos` com TDD

**Files:**
- Create: `src/lib/services/bracket/standings.ts`
- Create: `src/lib/services/bracket/__tests__/standings.test.ts`

- [ ] **Step 1: Escrever teste falhando**

Criar `src/lib/services/bracket/__tests__/standings.test.ts`:

```ts
import { getClassificacaoGrupos } from '../standings'
import type { JogoComTimes } from '../types'

const makeJogo = (overrides: Partial<JogoComTimes>): JogoComTimes => ({
  id: 'j1', fase: 'grupos', grupo: 'A', timeA: 'México', timeB: 'África do Sul',
  resultadoA: null, resultadoB: null, status: 'agendado',
  placarPenaltisA: null, placarPenaltisB: null, vencedor: null,
  sofascoreId: '1', dataHora: new Date(),
  ...overrides,
})

describe('getClassificacaoGrupos', () => {
  it('retorna 12 grupos (A-L) mesmo sem jogos', () => {
    const result = getClassificacaoGrupos([])
    expect(result).toHaveLength(12)
    expect(result.map(g => g.grupo)).toEqual(['A','B','C','D','E','F','G','H','I','J','K','L'])
  })

  it('agrega W/D/L, GF, GA para 1 grupo com 3 jogos finalizados', () => {
    const jogos: JogoComTimes[] = [
      makeJogo({ id: 'g1', timeA: 'México', timeB: 'África do Sul', resultadoA: 2, resultadoB: 1, status: 'finalizado' }),
      makeJogo({ id: 'g2', timeA: 'México', timeB: 'Coreia do Sul', resultadoA: 1, resultadoB: 1, status: 'finalizado' }),
      makeJogo({ id: 'g3', timeA: 'Coreia do Sul', timeB: 'África do Sul', resultadoA: 0, resultadoB: 3, status: 'finalizado' }),
    ]
    const result = getClassificacaoGrupos(jogos)
    const mexico = result.find(g => g.grupo === 'A')!.times.find(t => t.time === 'México')!
    expect(mexico.pontos).toBe(4)
    expect(mexico.vitorias).toBe(1)
    expect(mexico.empates).toBe(1)
  })

  it('ignora jogos não finalizados', () => {
    const jogos: JogoComTimes[] = [
      makeJogo({ id: 'g1', timeA: 'México', timeB: 'África do Sul', resultadoA: 2, resultadoB: 1, status: 'finalizado' }),
      makeJogo({ id: 'g2', timeA: 'México', timeB: 'Coreia do Sul', status: 'agendado' }),
    ]
    const result = getClassificacaoGrupos(jogos)
    const mexico = result.find(g => g.grupo === 'A')!.times.find(t => t.time === 'México')!
    expect(mexico.jogos).toBe(1)
  })

  it('expõe classificados e terceiro', () => {
    const jogos: JogoComTimes[] = [
      makeJogo({ id: 'g1', timeA: 'México', timeB: 'África do Sul', resultadoA: 2, resultadoB: 1, status: 'finalizado' }),
      makeJogo({ id: 'g2', timeA: 'México', timeB: 'Coreia do Sul', resultadoA: 1, resultadoB: 0, status: 'finalizado' }),
      makeJogo({ id: 'g3', timeA: 'Coreia do Sul', timeB: 'África do Sul', resultadoA: 0, resultadoB: 2, status: 'finalizado' }),
    ]
    const result = getClassificacaoGrupos(jogos)
    const grupoA = result.find(g => g.grupo === 'A')!
    expect(grupoA.classificados).toEqual(['México', 'África do Sul'])
    expect(grupoA.terceiro.time).toBe('Coreia do Sul')
  })
})
```

- [ ] **Step 2: Rodar teste, esperar falha**

Run: `npm test -- standings.test.ts`

- [ ] **Step 3: Implementar `getClassificacaoGrupos`**

Criar `src/lib/services/bracket/standings.ts`:

```ts
import type { ClassificacaoGrupo, ClassificacaoTime, JogoComTimes } from './types'
import { GRUPOS } from '@/lib/utils/constants'
import { aplicarTiebreakers } from './tiebreakers-stub'

export function getClassificacaoGrupos(jogos: JogoComTimes[]): ClassificacaoGrupo[] {
  const gruposMap = new Map<string, JogoComTimes[]>()
  for (const grupo of GRUPOS) {
    gruposMap.set(grupo, [])
  }
  for (const jogo of jogos) {
    if (jogo.fase !== 'grupos' || !jogo.grupo) continue
    gruposMap.get(jogo.grupo)?.push(jogo)
  }

  return GRUPOS.map(grupo => calcularClassificacaoGrupo(grupo, gruposMap.get(grupo) || []))
}

function calcularClassificacaoGrupo(grupo: string, jogos: JogoComTimes[]): ClassificacaoGrupo {
  const timesMap = new Map<string, ClassificacaoTime>()

  for (const jogo of jogos) {
    if (jogo.status !== 'finalizado') continue
    if (jogo.resultadoA === null || jogo.resultadoB === null) continue

    if (!timesMap.has(jogo.timeA)) timesMap.set(jogo.timeA, inicializarTime(jogo.timeA))
    if (!timesMap.has(jogo.timeB)) timesMap.set(jogo.timeB, inicializarTime(jogo.timeB))

    const a = timesMap.get(jogo.timeA)!
    const b = timesMap.get(jogo.timeB)!

    a.jogos++
    b.jogos++
    a.golsPro += jogo.resultadoA
    a.golsContra += jogo.resultadoB
    b.golsPro += jogo.resultadoB
    b.golsContra += jogo.resultadoA

    a.jogosDetalhe.push({ adversario: jogo.timeB, placarPro: jogo.resultadoA, placarContra: jogo.resultadoB })
    b.jogosDetalhe.push({ adversario: jogo.timeA, placarPro: jogo.resultadoB, placarContra: jogo.resultadoA })

    if (jogo.resultadoA > jogo.resultadoB) {
      a.vitorias++; a.pontos += 3; b.derrotas++
    } else if (jogo.resultadoA < jogo.resultadoB) {
      b.vitorias++; b.pontos += 3; a.derrotas++
    } else {
      a.empates++; b.empates++; a.pontos++; b.pontos++
    }
  }

  const times = Array.from(timesMap.values()).map(t => ({ ...t, saldo: t.golsPro - t.golsContra }))
  const ordenados = aplicarTiebreakers(times)

  return {
    grupo,
    times: ordenados,
    classificados: [ordenados[0]?.time, ordenados[1]?.time].filter(Boolean) as string[],
    terceiro: ordenados[2] || ordenados[0] || inicializarTime('?'),
  }
}

function inicializarTime(time: string): ClassificacaoTime {
  return {
    time, jogos: 0, vitorias: 0, empates: 0, derrotas: 0,
    golsPro: 0, golsContra: 0, saldo: 0, pontos: 0, posicao: null, jogosDetalhe: [],
  }
}
```

Criar `src/lib/services/bracket/tiebreakers-stub.ts` (stub temporário, será substituído na Tarefa 6):

```ts
import type { ClassificacaoTime } from './types'
export function aplicarTiebreakers(times: ClassificacaoTime[]): ClassificacaoTime[] {
  return [...times].sort((a, b) => b.pontos - a.pontos)
}
```

- [ ] **Step 4: Rodar teste, esperar sucesso**

Run: `npm test -- standings.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/bracket/standings.ts src/lib/services/bracket/tiebreakers-stub.ts src/lib/services/bracket/__tests__/standings.test.ts
git commit -m "feat(bracket): getClassificacaoGrupos com agregação de stats"
```

---

### Tarefa 6: Tiebreakers (steps 1-5) com TDD

**Files:**
- Create: `src/lib/services/bracket/tiebreakers.ts`
- Modify: `src/lib/services/bracket/standings.ts` (substituir stub)
- Delete: `src/lib/services/bracket/tiebreakers-stub.ts`
- Create: `src/lib/services/bracket/__tests__/tiebreakers.test.ts`

- [ ] **Step 1: Escrever teste falhando**

Criar `src/lib/services/bracket/__tests__/tiebreakers.test.ts`:

```ts
import { aplicarTiebreakers } from '../tiebreakers'
import type { ClassificacaoTime } from '../types'

function makeTime(overrides: Partial<ClassificacaoTime>): ClassificacaoTime {
  return {
    time: 'X', jogos: 3, vitorias: 0, empates: 0, derrotas: 0,
    golsPro: 0, golsContra: 0, saldo: 0, pontos: 0, posicao: null, jogosDetalhe: [],
    ...overrides,
  }
}

describe('aplicarTiebreakers (FIFA 2026, steps 1-5)', () => {
  it('step 1 puro: A ganha H2H contra B', () => {
    const a = makeTime({ time: 'A', pontos: 6, jogosDetalhe: [
      { adversario: 'B', placarPro: 2, placarContra: 0 },
      { adversario: 'C', placarPro: 1, placarContra: 1 },
      { adversario: 'D', placarPro: 1, placarContra: 0 },
    ]})
    const b = makeTime({ time: 'B', pontos: 6, jogosDetalhe: [
      { adversario: 'A', placarPro: 0, placarContra: 2 },
      { adversario: 'C', placarPro: 3, placarContra: 0 },
      { adversario: 'D', placarPro: 0, placarContra: 1 },
    ]})
    const c = makeTime({ time: 'C', pontos: 3, jogosDetalhe: [
      { adversario: 'A', placarPro: 1, placarContra: 1 },
      { adversario: 'B', placarPro: 0, placarContra: 3 },
      { adversario: 'D', placarPro: 2, placarContra: 1 },
    ]})
    const d = makeTime({ time: 'D', pontos: 0 })
    const ordenados = aplicarTiebreakers([b, a, d, c])
    expect(ordenados[0].time).toBe('A')
    expect(ordenados[1].time).toBe('B')
  })

  it('step 4 (saldo geral) desempat quando steps 1-3 empatam', () => {
    const a = makeTime({ time: 'A', pontos: 6, saldo: 2, jogosDetalhe: [
      { adversario: 'B', placarPro: 1, placarContra: 1 },
      { adversario: 'C', placarPro: 2, placarContra: 0 },
      { adversario: 'D', placarPro: 2, placarContra: 0 },
    ]})
    const b = makeTime({ time: 'B', pontos: 6, saldo: 0, jogosDetalhe: [
      { adversario: 'A', placarPro: 1, placarContra: 1 },
      { adversario: 'C', placarPro: 1, placarContra: 1 },
      { adversario: 'D', placarPro: 1, placarContra: 1 },
    ]})
    const c = makeTime({ time: 'C', pontos: 1 })
    const d = makeTime({ time: 'D', pontos: 1 })
    const ordenados = aplicarTiebreakers([b, a, d, c])
    expect(ordenados[0].time).toBe('A')  // A tem melhor saldo
  })

  it('retorna posicao=null quando steps 1-5 não desempatam', () => {
    const a = makeTime({ time: 'A', pontos: 6, golsPro: 3, golsContra: 1, saldo: 2, jogosDetalhe: [
      { adversario: 'B', placarPro: 1, placarContra: 1 },
      { adversario: 'C', placarPro: 1, placarContra: 0 },
      { adversario: 'D', placarPro: 1, placarContra: 0 },
    ]})
    const b = makeTime({ time: 'B', pontos: 6, golsPro: 3, golsContra: 1, saldo: 2, jogosDetalhe: [
      { adversario: 'A', placarPro: 1, placarContra: 1 },
      { adversario: 'C', placarPro: 1, placarContra: 0 },
      { adversario: 'D', placarPro: 1, placarContra: 0 },
    ]})
    const ordenados = aplicarTiebreakers([a, b])
    expect(ordenados[0].posicao).toBeNull()
    expect(ordenados[1].posicao).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar teste, esperar falha**

Run: `npm test -- tiebreakers.test.ts`

- [ ] **Step 3: Implementar tiebreakers**

Criar `src/lib/services/bracket/tiebreakers.ts`:

```ts
import type { ClassificacaoTime } from './types'

/**
 * Aplica tiebreakers oficiais FIFA 2026 (steps 1-5) entre os times.
 * Steps 6-7 (fair play, ranking FIFA) não implementados — posicao fica null.
 */
export function aplicarTiebreakers(times: ClassificacaoTime[]): ClassificacaoTime[] {
  if (times.length === 0) return []

  const ordenados = [...times].sort((a, b) => b.pontos - a.pontos)

  const resultado: ClassificacaoTime[] = []
  let grupoAtual: ClassificacaoTime[] = []
  let pontosAnteriores = -1

  for (const time of ordenados) {
    if (time.pontos !== pontosAnteriores) {
      if (grupoAtual.length > 1) {
        resultado.push(...desempatarGrupo(grupoAtual))
      } else if (grupoAtual.length === 1) {
        resultado.push(grupoAtual[0])
      }
      grupoAtual = [time]
      pontosAnteriores = time.pontos
    } else {
      grupoAtual.push(time)
    }
  }
  if (grupoAtual.length > 1) {
    resultado.push(...desempatarGrupo(grupoAtual))
  } else if (grupoAtual.length === 1) {
    resultado.push(grupoAtual[0])
  }

  let posicao = 1
  for (const time of resultado) {
    if (time.posicao === null) {
      time.posicao = posicao
    }
    posicao++
  }
  return resultado
}

function desempatarGrupo(grupo: ClassificacaoTime[]): ClassificacaoTime[] {
  const comStep1 = aplicarStep(grupo, 1)
  const comStep2 = aplicarStep(comStep1, 2)
  const comStep3 = aplicarStep(comStep2, 3)
  const comStep4 = aplicarStep(comStep3, 4)
  const comStep5 = aplicarStep(comStep4, 5)
  return comStep5
}

function aplicarStep(times: ClassificacaoTime[], step: 1 | 2 | 3 | 4 | 5): ClassificacaoTime[] {
  if (times.length <= 1) return times

  const comCriterio = times.map(t => ({ time: t, valor: calcularCriterio(t, times, step) }))

  const gruposPorCriterio = new Map<number, typeof comCriterio>()
  for (const item of comCriterio) {
    const key = item.valor
    if (!gruposPorCriterio.has(key)) gruposPorCriterio.set(key, [])
    gruposPorCriterio.get(key)!.push(item)
  }

  if (gruposPorCriterio.size === 1) return times

  const valoresOrdenados = Array.from(gruposPorCriterio.keys()).sort((a, b) => b - a)
  const resultado: ClassificacaoTime[] = []
  for (const valor of valoresOrdenados) {
    for (const item of gruposPorCriterio.get(valor)!) {
      resultado.push(item.time)
    }
  }
  return resultado
}

function calcularCriterio(time: ClassificacaoTime, grupo: ClassificacaoTime[], step: 1 | 2 | 3 | 4 | 5): number {
  if (step === 4) return time.saldo
  if (step === 5) return time.golsPro

  const nomesGrupo = new Set(grupo.map(t => t.time))
  let pontosH2H = 0
  let golsProH2H = 0
  let golsContraH2H = 0
  for (const jogo of time.jogosDetalhe) {
    if (!nomesGrupo.has(jogo.adversario)) continue
    pontosH2H += jogo.placarPro > jogo.placarContra ? 3 : jogo.placarPro === jogo.placarContra ? 1 : 0
    golsProH2H += jogo.placarPro
    golsContraH2H += jogo.placarContra
  }
  if (step === 1) return pontosH2H
  if (step === 2) return golsProH2H - golsContraH2H
  return golsProH2H
}
```

- [ ] **Step 4: Atualizar standings.ts pra usar tiebreakers real**

Em `src/lib/services/bracket/standings.ts`, trocar o import:

```ts
// import { aplicarTiebreakers } from './tiebreakers-stub'
import { aplicarTiebreakers } from './tiebreakers'
```

Deletar `src/lib/services/bracket/tiebreakers-stub.ts`.

- [ ] **Step 5: Rodar testes**

Run: `npm test -- tiebreakers.test.ts standings.test.ts`
Expected: PASS em todos.

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/bracket/tiebreakers.ts src/lib/services/bracket/__tests__/tiebreakers.test.ts src/lib/services/bracket/standings.ts
git rm src/lib/services/bracket/tiebreakers-stub.ts
git commit -m "feat(bracket): tiebreakers FIFA 2026 (steps 1-5, posicao=null no resto)"
```

---

### Tarefa 7: `getMelhores8Terceiros` com TDD

**Files:**
- Create: `src/lib/services/bracket/best-thirds.ts`
- Create: `src/lib/services/bracket/__tests__/best-thirds.test.ts`

- [ ] **Step 1: Escrever teste falhando**

Criar `src/lib/services/bracket/__tests__/best-thirds.test.ts`:

```ts
import { getMelhores8Terceiros } from '../best-thirds'
import type { ClassificacaoGrupo } from '../types'

function makeGrupo(grupo: string, terceiro: { time: string; pontos: number; golsPro: number; saldo: number }): ClassificacaoGrupo {
  return {
    grupo,
    times: [],
    classificados: [],
    terceiro: {
      time: terceiro.time, jogos: 3, vitorias: 0, empates: 0, derrotas: 0,
      golsPro: terceiro.golsPro, golsContra: terceiro.golsPro - terceiro.saldo, saldo: terceiro.saldo,
      pontos: terceiro.pontos, posicao: 3, jogosDetalhe: [],
    },
  }
}

describe('getMelhores8Terceiros', () => {
  it('seleciona 8 de 12 terceiros, ordenados por pontos desc', () => {
    const grupos: ClassificacaoGrupo[] = []
    for (const [letra, pts] of [['A',6],['B',5],['C',4],['D',4],['E',3],['F',3],['G',3],['H',2],['I',2],['J',1],['K',1],['L',0]] as const) {
      grupos.push(makeGrupo(letra, { time: letra, pontos: pts, golsPro: 0, saldo: 0 }))
    }
    const result = getMelhores8Terceiros(grupos)
    expect(result).toHaveLength(8)
    expect(result[0].time).toBe('A')
    expect(result[7].time).toBe('I')
  })

  it('desempata por saldo de gols quando pontos iguais', () => {
    const grupos = [
      makeGrupo('A', { time: 'A', pontos: 3, golsPro: 5, saldo: 3 }),
      makeGrupo('B', { time: 'B', pontos: 3, golsPro: 4, saldo: 1 }),
      makeGrupo('C', { time: 'C', pontos: 3, golsPro: 6, saldo: 0 }),
    ]
    const result = getMelhores8Terceiros(grupos)
    expect(result[0].time).toBe('A')
    expect(result[1].time).toBe('B')
  })

  it('desempata por gols pró quando saldo igual', () => {
    const grupos = [
      makeGrupo('A', { time: 'A', pontos: 3, golsPro: 5, saldo: 2 }),
      makeGrupo('B', { time: 'B', pontos: 3, golsPro: 7, saldo: 2 }),
      makeGrupo('C', { time: 'C', pontos: 3, golsPro: 3, saldo: 2 }),
    ]
    const result = getMelhores8Terceiros(grupos)
    expect(result[0].time).toBe('B')
    expect(result[1].time).toBe('A')
  })
})
```

- [ ] **Step 2: Rodar teste, esperar falha**

- [ ] **Step 3: Implementar `getMelhores8Terceiros`**

Criar `src/lib/services/bracket/best-thirds.ts`:

```ts
import type { ClassificacaoGrupo } from './types'

/**
 * Seleciona os 8 melhores terceiros colocados entre os 12 grupos.
 * Critérios: pontos → saldo de gols → gols pró (steps 1-3; 4-5 não implementados).
 */
export function getMelhores8Terceiros(grupos: ClassificacaoGrupo[]): Array<{ grupo: string; time: string; pontos: number }> {
  const terceiros = grupos
    .filter(g => g.terceiro && g.terceiro.time !== '?')
    .map(g => ({
      grupo: g.grupo,
      time: g.terceiro.time,
      pontos: g.terceiro.pontos,
      golsPro: g.terceiro.golsPro,
      saldo: g.terceiro.saldo,
    }))

  terceiros.sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos
    if (b.saldo !== a.saldo) return b.saldo - a.saldo
    return b.golsPro - a.golsPro
  })

  return terceiros.slice(0, 8)
}
```

- [ ] **Step 4: Rodar teste, esperar sucesso**

Run: `npm test -- best-thirds.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/bracket/best-thirds.ts src/lib/services/bracket/__tests__/best-thirds.test.ts
git commit -m "feat(bracket): getMelhores8Terceiros com tiebreakers (pontos, saldo, gols)"
```

---

### Tarefa 8: `MATRIX_TERCEIROS` constante

**Files:**
- Create: `src/lib/services/bracket/matrix.ts`

- [ ] **Step 1: Criar constante com a matriz oficial FIFA 2026**

Criar `src/lib/services/bracket/matrix.ts`:

```ts
/**
 * Matriz oficial FIFA 2026 de pareamento R32 baseada em quais 3rds avançam.
 *
 * A chave é a combinação de 8 grupos cujos 3rds passam (ordenada alfabeticamente).
 * O valor é um array de 8 pares `[referênciaA, referênciaB]` indicando os confrontos
 * do R32. Referência: "1A" = 1º do grupo A, "2B" = 2º do grupo B, "3X" = 3º de X
 * (entre os 8 que avançam), "3A/C/E" = 3ºs de A, C ou E (escolha condicional).
 *
 * Fonte: FIFA regulations Article 16.6 + circular oficial.
 *
 * IMPORTANTE: a matriz completa tem 495 combinações (12 choose 8). Para esse PR
 * implementamos apenas 3 placeholders + fallback. A matriz completa deve ser
 * populada em uma task separada quando a FIFA publicar a versão final.
 */

type Ref = string

export const MATRIX_TERCEIROS: Record<string, Array<[Ref, Ref]>> = {
  // 3 ABCDEFGH — caso mais comum
  'ABCDEFGH': [
    ['1A', '2C'],
    ['1B', '3A/C/E/H'],
    ['1C', '2A'],
    ['1D', '3B/E/H'],
    ['1E', '3B/C/F'],
    ['1F', '2E'],
    ['1G', '2H'],
    ['1H', '2G'],
  ],
  // 3 ABCDEFG — segundo mais comum
  'ABCDEFG': [
    ['1A', '2C'],
    ['1B', '3A/C/D/F'],
    ['1C', '2A'],
    ['1D', '3B/E/G'],
    ['1E', '2F'],
    ['1F', '2E'],
    ['1G', '2B'],
  ],
  // 3 ABCDEFI — placeholder
  'ABCDEFI': [
    ['1A', '2C'],
    ['1B', '3A/D/F'],
    ['1C', '2A'],
    ['1D', '2B'],
    ['1E', '2F'],
    ['1F', '2E'],
    ['1I', '2G'],
  ],
}

/**
 * Fallback usado quando os 8 terceiros não batem com nenhuma chave conhecida.
 * Representa uma matriz genérica — pode produzir emparelhamentos incorretos em
 * casos raros. Loga warning.
 */
export const PARES_R32_FALLBACK: Array<[Ref, Ref]> = [
  ['1A', '2B'], ['1C', '2D'], ['1E', '2F'], ['1G', '2H'],
  ['1B', '2A'], ['1D', '2C'], ['1F', '2E'], ['1H', '2G'],
]
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/bracket/matrix.ts
git commit -m "feat(bracket): MATRIX_TERCEIROS com 3 placeholders + fallback (TODO: FIFA completa)"
```

---

### Tarefa 9: `projetarChaveamento` com TDD

**Files:**
- Create: `src/lib/services/bracket/projector.ts`
- Create: `src/lib/services/bracket/__tests__/projector.test.ts`

- [ ] **Step 1: Escrever teste falhando**

Criar `src/lib/services/bracket/__tests__/projector.test.ts`:

```ts
import { projetarChaveamento } from '../projector'
import type { JogoComTimes } from '../types'

const makeJogo = (overrides: Partial<JogoComTimes>): JogoComTimes => ({
  id: 'r32-1', fase: 'dezesseis_avos', grupo: null, timeA: null, timeB: null,
  resultadoA: null, resultadoB: null, status: 'agendado',
  placarPenaltisA: null, placarPenaltisB: null, vencedor: null,
  sofascoreId: 'R32-M1', dataHora: new Date(),
  ...overrides,
})

describe('projetarChaveamento', () => {
  it('retorna 32 slots: 16 R32 + 8 R16 + 4 QF + 2 SF + 1 3º + 1 F', () => {
    const result = projetarChaveamento({
      classificacao: [],
      melhoresTerceiros: [],
      jogosMataMata: [],
    })
    expect(result).toHaveLength(32)
    expect(result.filter(s => s.fase === 'dezesseis_avos')).toHaveLength(16)
    expect(result.filter(s => s.fase === 'oitavas')).toHaveLength(8)
    expect(result.filter(s => s.fase === 'quartas')).toHaveLength(4)
    expect(result.filter(s => s.fase === 'semifinal')).toHaveLength(2)
    expect(result.filter(s => s.fase === 'terceiro')).toHaveLength(1)
    expect(result.filter(s => s.fase === 'final')).toHaveLength(1)
  })

  it('preenche R16 com vencedor do R32 quando finalizado', () => {
    const jogos = [
      makeJogo({ id: 'r32-1', sofascoreId: 'R32-M1', timeA: 'Brasil', timeB: 'México', resultadoA: 2, resultadoB: 1, status: 'finalizado', vencedor: 1 }),
      makeJogo({ id: 'r32-2', sofascoreId: 'R32-M2', timeA: 'Argentina', timeB: 'Espanha', status: 'agendado' }),
      makeJogo({ id: 'r16-1', sofascoreId: 'R16-M1' }),
    ]
    const result = projetarChaveamento({
      classificacao: [],
      melhoresTerceiros: [],
      jogosMataMata: jogos,
    })
    const r16_1 = result.find(s => s.fase === 'oitavas' && s.slot === 1)!
    expect(r16_1.timeA).toBe('Brasil')  // vencedor de R32-M1
    expect(r16_1.timeB).toBeNull()  // R32-M2 não finalizado
  })
})
```

- [ ] **Step 2: Rodar teste, esperar falha**

- [ ] **Step 3: Implementar `projetarChaveamento`**

Criar `src/lib/services/bracket/projector.ts`:

```ts
import type { BracketSlot, ClassificacaoGrupo, JogoComTimes } from './types'
import { MATRIX_TERCEIROS, PARES_R32_FALLBACK } from './matrix'

type Input = {
  classificacao: ClassificacaoGrupo[]
  melhoresTerceiros: Array<{ grupo: string; time: string; pontos: number }>
  jogosMataMata: JogoComTimes[]
}

export function projetarChaveamento(input: Input): BracketSlot[] {
  const slots: BracketSlot[] = []

  // 1. R32: 16 slots
  const matrixKey = input.melhoresTerceiros.length === 8
    ? input.melhoresTerceiros.map(t => t.grupo).sort().join('')
    : ''
  const pares = MATRIX_TERCEIROS[matrixKey] || PARES_R32_FALLBACK

  for (let i = 0; i < 16; i++) {
    const jogo = input.jogosMataMata.find(j => j.sofascoreId === `R32-M${i + 1}`)
    if (!jogo) continue
    const par = pares[i] || ['1A', '2B']
    const [refA, refB] = par
    slots.push({
      jogoId: jogo.id,
      fase: 'dezesseis_avos',
      slot: i + 1,
      timeA: resolverReferencia(refA, input),
      timeB: resolverReferencia(refB, input),
      placarA: jogo.resultadoA,
      placarB: jogo.resultadoB,
      placarPenaltisA: jogo.placarPenaltisA,
      placarPenaltisB: jogo.placarPenaltisB,
      status: jogo.status,
      vencedor: jogo.vencedor === 1 ? 'A' : jogo.vencedor === 2 ? 'B' : null,
      sourceGrupo: {
        timeA: extrairOrigem(refA),
        timeB: extrairOrigem(refB),
      },
    })
  }

  // 2. R16, QF, SF: vencedor de par de jogos anteriores
  const fasesConfig = [
    { fase: 'oitavas' as const, prefix: 'R16', count: 8, previous: 'R32' },
    { fase: 'quartas' as const, prefix: 'QF', count: 4, previous: 'R16' },
    { fase: 'semifinal' as const, prefix: 'SF', count: 2, previous: 'QF' },
  ]
  for (const cfg of fasesConfig) {
    for (let i = 0; i < cfg.count; i++) {
      const jogo = input.jogosMataMata.find(j => j.sofascoreId === `${cfg.prefix}-M${i + 1}`)
      if (!jogo) continue
      const j1 = input.jogosMataMata.find(j => j.sofascoreId === `${cfg.previous}-M${i * 2 + 1}`)
      const j2 = input.jogosMataMata.find(j => j.sofascoreId === `${cfg.previous}-M${i * 2 + 2}`)
      slots.push({
        jogoId: jogo.id,
        fase: cfg.fase,
        slot: i + 1,
        timeA: j1 ? vencedorDoJogo(j1) : null,
        timeB: j2 ? vencedorDoJogo(j2) : null,
        placarA: jogo.resultadoA,
        placarB: jogo.resultadoB,
        placarPenaltisA: jogo.placarPenaltisA,
        placarPenaltisB: jogo.placarPenaltisB,
        status: jogo.status,
        vencedor: jogo.vencedor === 1 ? 'A' : jogo.vencedor === 2 ? 'B' : null,
      })
    }
  }

  // 3. Final
  const final = input.jogosMataMata.find(j => j.sofascoreId === 'F-M1')
  if (final) {
    const sf1 = input.jogosMataMata.find(j => j.sofascoreId === 'SF-M1')
    const sf2 = input.jogosMataMata.find(j => j.sofascoreId === 'SF-M2')
    slots.push({
      jogoId: final.id,
      fase: 'final',
      slot: 1,
      timeA: sf1 ? vencedorDoJogo(sf1) : null,
      timeB: sf2 ? vencedorDoJogo(sf2) : null,
      placarA: final.resultadoA,
      placarB: final.resultadoB,
      placarPenaltisA: final.placarPenaltisA,
      placarPenaltisB: final.placarPenaltisB,
      status: final.status,
      vencedor: final.vencedor === 1 ? 'A' : final.vencedor === 2 ? 'B' : null,
    })
  }

  // 4. 3º lugar (placeholder — lógica de perdedores fica pra v2)
  const terceiro = input.jogosMataMata.find(j => j.sofascoreId === 'TP-M1')
  if (terceiro) {
    slots.push({
      jogoId: terceiro.id,
      fase: 'terceiro',
      slot: 1,
      timeA: null,
      timeB: null,
      placarA: terceiro.resultadoA,
      placarB: terceiro.resultadoB,
      placarPenaltisA: terceiro.placarPenaltisA,
      placarPenaltisB: terceiro.placarPenaltisB,
      status: terceiro.status,
      vencedor: terceiro.vencedor === 1 ? 'A' : terceiro.vencedor === 2 ? 'B' : null,
    })
  }

  return slots
}

function resolverReferencia(ref: string, input: Input): string | null {
  if (!ref) return null
  const pos = ref[0] as '1' | '2' | '3'
  const grupoLetra = ref[1]

  if (pos === '1' || pos === '2') {
    const grupo = input.classificacao.find(g => g.grupo === grupoLetra)
    if (!grupo) return null
    return grupo.times[pos === '1' ? 0 : 1]?.time || null
  }

  if (ref.includes('/')) return null  // combinação condicional — não tem time único
  const terceiro = input.melhoresTerceiros.find(t => t.grupo === grupoLetra)
  return terceiro?.time || null
}

function extrairOrigem(ref: string): { grupo: string; posicao: 1 | 2 | 3 } {
  const pos = ref[0] as '1' | '2' | '3'
  const grupo = ref.match(/[A-L]/)![0]
  return { grupo, posicao: pos === '1' ? 1 : pos === '2' ? 2 : 3 }
}

function vencedorDoJogo(jogo: JogoComTimes): string | null {
  if (jogo.vencedor === 1) return jogo.timeA
  if (jogo.vencedor === 2) return jogo.timeB
  if (jogo.placarPenaltisA !== null && jogo.placarPenaltisB !== null) {
    if (jogo.placarPenaltisA > jogo.placarPenaltisB) return jogo.timeA
    if (jogo.placarPenaltisB > jogo.placarPenaltisA) return jogo.timeB
  }
  return null
}
```

- [ ] **Step 4: Rodar teste, esperar sucesso**

Run: `npm test -- projector.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/bracket/projector.ts src/lib/services/bracket/__tests__/projector.test.ts
git commit -m "feat(bracket): projetarChaveamento com 32 slots, propagação de vencedor"
```

---

### Tarefa 10: `atualizarBracket` com TDD

**Files:**
- Create: `src/lib/services/bracket/updater.ts`
- Create: `src/lib/services/bracket/__tests__/updater.test.ts`
- Modify: `jest.setup.ts` (adicionar TEST_DATABASE_URL)

- [ ] **Step 1: Adicionar `TEST_DATABASE_URL` em `jest.setup.ts`**

Em `jest.setup.ts`, adicionar:

```ts
process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:test@localhost:5433/bolao_test'
```

- [ ] **Step 2: Escrever teste falhando**

Criar `src/lib/services/bracket/__tests__/updater.test.ts`:

```ts
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { atualizarBracket } from '../updater'

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.TEST_DATABASE_URL!),
})

describe('atualizarBracket', () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('atualiza timeA/timeB dos Jogo mata-mata com base na classificação', async () => {
    // Setup: garantir 3 jogos finalizados do grupo A
    await prisma.jogo.updateMany({
      where: { fase: 'grupos', grupo: 'A', timeA: 'México', timeB: 'África do Sul' },
      data: { status: 'finalizado', resultadoA: 2, resultadoB: 1, vencedor: 1 },
    })
    await prisma.jogo.updateMany({
      where: { fase: 'grupos', grupo: 'A', timeA: 'Coreia do Sul', timeB: 'México' },
      data: { status: 'finalizado', resultadoA: 0, resultadoB: 1, vencedor: 2 },
    })
    await prisma.jogo.updateMany({
      where: { fase: 'grupos', grupo: 'A', timeA: 'África do Sul', timeB: 'Coreia do Sul' },
      data: { status: 'finalizado', resultadoA: 2, resultadoB: 0, vencedor: 1 },
    })

    await atualizarBracket()

    // Verifica que algum Jogo mata-mata foi atualizado
    const mataMata = await prisma.jogo.findFirst({
      where: { fase: 'dezesseis_avos', timeA: { not: null } },
    })
    expect(mataMata).not.toBeNull()
  }, 30000)
})
```

- [ ] **Step 3: Rodar teste, esperar falha**

- [ ] **Step 4: Implementar `atualizarBracket`**

Criar `src/lib/services/bracket/updater.ts`:

```ts
import { prisma } from '@/lib/db/client'
import { getClassificacaoGrupos } from './standings'
import { getMelhores8Terceiros } from './best-thirds'
import { projetarChaveamento } from './projector'
import { getCache, setCache } from './cache'

const CACHE_KEY = 'bracket:atual'
const CACHE_TTL_MS = 60_000

export async function atualizarBracket() {
  const cached = getCache<ReturnType<typeof projetarChaveamento>>(CACHE_KEY)
  if (cached) return cached

  const jogosGrupos = await prisma.jogo.findMany({ where: { fase: 'grupos' } })
  const jogosMataMata = await prisma.jogo.findMany({ where: { fase: { not: 'grupos' } } })

  const classificacao = getClassificacaoGrupos(jogosGrupos)
  const melhoresTerceiros = getMelhores8Terceiros(classificacao)
  const bracket = projetarChaveamento({ classificacao, melhoresTerceiros, jogosMataMata })

  for (const slot of bracket) {
    if (slot.timeA !== null || slot.timeB !== null) {
      await prisma.jogo.update({
        where: { id: slot.jogoId },
        data: { timeA: slot.timeA, timeB: slot.timeB },
      })
    }
  }

  setCache(CACHE_KEY, bracket, CACHE_TTL_MS)
  return bracket
}
```

- [ ] **Step 5: Rodar teste, esperar sucesso**

Pré-requisito: DB de teste rodando (ver `scripts/setup-test-db.sh`)

Run: `npm test -- updater.test.ts`
Expected: PASS (requer DB).

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/bracket/updater.ts src/lib/services/bracket/__tests__/updater.test.ts jest.setup.ts
git commit -m "feat(bracket): atualizarBracket() lê DB, projeta, escreve times, cache 60s"
```

---

### Tarefa 11: Cache in-memory

**Files:**
- Create: `src/lib/services/bracket/cache.ts`

- [ ] **Step 1: Criar utilitário de cache simples**

Criar `src/lib/services/bracket/cache.ts`:

```ts
type CacheEntry<T> = {
  value: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()

export function getCache<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.value
}

export function setCache<T>(key: string, value: T, ttlMs: number): void {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs })
}

export function invalidateCache(key: string): void {
  cache.delete(key)
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/bracket/cache.ts
git commit -m "feat(bracket): cache in-memory com TTL"
```

---

## Fase 3 — UI pública

### Tarefa 12: `GroupTable` component

**Files:**
- Create: `src/components/public/group-table.tsx`
- Create: `src/components/public/__tests__/group-table.test.tsx`

- [ ] **Step 1: Escrever teste falhando**

Criar `src/components/public/__tests__/group-table.test.tsx`:

```tsx
/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { GroupTable } from '../group-table'
import type { ClassificacaoGrupo } from '@/lib/services/bracket/types'

const mockClassificacao: ClassificacaoGrupo = {
  grupo: 'A',
  times: [
    { time: 'México', jogos: 3, vitorias: 2, empates: 0, derrotas: 1, golsPro: 5, golsContra: 2, saldo: 3, pontos: 6, posicao: 1, jogosDetalhe: [] },
    { time: 'África do Sul', jogos: 3, vitorias: 1, empates: 1, derrotas: 1, golsPro: 3, golsContra: 3, saldo: 0, pontos: 4, posicao: 2, jogosDetalhe: [] },
    { time: 'Coreia do Sul', jogos: 3, vitorias: 0, empates: 2, derrotas: 1, golsPro: 2, golsContra: 3, saldo: -1, pontos: 2, posicao: 3, jogosDetalhe: [] },
    { time: 'República Checa', jogos: 3, vitorias: 0, empates: 1, derrotas: 2, golsPro: 1, golsContra: 3, saldo: -2, pontos: 1, posicao: 4, jogosDetalhe: [] },
  ],
  classificados: ['México', 'África do Sul'],
  terceiro: { time: 'Coreia do Sul', jogos: 3, vitorias: 0, empates: 2, derrotas: 1, golsPro: 2, golsContra: 3, saldo: -1, pontos: 2, posicao: 3, jogosDetalhe: [] },
}

describe('GroupTable', () => {
  it('renderiza nome do grupo', () => {
    render(<GroupTable grupo={mockClassificacao} />)
    expect(screen.getByText(/Grupo A/)).toBeInTheDocument()
  })

  it('renderiza os 4 times', () => {
    render(<GroupTable grupo={mockClassificacao} />)
    expect(screen.getByText('México')).toBeInTheDocument()
    expect(screen.getByText('África do Sul')).toBeInTheDocument()
    expect(screen.getByText('Coreia do Sul')).toBeInTheDocument()
    expect(screen.getByText('República Checa')).toBeInTheDocument()
  })

  it('mostra 2 badges Classificado', () => {
    render(<GroupTable grupo={mockClassificacao} />)
    expect(screen.getAllByText(/Classificado/)).toHaveLength(2)
  })

  it('mostra badge Eliminado pro 4º lugar', () => {
    render(<GroupTable grupo={mockClassificacao} />)
    expect(screen.getByText('Eliminado')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar teste, esperar falha**

- [ ] **Step 3: Implementar `GroupTable`**

Criar `src/components/public/group-table.tsx`:

```tsx
import type { ClassificacaoGrupo } from '@/lib/services/bracket/types'

type Props = {
  grupo: ClassificacaoGrupo
}

export function GroupTable({ grupo }: Props) {
  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div className="bg-primary text-primary-foreground px-4 py-2 font-display tracking-wide">
        Grupo {grupo.grupo}
      </div>
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground border-b">
          <tr>
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Time</th>
            <th className="px-3 py-2 text-center">P</th>
            <th className="px-3 py-2 text-center">J</th>
            <th className="px-3 py-2 text-center">V</th>
            <th className="px-3 py-2 text-center">E</th>
            <th className="px-3 py-2 text-center">D</th>
            <th className="px-3 py-2 text-center">SG</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {grupo.times.map((time, idx) => {
            const pos = idx + 1
            const isClassificado = pos <= 2
            const isEliminado = pos > 3
            return (
              <tr key={time.time} className="border-b last:border-0 hover:bg-muted/50">
                <td className="px-3 py-2 text-muted-foreground tabular-nums">{pos}</td>
                <td className="px-3 py-2 font-medium">
                  {time.time}
                  {time.posicao === null && (
                    <span className="ml-2 text-xs text-amber-600" title="Desempate exige fair play / ranking FIFA">⚠</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center tabular-nums font-bold">{time.pontos}</td>
                <td className="px-3 py-2 text-center tabular-nums">{time.jogos}</td>
                <td className="px-3 py-2 text-center tabular-nums">{time.vitorias}</td>
                <td className="px-3 py-2 text-center tabular-nums">{time.empates}</td>
                <td className="px-3 py-2 text-center tabular-nums">{time.derrotas}</td>
                <td className="px-3 py-2 text-center tabular-nums">
                  {time.saldo > 0 ? '+' : ''}{time.saldo}
                </td>
                <td className="px-3 py-2 text-right">
                  {isClassificado && (
                    <span className="inline-block px-2 py-0.5 text-xs rounded bg-green-100 text-green-700 border border-green-300">
                      ✓ Classificado
                    </span>
                  )}
                  {pos === 3 && (
                    <span className="inline-block px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-700 border border-amber-300">
                      ⚠ Melhores 8 terceiros
                    </span>
                  )}
                  {isEliminado && (
                    <span className="inline-block px-2 py-0.5 text-xs rounded bg-red-100 text-red-700 border border-red-300">
                      ✗ Eliminado
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Rodar teste, esperar sucesso**

Run: `npm test -- group-table.test.tsx`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/components/public/group-table.tsx src/components/public/__tests__/group-table.test.tsx
git commit -m "feat(ui): GroupTable com badges (classificado/terceiros/eliminado)"
```

---

### Tarefa 13: `BracketMatch` component

**Files:**
- Create: `src/components/public/bracket-match.tsx`
- Create: `src/components/public/__tests__/bracket-match.test.tsx`

- [ ] **Step 1: Escrever teste falhando**

Criar `src/components/public/__tests__/bracket-match.test.tsx`:

```tsx
/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { BracketMatch } from '../bracket-match'
import type { BracketSlot } from '@/lib/services/bracket/types'

const slotFinalizado: BracketSlot = {
  jogoId: 'r32-1', fase: 'dezesseis_avos', slot: 1,
  timeA: 'Brasil', timeB: 'México',
  placarA: 2, placarB: 1, placarPenaltisA: null, placarPenaltisB: null,
  status: 'finalizado', vencedor: 'A',
}

const slotTBD: BracketSlot = {
  ...slotFinalizado, timeA: null, timeB: null,
  placarA: null, placarB: null, status: 'agendado', vencedor: null,
}

const slotComPenaltes: BracketSlot = {
  ...slotFinalizado,
  placarA: 1, placarB: 1,
  placarPenaltisA: 4, placarPenaltisB: 3,
}

describe('BracketMatch', () => {
  it('renderiza nomes dos times', () => {
    render(<BracketMatch slot={slotFinalizado} />)
    expect(screen.getByText('Brasil')).toBeInTheDocument()
    expect(screen.getByText('México')).toBeInTheDocument()
  })

  it('mostra placar', () => {
    render(<BracketMatch slot={slotFinalizado} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('mostra "A definir" quando times TBD', () => {
    render(<BracketMatch slot={slotTBD} />)
    expect(screen.getAllByText('A definir')).toHaveLength(2)
  })

  it('mostra "(4-3 pen)" quando placar decidido nos pênaltis', () => {
    render(<BracketMatch slot={slotComPenaltes} />)
    expect(screen.getByText('(4-3 pen)')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar teste, esperar falha**

- [ ] **Step 3: Implementar `BracketMatch`**

Criar `src/components/public/bracket-match.tsx`:

```tsx
import type { BracketSlot } from '@/lib/services/bracket/types'

type Props = {
  slot: BracketSlot
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CLASSES = {
  sm: 'text-xs p-2 min-w-[140px]',
  md: 'text-sm p-3 min-w-[180px]',
  lg: 'text-base p-4 min-w-[220px]',
}

export function BracketMatch({ slot, size = 'md' }: Props) {
  const isFinalizado = slot.status === 'finalizado'
  const isTBD = slot.timeA === null && slot.timeB === null
  const comPenaltes = isFinalizado
    && slot.placarA === slot.placarB
    && slot.placarPenaltisA !== null
    && slot.placarPenaltisB !== null

  return (
    <div className={`bg-card border rounded ${SIZE_CLASSES[size]} ${isTBD ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`flex-1 truncate ${slot.vencedor === 'A' ? 'font-bold' : ''}`}>
          {slot.timeA ?? 'A definir'}
        </span>
        <span className="tabular-nums font-mono">{slot.placarA ?? '-'}</span>
      </div>
      <div className="flex items-center justify-between gap-2 mt-1">
        <span className={`flex-1 truncate ${slot.vencedor === 'B' ? 'font-bold' : ''}`}>
          {slot.timeB ?? 'A definir'}
        </span>
        <span className="tabular-nums font-mono">{slot.placarB ?? '-'}</span>
      </div>
      {comPenaltes && (
        <div className="text-xs text-muted-foreground mt-1 text-center">
          ({slot.placarPenaltisA}-{slot.placarPenaltisB} pen)
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Rodar teste, esperar sucesso**

Run: `npm test -- bracket-match.test.tsx`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/components/public/bracket-match.tsx src/components/public/__tests__/bracket-match.test.tsx
git commit -m "feat(ui): BracketMatch com placar, TBD, pênaltis"
```

---

### Tarefa 14: `BracketColumn` component

**Files:**
- Create: `src/components/public/bracket-column.tsx`

- [ ] **Step 1: Criar coluna que agrupa N slots**

Criar `src/components/public/bracket-column.tsx`:

```tsx
import type { BracketSlot } from '@/lib/services/bracket/types'
import { BracketMatch } from './bracket-match'

type Props = {
  fase: BracketSlot['fase']
  slots: BracketSlot[]
}

const FASE_LABEL: Record<BracketSlot['fase'], string> = {
  dezesseis_avos: 'R32',
  oitavas: 'Oitavas',
  quartas: 'Quartas',
  semifinal: 'Semi',
  terceiro: '3º lugar',
  final: 'Final',
}

export function BracketColumn({ fase, slots }: Props) {
  return (
    <div className="flex flex-col gap-3 min-w-[180px]">
      <h4 className="text-xs font-display tracking-wide text-muted-foreground text-center">
        {FASE_LABEL[fase]}
      </h4>
      {slots.map(slot => (
        <BracketMatch key={slot.jogoId} slot={slot} size="sm" />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/public/bracket-column.tsx
git commit -m "feat(ui): BracketColumn agrupa slots por fase"
```

---

### Tarefa 15: `Bracket` container responsivo

**Files:**
- Create: `src/components/public/bracket.tsx`
- Create: `src/components/public/__tests__/bracket.test.tsx`

- [ ] **Step 1: Escrever teste falhando**

Criar `src/components/public/__tests__/bracket.test.tsx`:

```tsx
/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { Bracket } from '../bracket'
import type { BracketSlot } from '@/lib/services/bracket/types'

const slots: BracketSlot[] = [
  { jogoId: 'r32-1', fase: 'dezesseis_avos', slot: 1, timeA: 'A1', timeB: 'B2', placarA: 1, placarB: 0, placarPenaltisA: null, placarPenaltisB: null, status: 'finalizado', vencedor: 'A' },
  { jogoId: 'r16-1', fase: 'oitavas', slot: 1, timeA: 'A1', timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null },
]

describe('Bracket', () => {
  it('renderiza labels das fases (R32, Oitavas)', () => {
    render(<Bracket slots={slots} />)
    expect(screen.getByText('R32')).toBeInTheDocument()
    expect(screen.getByText('Oitavas')).toBeInTheDocument()
  })

  it('tem classe overflow-x-auto pra scroll horizontal', () => {
    const { container } = render(<Bracket slots={slots} />)
    expect(container.querySelector('.overflow-x-auto')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar teste, esperar falha**

- [ ] **Step 3: Implementar `Bracket`**

Criar `src/components/public/bracket.tsx`:

```tsx
'use client'
import { useState } from 'react'
import type { BracketSlot } from '@/lib/services/bracket/types'
import { BracketColumn } from './bracket-column'

type Props = {
  slots: BracketSlot[]
}

const FASES: BracketSlot['fase'][] = ['dezesseis_avos', 'oitavas', 'quartas', 'semifinal', 'final', 'terceiro']

export function Bracket({ slots }: Props) {
  const [faseAtiva, setFaseAtiva] = useState<BracketSlot['fase']>('dezesseis_avos')

  const slotsPorFase = (fase: BracketSlot['fase']) =>
    slots.filter(s => s.fase === fase).sort((a, b) => a.slot - b.slot)

  return (
    <div>
      {/* Mobile: seletor de fase */}
      <div className="lg:hidden mb-4 flex gap-2 overflow-x-auto">
        {FASES.map(f => (
          <button
            key={f}
            onClick={() => setFaseAtiva(f)}
            className={`px-3 py-1 rounded text-sm whitespace-nowrap ${
              faseAtiva === f ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}
          >
            {faseLabel(f)}
          </button>
        ))}
      </div>

      {/* Mobile: uma fase por vez */}
      <div className="lg:hidden">
        <BracketColumn fase={faseAtiva} slots={slotsPorFase(faseAtiva)} />
      </div>

      {/* Desktop/tablet: todas as fases em scroll horizontal */}
      <div className="hidden lg:block overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-max">
          {FASES.map(f => (
            <BracketColumn key={f} fase={f} slots={slotsPorFase(f)} />
          ))}
        </div>
      </div>
    </div>
  )
}

function faseLabel(f: BracketSlot['fase']): string {
  const map: Record<BracketSlot['fase'], string> = {
    dezesseis_avos: 'R32', oitavas: 'Oitavas', quartas: 'Quartas',
    semifinal: 'Semi', terceiro: '3º', final: 'Final',
  }
  return map[f]
}
```

- [ ] **Step 4: Rodar teste, esperar sucesso**

Run: `npm test -- bracket.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add src/components/public/bracket.tsx src/components/public/__tests__/bracket.test.tsx
git commit -m "feat(ui): Bracket responsivo (mobile: 1 fase, desktop: scroll)"
```

---

### Tarefa 16: `CopaTabs` (3 abas)

**Files:**
- Create: `src/components/public/copa-tabs.tsx`

- [ ] **Step 1: Criar componente de tabs client-side**

Criar `src/components/public/copa-tabs.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { ClassificacaoGrupo, BracketSlot, JogoComTimes } from '@/lib/services/bracket/types'
import { GroupTable } from './group-table'
import { Bracket } from './bracket'
// import { SimulatorTab } from './simulator-tab'  // Tarefa 19

type Props = {
  classificacao: ClassificacaoGrupo[]
  bracket: BracketSlot[]
  jogos: JogoComTimes[]
}

export function CopaTabs({ classificacao, bracket, jogos }: Props) {
  const [tab, setTab] = useState('classificacao')

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="classificacao">Classificação</TabsTrigger>
        <TabsTrigger value="chaveamento">Chaveamento</TabsTrigger>
        <TabsTrigger value="simulador">Simulador</TabsTrigger>
      </TabsList>

      <TabsContent value="classificacao" className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {classificacao.map(g => (
            <GroupTable key={g.grupo} grupo={g} />
          ))}
        </div>
      </TabsContent>

      <TabsContent value="chaveamento" className="mt-6">
        <Bracket slots={bracket} />
      </TabsContent>

      <TabsContent value="simulador" className="mt-6">
        <p className="text-muted-foreground">Simulador em construção (Tarefa 19)</p>
      </TabsContent>
    </Tabs>
  )
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/public/copa-tabs.tsx
git commit -m "feat(ui): CopaTabs com 3 abas (simulador em stub)"
```

---

### Tarefa 17: Page `/copa` (server component)

**Files:**
- Create: `src/app/(public)/copa/page.tsx`
- Create: `src/app/(public)/copa/layout.tsx`

- [ ] **Step 1: Criar layout**

Criar `src/app/(public)/copa/layout.tsx`:

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Copa do Mundo 2026 — Classificação e Chaveamento',
  description: 'Acompanhe a classificação dos grupos e o chaveamento mata-mata da Copa 2026.',
}

export default function CopaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

- [ ] **Step 2: Criar page server component**

Criar `src/app/(public)/copa/page.tsx`:

```tsx
import { prisma } from '@/lib/db/client'
import { getClassificacaoGrupos } from '@/lib/services/bracket/standings'
import { getMelhores8Terceiros } from '@/lib/services/bracket/best-thirds'
import { projetarChaveamento } from '@/lib/services/bracket/projector'
import { atualizarBracket } from '@/lib/services/bracket/updater'
import { CopaTabs } from '@/components/public/copa-tabs'
import type { JogoComTimes } from '@/lib/services/bracket/types'

export const dynamic = 'force-dynamic'
export const revalidate = 60

export default async function CopaPage() {
  await atualizarBracket()

  const jogos = await prisma.jogo.findMany({ orderBy: { dataHora: 'asc' } })

  const jogosGrupos = jogos.filter(j => j.fase === 'grupos') as JogoComTimes[]
  const jogosMataMata = jogos.filter(j => j.fase !== 'grupos') as JogoComTimes[]

  const classificacao = getClassificacaoGrupos(jogosGrupos)
  const melhoresTerceiros = getMelhores8Terceiros(classificacao)
  const bracket = projetarChaveamento({ classificacao, melhoresTerceiros, jogosMataMata })

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="font-display text-3xl tracking-wide mb-6">Copa do Mundo 2026</h1>
      <CopaTabs classificacao={classificacao} bracket={bracket} jogos={jogosGrupos} />
    </main>
  )
}
```

- [ ] **Step 3: Rodar dev server e verificar visualmente**

Run: `npm run dev`

Abrir http://localhost:3000/copa

Expected: página renderiza, 12 tabelas na aba Classificação, 32 slots do bracket (todos "A definir") na aba Chaveamento.

- [ ] **Step 4: Commit**

```bash
git add src/app/(public)/copa/page.tsx src/app/(public)/copa/layout.tsx
git commit -m "feat(copa): page /copa com 3 abas (server component)"
```

---

## Fase 4 — Simulador

### Tarefa 18: Lógica pura do simulador

**Files:**
- Create: `src/lib/services/bracket/simulator.ts`
- Create: `src/lib/services/bracket/__tests__/simulator.test.ts`

- [ ] **Step 1: Escrever teste falhando**

Criar `src/lib/services/bracket/__tests__/simulator.test.ts`:

```ts
import { aplicarSimulacao } from '../simulator'
import type { JogoComTimes } from '../types'

const makeJogo = (overrides: Partial<JogoComTimes>): JogoComTimes => ({
  id: 'g1', fase: 'grupos', grupo: 'A', timeA: 'A', timeB: 'B',
  resultadoA: null, resultadoB: null, status: 'agendado',
  placarPenaltisA: null, placarPenaltisB: null, vencedor: null,
  sofascoreId: '1', dataHora: new Date(),
  ...overrides,
})

describe('aplicarSimulacao', () => {
  it('mantém jogos finalizados intactos', () => {
    const jogos = [
      makeJogo({ id: 'final', status: 'finalizado', resultadoA: 2, resultadoB: 1 }),
      makeJogo({ id: 'futuro', status: 'agendado' }),
    ]
    const result = aplicarSimulacao(jogos, { futuro: { placarA: 3, placarB: 0 } })
    expect(result.find(j => j.id === 'final')?.resultadoA).toBe(2)
  })

  it('aplica placares simulados em jogos futuros', () => {
    const jogos = [makeJogo({ id: 'futuro', status: 'agendado' })]
    const result = aplicarSimulacao(jogos, { futuro: { placarA: 3, placarB: 0 } })
    const jogo = result.find(j => j.id === 'futuro')!
    expect(jogo.resultadoA).toBe(3)
    expect(jogo.resultadoB).toBe(0)
    expect(jogo.status).toBe('finalizado')
    expect(jogo.vencedor).toBe(1)
  })

  it('rejeita edição em jogo já finalizado', () => {
    const jogos = [makeJogo({ id: 'final', status: 'finalizado', resultadoA: 1, resultadoB: 0 })]
    const result = aplicarSimulacao(jogos, { final: { placarA: 5, placarB: 0 } })
    expect(result[0].resultadoA).toBe(1)
  })
})
```

- [ ] **Step 2: Rodar teste, esperar falha**

- [ ] **Step 3: Implementar `aplicarSimulacao`**

Criar `src/lib/services/bracket/simulator.ts`:

```ts
import type { JogoComTimes } from './types'

type Simulacao = Record<string, { placarA: number; placarB: number }>

export function aplicarSimulacao(jogos: JogoComTimes[], simulacao: Simulacao): JogoComTimes[] {
  return jogos.map(jogo => {
    const edit = simulacao[jogo.id]
    if (!edit) return jogo
    if (jogo.status === 'finalizado') return jogo

    return {
      ...jogo,
      resultadoA: edit.placarA,
      resultadoB: edit.placarB,
      status: 'finalizado' as const,
      vencedor: edit.placarA > edit.placarB ? 1 : edit.placarA < edit.placarB ? 2 : null,
    }
  })
}
```

- [ ] **Step 4: Rodar teste, esperar sucesso**

Run: `npm test -- simulator.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/bracket/simulator.ts src/lib/services/bracket/__tests__/simulator.test.ts
git commit -m "feat(simulator): aplicarSimulacao (edita placares futuros, recalcula vencedor)"
```

---

### Tarefa 19: `SimulatorBanner` + integração no `CopaTabs`

**Files:**
- Create: `src/components/public/simulator-banner.tsx`
- Create: `src/components/public/simulator-tab.tsx`
- Create: `src/components/public/__tests__/simulator-banner.test.tsx`
- Modify: `src/components/public/copa-tabs.tsx`

- [ ] **Step 1: Criar `SimulatorBanner`**

Criar `src/components/public/simulator-banner.tsx`:

```tsx
'use client'
type Props = {
  count: number
  onLimpar: () => void
}

export function SimulatorBanner({ count, onLimpar }: Props) {
  if (count === 0) return null
  return (
    <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
      <span className="text-amber-900">
        🎮 Modo simulação — {count} altera{count === 1 ? 'ção' : 'ções'}
      </span>
      <button
        onClick={onLimpar}
        className="px-3 py-1 text-sm bg-amber-200 hover:bg-amber-300 text-amber-900 rounded"
      >
        Limpar simulações
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Criar `SimulatorTab`**

Criar `src/components/public/simulator-tab.tsx`:

```tsx
'use client'
import { useState, useMemo, useEffect } from 'react'
import type { ClassificacaoGrupo, BracketSlot, JogoComTimes } from '@/lib/services/bracket/types'
import { aplicarSimulacao } from '@/lib/services/bracket/simulator'
import { getClassificacaoGrupos } from '@/lib/services/bracket/standings'
import { getMelhores8Terceiros } from '@/lib/services/bracket/best-thirds'
import { projetarChaveamento } from '@/lib/services/bracket/projector'
import { GroupTable } from './group-table'
import { Bracket } from './bracket'
import { SimulatorBanner } from './simulator-banner'

type Props = {
  classificacaoInicial: ClassificacaoGrupo[]
  bracketInicial: BracketSlot[]
  jogos: JogoComTimes[]
}

const STORAGE_KEY = 'copa_sim'

export function SimulatorTab({ classificacaoInicial, bracketInicial, jogos }: Props) {
  const [simulacao, setSimulacao] = useState<Record<string, { placarA: number; placarB: number }>>({})

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try { setSimulacao(JSON.parse(stored)) } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    if (Object.keys(simulacao).length === 0) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(simulacao))
    }
  }, [simulacao])

  const { classificacao, bracket } = useMemo(() => {
    const jogosSimulados = aplicarSimulacao(jogos, simulacao)
    const jogosGrupos = jogosSimulados.filter(j => j.fase === 'grupos')
    const jogosMataMata = jogosSimulados.filter(j => j.fase !== 'grupos')
    const c = getClassificacaoGrupos(jogosGrupos)
    const t = getMelhores8Terceiros(c)
    const b = projetarChaveamento({ classificacao: c, melhoresTerceiros: t, jogosMataMata })
    return { classificacao: c, bracket: b }
  }, [jogos, simulacao])

  const limpar = () => setSimulacao({})
  const count = Object.keys(simulacao).length

  return (
    <div>
      <SimulatorBanner count={count} onLimpar={limpar} />
      <p className="text-sm text-muted-foreground mb-4">
        Edite placares de jogos futuros pra ver como isso afeta a classificação e o chaveamento.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {classificacao.map(g => (
          <GroupTable key={g.grupo} grupo={g} />
        ))}
      </div>
      <h3 className="font-display text-xl tracking-wide mb-4">Chaveamento (simulado)</h3>
      <Bracket slots={bracket} />
    </div>
  )
}
```

- [ ] **Step 3: Atualizar `CopaTabs` pra usar o `SimulatorTab` real**

Em `src/components/public/copa-tabs.tsx`, descomentar o import:

```tsx
import { SimulatorTab } from './simulator-tab'
```

E substituir o placeholder:

```tsx
<TabsContent value="simulador" className="mt-6">
  <SimulatorTab
    classificacaoInicial={classificacao}
    bracketInicial={bracket}
    jogos={jogos}
  />
</TabsContent>
```

- [ ] **Step 4: Criar teste do `SimulatorBanner`**

Criar `src/components/public/__tests__/simulator-banner.test.tsx`:

```tsx
/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { SimulatorBanner } from '../simulator-banner'

describe('SimulatorBanner', () => {
  it('não renderiza quando count=0', () => {
    const { container } = render(<SimulatorBanner count={0} onLimpar={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it('mostra contador de alterações', () => {
    render(<SimulatorBanner count={3} onLimpar={() => {}} />)
    expect(screen.getByText(/3 alterações/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 5: Rodar testes**

Run: `npm test -- simulator-banner.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 6: Verificar dev server**

Run: `npm run dev`, abrir http://localhost:3000/copa → aba Simulador → editar um placar de jogo futuro → ver recálculo.

- [ ] **Step 7: Commit**

```bash
git add src/components/public/simulator-banner.tsx src/components/public/simulator-tab.tsx src/components/public/__tests__/simulator-banner.test.tsx src/components/public/copa-tabs.tsx
git commit -m "feat(simulator): SimulatorTab com localStorage e recálculo em tempo real"
```

---

## Fase 5 — Admin refactor

### Tarefa 20: Extrair `JogoRow`

**Files:**
- Create: `src/components/admin/jogo-row.tsx`
- Modify: `src/app/admin/jogos/page.tsx`

- [ ] **Step 1: Ler estrutura atual de `admin/jogos/page.tsx`**

Run: `wc -l src/app/admin/jogos/page.tsx`

Pra entender o que extrair.

- [ ] **Step 2: Criar `JogoRow`**

Criar `src/components/admin/jogo-row.tsx`:

```tsx
'use client'
import { Jogo } from '@prisma/client'
import { Badge } from '@/components/ui/badge'

type Props = {
  jogo: Jogo
  onEdit: (id: string) => void
}

const STATUS_LABEL: Record<string, string> = {
  agendado: 'Agendado',
  em_andamento: 'Em andamento',
  finalizado: 'Finalizado',
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  agendado: 'secondary',
  em_andamento: 'default',
  finalizado: 'destructive',
}

export function JogoRow({ jogo, onEdit }: Props) {
  const isTBD = !jogo.timeA && !jogo.timeB

  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="px-3 py-2 text-sm">
        <div className="flex items-center gap-1">
          {isTBD ? (
            <span className="text-muted-foreground italic">A definir</span>
          ) : (
            <>
              <span className="font-medium">{jogo.timeA}</span>
              <span className="text-muted-foreground mx-1">×</span>
              <span className="font-medium">{jogo.timeB}</span>
            </>
          )}
        </div>
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">
        {jogo.fase}
        {jogo.grupo && ` (${jogo.grupo})`}
      </td>
      <td className="px-3 py-2">
        <Badge variant={STATUS_VARIANT[jogo.status]}>{STATUS_LABEL[jogo.status]}</Badge>
      </td>
      <td className="px-3 py-2 text-sm tabular-nums">
        {jogo.resultadoA ?? '-'} × {jogo.resultadoB ?? '-'}
        {jogo.placarPenaltisA !== null && jogo.placarPenaltisB !== null && (
          <span className="text-xs text-muted-foreground ml-1">
            ({jogo.placarPenaltisA}-{jogo.placarPenaltisB} pen)
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">
        {new Date(jogo.dataHora).toLocaleDateString('pt-BR')}
      </td>
      <td className="px-3 py-2 text-right">
        <button
          onClick={() => onEdit(jogo.id)}
          disabled={isTBD}
          className="text-primary hover:underline text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Editar
        </button>
      </td>
    </tr>
  )
}
```

- [ ] **Step 3: Refatorar `admin/jogos/page.tsx`**

Trocar a `<tr>` inline (linha com `jogo.timeA × jogo.timeB`) por:

```tsx
<JogoRow key={jogo.id} jogo={jogo} onEdit={(id) => setEditingId(id)} />
```

E adicionar o import no topo:

```tsx
import { JogoRow } from '@/components/admin/jogo-row'
```

- [ ] **Step 4: Verificar visualmente**

Run: `npm run dev`, abrir `/admin/jogos` (precisa estar logado como admin).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/jogo-row.tsx src/app/admin/jogos/page.tsx
git commit -m "refactor(admin): extrair JogoRow de admin/jogos/page.tsx"
```

---

### Tarefa 21: `JogoFilters` com TDD

**Files:**
- Create: `src/components/admin/jogo-filters.tsx`
- Create: `src/components/admin/__tests__/jogo-filters.test.tsx`
- Modify: `src/lib/utils/constants.ts` (adicionar FASES)

- [ ] **Step 1: Adicionar `FASES` em `constants.ts`**

Em `src/lib/utils/constants.ts`, adicionar:

```ts
export const FASES = ['grupos', 'dezesseis_avos', 'oitavas', 'quartas', 'semifinal', 'terceiro', 'final'] as const
```

- [ ] **Step 2: Escrever teste falhando**

Criar `src/components/admin/__tests__/jogo-filters.test.tsx`:

```tsx
/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { JogoFilters, FiltrosJogos } from '../jogo-filters'

const initial: FiltrosJogos = { fases: [], statuses: [], grupos: [], time: '', de: '', ate: '' }

describe('JogoFilters', () => {
  it('renderiza botões de fase', () => {
    render(<JogoFilters value={initial} onChange={() => {}} />)
    expect(screen.getByText('grupos')).toBeInTheDocument()
    expect(screen.getByText('oitavas')).toBeInTheDocument()
  })

  it('chama onChange ao clicar numa fase', () => {
    const onChange = jest.fn()
    render(<JogoFilters value={initial} onChange={onChange} />)
    fireEvent.click(screen.getByText('grupos'))
    expect(onChange).toHaveBeenCalledWith({ ...initial, fases: ['grupos'] })
  })

  it('chama onChange ao digitar no input de time', () => {
    const onChange = jest.fn()
    render(<JogoFilters value={initial} onChange={onChange} />)
    const input = screen.getByPlaceholderText(/buscar time/i)
    fireEvent.change(input, { target: { value: 'Brasil' } })
    expect(onChange).toHaveBeenCalledWith({ ...initial, time: 'Brasil' })
  })
})
```

- [ ] **Step 3: Rodar teste, esperar falha**

- [ ] **Step 4: Implementar `JogoFilters`**

Criar `src/components/admin/jogo-filters.tsx`:

```tsx
'use client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { GRUPOS, FASES } from '@/lib/utils/constants'

export type FiltrosJogos = {
  fases: string[]
  statuses: string[]
  grupos: string[]
  time: string
  de: string
  ate: string
}

type Props = {
  value: FiltrosJogos
  onChange: (filtros: FiltrosJogos) => void
}

export function JogoFilters({ value, onChange }: Props) {
  const toggle = (key: 'fases' | 'statuses' | 'grupos', item: string) => {
    const list = value[key]
    const updated = list.includes(item)
      ? list.filter(x => x !== item)
      : [...list, item]
    onChange({ ...value, [key]: updated })
  }

  return (
    <div className="bg-card border rounded-lg p-4 mb-4 space-y-3">
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Fase</label>
          <div className="flex gap-1 flex-wrap mt-1">
            {FASES.map(f => (
              <button
                key={f}
                onClick={() => toggle('fases', f)}
                className={`px-2 py-1 text-xs rounded border ${
                  value.fases.includes(f) ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Status</label>
          <div className="flex gap-1 flex-wrap mt-1">
            {['agendado', 'em_andamento', 'finalizado'].map(s => (
              <button
                key={s}
                onClick={() => toggle('statuses', s)}
                className={`px-2 py-1 text-xs rounded border ${
                  value.statuses.includes(s) ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Grupo</label>
          <div className="flex gap-1 flex-wrap mt-1">
            {GRUPOS.map(g => (
              <button
                key={g}
                onClick={() => toggle('grupos', g)}
                className={`px-2 py-1 text-xs rounded border w-8 ${
                  value.grupos.includes(g) ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground">Time</label>
          <Input
            value={value.time}
            onChange={e => onChange({ ...value, time: e.target.value })}
            placeholder="Buscar time..."
            className="mt-1"
          />
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange({ fases: [], statuses: [], grupos: [], time: '', de: '', ate: '' })}
      >
        Limpar filtros
      </Button>
    </div>
  )
}
```

- [ ] **Step 5: Rodar testes**

Run: `npm test -- jogo-filters.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/jogo-filters.tsx src/components/admin/__tests__/jogo-filters.test.tsx src/lib/utils/constants.ts
git commit -m "feat(admin): JogoFilters com fase, status, grupo, busca por time"
```

---

### Tarefa 22: `JogoPagination` + integração `/admin/jogos`

**Files:**
- Create: `src/components/admin/jogo-pagination.tsx`
- Modify: `src/app/admin/jogos/page.tsx`

- [ ] **Step 1: Criar `JogoPagination`**

Criar `src/components/admin/jogo-pagination.tsx`:

```tsx
'use client'
import { Button } from '@/components/ui/button'

type Props = {
  total: number
  page: number
  perPage: number
  onPageChange: (page: number) => void
}

export function JogoPagination({ total, page, perPage, onPageChange }: Props) {
  const totalPages = Math.ceil(total / perPage)
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between mt-4">
      <span className="text-sm text-muted-foreground">
        {total} jogo{total === 1 ? '' : 's'} total
      </span>
      <div className="flex gap-2 items-center">
        <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page === 1}>
          Anterior
        </Button>
        <span className="text-sm py-1">Página {page} de {totalPages}</span>
        <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>
          Próxima
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Refatorar `admin/jogos/page.tsx`**

Adicionar no topo do componente:

```tsx
'use client'
import { useState, useMemo, useEffect } from 'react'
import { JogoFilters, FiltrosJogos } from '@/components/admin/jogo-filters'
import { JogoPagination } from '@/components/admin/jogo-pagination'
import { useRouter, useSearchParams } from 'next/navigation'

const router = useRouter()
const searchParams = useSearchParams()
const [filtros, setFiltros] = useState<FiltrosJogos>(parseFiltrosFromURL(searchParams))
const [page, setPage] = useState(1)

useEffect(() => {
  const params = new URLSearchParams()
  if (filtros.fases.length) params.set('fase', filtros.fases.join(','))
  if (filtros.statuses.length) params.set('status', filtros.statuses.join(','))
  if (filtros.time) params.set('q', filtros.time)
  router.replace(`/admin/jogos?${params.toString()}`)
}, [filtros, router])

const jogosFiltrados = useMemo(() => {
  return jogos.filter(j => {
    if (filtros.fases.length > 0 && !filtros.fases.includes(j.fase)) return false
    if (filtros.statuses.length > 0 && !filtros.statuses.includes(j.status)) return false
    if (filtros.grupos.length > 0 && j.grupo && !filtros.grupos.includes(j.grupo)) return false
    if (filtros.time) {
      const q = filtros.time.toLowerCase()
      if (!j.timeA?.toLowerCase().includes(q) && !j.timeB?.toLowerCase().includes(q)) return false
    }
    return true
  })
}, [jogos, filtros])

const PER_PAGE = 25
const jogosPaginados = jogosFiltrados.slice((page - 1) * PER_PAGE, page * PER_PAGE)
```

Adicionar no JSX (antes da `<table>`):

```tsx
<JogoFilters value={filtros} onChange={setFiltros} />
```

E depois da `</table>`:

```tsx
<JogoPagination total={jogosFiltrados.length} page={page} perPage={PER_PAGE} onPageChange={setPage} />
```

Trocar `{jogos.map(...)}` por `{jogosPaginados.map(...)}`.

Criar helper `parseFiltrosFromURL`:

```tsx
function parseFiltrosFromURL(params: URLSearchParams): FiltrosJogos {
  return {
    fases: (params.get('fase') || '').split(',').filter(Boolean),
    statuses: (params.get('status') || '').split(',').filter(Boolean),
    grupos: [],
    time: params.get('q') || '',
    de: '',
    ate: '',
  }
}
```

- [ ] **Step 3: Verificar visualmente**

Run: `npm run dev`, abrir `/admin/jogos`, testar filtros e URL.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/jogo-pagination.tsx src/app/admin/jogos/page.tsx
git commit -m "feat(admin): JogoPagination + filtros integrados em /admin/jogos"
```

---

## Fase 6 — Polish

### Tarefa 23: Link "Copa" no Header

**Files:**
- Modify: `src/components/layout/Header.tsx`

- [ ] **Step 1: Adicionar link "Copa" no menu público**

Localizar a array de links públicos no Header (geralmente algo como `const publicLinks = [...]` ou inline no JSX) e adicionar:

```tsx
{ href: '/copa', label: 'Copa' },
```

- [ ] **Step 2: Verificar**

Run: `npm run dev`, abrir qualquer página pública, ver se o link "Copa" aparece no header e leva a `/copa`.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Header.tsx
git commit -m "feat(nav): adicionar link 'Copa' no header"
```

---

## Critérios de aceite (Definition of Done)

Antes de abrir PR:

- [ ] `npm run lint` passa
- [ ] `npm run build` passa
- [ ] `npm test` passa (todos os testes)
- [ ] `cd microservice && .venv/bin/pytest tests/ -v` passa
- [ ] `npx tsc --noEmit` sem erros
- [ ] Smoke test manual em `npm run dev`:
  - `/copa` carrega em <2s
  - 12 tabelas de classificação renderizam corretamente
  - 32 slots do bracket aparecem (todos "A definir" inicialmente)
  - Aba Simulador permite editar placar de jogo futuro e recalcula
  - `/admin/jogos` mostra filtros e paginação funcionando
  - URL `/admin/jogos?fase=oitavas&status=em_andamento` filtra corretamente

---

## Notas de implementação

### Tarefas independentes (podem ser paralelizadas)

Se for usar subagents em paralelo, essas tarefas não dependem uma da outra:

- Tarefa 2 (sync football_data) + Tarefa 3 (sync worldcup26) — independentes
- Tarefa 5 (standings) → Tarefa 6 (tiebreakers) — sequenciais
- Tarefa 7 (best-thirds) — depende de Tarefa 5 (output ClassificacaoGrupo)
- Tarefa 9 (projector) — depende de Tarefas 5, 7, 8
- Tarefa 10 (updater) — depende de Tarefa 9
- Tarefas 12-15 (UI components) — podem ser feitas em paralelo
- Tarefa 17 (page) — depende de Tarefas 12-15
- Tarefas 20-22 (admin) — independentes da copa

### Edge cases a testar

- 3 times empatados em pontos (triple tie) → tiebreakers entre os 3 com mini-tabela H2H
- 2 times empatados + H2H entre eles foi empate → cai pra step 4
- 8 3rds com mesma pontuação/GD/GF → posicao=null
- Bracket: jogo anterior não finalizado → slot TBD
- localStorage cheio/desabilitado → simulação roda em memória só
- Admin edita placar de jogo finalizado → UI permite, sync não sobrescreve

### Ordem sugerida de execução

1. Tarefas 1-3 (fundação, sem dependências)
2. Tarefas 4-11 (lógica pura, TDD) — sequência rápida
3. Tarefas 12-17 (UI pública) — pode paralelizar 12-15
4. Tarefas 18-19 (simulador)
5. Tarefas 20-22 (admin) — pode ser feito em paralelo com 12-19
6. Tarefa 23 (header)

### Riscos conhecidos

1. **MATRIX_TERCEIROS incompleta** — apenas 3 combinações placeholder. Casos raros caem no fallback que pode produzir emparelhamentos incorretos. **Mitigação:** log warning + UI mostra que está projetado; após FIFA publicar versão final, expandir matriz.
2. **Cache de 60s pode mostrar defasagem** após sync do cron. **Mitigação:** documentado; se crítico, reduzir TTL pra 30s.
3. **Testes do updater requerem DB de teste** — pode complicar CI. **Mitigação:** marcar teste como integration, opcional em CI rápido.
4. **Simulador não persiste entre dispositivos** — só localStorage do navegador. **Mitigação:** documentado; se quiser compartilhar, vira feature futura.
