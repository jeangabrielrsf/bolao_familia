<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Bolão Copa 2026 — Project Context

## O que é

Bolão familiar da Copa do Mundo FIFA 2026. Site **informativo** (somente leitura para participantes) onde o admin carrega planilhas Excel com os palpites de cada participante para 33 jogos da fase de grupos + 5 palpites extras (artilheiro, campeão, vice, 3º, 4º). Participantes **NÃO** fazem palpites pelo site — tudo é importado via upload de planilha pelo admin.

## Stack

- **Frontend/API:** Next.js 16.2.7, React 19, TypeScript 5, Tailwind CSS 4
- **ORM/DB:** Prisma 7.8 com `@prisma/adapter-pg`, PostgreSQL
- **Auth:** JWT customizado (`jose`) + `bcryptjs`, cookie `admin_session`, middleware protege `/admin/*`
- **Storage:** Supabase (buckets `planilhas` e `fotos`)
- **Parsing:** `xlsx` (Excel), `sharp` (imagens), OpenRouter/GPT-4o (OCR)
- **Microserviço:** Python FastAPI (`microservice/`) — scraping SofaScore, deploy Fly.io (região `gru`)
- **Testes:** Jest 30 + React Testing Library

## Comandos

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Build produção |
| `npm run lint` | ESLint |
| `npm test` | Jest |
| `npx prisma generate` | Gerar Prisma Client |
| `npx prisma migrate dev` | Migration + aplica (dev) |
| `npx prisma migrate deploy` | Aplica migrations (prod) |
| `npx tsx --env-file=.env scripts/seed.ts` | Popular 72 jogos + config pontuação |
| `npx tsx --env-file=.env scripts/seed-admin.ts` | Criar hash da senha admin |

## Planilha do Bolão (`planilha/Bolão Copa do Mundo 2026.xlsx`)

Formato da planilha que cada participante preenche:
- **33 jogos** da fase de grupos: placar coluna C e E, com "x" na coluna D separando os times
- **5 extras** nas linhas 42-46 (0-indexed): artilheiro, quarto, terceiro, vice, campeao (coluna C)
- O parser (`src/lib/services/upload/excel-parser.ts`) identifica linhas de jogo pela coluna D="x"

## Sistema de Pontuação

| Palpite | Pontos (padrão) |
|---------|-----------------|
| Placar exato | 10 |
| Vencedor correto (sem placar exato) | 6 |
| Campeão/Vice/3º/4º/Artilheiro | 10 cada |
| **Máximo teórico** | **380** |

**Desempate:** 1) mais placares exatos → 2) mais vencedores corretos

Lógica em `src/lib/utils/helpers.ts` (`calcularPontosJogo`, `calcularPontosExtra`). Configuração editável pelo admin em `/admin/config`, armazenada na tabela `configuracoes`.

## Modelos do Banco (Prisma — `prisma/schema.prisma`)

| Modelo | Tabela | Descrição |
|--------|--------|-----------|
| `Participante` | `participantes` | nome (unique), fotoUrl opcional |
| `Jogo` | `jogos` | fase (enum: grupos→final), grupo, times, resultado, status, sofascoreId |
| `Palpite` | `palpites` | placarA/placarB por participante+jogo (unique pair), fonte (excel/foto) |
| `PalpiteExtra` | `palpites_extras` | tipo (artilheiro/campeao/vice/terceiro/quarto), valor string |
| `ResultadoExtra` | `resultados_extras` | resultado oficial dos extras |
| `Configuracao` | `configuracoes` | chave/valor (pontuação) |
| `AdminAuth` | `admin_auth` | senhaHash |
| `UploadLog` | `upload_logs` | histórico de uploads |

## Estrutura de Diretórios

```
src/app/
  (public)/          → rotas públicas: home, participantes, jogos, ranking, regras
  admin/             → painel admin: login, dashboard, upload, participantes, jogos, resultados, config
  api/               → API routes: jogos, participantes, ranking, resultados, upload, admin/*
src/components/
  ui/                → primitivos: Button, Card, Input, Modal, Table, Badge, Select, Tabs
  layout/            → Header, Footer, Navigation
  public/            → GameCard, RankingTable, ParticipantCard
  admin/             → UploadForm, PreviewTable, StatsCard
src/lib/
  auth/              → session.ts (JWT), password.ts (bcrypt), middleware.ts
  db/                → client.ts (Prisma singleton), queries/ (config, jogos, participantes, ranking, resultados)
  services/
    upload/          → excel-parser.ts, ocr-vision.ts, validator.ts
    storage/         → supabase.ts
    resultados/      → client.ts (HTTP pro microserviço)
    scoring/         → calculator (testes)
  utils/             → constants.ts, types.ts, helpers.ts
microservice/        → FastAPI + curl_cffi (scraping SofaScore), deploy Fly.io
scripts/             → seed.ts (jogos + config), seed-admin.ts
planilha/            → Bolão Copa do Mundo 2026.xlsx (template)
docs/superpowers/    → specs e plans (superpowers workflow)
```

## Fluxo de Upload (Admin)

1. Admin seleciona participante + arquivo (Excel, imagem ou PDF)
2. `POST /api/upload` → parse (excel-parser / ocr-vision / pdf-parser) → validação → retorna preview
3. Admin revisa/edita preview na UI
4. `POST /api/admin/upload/confirm` → salva palpites no DB + arquiva arquivo no Supabase Storage

## Resultados ao Vivo

Microserviço Python em `microservice/` faz scraping do SofaScore via `curl_cffi`. Admin dispara sync em `/admin/resultados`. Cliente HTTP em `src/lib/services/resultados/client.ts` chama `POST /resultados/lote`.

## Variáveis de Ambiente

Ver `.env.example`. Obrigatórias: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ADMIN_PASSWORD`, `SESSION_SECRET`. Condicionais: `OPENROUTER_API_KEY` (OCR), `MICROSERVICE_URL` (resultados ao vivo).

## Trabalho Pendente

- **Upload de PDF:** spec em `docs/superpowers/specs/2026-06-09-pdf-upload-design.md`, plan em `docs/superpowers/plans/2026-06-09-pdf-upload.md`. Usar `pdfjs-dist` para renderizar páginas como imagens e enviar ao OCR.

## Convenções

- Idioma: **Português Brasileiro** (nomes de tabelas, campos, mensagens, UI)
- Colunas DB usam snake_case com `@map` (ex: `placarA` → `placar_a`)
- Enums em português: `grupos`, `oitavas`, `quartas`, `semifinal`, `terceiro`, `final`
- API routes seguem padrão REST: GET (listar), POST (criar), PUT (atualizar), DELETE (remover)
- Rotas admin protegidas por `requireAdmin()` em `src/lib/auth/middleware.ts`
- Ranking calculado on-the-fly (não armazenado), em `src/lib/db/queries/ranking.ts`
- Commit messages: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`)
