# Sincronização Automática de Resultados

**Data:** 2026-06-12  
**Status:** Design  
**Autor:** Sistema

## Visão Geral

Implementar sincronização automática de resultados dos jogos da Copa do Mundo 2026 usando Vercel Cron Jobs, eliminando a necessidade do admin clicar manualmente no botão "Sincronizar" na página admin/resultados.

## Problema

Atualmente, a sincronização de resultados é manual:
- Admin precisa acessar `/admin/resultados`
- Clicar em "Sincronizar Resultados"
- Aguardar o retorno do microserviço

Durante a Copa, com múltiplos jogos por dia em horários variados (13h às 01h horário de Brasília), isso é impraticável e resulta em resultados desatualizados para os participantes.

## Solução Proposta

Utilizar **Vercel Cron Jobs** para disparar automaticamente a sincronização em horários estratégicos, cobrindo todos os slots de jogos da fase de grupos.

### Por que Vercel Cron?

- **Nativo:** Integração direta com a infraestrutura existente
- **Zero custo adicional:** Incluso no plano Hobby (até 100 crons/projeto)
- **Simples:** Reutiliza o endpoint de sync existente
- **Sem nova infra:** Não precisa adicionar schedulers no microserviço ou bancos

## Arquitetura

```
Vercel Cron Job (5 horários)
    ↓
GET /api/resultados/sync-auto (com CRON_SECRET no header)
    ↓
Verifica se há jogos ativos nas últimas 3h
    ↓ (se houver)
POST /api/resultados/sync (lógica existente)
    ↓
Microserviço Fly.io (football-data.org + worldcup26.ir)
    ↓
Atualiza banco Supabase
```

## Configuração dos Cron Jobs

### Horários dos Jogos (Fase de Grupos)

Análise dos 72 jogos da fase de grupos revelou 5 blocos de horários (horário de Brasília):

| Bloco | Horários de Início | Término Típico |
|-------|-------------------|----------------|
| Matutino | 13:00, 14:00 | 15:00, 16:00 |
| Vespertino | 16:00, 17:00 | 18:00, 19:00 |
| Noturno 1 | 19:00, 20:00, 20:30, 21:00 | 21:00, 22:00, 22:30, 23:00 |
| Noturno 2 | 22:00, 23:00, 00:00, 01:00 | 00:00, 01:00, 02:00, 03:00 |

### Cron Jobs Propostos (UTC)

Vercel Cron usa **UTC obrigatoriamente**. Conversão Brasília (UTC-3) → UTC:

| Brasília | UTC | Cron Expression | Cobertura |
|----------|-----|-----------------|-----------|
| 16:00 | 19:00 | `0 19 * * *` | Jogos 13h-14h |
| 19:00 | 22:00 | `0 22 * * *` | Jogos 16h-17h |
| 21:30 | 00:30 | `30 0 * * *` | Jogos 19h-20h30 |
| 00:00 | 03:00 | `0 3 * * *` | Jogos 21h-00h |
| 01:30 | 04:30 | `30 4 * * *` | Jogos 01h |

**Total:** 5 cron jobs (bem abaixo do limite de 100/projeto)

### Configuração vercel.json

```json
{
  "buildCommand": "prisma generate && next build",
  "crons": [
    {
      "path": "/api/resultados/sync-auto",
      "schedule": "0 19 * * *"
    },
    {
      "path": "/api/resultados/sync-auto",
      "schedule": "0 22 * * *"
    },
    {
      "path": "/api/resultados/sync-auto",
      "schedule": "30 0 * * *"
    },
    {
      "path": "/api/resultados/sync-auto",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/resultados/sync-auto",
      "schedule": "30 4 * * *"
    }
  ]
}
```

## Endpoint de Auto-Sync

### Rota: `/api/resultados/sync-auto`

**Método:** GET (Vercel Cron faz requisições GET)

**Autenticação:** Header `Authorization: Bearer <CRON_SECRET>`

**Lógica:**

1. **Valida CRON_SECRET** (obrigatório, senão retorna 401)
2. **Verifica jogos ativos** (últimas 3h com margem para imprecisão do Hobby)
3. **Se não houver jogos ativos:** retorna 200 com `{ success: true, skipped: true, reason: "no_active_games" }`
4. **Se houver jogos ativos:** chama a lógica existente de sync
5. **Retorna resultado** com detalhes das atualizações

### Verificação de Jogos Ativos

```typescript
// Busca jogos que começaram ou terminaram nas últimas 3h
const agora = new Date()
const tresHorasAtras = new Date(agora.getTime() - 3 * 60 * 60 * 1000)

const jogosAtivos = await prisma.jogo.findMany({
  where: {
    status: { in: ['agendado', 'em_andamento'] },
    dataHora: {
      gte: tresHorasAtras,
      lte: agora,
    },
  },
})
```

**Por que 3h?**
- Jogo típico dura ~2h (90min + intervalo)
- Margem para imprecisão do plano Hobby (±59min)
- Garante que jogos que terminaram recentemente ainda sejam capturados

## Segurança

### CRON_SECRET

**Variável de ambiente obrigatória:** `CRON_SECRET`

**Geração:** String aleatória de 32+ caracteres (ex: `openssl rand -hex 32`)

