# Sincronização Automática de Resultados

**Data:** 2026-06-13
**Status:** Design (revisado)
**Autor:** Sistema

## Visão Geral

Implementar sincronização automática de resultados dos jogos da Copa do Mundo 2026 usando Vercel Cron Jobs, eliminando a necessidade do admin clicar manualmente no botão "Sincronizar" na página `/admin/resultados`.

## Problema

Atualmente, a sincronização de resultados é manual:
- Admin precisa acessar `/admin/resultados`
- Clicar em "Sincronizar Resultados"
- Aguardar o retorno do microserviço

Durante a Copa, com múltiplos jogos por dia em horários variados (13h às 01h horário de Brasília), isso é impraticável e resulta em resultados desatualizados para os participantes.

## Solução Proposta

Utilizar **Vercel Cron Jobs** para disparar automaticamente a sincronização em horários estratégicos, cobrindo todos os slots de jogos da fase de grupos. A lógica de sync é extraída para uma service function compartilhada entre o endpoint admin (manual) e o endpoint auto (cron).

### Por que Vercel Cron?

- **Nativo:** Integração direta com a infraestrutura existente (Vercel).
- **Sem custo adicional:** Incluído em todos os planos.
- **Simples:** Reutiliza a lógica de sync existente via service function.
- **Sem nova infra:** Não precisa adicionar schedulers no microserviço Python.

## Arquitetura

```
Vercel Cron Job (5 horários diários)
    ↓
GET /api/resultados/sync-auto
    ↓ (valida CRON_SECRET via header Authorization)
    ↓
chamar syncResultados({ origem: 'auto' })
    ↓
advisory lock (pg_try_advisory_xact_lock) ← previne concorrência
    ↓
buscar jogos ativos (últimas 3h, status agendado/em_andamento)
    ↓ (se houver)
POST /api/resultados/sync (refatorado: extraído para service)
    ↓
Microserviço Fly.io (football-data.org + worldcup26.ir)
    ↓
Atualiza banco Supabase
```

**Decisão de design:** o endpoint auto-sync **chama a mesma service function** que o endpoint admin manual, evitando chamada HTTP interna (que dobraria latência e timeout).

## Configuração dos Cron Jobs

### Horários dos Jogos (Fase de Grupos)

Análise dos 72 jogos da fase de grupos revelou 4 blocos de horários (horário de Brasília):

| Bloco | Horários de Início (BRT) | Término Típico (BRT) |
|-------|--------------------------|----------------------|
| Matutino | 13:00, 14:00 | 15:00, 16:00 |
| Vespertino | 16:00, 17:00 | 18:00, 19:00 |
| Noturno 1 | 19:00, 20:00, 20:30, 21:00 | 21:00, 22:00, 22:30, 23:00 |
| Noturno 2 | 22:00, 23:00, 00:00, 01:00 | 00:00, 01:00, 02:00, 03:00 |

### Cron Jobs Propostos (UTC)

Vercel Cron usa **UTC obrigatoriamente** (junho 2026 = sem horário de verão no Brasil, UTC-3 fixo).

| Horário (BRT) | UTC | Cron Expression | Janela Coberta (BRT) |
|---------------|-----|-----------------|----------------------|
| 16:00 | 19:00 | `0 19 * * *` | Jogos 13:00–16:00 |
| 19:00 | 22:00 | `0 22 * * *` | Jogos 16:00–19:00 |
| 21:30 | 00:30 | `30 0 * * *` | Jogos 19:00–21:30 |
| 00:00 | 03:00 | `0 3 * * *` | Jogos 21:00–00:00 |
| 01:30 | 04:30 | `30 4 * * *` | Jogos 22:30–01:30 |

**Total:** 5 cron jobs (limite Hobby/Pro: 100/projeto). Cada expressão é 1x/dia, compatível com Hobby.

### Limitação de Hobby: 1x/dia por expressão

> Cron jobs no Hobby são limitados a **1 execução por dia por expressão**. Expressões que rodam mais frequentemente (`0 * * * *`, `*/30 * * * *`) falham no deploy.

Todas as 5 expressões do spec são 1x/dia, então funcionam em Hobby. Para mais frequência, é necessário Pro.

### Configuração vercel.json

