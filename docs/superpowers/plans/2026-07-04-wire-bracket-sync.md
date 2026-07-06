# Wire-in de `atualizarBracket()` no Fluxo de Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer os jogos da próxima fase do mata-mata receberem `timeA`/`timeB` automaticamente assim que a fase anterior terminar — hoje `atualizarBracket()` existe mas ninguém chama.

**Architecture:** Novo endpoint Next.js `/api/admin/bracket/atualizar` aceita **duplo auth** (cookie admin **OU** header `X-Cron-Secret`) pra servir tanto admin manual quanto service-to-service do microserviço Python. Microserviço faz HTTP call após `sync_writer`. Sync legado Next.js (rota admin) chama `atualizarBracket()` em-process. Fallback SSR em `/copa/page.tsx` garante que a página sempre mostra dados atualizados mesmo sem sync recente.

**Tech Stack:** Next.js 16 Route Handlers + Prisma; FastAPI + httpx (novo dep); Jest (testes TS); pytest + `pytest-httpx` (testes Python).

## Global Constraints

- Idioma: **Português Brasileiro** (mensagens, logs, comentários de código).
- Commit messages: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`).
- Auth admin: `requireAdmin()` via cookie `admin_session` + `verifySession()` em `src/lib/auth/middleware.ts`.
- Auth service-to-service: header `X-Cron-Secret` bate com env `CRON_SECRET` (mesmo segredo que GH Actions já usa contra o microserviço).
- Microserviço: Python FastAPI, deploy Fly.io (`bolao-copa-microservice.fly.dev`).
- **Não adicionar dependência nova sem justificativa** (ver Task 3).

---

## File Structure

**Criar:**
- `src/app/api/admin/bracket/atualizar/route.ts` — endpoint admin com duplo auth
- `src/app/api/admin/bracket/__tests__/atualizar.test.ts` — testes do endpoint
- `microservice/app/services/bracket_client.py` — client HTTP que chama Next.js
- `microservice/tests/test_bracket_client.py` — testes do client

**Modificar:**
- `src/app/api/resultados/sync/route.ts` — wire `atualizarBracket()` após updates
- `microservice/app/services/sync_runner.py` — HTTP call pós-sync
- `microservice/pyproject.toml` — adicionar `httpx`
- `src/app/(public)/copa/page.tsx` — fallback SSR (chama `atualizarBracket()`)
- `microservice/.env.example` — documentar `NEXTJS_BASE_URL`
- `AGENTS.md` — documentar fluxo atualizado de sync+bracket

**Não modificar:**
- `src/lib/services/bracket/updater.ts` (função já está pronta, só falta caller)
- `src/lib/services/bracket/projector.ts` (lógica de projeção já testada)
- `.github/workflows/sync-resultados.yml` (delega propagação pro microserviço)

---

### Task 1: Endpoint Next.js `/api/admin/bracket/atualizar`

**Files:**
- Create: `src/app/api/admin/bracket/atualizar/route.ts`
- Create: `src/app/api/admin/bracket/__tests__/atualizar.test.ts`

**Interfaces:**
- Consome: `atualizarBracket()` de `src/lib/services/bracket/updater.ts` (assinatura: `export async function atualizarBracket(): Promise<BracketSlot[]>`)
- Consome: `requireAdmin()` de `src/lib/auth/middleware.ts`
- Produz: `POST /api/admin/bracket/atualizar` — response `{ success: true, atualizados: number, bracket: BracketSlot[] }`
- Auth: **cookie admin OU header `X-Cron-Secret`**

- [ ] **Step 1: Write failing test (auth negada sem ambos)**

Criar `src/app/api/admin/bracket/__tests__/atualizar.test.ts`:

```ts
import { NextRequest } from 'next/server'
import { POST } from '../atualizar/route'

jest.mock('@/lib/auth/middleware', () => ({
  requireAdmin: jest.fn().mockResolvedValue(
    new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 })
  ),
}))