**Configuração:**
- Adicionar em `.env.local` (desenvolvimento)
- Adicionar nas env vars da Vercel (produção)

**Validação no handler:**

```typescript
const authHeader = request.headers.get('authorization')
const cronSecret = process.env.CRON_SECRET

if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json(
    { success: false, error: 'Unauthorized' },
    { status: 401 }
  )
}
```

**Nota:** Vercel Cron automaticamente envia o header `Authorization: Bearer <CRON_SECRET>` quando configurado nas env vars do projeto.

## Tratamento de Erros

### Cenários de Falha

1. **CRON_SECRET não configurado:**
   - Retorna 401
   - Log de erro no console
   - Cron job falha (visível no dashboard Vercel)

2. **Microserviço indisponível:**
   - Timeout de 60s (já configurado no client.ts)
   - Retorna 500
   - Log de erro detalhado
   - Próximo cron job tenta novamente

3. **Nenhum jogo com sofascoreId:**
   - Retorna 200 com `{ success: true, atualizados: 0 }`
   - Não é erro, apenas não há dados para sincronizar

4. **Erro de conexão com Supabase:**
   - Transação falha
   - Retorna 500
   - Log de erro
   - Próximo cron job tenta novamente

### Logs

Manter logs detalhados (já existentes no sync manual):
- Início/fim do sync
- Quantidade de jogos processados
- Mudanças detectadas (placar, status, local, cidade)
- Erros e exceções

## Monitoramento

### Dashboard Vercel

- **Crons tab:** Mostra status de cada cron job (success/failure)
- **Function logs:** Logs de execução do endpoint
- **Invocations:** Contagem de execuções

### Logs da Aplicação

- Console.log no endpoint (visível em Vercel > Functions > Logs)
- Logs do microserviço (Fly.io logs)
- Logs de atualização do banco (já existentes)

### Alertas (Opcional)

Futuro: integrar com serviço de notificação (Slack, email) para falhas críticas.

## Limitações do Plano Hobby

### Precisão Horária

- **Problema:** Cron jobs no Hobby têm precisão de ±59 minutos
- **Impacto:** O cron das 21:30 UTC pode disparar entre 00:00 e 00:59 UTC
- **Solução:** Verificação de jogos ativos nas últimas 3h (margem de segurança)

### Frequência Mínima

- **Problema:** Hobby permite apenas 1 execução/dia por cron
- **Impacto:** Nenhum (nossos crons são diários)
- **Solução:** N/A (já está ok)

### Timing Impreciso

- **Problema:** Não sabemos exatamente quando o cron vai disparar
- **Impacto:** Mínimo (a verificação de 3h cobre a imprecisão)
- **Solução:** Janela de verificação ampla (3h)

## Considerações de Fase Eliminatória

Após a fase de grupos, os horários mudam (oitavas, quartas, semifinal, final).

**Solução:**
- Os mesmos 5 crons cobrem a maioria dos horários (16h, 19h, 21h, 00h, 01h30)
- Se necessário adicionar/remover crons para fases específicas, editar `vercel.json` e fazer redeploy
- Alternativa: endpoint inteligente que calcula próximos jogos e ajusta dinamicamente (futuro)

## Testes

### Teste Local

1. Configurar `CRON_SECRET` em `.env.local`
2. Rodar `npm run dev`
3. Simular requisição do cron:
   ```bash
   curl -H "Authorization: Bearer <CRON_SECRET>" \
     http://localhost:3000/api/resultados/sync-auto
   ```

### Teste em Produção

1. Deploy para produção (`vercel deploy --prod`)
2. Verificar crons registrados no dashboard Vercel
3. Aguardar execução ou forçar manualmente (se disponível)
4. Verificar logs de execução

## Próximos Passos

### Implementação

1. **Criar endpoint** `/api/resultados/sync-auto`
2. **Adicionar CRON_SECRET** às variáveis de ambiente
3. **Atualizar vercel.json** com os 5 cron jobs
4. **Testar localmente** com curl
5. **Deploy para produção**
6. **Monitorar primeiras execuções**

### Melhorias Futuras (Opcional)

- **Endpoint inteligente:** Calcula próximos jogos e sugere horários
- **Notificações:** Alerta admin em caso de falha
- **Dashboard admin:** Mostra histórico de execuções automáticas
- **Toggle:** Permite habilitar/desabilitar auto-sync via config
- **Fases eliminatórias:** Ajusta horários dinamicamente

## Referências

- [Vercel Cron Jobs Docs](https://vercel.com/docs/cron-jobs)
- [Vercel Cron Jobs Usage & Pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [Vercel Cron Jobs Quickstart](https://vercel.com/docs/cron-jobs/quickstart)
- [Vercel.json Configuration](https://vercel.com/docs/project-configuration/vercel-json)

## Anexos

### Exemplo de Resposta do Endpoint

**Sucesso (com atualizações):**
```json
{
  "success": true,
  "skipped": false,
  "atualizados": 3,
  "finalizados": 2,
  "mudancas": [
    {
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
  "skipped": true,
  "reason": "no_active_games",
  "message": "Nenhum jogo ativo nas últimas 3 horas"
}
```

**Erro (não autorizado):**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```