```json
{
  "buildCommand": "prisma generate && next build",
  "crons": [
    { "path": "/api/resultados/sync-auto", "schedule": "0 19 * * *" },
    { "path": "/api/resultados/sync-auto", "schedule": "0 22 * * *" },
    { "path": "/api/resultados/sync-auto", "schedule": "30 0 * * *" },
    { "path": "/api/resultados/sync-auto", "schedule": "0 3 * * *" },
    { "path": "/api/resultados/sync-auto", "schedule": "30 4 * * *" }
  ],
  "functions": {
    "src/app/api/resultados/sync-auto/route.ts": {
      "maxDuration": 300
    }
  }
}
```

## Endpoint de Auto-Sync

### Rota: `/api/resultados/sync-auto`

**Método:** GET (Vercel Cron faz requisições GET).

**Autenticação:** Header `Authorization: Bearer <CRON_SECRET>` (enviado automaticamente pela Vercel quando a env var `CRON_SECRET` está configurada no projeto).

**Headers úteis para logging:**
- `Authorization: Bearer <CRON_SECRET>` — autenticação
- `x-vercel-cron-schedule: <expressão>` — qual cron disparou
- `User-Agent: vercel-cron/1.0` — identificar request de cron

### Lógica

1. **Valida `CRON_SECRET`** (obrigatório; sem env var ou header inválido → 401).
2. **Tenta adquirir lock** (`pg_try_advisory_xact_lock` no Supabase).
   - Se falhar: retorna 200 com `{ skipped: 'sync_already_running' }`.
3. **Verifica jogos ativos** (últimas 3h com `status: 'agendado' | 'em_andamento'`).
   - Se não houver: retorna 200 com `{ skipped: 'no_active_games' }`.
4. **Chama `syncResultados({ origem: 'auto' })`** (service function compartilhada).
5. **Retorna resultado** com detalhes das atualizações.

### maxDuration

```ts
// src/app/api/resultados/sync-auto/route.ts
export const maxDuration = 300; // Hobby safe (5 min). Pro: até 800s.
```

| Plano | maxDuration default | maxDuration configurável |
|-------|---------------------|--------------------------|
| Hobby | 300s (5 min) | 300s (hard cap) |
| Pro | 300s (5 min) | 800s (ou 1800s beta estendido) |

Sync de 72 jogos + 1 chamada ao microserviço costuma levar 5–20s, mas timeout é imprevisível. 300s dá margem ampla.

## Service Function Compartilhada

Refatorar a lógica de sync para uma service function reutilizável:

**Arquivo:** `src/lib/services/resultados/sync.ts`

```ts
export type SyncOrigem = 'admin' | 'auto' | 'manual'

export interface SyncResult {
  success: boolean
  skipped?: 'no_active_games' | 'sync_already_running'
  atualizados: number
  finalizados: number
  mudancas: Array<{
    jogoId: string
    timeA: string
    timeB: string
    mudouPlacar: boolean
    mudouStatus: boolean
    antes: { status: string; resultadoA: number | null; resultadoB: number | null }
    depois: { status: string; resultadoA: number | null; resultadoB: number | null }
  }>
  duracaoMs: number
  origem: SyncOrigem
}

export async function syncResultados(opts?: {
  origem?: SyncOrigem
  forceAllGames?: boolean
}): Promise<SyncResult> {
  // Implementação
}
```

**Endpoints que usam:**
- `POST /api/resultados/sync` (admin manual) → chama `syncResultados({ origem: 'admin', forceAllGames: true })`
- `GET /api/resultados/sync-auto` (cron) → chama `syncResultados({ origem: 'auto' })`

## Concorrência e Lock

Vercel Cron pode disparar uma segunda instância se a primeira demorar mais que o intervalo entre invocações. Para evitar race conditions, usar **advisory lock do Postgres** (sem dependência externa):

```ts
await prisma.$transaction(async (tx) => {
  const [lock] = await tx.$queryRaw<Array<{ locked: boolean }>>`
    SELECT pg_try_advisory_xact_lock(${LOCK_KEY_RESULTADOS_SYNC}) AS locked
  `
  if (!lock.locked) {
    return { success: true, skipped: 'sync_already_running' as const, ... }
  }
  // ... lógica de sync
})
```

**Lock key:** constante numérica (ex: `987654321`). Definir em `src/lib/constants.ts` para evitar colisão com outros locks.

**Vantagem sobre Redis:** já temos Supabase, zero infra adicional. Lock é liberado automaticamente no fim da transação.

