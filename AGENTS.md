<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Bolão Copa 2026 — Project Context

## O que é

Bolão familiar da Copa do Mundo FIFA 2026. Sistema onde o admin carrega planilhas Excel com os palpites de cada participante para 33 jogos da fase de grupos + 5 palpites extras (artilheiro, campeão, vice, 3º, 4º). Participantes podem **completar os 39 jogos restantes** via link personalizado com token (`/completar/{token}`), acessível pelo WhatsApp.

### Formato da Copa 2026

A Copa do Mundo 2026 terá **104 jogos** distribuídos em **13 fases**, com 48 seleções:

| Fase                | Jogos   | Detalhe                              |
| ------------------- | ------- | ------------------------------------ |
| Fase de Grupos      | 72      | 12 grupos de 4 seleções              |
| 16 avos de final    | 16      | 32 seleções (nova fase eliminatória) |
| Oitavas de final    | 8       |                                      |
| Quartas de final    | 4       |                                      |
| Semifinais          | 2       |                                      |
| Disputa do 3º lugar | 1       |                                      |
| Final               | 1       |                                      |
| **Total**           | **104** |                                      |

**Upload em Lote:** Suporta upload de planilhas multi-abas, onde cada aba contém os palpites de um participante (ou múltiplos palpites do mesmo participante). O sistema cria automaticamente grupos de palpites (`PalpiteGrupo`) para cada aba, permitindo que um participante tenha vários conjuntos de palpites.

## Stack

- **Frontend/API:** Next.js 16.2.7, React 19, TypeScript 5, Tailwind CSS 4
- **ORM/DB:** Prisma 7.8 com `@prisma/adapter-pg`, PostgreSQL
- **Auth:** JWT customizado (`jose`) + `bcryptjs`, cookie `admin_session`, middleware protege `/admin/*`
- **Storage:** Supabase (buckets `fotos` e `palpites`)
- **Parsing:** `xlsx` (Excel), `sharp` (imagens), OpenCode Go/Qwen3.7 Plus (OCR)
- **Microserviço:** Python FastAPI (`microservice/`) — football-data.org (primário) + worldcup26.ir (fallback), deploy Fly.io (região `gru`)
- **Testes:** Jest 30 + React Testing Library

## Comandos

| Comando                                         | Descrição                           |
| ----------------------------------------------- | ----------------------------------- |
| `npm run dev`                                   | Dev server (Turbopack)              |
| `npm run build`                                 | Build produção                      |
| `npm run lint`                                  | ESLint                              |
| `npm test`                                      | Jest                                |
| `npx prisma generate`                           | Gerar Prisma Client                 |
| `npx prisma migrate dev`                        | Migration + aplica (dev)            |
| `npx prisma migrate deploy`                     | Aplica migrations (prod)            |
| `npx tsx --env-file=.env scripts/seed.ts`       | Popular 72 jogos + config pontuação |
| `npx tsx --env-file=.env scripts/seed-admin.ts` | Criar hash da senha admin           |
| `./scripts/setup-test-db.sh`                    | Sobe Postgres local + dump Supabase |
| `./scripts/teardown-test-db.sh`                 | Remove container e volume           |
| `./scripts/test-sync.sh`                        | Testa sync end-to-end contra DB local |

## Planilha do Bolão (`planilha/Bolão Copa do Mundo 2026.xlsx`)

Formato da planilha que cada participante preenche:

- **33 jogos** da fase de grupos: placar coluna C e E, com "x" na coluna D separando os times
- **5 extras** nas linhas 42-46 (0-indexed): artilheiro, quarto, terceiro, vice, campeao (coluna B)
- O parser (`src/lib/services/upload/excel-parser.ts`) identifica linhas de jogo pela coluna D="x"

## Sistema de Pontuação

| Palpite                             | Pontos (padrão) |
| ----------------------------------- | --------------- |
| Placar exato                        | 10              |
| Vencedor correto (sem placar exato) | 6               |
| Campeão/Vice/3º/4º/Artilheiro       | 10 cada         |
| **Máximo teórico**                  | **770**         |

