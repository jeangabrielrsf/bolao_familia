# Bolão Copa 2026

Sistema de bolão para a Copa do Mundo FIFA 2026. Permite que participantes registrem palpites para todos os 72 jogos da fase de grupos, acompanhem o ranking e resultados em tempo real. Admin pode importar palpites via upload de planilhas (Excel, fotos, PDFs) e participantes podem completar seus palpites restantes via link personalizado com token.

## Stack

### Frontend
- **Next.js 16.2.7** (App Router, Turbopack)
- **React 19.2.4**
- **TypeScript 5**
- **Tailwind CSS 4** (via `@tailwindcss/postcss`)

### Backend / API
- **Next.js API Routes** (`src/app/api/`)
- **Prisma 7.8** com driver adapter `@prisma/adapter-pg`
- **PostgreSQL** como banco de dados
- **Autenticação**: JWT customizado com `jose` + `bcryptjs` para hash de senhas
- **Middleware** (`src/middleware.ts`) protege rotas `/admin/*`

### Armazenamento de arquivos
- **Supabase** (storage para uploads de fotos e arquivos de palpites)
- **xlsx** para parsing de planilhas Excel
- **sharp** para processamento de imagens

### Microserviço (resultados ao vivo)
- **Python FastAPI** (`microservice/`)
- **football-data.org** (API primária) + **worldcup26.ir** (fallback)
- Deploy no **Fly.io** (`fly.toml` configurado para região `gru`)

### IA / Visão computacional
- **OpenCode Go** para extração de dados via modelos de visão (ex: `qwen3.7-plus`)

### Testes
- **Jest 30** + **React Testing Library**

---

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha os valores:

```bash
cp .env.example .env
```

### Referência completa

| Variável | Obrigatória | Descrição | Onde é usada |
|---|---|---|---|
| `DATABASE_URL` | Sim | String de conexão PostgreSQL. Formato: `postgresql://user:pass@host:port/dbname` | Prisma client (`src/lib/db/client.ts`), migrations, seeds |
| `SUPABASE_URL` | Sim | URL do projeto Supabase (ex: `https://xxx.supabase.co`) | Upload de arquivos no storage (`src/lib/services/storage/supabase.ts`) |
| `SUPABASE_SERVICE_KEY` | Sim | Chave service role do Supabase (bypass RLS) | Upload server-side com permissões totais |
| `ADMIN_PASSWORD` | Sim | Senha do painel administrativo | Script `seed-admin.ts` para criar hash inicial |
| `SESSION_SECRET` | Sim | Segredo para assinatura JWT (mínimo 32 caracteres) | `src/lib/auth/session.ts` - gera e valida tokens de sessão |
| `OPENCODE_GO_API_KEY` | Condicional | Chave da API OpenCode Go | OCR de fotos/PDFs (`src/lib/services/upload/ocr-vision.ts`) - necessário se usar upload de fotos ou PDFs |
| `VISION_MODEL` | Não | Modelo de visão para OCR. Padrão: `qwen3.7-plus` | Mesmo arquivo acima |
| `MICROSERVICE_URL` | Condicional | URL do microserviço de resultados | Sync de resultados ao vivo (`src/lib/services/resultados/client.ts`) - só needed se usar resultados automáticos |
| `FOOTBALL_DATA_API_KEY` | Condicional | Chave da API football-data.org | Configurada no microserviço Fly.io (`fly secrets set`) |

### Gerar SESSION_SECRET

```bash
openssl rand -base64 32
```

### Variáveis removidas

- `SUPABASE_ANON_KEY`: não é usada no código. O client usa `SUPABASE_SERVICE_KEY` para uploads server-side.
- `NEXT_PUBLIC_SITE_URL`: não é usada no código.

---

## Configuração do projeto

### Pré-requisitos
- **Node.js 20+**
- **npm** (ou yarn/pnpm/bun)
- **PostgreSQL 15+** (Docker local ou Supabase)
- **Python 3.11+** (apenas se for rodar o microserviço localmente)

### Opção A: PostgreSQL com Docker (desenvolvimento local)

Se não tiver PostgreSQL instalado, use Docker:

```bash
docker run --name bolao-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=bolao_copa \
  -p 5433:5432 \
  -v bolao-data:/var/lib/postgresql/data \
  -d postgres:16
```