## Idempotência

Vercel pode invocar o mesmo cron **2x** (best-effort delivery) ou **pular** uma execução. O sync precisa ser resiliente a ambos.

**Por que o sync atual já é idempotente:**
- Operação é `UPDATE` em `jogos` (não `INSERT`).
- Placar final é derivado de placares parciais — não acumula.
- Comparação "antes vs depois" evita writes desnecessários.

**Reforço recomendado:**
```ts
// Só atualiza se placar mudou
if (novoPlacarA !== jogo.placarA || novoPlacarB !== jogo.placarB) {
  await prisma.jogo.update({ where: { id: jogo.id }, data: { ... } })
}
```

## Segurança

### CRON_SECRET

**Variável de ambiente obrigatória:** `CRON_SECRET`.

**Geração:** string aleatória de 16+ caracteres (ex: `openssl rand -hex 32`). Doc oficial recomenda 16+; 32+ hex = 64 chars, mais que suficiente.

**Configuração:**
- Adicionar em `.env.local` (desenvolvimento) e `.env.example` (template).
- Adicionar nas env vars da Vercel (produção).

**Validação no handler:**

```ts
const authHeader = request.headers.get('authorization')
const cronSecret = process.env.CRON_SECRET

if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json(
    { success: false, error: 'Unauthorized' },
    { status: 401 }
  )
}
```

> **Nota oficial:** quando `CRON_SECRET` está configurada como env var do projeto Vercel, a plataforma envia automaticamente `Authorization: Bearer <CRON_SECRET>` em toda invocação de cron.

## Tratamento de Erros

### Cenários de Falha

| Cenário | Comportamento | Mitigação |
|---------|--------------|-----------|
| `CRON_SECRET` ausente | 401 | Deploy falha se env var não existe (Vercel valida) |
| `CRON_SECRET` inválido | 401 | Header não confere |
| Lock já adquirido | 200 + `skipped: 'sync_already_running'` | Outra instância está rodando |
| Sem jogos ativos | 200 + `skipped: 'no_active_games'` | Normal em dias sem jogos |
| Microserviço indisponível | 500 | Próximo cron tenta (até 5x/dia) |
| Timeout (`maxDuration`) | Função morta | Lock liberado (transação aborted); próximo cron tenta |
| Erro de conexão Supabase | 500 | Próximo cron tenta |
| `pg_try_advisory_xact_lock` retorna false | 200 + `skipped` | Lock ativo; não é erro |

### Retry Policy

**Vercel NÃO retenta falhas.** Cada cron é independente.

**Mitigação:** 5 crons/dia cobrem janelas diferentes. Se todos falharem (ex: microserviço fora o dia todo), o admin pode disparar manualmente:

```bash
vercel crons run /api/resultados/sync-auto
```

### Logs

Manter logs estruturados (já existentes no sync manual):
- Início/fim do sync (com `duracaoMs` e `origem`)
- Lock acquired/released
- Jogos processados / atualizados / pulados
- Mudanças detectadas (placar, status, local, cidade)
- `x-vercel-cron-schedule` (qual cron disparou)
- Erros e exceções (com stack trace)

## Monitoramento

### Dashboard Vercel

- **Settings > Cron Jobs:** lista de crons ativos, status (success/failure), botão **"Disable Cron Jobs"** (kill switch).
- **Logs tab:** logs de execução de cada cron, com botão "View Logs".
- **Functions > Logs:** logs runtime do endpoint.

### Logs da Aplicação

- `console.log` no endpoint (visível em Vercel > Functions > Logs).
- Logs do microserviço (Fly.io).
- Logs de atualização do banco (já existentes).

### Alertas (Futuro)

- Vercel envia email em deploy failure, mas não em cron failure.
- Para alertas em produção: integrar Slack/email via monitoramento externo (UptimeRobot, Better Stack).

## Rollback

### Kill Switch Oficial

Vercel tem um botão **"Disable Cron Jobs"** no dashboard (`Settings > Cron Jobs`). Isso **para todas as execuções agendadas imediatamente**, sem redeploy. **Estratégia primária de rollback.**

### Instant Rollback NÃO atualiza crons

> Se você fizer Instant Rollback para um deploy anterior, os cron jobs ativos **continuam rodando o código da versão antiga** até serem manualmente desabilitados ou um novo deploy ser feito.

