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

Microserviço Python em `microservice/` busca resultados de duas APIs:
- **football-data.org** (primário): API gratuita com 10 req/min, retorna placar, status, local, vencedor, penalidades
- **worldcup26.ir** (fallback): API gratuita sem API key, usada quando football-data.org não tem dados

### Fluxo de Sincronização

1. Admin clica "Sincronizar Resultados" em `/admin/resultados`
2. `POST /api/resultados/sync` envia contexto dos jogos (timeA, timeB, dataHora, grupo) para microserviço
3. Microserviço faz match por grupo + data (tolerância 3h para fusos horários)
4. **Comparação inteligente**: só atualiza jogos que realmente mudaram (placar, status, local, cidade)
5. Logs detalhados no console mostram antes/depois de cada mudança
6. Toast mostra resumo: quantos placares, status, locais mudaram
7. Card de resultados mostra detalhes visuais de cada mudança

### Arquivos Principais

- `microservice/app/services/football_data.py` - serviço football-data.org
- `microservice/app/services/worldcup26.py` - serviço worldcup26.ir com mapeamento de fusos
- `microservice/app/routers/resultados.py` - endpoint `/resultados/lote`
- `src/lib/services/resultados/client.ts` - cliente HTTP que envia contexto dos jogos
- `src/app/api/resultados/sync/route.ts` - API route com comparação inteligente

### Match de Jogos

- Fase de grupos: match por `grupo` + `dataHora` (tolerância 3h)
- Mata-mata: match por nome dos times (dicionário PT→EN)
- Merge de dados: football-data.org para `local`, worldcup26.ir para `cidade` se faltando

## Variáveis de Ambiente

Ver `.env.example`. Obrigatórias: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ADMIN_PASSWORD`, `SESSION_SECRET`. Condicionais: `OPENCODE_GO_API_KEY` (OCR), `MICROSERVICE_URL` (resultados ao vivo), `FOOTBALL_DATA_API_KEY` (API de resultados, configurada no microserviço Fly.io).

## Trabalho Pendente

- **Upload de PDF:** Implementado com `pdfjs-dist` + `@napi-rs/canvas` para converter PDF em imagens PNG, depois OCR via OpenCode Go/Qwen3.7 Plus.

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