jest.mock('@/lib/services/bracket/updater', () => ({
  atualizarBracket: jest.fn().mockResolvedValue([]),
}))

describe('POST /api/admin/bracket/atualizar', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret'
  })

  it('rejeita sem cookie admin e sem X-Cron-Secret', async () => {
    const req = new NextRequest('http://localhost/api/admin/bracket/atualizar', {
      method: 'POST',
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/api/admin/bracket/__tests__/atualizar.test.ts`
Expected: FAIL — `Cannot find module '../atualizar/route'`

- [ ] **Step 3: Write endpoint com duplo auth**

Criar `src/app/api/admin/bracket/atualizar/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { atualizarBracket } from '@/lib/services/bracket/updater'

export async function POST(request: NextRequest) {
  // Auth dupla: cookie admin OU header X-Cron-Secret (service-to-service)
  const cronSecret = request.headers.get('x-cron-secret')
  const adminAuthFailed = await requireAdmin(request)
  const isCronAuth = !!cronSecret && cronSecret === process.env.CRON_SECRET

  if (adminAuthFailed && !isCronAuth) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    console.log('[bracket/atualizar] iniciando atualização do bracket')
    const bracket = await atualizarBracket()

    const slotsComTimes = bracket.filter(s => s.timeA !== null || s.timeB !== null)
    console.log(`[bracket/atualizar] ${slotsComTimes.length} slots com times definidos`)

    return NextResponse.json({
      success: true,
      atualizados: slotsComTimes.length,
      bracket,
    })
  } catch (error) {
    console.error('[bracket/atualizar] erro:', error)
    const message = error instanceof Error ? error.message : 'Erro ao atualizar bracket'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/api/admin/bracket/__tests__/atualizar.test.ts`
Expected: PASS

- [ ] **Step 5: Add test para auth via X-Cron-Secret**

Adicionar ao arquivo de teste:

```ts
it('aceita request com X-Cron-Secret correto (service-to-service)', async () => {
  const req = new NextRequest('http://localhost/api/admin/bracket/atualizar', {
    method: 'POST',
    headers: { 'x-cron-secret': 'test-secret' },
  })
  const res = await POST(req)
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.success).toBe(true)
})

it('rejeita X-Cron-Secret errado', async () => {
  const req = new NextRequest('http://localhost/api/admin/bracket/atualizar', {
    method: 'POST',
    headers: { 'x-cron-secret': 'wrong-secret' },
  })
  const res = await POST(req)
  expect(res.status).toBe(401)
})
```

- [ ] **Step 6: Run tests**

Run: `npm test -- src/app/api/admin/bracket/__tests__/atualizar.test.ts`
Expected: 3 tests PASS

- [ ] **Step 7: Teste manual (curl)**

Com servidor rodando e admin logado:
```bash
curl -i -X POST http://localhost:3000/api/admin/bracket/atualizar \
  -H "Cookie: admin_session=<token>"
```
Expected: HTTP 200 + JSON `{ success: true, atualizados: N, bracket: [...] }`

Via service-to-service:
```bash
CRON_SECRET=$(grep CRON_SECRET .env | cut -d= -f2)
curl -i -X POST http://localhost:3000/api/admin/bracket/atualizar \
  -H "X-Cron-Secret: $CRON_SECRET"
```
Expected: HTTP 200

- [ ] **Step 8: Commit**

```bash
git add src/app/api/admin/bracket/
git commit -m "feat(bracket): endpoint /api/admin/bracket/atualizar com auth duplo"
```

---

### Task 2: Wire no Sync Legado Next.js

**Files:**
- Modify: `src/app/api/resultados/sync/route.ts:171-186`

**Interfaces:**
- Consome: `atualizarBracket()` de `@/lib/services/bracket/updater`
- Consumido por: botão manual "Sincronizar" no painel admin (rota legacy)

- [ ] **Step 1: Adicionar import + chamada após $transaction**

Abrir `src/app/api/resultados/sync/route.ts`. Adicionar import no topo:

```ts
import { atualizarBracket } from '@/lib/services/bracket/updater'
```

Localizar bloco (linhas 175-186):
```ts
if (updates.length > 0) {
  console.log(`\nExecutando ${updates.length} updates no banco...`)
  await prisma.$transaction(
    updates.map((u) =>
      prisma.jogo.update({
        where: { id: u.id },
        data: u.data,
      })
    ),
    { timeout: 30000 }
  )
}
```

Acrescentar **após** o fechamento do `if`:
```ts
if (updates.length > 0) {
  console.log(`\nExecutando ${updates.length} updates no banco...`)
  await prisma.$transaction(
    updates.map((u) =>
      prisma.jogo.update({
        where: { id: u.id },
        data: u.data,
      })
    ),
    { timeout: 30000 }
  )

  // Propaga vencedores pros jogos da próxima fase (mata-mata)
  console.log('Atualizando bracket (propaga times pras próximas fases)...')
  try {
    const bracket = await atualizarBracket()
    const comTimes = bracket.filter(s => s.timeA !== null || s.timeB !== null)
    console.log(`  ${comTimes.length} slots com times preenchidos`)
  } catch (err) {
    // Bracket update é best-effort — não falha o sync por causa dele
    console.error('  [warn] falha ao atualizar bracket:', err)
  }
}
```

- [ ] **Step 2: Teste manual**

Com admin logado, chamar sync manualmente no painel ou via curl:
```bash
curl -i -X POST http://localhost:3000/api/resultados/sync \
  -H "Cookie: admin_session=<token>"
```

Expected nos logs:
```
=== FIM SYNC RESULTADOS ===
Atualizando bracket (propaga times pras próximas fases)...
  N slots com times preenchidos
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/resultados/sync/route.ts
git commit -m "feat(sync): propaga bracket no sync legado admin"
```

---

### Task 3: Microserviço Chama Endpoint Após Sync

**Files:**
- Modify: `microservice/pyproject.toml` (adicionar `httpx`)
- Create: `microservice/app/services/bracket_client.py`
- Create: `microservice/tests/test_bracket_client.py`
- Modify: `microservice/app/services/sync_runner.py:138-145`

**Interfaces:**
- Consome: `POST /api/admin/bracket/atualizar` no Next.js (Task 1)
- Consome: env `NEXTJS_BASE_URL` (novo) + `CRON_SECRET` (já existe)
- Produz: `async def notificar_bracket() -> dict | None`

- [ ] **Step 1: Adicionar httpx ao pyproject.toml**

Abrir `microservice/pyproject.toml`. Localizar seção `dependencies = [...]`. Adicionar `"httpx>=0.27"` à lista.

Exemplo (adapte pra estrutura atual):
```toml
dependencies = [
    # ... deps existentes ...
    "httpx>=0.27",
]
```

- [ ] **Step 2: Rodar `uv sync` para instalar**

Run: `cd microservice && uv sync`
Expected: httpx instalado, lock file atualizado

- [ ] **Step 3: Write failing test do client**

Criar `microservice/tests/test_bracket_client.py`:

```python
import pytest
from unittest.mock import patch
import httpx

from app.services import bracket_client


@pytest.mark.asyncio
async def test_notificar_bracket_sucesso():
    """Chama notificar_bracket com NEXTJS_BASE_URL + CRON_SECRET setados.
    Espera request POST correto com header X-Cron-Secret."""
    captured = {}

    class FakeResponse:
        status_code = 200
        def json(self):
            return {"success": True, "atualizados": 5}
        def raise_for_status(self):
            pass

    class FakeClient:
        async def __aenter__(self): return self
        async def __aexit__(self, *a): pass
        async def post(self, url, headers=None, timeout=None):
            captured["url"] = url
            captured["headers"] = headers
            return FakeResponse()

    with patch.object(bracket_client.httpx, "AsyncClient", return_value=FakeClient()):
        with patch.object(bracket_client.settings, "NEXTJS_BASE_URL", "https://bolao.test"):
            with patch.object(bracket_client.settings, "CRON_SECRET", "sekret"):
                result = await bracket_client.notificar_bracket()

    assert result == {"success": True, "atualizados": 5}
    assert captured["url"] == "https://bolao.test/api/admin/bracket/atualizar"
    assert captured["headers"]["X-Cron-Secret"] == "sekret"


@pytest.mark.asyncio
async def test_notificar_bracket_sem_nextjs_base_url_retorna_none():
    """NEXTJS_BASE_URL não setado → não tenta chamar, retorna None."""
    with patch.object(bracket_client.settings, "NEXTJS_BASE_URL", ""):
        result = await bracket_client.notificar_bracket()
    assert result is None


@pytest.mark.asyncio
async def test_notificar_bracket_falha_http_nao_propaga_erro():
    """Erro HTTP não quebra o sync — loga e retorna None."""
    class FakeClient:
        async def __aenter__(self): return self
        async def __aexit__(self, *a): pass
        async def post(self, url, headers=None, timeout=None):
            raise httpx.HTTPError("timeout")

    with patch.object(bracket_client.httpx, "AsyncClient", return_value=FakeClient()):
        with patch.object(bracket_client.settings, "NEXTJS_BASE_URL", "https://bolao.test"):
            with patch.object(bracket_client.settings, "CRON_SECRET", "sekret"):
                result = await bracket_client.notificar_bracket()

    assert result is None
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd microservice && uv run pytest tests/test_bracket_client.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.bracket_client'`

- [ ] **Step 5: Implementar bracket_client**

Criar `microservice/app/services/bracket_client.py`:

```python
"""Client HTTP que notifica o Next.js pra atualizar o bracket após sync.

Service-to-service: autentica via X-Cron-Secret (não via cookie admin).
Best-effort: falha de rede não quebra o sync de resultados — loga e segue.
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = 30


async def notificar_bracket() -> dict[str, Any] | None:
    """Chama `POST /api/admin/bracket/atualizar` no Next.js.

    Retorna JSON da resposta ou None se:
    - NEXTJS_BASE_URL não configurado
    - falha de rede / timeout / HTTP error
    """
    base_url = settings.NEXTJS_BASE_URL.strip()
    if not base_url:
        logger.info("[bracket_client] NEXTJS_BASE_URL vazio — pulando notificação")
        return None

    url = f"{base_url.rstrip('/')}/api/admin/bracket/atualizar"
    headers = {
        "X-Cron-Secret": settings.CRON_SECRET,
        "User-Agent": "bolao-copa-microservice/1.0",
    }

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            response = await client.post(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            logger.info(
                f"[bracket_client] bracket atualizado: "
                f"{data.get('atualizados', '?')} slots preenchidos"
            )
            return data
    except httpx.HTTPStatusError as e:
        logger.warning(
            f"[bracket_client] HTTP {e.response.status_code} ao notificar bracket — "
            f"sync de resultados não foi afetado"
        )
        return None
    except httpx.HTTPError as e:
        logger.warning(
            f"[bracket_client] erro de rede ao notificar bracket: {e} — "
            f"sync de resultados não foi afetado"
        )
        return None
    except Exception as e:  # pragma: no cover — fallback defensivo
        logger.exception(f"[bracket_client] erro inesperado: {e}")
        return None
```

- [ ] **Step 6: Run tests para verificar passam**

Run: `cd microservice && uv run pytest tests/test_bracket_client.py -v`
Expected: 3 tests PASS

- [ ] **Step 7: Adicionar NEXTJS_BASE_URL ao config.py**

Abrir `microservice/app/config.py`. Adicionar campo à classe `Settings`:

```python
class Settings(BaseSettings):
    CACHE_TTL_SECONDS: int = 300
    FOOTBALL_DATA_API_KEY: str = ""
    DATABASE_URL: str = ""
    CRON_SECRET: str = ""
    NEXTJS_BASE_URL: str = ""  # ex: https://bolao-copa.vercel.app
    LOCK_KEY_RESULTADOS_SYNC: int = 987654321

    class Config:
        env_file = ".env"
```

- [ ] **Step 8: Wire call no sync_runner.py**

Abrir `microservice/app/services/sync_runner.py`. Adicionar import:

```python
from app.services import bracket_client, db, football_data, sync_writer, teams, worldcup26
```

Localizar bloco final (linha ~139-141):
```python
# 5. Compara e atualiza (idempotente)
sync_result = await sync_writer.sincronizar_jogos(
    conn, list(rows), resultados
)
```

Substituir a partir desse ponto até o fim da função por:
```python
            # 5. Compara e atualiza (idempotente)
            sync_result = await sync_writer.sincronizar_jogos(
                conn, list(rows), resultados
            )

        # 6. Fora da transação (após commit): notifica Next.js pra propagar
        #    bracket. Best-effort: falha não quebra o sync de resultados.
        #    Se sync_result.atualizados == 0, não houve mudança — pula.
        if sync_result.atualizados > 0:
            await bracket_client.notificar_bracket()

    except Exception as e:
        logger.exception("Erro durante sincronização")
        raise
```

**Nota sobre transação + advisory lock:** `sync_writer.sincronizar_jogos` roda **dentro** do `with_db_tx()` (mesma transação que adquiriu o advisory lock). A chamada HTTP ao Next.js precisa vir **depois** do commit — senão o Next.js lê estado antigo. Ao sair do `with_db_tx()`, a transação faz commit e o advisory lock é liberado automaticamente (é `pg_try_advisory_xact_lock`, atado à transação).

- [ ] **Step 9: Rodar teste geral do sync_runner**

Run: `cd microservice && uv run pytest tests/ -v`
Expected: todos os testes existentes continuam passando + os 3 novos do `bracket_client` passam

- [ ] **Step 10: Teste end-to-end manual (opcional mas recomendado)**

Com microserviço local apontando pra Next.js local:
```bash
cd microservice
NEXTJS_BASE_URL=http://localhost:3000 \
CRON_SECRET=test-secret \
DATABASE_URL=postgresql://... \
uv run uvicorn app.main:app --port 8765
```

Disparar sync:
```bash
curl -i -X POST http://localhost:8765/resultados/sincronizar \
  -H "X-Cron-Secret: test-secret"
```

Verificar logs:
```
[bracket_client] bracket atualizado: N slots preenchidos
```

- [ ] **Step 11: Commit**

```bash
git add microservice/
git commit -m "feat(sync): microserviço notifica Next.js pra propagar bracket pós-sync"
```

---

### Task 4: Fallback SSR em `/copa/page.tsx`

**Files:**
- Modify: `src/app/(public)/copa/page.tsx`

**Interfaces:**
- Consome: `atualizarBracket()` de `@/lib/services/bracket/updater`
- Produz: **persistência** no DB dos times calculados — outras páginas (`/jogos/[id]`, `/admin/jogos`, `/completar/[token]`) leem direto do DB e precisam ver os times atualizados

**Por que fallback:** `projetarChaveamento()` já calcula `timeA`/`timeB` em memória usando classificação + `vencedor` dos jogos (projector.ts:25-26, 80-81). Então a página `/copa` **já mostra dados corretos** sem precisar do fallback. O valor real da chamada SSR é **persistir** esses dados no DB pra outras páginas que não fazem projeção em memória. `atualizarBracket()` tem cache de 60s → custo baixo (1 write esparsos por minuto).

- [ ] **Step 1: Adicionar chamada no page component**

Abrir `src/app/(public)/copa/page.tsx`. Adicionar import:

```ts
import { atualizarBracket } from '@/lib/services/bracket/updater'
```

Modificar `CopaPage` — inserir a chamada **antes** de ler os jogos (pra garantir que o `prisma.jogo.findMany` já encontre os times recém-gravados):

```ts
export default async function CopaPage() {
  // Dispara atualização do bracket (persiste times pras próximas fases).
  // atualizarBracket() tem cache de 60s, então custo é baixo.
  // Best-effort: se falhar, segue com dados em memória (projetor calcula sem o DB).
  try {
    await atualizarBracket()
  } catch (err) {
    console.error('[copa] falha ao atualizar bracket:', err)
  }

  const jogos = await prisma.jogo.findMany({ orderBy: { dataHora: 'asc' } })

  const jogosGrupos = jogos.filter(j => j.fase === 'grupos') as JogoComTimes[]
  const jogosMataMata = jogos.filter(j => j.fase !== 'grupos') as JogoComTimes[]

  const classificacao = getClassificacaoGrupos(jogosGrupos)
  const melhoresTerceiros = getMelhores8Terceiros(classificacao)
  const bracket = projetarChaveamento({ classificacao, melhoresTerceiros, jogosMataMata })

  return (
    // ... JSX igual, sem mudança
  )
}
```

- [ ] **Step 2: Teste manual**

Rodar dev server e acessar `/copa`. Verificar no log:
```
[copa] (sem mensagem de erro — atualizarBracket rodou em silêncio)
```

Abrir jogo da fase de oitavas via `/jogos/[id]` — `timeA`/`timeB` devem estar preenchidos (lê direto do DB).

- [ ] **Step 3: Commit**

```bash
git add src/app/\(public\)/copa/page.tsx
git commit -m "feat(copa): fallback SSR persiste bracket no DB"
```

---

### Task 5: Documentar Configuração de Deploy

**Files:**
- Modify: `microservice/.env.example`
- Modify: `AGENTS.md`

**Interfaces:**
- Consome: decisões das Tasks 1-4
- Produz: documentação atualizada pra próximo dev conseguir rodar/deployar

- [ ] **Step 1: Atualizar .env.example do microserviço**

Abrir `microservice/.env.example`. Adicionar linha:

```
# URL base do Next.js (pra notificar bracket após sync). Ex: https://bolao-copa.vercel.app
NEXTJS_BASE_URL=
```

- [ ] **Step 2: Atualizar AGENTS.md — seção "Auto-Sync de Resultados"**

Localizar seção "Auto-Sync de Resultados (Cron)" em `AGENTS.md`. Adicionar parágrafo após o existente:

```markdown
### Propagação do Bracket (times pras próximas fases)

Após cada sync bem-sucedido de resultados, o microserviço chama
`POST /api/admin/bracket/atualizar` no Next.js (via `X-Cron-Secret`).
Esse endpoint executa `atualizarBracket()` — lê classificação dos grupos,
projeta o chaveamento, grava `timeA`/`timeB` dos jogos mata-mata.

Fluxo completo:
```
GitHub Actions (cron) → microserviço /resultados/sincronizar
  → sync_writer.sincronizar_jogos (placar/status/vencedor)
  → bracket_client.notificar_bracket (HTTP pro Next.js)
  → Next.js /api/admin/bracket/atualizar
  → atualizarBracket() grava times das próximas fases
```

Variáveis de ambiente necessárias:
- Microserviço: `NEXTJS_BASE_URL` (ex: `https://bolao-copa.vercel.app`) + `CRON_SECRET`
- Next.js: `CRON_SECRET` (já existe)

Fallback: `/copa/page.tsx` também chama `atualizarBracket()` no SSR (cache 60s),
então mesmo sem sync recente a página mostra dados atualizados.
```

- [ ] **Step 3: Adicionar nota em "Variáveis de Ambiente"**

Localizar seção "Variáveis de Ambiente" em `AGENTS.md`. Adicionar `NEXTJS_BASE_URL` na descrição:

```markdown
**Variáveis de Ambiente:**
Ver `.env.example`. Obrigatórias: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ADMIN_PASSWORD`, `SESSION_SECRET`. Condicionais: `OPENCODE_GO_API_KEY` (OCR), `MICROSERVICE_URL` (resultados ao vivo), `FOOTBALL_DATA_API_KEY` (API de resultados, configurada no microserviço Fly.io). **Microserviço também precisa:** `NEXTJS_BASE_URL` (URL do Next.js, pra notificar bracket após sync).
```

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md microservice/.env.example
git commit -m "docs(sync): documentar fluxo de propagação do bracket"
```

---

### Task 6: Deploy de Secrets no Fly.io

**Files:** (nenhum — apenas comandos de deploy)

**Pré-requisito:** Task 3 mergeada + microserviço rodando com `NEXTJS_BASE_URL`.

- [ ] **Step 1: Adicionar secret no Fly.io**

```bash
cd microservice
fly secrets set NEXTJS_BASE_URL=https://bolao-copa.vercel.app
```

(Usar URL de produção do Next.js. Se tiver preview branches, usar a main.)

- [ ] **Step 2: Verificar `CRON_SECRET` já existe**

```bash
fly secrets list | grep CRON_SECRET
```

Expected: já deve existir (mesmo segredo que GH Actions usa).

- [ ] **Step 3: Validar healthcheck**

```bash
fly logs --app bolao-copa-microservice | head -50
fly status --app bolao-copa-microservice
```

Expected: app rodando, sem crash.

- [ ] **Step 4: Testar propagação end-to-end em produção**

Disparar sync manual:
```bash
curl -i -X POST https://bolao-copa-microservice.fly.dev/resultados/sincronizar \
  -H "X-Cron-Secret: <secret>"
```

Verificar logs do Next.js (Vercel dashboard) ou do microserviço (Fly logs):
```
[bracket_client] bracket atualizado: N slots preenchidos
```

Abrir `https://<dominio>/copa` — jogos de oitavas devem ter `timeA`/`timeB` preenchidos.

---

### Task 7: Commit Final + PR

- [ ] **Step 1: Abrir PR**

```bash
git checkout -b feat/wire-bracket-no-sync
git push -u origin feat/wire-bracket-no-sync
gh pr create --title "feat(sync): propagar bracket automaticamente após sync" --body "$(cat <<'EOF'
## Summary
- Cria endpoint `/api/admin/bracket/atualizar` com auth duplo (cookie admin + X-Cron-Secret)
- Wire no sync legado Next.js (admin manual) e no microserviço Python (auto-sync)
- Fallback SSR em `/copa/page.tsx` garante página sempre atualizada
- Microserviço notifica Next.js via HTTP após cada sync bem-sucedido

## Root cause
`atualizarBracket()` existia mas não era chamado em lugar nenhum de produção.
Quando 16 avos terminavam, `vencedor` era gravado no jogo, mas ninguém
propagava esse vencedor como `timeA`/`timeB` pro jogo da fase seguinte.

## Test plan
- [ ] `npm test` — todos os testes existentes + novos do endpoint admin
- [ ] `cd microservice && uv run pytest` — todos os testes existentes + novos do bracket_client
- [ ] Deploy em preview + sync manual → jogos de oitavas devem ter times preenchidos
- [ ] Acessar `/copa` → bracket mostra classificados corretos

## Secrets necessários (post-merge)
- `fly secrets set NEXTJS_BASE_URL=https://bolao-copa.vercel.app`
EOF
)"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Endpoint admin com auth service-to-service → Task 1
- [x] Wire no sync legado → Task 2
- [x] Wire no microserviço → Task 3
- [x] Fallback SSR → Task 4
- [x] Documentação → Task 5
- [x] Deploy → Task 6

**Placeholder scan:** sem "TBD", "TODO", "implementar depois". Cada step tem código completo ou comando exato.

**Type consistency:**
- `atualizarBracket()`: mesma assinatura em Tasks 1, 2, 3, 4
- `notificar_bracket()`: mesma assinatura em Tasks 3, 5
- `X-Cron-Secret`: mesmo header em Tasks 1, 3
- `NEXTJS_BASE_URL`: mesmo env var em Tasks 3, 5, 6