**Implicação:** rollback via UI da Vercel não é seguro para corrigir bug em cron. Plano correto:
1. Clicar "Disable Cron Jobs" (kill switch)
2. Investigar logs
3. Fix + redeploy
4. Reabilitar crons no dashboard

### Feature Flag (Opcional)

Alternativa ao kill switch do dashboard: toggle no banco (`configuracoes` table, mesmo padrão de `completar_bolao_habilitado`). Útil se quiser desabilitar apenas o auto-sync mas manter os crons registrados. **Não-MVP.**

## Considerações de Fase Eliminatória

Após a fase de grupos, os horários mudam (oitavas, quartas, semifinal, final). Os 5 crons propostos cobrem a maioria dos horários (16h, 19h, 21h, 00h, 01h30 BRT).

**Estratégia para fases eliminatórias:**
- **Curto prazo:** os mesmos 5 crons cobrem ~90% dos mata-mata (jogos em 12h, 16h, 20h BRT típicos).
- **Se necessário ajustar:** editar `vercel.json` + commit + redeploy. Cronograma da Copa é conhecido, pode ser planejado com antecedência.
- **Alternativa futura:** endpoint inteligente que lê próximos jogos do banco e sugere horários dinamicamente.

## Testes

### Teste Local (curl)

```bash
# 1. Configurar CRON_SECRET em .env.local
echo "CRON_SECRET=$(openssl rand -hex 32)" >> .env.local

# 2. Rodar dev server
npm run dev

# 3. Simular cron
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/resultados/sync-auto
```

> **Nota:** Vercel Cron não dispara em `next dev` ou `vercel dev`. Testes locais são sempre manuais via curl.

### Teste em Produção

```bash
# Forçar execução manual do cron em prod
vercel crons run /api/resultados/sync-auto
```

Verificar:
- Cron aparece como "Success" no dashboard Vercel.
- Logs estruturados aparecem em Functions > Logs.
- Jogos foram atualizados no banco.

### Testes Automatizados (Jest)

Sugestão (não-bloqueante, mas recomendado):

```ts
// src/lib/services/resultados/sync.test.ts
describe('syncResultados', () => {
  it('retorna skipped: no_active_games quando não há jogos nas últimas 3h', async () => {})
  it('atualiza placar quando API retorna mudança', async () => {})
  it('é idempotente: rodar 2x não duplica mudanças', async () => {})
  it('adquire lock e bloqueia execução concorrente', async () => {})
})
```

### Cenários de Validação Manual

| Cenário | Resultado Esperado |
|---------|--------------------|
| Cron dispara em horário de jogo | Logs mostram jogos processados, placares atualizados |
| Cron dispara fora de horário de jogo | 200 + `skipped: 'no_active_games'` |
| Dois crons disparam simultaneamente (±59min overlap) | Um roda, outro retorna `skipped: 'sync_already_running'` |
| `CRON_SECRET` errado | 401 |
| Microserviço retorna 500 | 500 + log de erro; próximo cron tenta |
| Timeout (>300s) | Função morta; lock liberado; próximo cron tenta |

## Critérios de Aceitação

- [ ] Endpoint `/api/resultados/sync-auto` criado e validado por `CRON_SECRET`.
- [ ] Service function `syncResultados` extraída e reutilizada por admin manual + auto.
- [ ] Lock `pg_try_advisory_xact_lock` impede execuções concorrentes.
- [ ] `maxDuration = 300` declarado na route.
- [ ] `vercel.json` com 5 cron jobs, todos 1x/dia.
- [ ] `CRON_SECRET` configurada em produção (Vercel env vars).
- [ ] Logs estruturados com `origem`, `duracaoMs`, `x-vercel-cron-schedule`.
- [ ] Sync é idempotente (rodar 2x não duplica writes).
- [ ] Teste local com curl funciona.
- [ ] Teste em produção com `vercel crons run` funciona.
- [ ] Kill switch testado: "Disable Cron Jobs" no dashboard para tudo.

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Cron não dispara (Vercel outage) | Baixa | Médio | 5 crons/dia = redundância; admin pode disparar manual |
| Cron dispara 2x (duplicate) | Baixa | Baixo | Sync é idempotente por design |
| Timeout (>300s) | Média | Médio | Lock libera automático; próximo cron tenta; admin monitora logs |
| Race condition (dois crons paralelos) | Baixa | Médio | Advisory lock |
| Microserviço fora por horas | Média | Alto | 5 janelas = alta chance de pelo menos 1 funcionar; admin monitora |
| `CRON_SECRET` exposta em logs | Baixa | Alto | Não logar header; validar tamanho mínimo 32 chars |
| Horário de verão mudar regras | Muito baixa | Baixo | Junho 2026 = sem horário de verão BR; revisitar em 2027+ |
| Plano Hobby mudar limites | Baixa | Médio | Doc oficial fixada em 2026-05; revisar antes de Copa |
| Fases eliminatórias com horários não cobertos | Média | Médio | Editar `vercel.json` para fases específicas |
| Brasil mudar fuso (improvável) | Muito baixa | Alto | Cron é em UTC; impacto zero no servidor, só na conversão |