**Desempate:** 1) mais placares exatos → 2) mais vencedores corretos

Lógica em `src/lib/utils/helpers.ts` (`calcularPontosJogo`, `calcularPontosExtra`). Configuração editável pelo admin em `/admin/config`, armazenada na tabela `configuracoes`.

## Fuso Horário

**Todos os horários são exibidos em horário de Brasília (`America/Sao_Paulo`, UTC-3).**

### Armazenamento

- Horários dos jogos são armazenados em **UTC** no banco (`TIMESTAMP` sem timezone)
- O seed (`scripts/seed.ts`) converte horários locais das sedes → UTC usando o offset da cidade
- Mapeamento de cidades em `CITY_OFFSET_HOURS` no seed (junho/julho 2026 = horário de verão das sedes)

### Exibição

- **Nunca usar** `toLocaleDateString/Time` diretamente nos componentes
- Usar as funções de `src/lib/utils/date.ts`:
  - `formatarData(data)` → `dd/mm`
  - `formatarHora(data)` → `hh:mm`
  - `formatarDataHoraCompleta(data)` → `dd/mm/yyyy hh:mm`
- Todas forçam `timeZone: 'America/Sao_Paulo'` no `toLocaleString`

### Queries de "jogos do dia"

- `getJogosDoDia()` em `src/lib/db/queries/jogos.ts` usa `inicioDiaBrasilia()` / `fimDiaBrasilia()`
- Calcula início/fim do dia em horário de Brasília, independente do timezone do servidor

## Modelos do Banco (Prisma — `prisma/schema.prisma`)

| Modelo           | Tabela              | Descrição                                                                                                                                    |
| ---------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `Participante`   | `participantes`     | nome (unique), fotoUrl opcional, token (UUID único para link de completar)                                                                   |
| `PalpiteGrupo`   | `palpites_grupos`   | Grupo de palpites (participante pode ter vários), unique(participanteId, nome)                                                               |
| `Jogo`           | `jogos`             | fase (enum: grupos→final), grupo, times, resultado, status, isBolao, sofascoreId, local, cidade, vencedor, rankingTimeA/B, placarPenaltisA/B |
| `Palpite`        | `palpites`          | placarA/placarB por grupo+jogo (unique pair), fonte (excel/foto/pdf)                                                                         |
| `PalpiteExtra`   | `palpites_extras`   | tipo (artilheiro/campeao/vice/terceiro/quarto), valor string, por grupo                                                                      |
| `ResultadoExtra` | `resultados_extras` | resultado oficial dos extras                                                                                                                 |
| `Configuracao`   | `configuracoes`     | chave/valor (pontuação, prazo_completar_bolao, completar_bolao_habilitado)                                                                   |
| `AdminAuth`      | `admin_auth`        | senhaHash                                                                                                                                    |
| `UploadLog`      | `upload_logs`       | histórico de uploads                                                                                                                         |

## Estrutura de Diretórios