> Porta host `5433` para evitar conflito com outros containers na porta `5432`. Ajuste se necessário.

No `.env`, use:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/bolao_copa"
```

Comandos úteis:
```bash
# Parar container
docker stop bolao-postgres

# Iniciar container parado
docker start bolao-postgres

# Ver logs
docker logs -f bolao-postgres

# Remover container (dados no volume bolao-data são preservados)
docker rm -f bolao-postgres
```

### Opção B: Supabase (produção ou desenvolvimento)

O Supabase oferece PostgreSQL gerenciado gratuitamente (500MB no plano free). Ideal para produção e também pode ser usado localmente.

#### Criar projeto Supabase

1. Acesse [supabase.com](https://supabase.com) e crie conta (ou login)
2. Clique em **New Project**
3. Configure:
   - **Organization**: sua organização
   - **Name**: `bolao-copa` (ou outro nome)
   - **Database Password**: gere uma senha forte e **guarde** (será usada na `DATABASE_URL`)
   - **Region**: escolha a mais próxima (ex: `South America (São Paulo)`)
4. Clique em **Create new project** (aguarde ~2 min)

#### Obter DATABASE_URL

1. No painel Supabase, vá em **Settings** (ícone de engrenagem na sidebar)
2. Clique em **Database**
3. Em **Connection string**, selecione o modo **URI**
4. Copie a string (formato: `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`)
5. Substitua `[PASSWORD]` pela senha que você criou

No `.env`:
```
DATABASE_URL="postgresql://postgres:SUA_SENHA@db.abcdefghijk.supabase.co:5432/postgres"
```

#### Obter credenciais do Supabase (para storage)

1. Em **Settings > API**
2. Copie:
   - **Project URL** → `SUPABASE_URL`
   - **service_role secret** → `SUPABASE_SERVICE_KEY`

> **Importante**: use a `service_role key`, NÃO a `anon key`. A service role bypassa Row Level Security (RLS), necessário para uploads server-side.

No `.env`:
```
SUPABASE_URL="https://abcdefghijk.supabase.co"
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Criar buckets no Supabase Storage

1. No painel, vá em **Storage** (sidebar)
2. Clique em **New bucket**
3. Crie os buckets necessários:
   - `fotos` - para fotos de perfil dos participantes
   - `palpites` - para arquivar arquivos de upload (Excel, PDF, imagens)
4. Configure como **Public** (para que as URLs sejam acessíveis)

#### Testar Supabase localmente

Antes de fazer deploy, teste a conexão com Supabase localmente:

```bash
# 1. Configure DATABASE_URL do Supabase no .env

# 2. Teste a conexão
npx prisma migrate deploy

# 3. Rode os seeds
npx tsx --env-file=.env scripts/seed.ts
npx tsx --env-file=.env scripts/seed-admin.ts

# 4. Inicie o dev server
npm run dev
```

Se tudo funcionar, o banco Supabase está configurado corretamente.

### Instalação

```bash
# Instalar dependências
npm install

# Gerar Prisma Client
npx prisma generate
```

### Banco de dados

```bash
# Rodar migrações (cria tabelas no PostgreSQL)
npx prisma migrate deploy

# OU, em desenvolvimento (cria migration + aplica):
npx prisma migrate dev

# Popular banco com jogos da fase de grupos + configuração de pontuação
npx tsx --env-file=.env scripts/seed.ts

# Criar senha do admin (usa ADMIN_PASSWORD do .env)
npx tsx --env-file=.env scripts/seed-admin.ts
```

---

## Rodando localmente

### Aplicação Next.js

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

- Área pública: `/` (ranking, jogos, palpites)
- Painel admin: `/admin/login` (protegido por senha)

### Microserviço (opcional, para resultados ao vivo)

O microserviço Python busca resultados de duas APIs:
- **football-data.org** (primária): API gratuita com placar, status, local, vencedor, penalidades
- **worldcup26.ir** (fallback): API gratuita sem API key, usada quando football-data.org não tem dados

#### Configuração

```bash
cd microservice

# Criar venv Python
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate   # Windows

# Instalar dependências
pip install -r requirements.txt

# Rodar
uvicorn app.main:app --reload --port 8000
```

No `.env` do projeto principal:
```
MICROSERVICE_URL="http://localhost:8000"
```