## Próximos Passos

### Implementação (ordem)

1. **Refatorar lógica de sync** para `src/lib/services/resultados/sync.ts` (extrair do endpoint admin atual).
2. **Atualizar endpoint admin** `POST /api/resultados/sync` para usar a service function.
3. **Criar endpoint** `/api/resultados/sync-auto` com auth + lock + service call.
4. **Adicionar `CRON_SECRET`** ao `.env.example` e documentar geração.
5. **Atualizar `vercel.json`** com 5 crons + `maxDuration`.
6. **Testar localmente** com curl em 3 cenários: sem jogos, com jogos, sem auth.
7. **Deploy para staging** (se houver) e validar logs.
8. **Deploy para produção** e validar primeira execução.
9. **Monitorar** primeiras 24h de execuções.

### Melhorias Futuras

- Endpoint inteligente que sugere cron schedules baseado em próximos jogos.
- Notificações Slack/email em falhas consecutivas.
- Dashboard admin com histórico de execuções automáticas.
- Feature flag em DB para toggle rápido (alternativa ao kill switch do dashboard).
- Suporte a múltiplos estádios/sedes com conversão de fuso automática.

## Referências

- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs) — visão geral
- [Vercel Cron Jobs Quickstart](https://vercel.com/docs/cron-jobs/quickstart)
- [Managing Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs) — duration, error handling, concurrency, idempotency
- [Cron Jobs Usage & Pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing) — Hobby 1x/dia, Pro 1x/min
- [Vercel.json Configuration](https://vercel.com/docs/project-configuration/vercel-json)
- [Configuring Maximum Duration](https://vercel.com/docs/functions/configuring-functions/duration) — `maxDuration`
- [Vercel CLI Crons](https://vercel.com/docs/cli/crons) — `vercel crons run` para teste manual

## Anexos

### Exemplo de Resposta do Endpoint

**Sucesso (com atualizações):**
```json
{
  "success": true,
  "skipped": false,
  "origem": "auto",
  "duracaoMs": 8420,
  "atualizados": 3,
  "finalizados": 2,
  "mudancas": [
    {
      "jogoId": "clx...",
      "timeA": "Brasil",
      "timeB": "Alemanha",
      "mudouPlacar": true,
      "mudouStatus": true,
      "antes": { "status": "agendado", "resultadoA": null, "resultadoB": null },
      "depois": { "status": "finalizado", "resultadoA": 2, "resultadoB": 1 }
    }
  ]
}
```

**Sucesso (sem jogos ativos):**
```json
{
  "success": true,
  "skipped": "no_active_games",
  "message": "Nenhum jogo ativo nas últimas 3 horas",
  "duracaoMs": 120
}
```

**Sucesso (sync concorrente):**
```json
{
  "success": true,
  "skipped": "sync_already_running",
  "message": "Outra instância do sync está em execução"
}
```

**Erro (não autorizado):**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

### Exemplo de Log Estruturado

```json
{
  "timestamp": "2026-06-15T19:00:42.123Z",
  "level": "info",
  "origem": "auto",
  "schedule": "0 19 * * *",
  "userAgent": "vercel-cron/1.0",
  "event": "sync_start",
  "lockAcquired": true
}
```

```json
{
  "timestamp": "2026-06-15T19:00:50.456Z",
  "level": "info",
  "origem": "auto",
  "schedule": "0 19 * * *",
  "event": "sync_end",
  "duracaoMs": 8333,
  "jogosProcessados": 4,
  "atualizados": 2,
  "finalizados": 1
}
```