```
src/app/
  (public)/          → rotas públicas: home, participantes, jogos, ranking, regras
    completar/[token]/ → página do participante para completar palpites restantes
  admin/             → painel admin: login, dashboard, upload, participantes, jogos, resultados, config
    completar-bolao/   → dashboard de completar bolão (status, sortear, configs)
    participantes/[id]/editar-palpites/ → admin edita palpites de participante
  api/               → API routes: jogos, participantes, ranking, resultados, upload, admin/*
    token/[token]/     → valida token do participante
    completar/[token]/ → listar jogos e salvar palpites do participante
    admin/completar-bolao/ → status, sortear palpites
    admin/config/completar-bolao/ → atualizar prazo e toggle
    admin/participantes/[id]/palpites/ → admin edita palpites
src/components/
  ui/                → primitivos: Button, Card, Input, Modal, Table, Badge, Select, Tabs
  layout/            → Header, Footer, Navigation
  public/            → GameCard, RankingTable, ParticipantCard, Hero
  admin/             → UploadForm, PreviewTable, StatsCard, UploadModeSelector, BatchPreviewTabs
src/lib/
  auth/              → session.ts (JWT), password.ts (bcrypt), middleware.ts
  db/                → client.ts (Prisma singleton), queries/ (config, jogos, participantes, ranking, resultados, completar-bolao)
  services/
    upload/          → excel-parser.ts, ocr-vision.ts, validator.ts
    storage/         → supabase.ts
    resultados/      → client.ts (HTTP pro microserviço)
    scoring/         → calculator (testes)
  utils/             → constants.ts, types.ts, helpers.ts, date.ts (formatação timezone Brasília)
microservice/        → FastAPI + football-data.org + worldcup26.ir, deploy Fly.io
scripts/             → seed.ts (jogos + config), seed-admin.ts
planilha/            → Bolão Copa do Mundo 2026.xlsx (template)
docs/superpowers/    → specs e plans (superpowers workflow)
```

## Fluxo de Upload (Admin)

### Upload Individual

1. Admin seleciona participante + arquivo (Excel, imagem ou PDF)
2. `POST /api/upload` → parse (excel-parser / ocr-vision / pdf-parser) → validação → retorna preview
3. Admin revisa/edita preview na UI
4. `POST /api/admin/upload/confirm` → cria/atualiza PalpiteGrupo + salva palpites no DB + arquiva arquivo no Supabase Storage

### Upload em Lote (Multi-Abas)

1. Admin seleciona arquivo Excel com múltiplas abas (cada aba = um grupo de palpites)
2. `POST /api/upload/lote` → parseExcelMultiSheet → valida cada grupo → retorna preview com tabs
3. Admin revisa preview (tabs por grupo, badges "existente"/"novo")
4. `POST /api/admin/upload/confirm-lote` → busca/cria participantes, busca/cria PalpiteGrupos, salva palpites

**Parser Multi-Abas:** `parseExcelMultiSheet(buffer, jogosIds)` em `src/lib/services/upload/excel-parser.ts`

- Filtra aba "Modelo" (case-insensitive)
- Extrai nome do participante e apelido do grupo do nome da aba (regex sufixo: "Leo 1", "João - Palpite 2", etc.)
- Retorna `PalpiteGrupoParsed[]` com palpites e extras de cada aba

## Completar Bolão (Participantes)

Sistema que permite aos participantes preencherem os 39 jogos restantes da fase de grupos (`isBolao=false`) diretamente no site.

### Fluxo

1. Admin envia link `/completar/{token}` via WhatsApp
2. Participante acessa, valida token, verifica prazo
3. Preenche placares dos 39 jogos restantes
4. Rascunhos salvos automaticamente no localStorage
5. Após salvar todos os 39 jogos, página fica em modo somente leitura
6. Se precisar alterar, deve contatar o admin

### Funcionalidades

- **Múltiplos palpites**: Abas para cada `PalpiteGrupo` do participante
- **Persistência**: Auto-save no localStorage (`bolao_draft_{token}_{grupoId}`)
- **Indicadores**: Badge "Não salvo", ponto laranja nas abas com alterações
- **Descartar**: Botão para reverter alterações não salvas
- **Prazo**: Configurável pelo admin (`prazo_completar_bolao` na tabela `configuracoes`)
- **Toggle**: Admin pode habilitar/desabilitar coleta (`completar_bolao_habilitado`)
- **Sorteio**: Admin pode sortear palpites aleatórios para participantes incompletos

### Queries (`src/lib/db/queries/completar-bolao.ts`)

- `getParticipanteByToken(token)` - busca participante com grupos e palpites
- `getJogosRestantes()` - 39 jogos com `isBolao=false` e `fase=grupos`
- `getConfigCompletarBolao()` - prazo e toggle
- `getPalpitesPorGrupo(grupoId)` - palpites de um grupo específico
- `getGruposParticipante(participanteId)` - lista grupos do participante
- `salvarPalpitesCompletar(participanteId, palpites, grupoId?)` - salva palpites
- `getStatusCompletarBolao()` - status de todos participantes (admin)
- `sortearPalpites(participanteIds)` - sorteia palpites aleatórios (admin)
- `getJogosRestantesComPalpites(participanteId, grupoId?)` - jogos + palpites existentes