Para produção, configure a API key no Fly.io:
```bash
fly secrets set FOOTBALL_DATA_API_KEY=sua-chave
```

---

## Estrutura do projeto

```
├── prisma/
│   └── schema.prisma          # Modelos: Participante, Jogo, Palpite, PalpiteExtra, etc.
├── scripts/
│   ├── seed.ts                # Popula jogos da fase de grupos
│   └── seed-admin.ts          # Cria credenciais do admin
├── microservice/              # FastAPI - scraping de resultados (Fly.io)
├── src/
│   ├── app/
│   │   ├── (public)/          # Rotas públicas (ranking, jogos)
│   │   │   └── completar/[token]/  # Página do participante para completar palpites
│   │   ├── admin/             # Painel administrativo
│   │   │   ├── completar-bolao/    # Dashboard de completar bolão
│   │   │   └── participantes/[id]/editar-palpites/  # Editar palpites individuais
│   │   └── api/               # API routes (admin, jogos, participantes, ranking, resultados, upload, completar)
│   ├── components/            # Componentes React
│   ├── lib/
│   │   ├── auth/              # Autenticação (JWT, hash, sessão)
│   │   ├── db/                # Prisma client + queries
│   │   │   └── queries/
│   │   │       └── completar-bolao.ts  # Queries para sistema de completar bolão
│   │   ├── services/          # Upload (Excel, OCR, PDF), Storage, Resultados
│   │   └── utils/             # Constantes, helpers
│   └── middleware.ts          # Proteção de rotas /admin
├── vercel.json                # Config Vercel (prisma generate + next build)
└── next.config.ts
```

---

## Modelos do banco (Prisma)

| Modelo | Tabela | Descrição |
|---|---|---|
| `Participante` | `participantes` | Usuários do bolão |
| `PalpiteGrupo` | `palpites_grupos` | Grupo de palpites (participante pode ter vários) |
| `Jogo` | `jogos` | Partidas (fase de grupos, oitavas, quartas, etc.) |
| `Palpite` | `palpites` | Palpites de placar por grupo/jogo |
| `PalpiteExtra` | `palpites_extras` | Palpites especiais (artilheiro, campeão, vice, etc.) por grupo |
| `ResultadoExtra` | `resultados_extras` | Resultados oficiais dos extras |
| `Configuracao` | `configuracoes` | Configurações do sistema (pontuação, etc.) |
| `AdminAuth` | `admin_auth` | Credenciais do admin |
| `UploadLog` | `upload_logs` | Histórico de uploads |

---

## Upload de Palpites

O sistema suporta dois modos de upload de palpites pelo painel admin:

### Upload Individual
1. Admin seleciona participante + arquivo (Excel, imagem ou PDF)
2. Parse e validação → preview editável
3. Confirmação → salva palpites no DB + arquiva arquivo no Supabase Storage

### Upload em Lote (Multi-Abas)
1. Admin seleciona arquivo Excel com múltiplas abas (cada aba = um grupo de palpites)
2. Parser identifica automaticamente participante e apelido do grupo pelo nome da aba (ex: "Leo 1", "João - Palpite 2")
3. Preview com tabs por grupo, badges indicando participante existente/novo
4. Confirmação → busca/cria participantes, busca/cria PalpiteGrupos, salva palpites

Cada participante pode ter múltiplos grupos de palpites (ex: "Palpite 1", "Palpite 2"), e cada grupo é uma entrada independente no ranking.

---

## Completar Bolão (Participantes)

Sistema que permite aos participantes preencherem os 39 jogos restantes da fase de grupos diretamente no site, via link personalizado com token.

### Fluxo

1. **Admin gera tokens**: Cada participante recebe um token único (UUID) automaticamente ao ser criado
2. **Admin envia link**: Link no formato `/completar/{token}` enviado via WhatsApp
3. **Participante acessa**: Valida token, verifica prazo e status
4. **Preenche palpites**: Interface mobile-first com inputs para placar de cada jogo
5. **Persistência automática**: Rascunhos salvos no localStorage (não perde dados ao atualizar página)
6. **Salva**: Após preencher todos os 39 jogos, salva no banco de dados
7. **Bloqueio**: Após salvar, página fica em modo somente leitura

### Funcionalidades

