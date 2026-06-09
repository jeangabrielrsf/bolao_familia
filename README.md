# Bolão Copa 2026

Sistema de bolão para a Copa do Mundo FIFA 2026. Permite que participantes registrem palpites para todos os jogos da fase de grupos, acompanhem o ranking e resultados em tempo real. Painel admin para gestão de jogos, participantes, resultados e uploads de planilhas, fotos e PDFs.

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
- **curl_cffi** para scraping de resultados (SofaScore)
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

O microserviço Python faz scraping de resultados do SofaScore e atualiza o banco.

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
│   │   ├── admin/             # Painel administrativo
│   │   └── api/               # API routes (admin, jogos, participantes, ranking, resultados, upload)
│   ├── components/            # Componentes React
│   ├── lib/
│   │   ├── auth/              # Autenticação (JWT, hash, sessão)
│   │   ├── db/                # Prisma client + queries
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
| `Jogo` | `jogos` | Partidas (fase de grupos, oitavas, quartas, etc.) |
| `Palpite` | `palpites` | Palpites de placar por participante/jogo |
| `PalpiteExtra` | `palpites_extras` | Palpites especiais (artilheiro, campeão, vice, etc.) |
| `ResultadoExtra` | `resultados_extras` | Resultados oficiais dos extras |
| `Configuracao` | `configuracoes` | Configurações do sistema (pontuação, etc.) |
| `AdminAuth` | `admin_auth` | Credenciais do admin |
| `UploadLog` | `upload_logs` | Histórico de uploads |

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

O microserviço faz scraping de resultados do SofaScore.

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