## Resultados ao Vivo

Microserviço Python em `microservice/` busca resultados de duas APIs e **escreve direto no Supabase**:
- **football-data.org** (primário): API gratuita com 10 req/min, retorna placar, status, local, vencedor, penalidades
- **worldcup26.ir** (fallback): API gratuita sem API key, usada quando football-data.org não tem dados

### Arquitetura

```
Trigger (admin manual / cron)
    ↓
POST /resultados/sincronizar (microserviço)
    ↓ valida X-Cron-Secret
    ↓ adquire pg_try_advisory_xact_lock
    ↓
busca jogos ativos (sofascore_id, últimas Xh)
    ↓
fetch APIs externas (football-data + worldcup26)
    ↓
match_game() por grupo + dataHora (tolerância 3h)
    ↓
sync_writer.sincronizar_jogos() — UPDATE idempotente
    ↓
retorna { atualizados, finalizados, mudancas[] }
```

### Endpoints

- **`POST /resultados/lote`** (`microservice/app/routers/resultados.py`) — recebe jogos do Next.js, retorna resultados das APIs. **Read-only** (não escreve DB). Usado pelo admin manual.
- **`POST /resultados/sincronizar`** — busca jogos do DB, busca APIs, escreve DB. Usado por cron / auto-sync. Autentica via header `X-Cron-Secret`.

### Lógica de Comparação e Escrita

`microservice/app/services/sync_writer.py` — migrada de `src/app/api/resultados/sync/route.ts` (linhas 64-178):

- Filtra `not_found` e valida `finished` (resultadoA/B inteiros ≥ 0)
- Para cada resultado: calcula novos valores, compara com jogo atual
- Atualiza apenas o que mudou (placar/status/local/cidade)
- Preserva `local`/`cidade` quando API não retorna
- UPDATE em transação por jogo (lock adquirido antes)

### Garantias

- **Idempotência**: rodar 2x seguidas = mesmo resultado. UPDATE condicional só escreve se houve mudança.
- **Concorrência**: `pg_try_advisory_xact_lock(987654321)` impede execuções paralelas. Segunda chamada retorna `skipped: 'sync_already_running'`.
- **Auth**: header `X-Cron-Secret` deve bater com env `CRON_SECRET`. Sem secret = 401.

### Conexão com o Banco

- `asyncpg` pool (1-5 conexões)
- Helper `with_db_tx()` para transações
- Lock key: `settings.LOCK_KEY_RESULTADOS_SYNC` (constante)

### Match de Jogos

- Fase de grupos: match por `grupo` + `dataHora` (tolerância 3h)
- Mata-mata: match por nome dos times (dicionário PT→EN)
- Merge de dados: football-data.org para `local`, worldcup26.ir para `cidade` se faltando
- `data_hora` no DB é naive (UTC por convenção); convertido para offset-aware antes do match

### Janela de Jogos Ativos

Endpoint `/resultados/sincronizar` busca jogos com:
- `sofascore_id IS NOT NULL`
- `data_hora >= NOW() - INTERVAL 'X hours'` (default 12h, configurável via header `X-Window-Hours`)
- `data_hora <= NOW() + INTERVAL '6 hours'` (cobre jogos que ainda não começaram)

### Arquivos Principais

- `microservice/app/services/football_data.py` - serviço football-data.org
- `microservice/app/services/worldcup26.py` - serviço worldcup26.ir com mapeamento de fusos
- `microservice/app/services/sync_writer.py` - **lógica de comparação + UPDATE no DB**
- `microservice/app/services/db.py` - pool asyncpg + `with_db_tx()`
- `microservice/app/routers/resultados.py` - endpoints `/lote` (read) + `/sincronizar` (write)
- `src/lib/services/resultados/client.ts` - cliente HTTP (apenas para admin manual futuro)
- `src/app/api/resultados/sync/route.ts` - API route admin manual (legado, ainda funciona)