- **Múltiplos palpites**: Se participante tem vários grupos, mostra abas para cada um
- **Persistência**: Auto-save no localStorage a cada alteração
- **Indicadores visuais**: Badge "Não salvo" e ponto laranja nas abas com alterações
- **Descartar alterações**: Botão para voltar aos dados salvos
- **Prazo configurável**: Admin define prazo em `/admin/config/completar-bolao`
- **Toggle global**: Admin pode habilitar/desabilitar a coleta
- **Sorteio aleatório**: Admin pode sortear palpites para participantes incompletos

### Dashboard Admin (`/admin/completar-bolao`)

- Lista todos participantes com status (Completo/Incompleto)
- Botão para copiar link de cada participante
- Botão "Sortear" individual ou em lote
- Configurações: prazo e toggle de habilitação
- Contador de jogos faltando por participante

### APIs

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/token/[token]` | GET | Valida token e retorna info do participante |
| `/api/completar/[token]/jogos` | GET | Lista 39 jogos restantes com palpites |
| `/api/completar/[token]` | POST | Salva palpites do participante |
| `/api/admin/completar-bolao/status` | GET | Status de todos participantes (admin) |
| `/api/admin/completar-bolao/sortear` | POST | Sorteia palpites aleatórios (admin) |
| `/api/admin/config/completar-bolao` | PUT | Atualiza prazo e toggle (admin) |
| `/api/admin/participantes/[id]/palpites` | PUT | Admin edita palpites de participante |

---

## Resultados ao Vivo

Sistema de sincronização automática de resultados dos jogos usando duas APIs:
- **football-data.org** (primária): API gratuita com 10 req/min
- **worldcup26.ir** (fallback): API gratuita sem API key

### Fluxo de Sincronização

1. Admin clica "Sincronizar Resultados" em `/admin/resultados`
2. API envia contexto dos jogos (timeA, timeB, dataHora, grupo) para microserviço
3. Microserviço faz match por grupo + data (tolerância 3h para fusos horários)
4. **Comparação inteligente**: só atualiza jogos que realmente mudaram (placar, status, local, cidade)
5. Logs detalhados no console mostram antes/depois de cada mudança
6. Toast mostra resumo: quantos placares, status, locais mudaram
7. Card de resultados mostra detalhes visuais de cada mudança

### Match de Jogos

- **Fase de grupos**: match por `grupo` + `dataHora` (tolerância 3h)
- **Mata-mata**: match por nome dos times (dicionário PT→EN)
- **Merge de dados**: football-data.org para `local`, worldcup26.ir para `cidade` se faltando

### Arquivos Principais

| Arquivo | Descrição |
|---------|-----------|
| `microservice/app/services/football_data.py` | Serviço football-data.org |
| `microservice/app/services/worldcup26.py` | Serviço worldcup26.ir com mapeamento de fusos |
| `microservice/app/routers/resultados.py` | Endpoint `/resultados/lote` |
| `src/lib/services/resultados/client.ts` | Cliente HTTP que envia contexto dos jogos |
| `src/app/api/resultados/sync/route.ts` | API route com comparação inteligente |

---

## Scripts npm

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (Turbopack) |
| `npm run build` | Build de produção |
| `npm start` | Servidor de produção |
| `npm run lint` | ESLint |
| `npm test` | Jest |

---

## Deploy

O deploy envolve 3 serviços:

1. **Supabase** - Banco de dados PostgreSQL + Storage (arquivos)
2. **Fly.io** - Microserviço Python (resultados ao vivo)
3. **Vercel** - Aplicação Next.js (frontend + API)

### 1. Supabase (banco + storage)

Siga as instruções em [Opção B: Supabase](#opção-b-supabase-produção-ou-desenvolvimento) acima.

Após criar o projeto:

```bash
# Rodar migrações no Supabase
DATABASE_URL="postgresql://postgres:SUA_SENHA@db.xxx.supabase.co:5432/postgres" npx prisma migrate deploy

# Popular dados iniciais
DATABASE_URL="postgresql://postgres:SUA_SENHA@db.xxx.supabase.co:5432/postgres" npx tsx --env-file=.env scripts/seed.ts
DATABASE_URL="postgresql://postgres:SUA_SENHA@db.xxx.supabase.co:5432/postgres" ADMIN_PASSWORD="sua-senha-forte" npx tsx --env-file=.env scripts/seed-admin.ts
```

Não esqueça de criar os buckets `fotos` e `palpites` no Storage.

### 2. Fly.io (microserviço Python)

O microserviço busca resultados de football-data.org (primário) e worldcup26.ir (fallback).

#### Pré-requisitos

- Conta no [Fly.io](https://fly.io)
- CLI instalado: `curl -L https://fly.io/install.sh | sh`