## Banco de Dados de Teste Local

Para testar mudanças no sync sem tocar em produção, há um ambiente isolado via Docker.

### Componentes

- **Container:** `bolao-test-db` (Postgres 17, porta `5433:5432`)
- **Source:** dump do Supabase via `pg_dump` (read-only)
- **Restore:** SQL puro dentro do container, schemas internos do Supabase excluídos
- **Connection:** `postgresql://postgres:test@localhost:5433/bolao_test`

### Scripts

| Script | Função |
|--------|--------|
| `scripts/setup-test-db.sh` | Sobe container + dump + restore (idempotente) |
| `scripts/teardown-test-db.sh` | Remove container + volume |
| `scripts/test-sync.sh` | Testa sync end-to-end (snapshot antes/depois + diff + idempotência + lock) |
| `docker-compose.test.yml` | Define o container |
| `.env.test` | `DATABASE_URL` apontando pro container, `CRON_SECRET=test-secret-local` |
| `tmp/.gitignore` | Garante que backup.sql e snapshots não vão pro git |

### Pegadinhas conhecidas

1. **Postgres 17** (não 16) — versão deve casar com Supabase, senão `pg_dump: server version mismatch`.
2. **`DATABASE_URL` (Supavisor Session Pooler)**, não `DIRECT_URL` — direct é IPv6-only e container Docker sem rota IPv6 não alcança. Supavisor é IPv4-compatible. Doc oficial: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
3. **Resolução IPv4 forçada** via `hostaddr=` na connection string — Docker pode tentar IPv6 primeiro.
4. **`pg_dump` roda dentro do container** — não está instalado no host, mas a imagem `postgres:17-alpine` tem.

### Garantias de Isolamento

- Container em porta `5433` (não `5432`) — não conflita com Postgres local
- Credenciais próprias (`postgres/test`) — separado de qualquer outro DB
- Volume Docker nomeado — isolado do filesystem do host
- `DATABASE_URL` aponta pra `localhost:5433` no `.env.test` — microserviço nunca conecta no Supabase
- Backup em `tmp/backup.sql` (gitignored) — pode ser apagado sem risco

### Como Usar

```bash
# 1. Subir DB de teste (idempotente)
./scripts/setup-test-db.sh

# 2. Subir microserviço apontando pro DB local
cd microservice
DATABASE_URL=postgresql://postgres:test@localhost:5433/bolao_test \
  FOOTBALL_DATA_API_KEY=<key> \
  CRON_SECRET=test-secret-local \
  .venv/bin/uvicorn app.main:app --port 8765

# 3. Testar
curl -X POST -H "X-Cron-Secret: test-secret-local" http://127.0.0.1:8765/resultados/sincronizar
# ou
./scripts/test-sync.sh

# 4. Limpar
./scripts/teardown-test-db.sh
```

## Auto-Sync de Resultados (Cron)

Spec detalhada em `docs/superpowers/specs/2026-06-12-auto-sync-resultados-design.md`. Resumo das decisões:

- **Trigger:** GitHub Actions cron (não Vercel Cron) — delay 10-30min da API exigia frequência <1x/dia, e Vercel Cron Hobby limita a 1x/dia por expressão.
- **Frequência:** `*/15` em janelas de jogos BRT (13h-23h + 0h-4h UTC) — atraso máx ~25min entre API atualizar e usuário ver.
- **Scheduler alternativo descartado:** Vercel Pro ($20/mês), APScheduler no FastAPI (perde schedule em restart), Fly.io scheduled machines (custo).
- **Endpoint target:** `POST /resultados/sincronizar` no microserviço (autentica, adquire lock, escreve DB).
- **Bypass do Next.js:** o auto-sync não passa pelo Next.js. Admin manual pode continuar via Next.js (legado) ou via curl direto.

### Propagação do Bracket (times pras próximas fases)

Após cada sync bem-sucedido de resultados, o microserviço chama `POST /api/admin/bracket/atualizar` no Next.js (via `X-Cron-Secret`). Esse endpoint executa `atualizarBracket()` — lê classificação dos grupos, projeta o chaveamento, grava `timeA`/`timeB` dos jogos mata-mata.

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

Fallback: `/copa/page.tsx` também chama `atualizarBracket()` no SSR (cache 60s), então mesmo sem sync recente a página mostra dados atualizados.

**Status:** ✅ **Implementado, pendente deploy.**

Pendente: adicionar `NEXTJS_BASE_URL` como secret no Fly.io (`fly secrets set NEXTJS_BASE_URL=https://bolao-copa.vercel.app`) e fazer redeploy.

### Infraestrutura Existente (Auto-Sync)

**Status:** ✅ **Implementado e deployado em produção.**

- Pendente: adicionar `MICROSERVICE_URL` e `CRON_SECRET` como secrets no GitHub, fazer push, validar primeira execução

## Variáveis de Ambiente

Ver `.env.example`. Obrigatórias: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ADMIN_PASSWORD`, `SESSION_SECRET`. Condicionais: `OPENCODE_GO_API_KEY` (OCR), `MICROSERVICE_URL` (resultados ao vivo), `FOOTBALL_DATA_API_KEY` (API de resultados, configurada no microserviço Fly.io). **Microserviço também precisa:** `NEXTJS_BASE_URL` (URL do Next.js, pra notificar bracket após sync).

## Trabalho Pendente

- **Auto-Sync de Resultados (GitHub Actions):** ✅ Deployado, falta adicionar secrets no GitHub (`MICROSERVICE_URL` + `CRON_SECRET`) e validar primeira execução. Spec completa em `docs/superpowers/specs/2026-06-12-auto-sync-resultados-design.md`.
- **Upload de PDF:** Implementado com `pdfjs-dist` + `@napi-rs/canvas` para converter PDF em imagens PNG, depois OCR via OpenCode Go/Qwen3.7 Plus.
- **Refator do endpoint admin `/api/resultados/sync` (Next.js):** Migrar para usar a mesma service function que o endpoint auto-sync do microserviço, eliminando a duplicação de lógica de comparação (atualmente existe em Next.js `route.ts` e Python `sync_writer.py`).

## Operações no Supabase

Use o MCP do Supabase para todas as operações diretas no banco e storage:

Use o MCP do Supabase para todas as operações diretas no banco e storage:

- **Queries SQL:** `supabase_execute_sql` — para SELECT, INSERT, UPDATE, criar buckets, etc.
- **Migrations:** `supabase_apply_migration` — para DDL (CREATE TABLE, ALTER TABLE, etc.)
- **Buckets Storage:** criar via SQL (`INSERT INTO storage.buckets`) ou usar `supabase_execute_sql`
- **Edge Functions:** `supabase_deploy_edge_function`, `supabase_list_edge_functions`
- **Logs:** `supabase_get_logs`
- **Advisors:** `supabase_get_advisors` (security/performance)

**NÃO use** `curl` direto para o Supabase — use as ferramentas MCP.
**NÃO use** operações de DELETE.

## Convenções

- Idioma: **Português Brasileiro** (nomes de tabelas, campos, mensagens, UI)
- Colunas DB usam snake_case com `@map` (ex: `placarA` → `placar_a`)
- Enums em português: `grupos`, `oitavas`, `quartas`, `semifinal`, `terceiro`, `final`
- API routes seguem padrão REST: GET (listar), POST (criar), PUT (atualizar), DELETE (remover)
- Rotas admin protegidas por `requireAdmin()` em `src/lib/auth/middleware.ts`
- Ranking calculado on-the-fly (não armazenado), em `src/lib/db/queries/ranking.ts`
- Commit messages: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`)