#### Deploy

```bash
cd microservice

# Login (primeira vez)
fly auth login

# Launch (primeira vez - cria app no Fly.io)
fly launch --name bolao-copa-microservice --region gru

# Deploy (subsequentes)
fly deploy
```

Após deploy, a URL será algo como `https://bolao-copa-microservice.fly.dev`.

#### Variáveis de ambiente no Fly.io

Se precisar configurar (ex: API key do football-data.org):

```bash
fly secrets set FOOTBALL_DATA_API_KEY=sua-chave
```

#### Logs

```bash
fly logs
fly status
```

### 3. Vercel (Next.js)

#### Pré-requisitos

- Conta no [Vercel](https://vercel.com)
- CLI instalado (opcional): `npm i -g vercel`
- Repositório no GitHub

#### Deploy via painel

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Importe o repositório do GitHub
3. Configure as variáveis de ambiente:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | String do Supabase: `postgresql://postgres:SENHA@db.xxx.supabase.co:5432/postgres` |
| `SUPABASE_URL` | URL do projeto Supabase: `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Service role key do Supabase |
| `ADMIN_PASSWORD` | Senha do admin |
| `SESSION_SECRET` | Gerado com `openssl rand -base64 32` |
| `OPENCODE_GO_API_KEY` | Chave do OpenCode Go (para OCR de fotos/PDFs) |
| `VISION_MODEL` | `qwen3.7-plus` |
| `MICROSERVICE_URL` | URL do Fly.io: `https://bolao-copa-microservice.fly.dev` |

4. O `vercel.json` já configura o build: `prisma generate && next build`
5. Clique em **Deploy**

#### Deploy via CLI

```bash
# Login (primeira vez)
vercel login

# Deploy preview
vercel

# Deploy produção
vercel --prod
```

Configure as variáveis de ambiente:

```bash
vercel env add DATABASE_URL
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_KEY
vercel env add ADMIN_PASSWORD
vercel env add SESSION_SECRET
vercel env add OPENCODE_GO_API_KEY
vercel env add VISION_MODEL
vercel env add MICROSERVICE_URL
```

#### Pós-deploy

1. Acesse `https://seu-domaino.vercel.app/admin/login`
2. Faça login com a `ADMIN_PASSWORD` configurada
3. Verifique se o ranking e jogos carregam corretamente
4. Teste upload de planilha para confirmar Supabase storage

---

## Resolução de problemas

### Erro "Authentication failed against the database server"

Causa: credenciais do PostgreSQL em `DATABASE_URL` estão incorretas.

Solução:
1. Verifique se o `.env` existe (copie de `.env.example`)
2. Confirme que `DATABASE_URL` aponta para um PostgreSQL acessível
3. No Supabase: confira a senha em **Settings > Database > Connection string**
4. Certifique-se de que as migrações rodaram (`npx prisma migrate deploy`)

### Erro "Prisma Client not generated"

```bash
npx prisma generate
```

### Erro "Variáveis de ambiente Supabase não configuradas"

Confirme que `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` estão no `.env`.

No Vercel: vá em **Settings > Environment Variables** e adicione ambas.

### Erro de upload no Supabase

1. Verifique se os buckets `fotos` e `palpites` existem
2. Confirme que estão configurados como **Public**
3. Verifique se `SUPABASE_SERVICE_KEY` é a **service_role key** (não a anon key)

### Microserviço fora do ar

```bash
cd microservice && fly logs
cd microservice && fly status
```

---

## Checklist de deploy

- [ ] Projeto Supabase criado
- [ ] `DATABASE_URL` configurado
- [ ] Migrações rodadas no Supabase
- [ ] Seeds executados (jogos + admin)
- [ ] Buckets `fotos` e `palpites` criados no Supabase Storage
- [ ] `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` anotados
- [ ] Microserviço deployado no Fly.io
- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] Deploy Vercel realizado com sucesso
- [ ] Login admin funcionando
- [ ] Upload de planilha testado
