# Bônus de Quem Passa — Visibilidade na UI + Correção do `vencedor=3`

**Data:** 2026-06-30
**Status:** Aprovado (pronto pra implementar)
**Stack:** Next.js 16, React 19, TypeScript 5, Tailwind 4 · Python FastAPI (microserviço)

## Contexto e motivação

A página `/jogos/[id]` mostra os palpites dos participantes para um jogo finalizado, com pontuação calculada via `calcularPontosMataMata` em `src/lib/utils/helpers.ts:24`. A regra de pontuação para mata-mata com empate (que vai a pênaltis) é:

- **6 pts** por acertar que o jogo vai a empate (sem placar exato)
- **+6 pts bônus** por acertar quem avança nos pênaltis (`quemPassa`)

**Hoje** o usuário olha para a linha "10 [Exato]" no jogo Alemanha x Paraguai (1-1, 3-4 pênaltis) e pensa: "acertei o placar, ganhei 10". Mas a regra diz que *acertar quem avança* vale +6 — ele não só não ganhou 16, como nem sabe que perdeu 6. A mesma situação afeta o jogo Holanda x Marrocos, mas amplificada por um bug de dados.

### 3 bugs descobertos em sequência

1. **UI** — sub-linha de quem-passa não existe; o badge `+QP` roxo passa despercebido e não mostra *o número*. Caso Erika (Alemanha x Paraguai): 10 pts parece bom, mas ela errou quem avança.
2. **Data** — `jogos.vencedor = 3` (empate) gravado no jogo Holanda x Marrocos mesmo com Marrocos tendo vencido nos pênaltis. Resultado: Bruna/Emile/Hugo/Igor (que apostaram 2x2 + Marrocos passa) ganham 6 pts quando deveriam ganhar 12.
3. **Sync** — `microservice/app/services/sync_writer.py:148` não inclui mudança de `vencedor` na flag `realmente_mudou`, então o sync não re-escreve `vencedor` quando a API corrige.

## Objetivos

- Tabela de palpites mostra **sub-linha textual** abaixo dos pontos, revelando acerto/erro do bônus quem-passa
- Cor verde (`text-green-700 dark:text-green-400`) para acerto, cinza (`text-muted-foreground`) para erro
- Bug do `vencedor=3` no jogo Holanda x Marrocos corrigido via SQL direto
- Sync writer detecta mudança de `vencedor` e re-escreve quando a API corrige
- Não-objetivo: o caso `worldcup26._derive_winner` que sempre retorna 3 para empate (precisa investigar API; fica pra outro PR)

## Decisões de design

| Pergunta | Resposta | Justificativa |
|---|---|---|
| Como exibir bônus? | Sub-linha textual | Direto e legível; cabe em mobile; sem tooltip |
| Cor do acerto? | `text-green-700 dark:text-green-400` | Mesmo tom do badge "Exato" — coerência |
| Cor do erro? | `text-muted-foreground` | Não grita; o número de pontos (sem o bônus) já é o herói |
| Manter badge `+QP` roxo? | **Não**, remover | Fica redundante com a sub-linha verde `+6 quem passa` |
| Quando mostrar sub-linha? | Só mata-mata com resultado empatado E palpite de empate E vencedorPalpite !== null | Fora desse universo, "quem passa" não existe |
| Texto positivo? | `+6 quem passa` | Curto, número explícito, regra explícita |
| Texto negativo? | `errou +6 quem passa` | "errou" comunica o erro; "+6" explica o que perdeu |
| Aplicar também no `/ranking`? | Não (YAGNI) | Ranking mostra totais; quebrar isso é design separado |
| Ordem de execução? | Data → UI → Sync | Cada camada é independente; data fix tem impacto imediato no ranking |

## Arquitetura

### Função nova: `statusBonusQuemPassa`

Em `src/lib/utils/helpers.ts`, exposta para uso na UI:

```ts
export function statusBonusQuemPassa(
  palpite: { placarA: number; placarB: number; vencedorPalpite: number | null },
  resultado: { resultadoA: number; resultadoB: number; vencedor: number | null; fase: string }
): 'acertou' | 'errou' | 'nao-aplicavel'
```

**Tabela de decisão:**

| fase | placarA==placarB | resultadoA==resultadoB | vencedorPalpite | resultado.vencedor | retorna |
|---|---|---|---|---|---|
| `grupos` | * | * | * | * | `nao-aplicavel` |
| `!=grupos` | * | false | * | * | `nao-aplicavel` |
| `!=grupos` | false | * | * | * | `nao-aplicavel` |
| `!=grupos` | true | true | null | * | `nao-aplicavel` |
| `!=grupos` | true | true | * | null | `nao-aplicavel` |
| `!=grupos` | true | true | X | Y | `acertou` se X===Y, senão `errou` |

### Mudança na UI

Em `src/app/(public)/jogos/[id]/page.tsx`:
- Calcular `bonus` para cada `palpitesComPontos` via `statusBonusQuemPassa`
- Renderizar sub-linha condicional (só para `acertou` ou `errou`) com cor correspondente
- Remover renderização do badge `+QP` (linha 231)

### Mudança no sync

Em `microservice/app/services/sync_writer.py`:
- Linha 148: incluir `vencedor_mudou` em `realmente_mudou`
- Linha 198: incluir `vencedor` em `columns` quando há mudança de vencedor
- Espelhar a mesma lógica do `src/app/api/resultados/sync/route.ts` legado

### Mudança de dados

SQL direto via MCP Supabase:
```sql
UPDATE jogos
SET vencedor = 2
WHERE id = '9d509566-2877-4a1f-bef9-836b95a8c207';
```

Justificativa do valor `2`: Marrocos é o `time_b` (segundo time) do jogo; o enum interno do DB usa `1 = timeA`, `2 = timeB`, `3 = empate`. Já validado pelo jogo Alemanha x Paraguai (1-1, 3-4 pênaltis) que tem `vencedor=2` (Paraguai = timeB).

## Componentes modificados

| Arquivo | Mudança |
|---|---|
| `src/lib/utils/helpers.ts` | Adiciona `statusBonusQuemPassa` |
| `src/lib/services/scoring/__tests__/calculator.test.ts` | Adiciona `describe('statusBonusQuemPassa')` com 7 testes |
| `src/app/(public)/jogos/[id]/page.tsx` | Calcula e renderiza sub-linha; remove badge +QP |
| `microservice/app/services/sync_writer.py` | Detecta mudança de `vencedor` no `realmente_mudou` |
| `jogos` (DB) | 1 row atualizada (Holanda x Marrocos) |

## Plano de testes (TDD)

`statusBonusQuemPassa`:

1. ✓ Fase de grupos → `nao-aplicavel` (não importa palpite/resultado)
2. ✓ Mata-mata sem empate no resultado → `nao-aplicavel`
3. ✓ Mata-mata com empate no resultado, palpite de placar não-empate → `nao-aplicavel`
4. ✓ Mata-mata com empate, palpite de empate, `vencedorPalpite=null` → `nao-aplicavel`
5. ✓ Mata-mata com empate, palpite de empate, `resultado.vencedor=null` → `nao-aplicavel`
6. ✓ Mata-mata com empate, palpite de empate, vencedor palpite === vencedor resultado → `acertou`
7. ✓ Mata-mata com empate, palpite de empate, vencedor palpite !== vencedor resultado → `errou` (caso da Bruna)

Cenários de UI (smoke): cobertos pelos testes existentes em `src/components/public/__tests__/` — não há teste direto da página `/jogos/[id]` (server component), então a verificação visual da sub-linha é feita no browser.

Cenários de sync (Python): `microservice/tests/test_sync_writer.py` já existe. Adicionar caso: jogo com placar mudado E vencedor mudado → ambos escritos.

## Não-objetivos (YAGNI)

- **Não** criar componente novo `PontosCell` — sub-linha inline na célula existente
- **Não** adicionar breakdown em tooltip/hover
- **Não** mudar o sistema de pontuação em si
- **Não** aplicar no `/ranking` (escopo separado)
- **Não** corrigir `worldcup26._derive_winner` (precisa investigar a API; risco de escopo crescer; vira spec próprio)
- **Não** corrigir `updateResultado` em `src/lib/db/queries/jogos.ts:46` (rota admin manual, sem bug ativo)

## Verificação

- `npm test` — todos os testes passam (incluindo o novo `statusBonusQuemPassa`)
- `npm run lint` — sem warnings/errors
- Query no Supabase: `SELECT vencedor FROM jogos WHERE id = '9d509566-...'` retorna `2`
- Visual: jogo Holanda x Marrocos: Bruna/Emile/Hugo/Igor aparecem com `12 [Vencedor] / +6 quem passa` (verde)
- Visual: jogo Alemanha x Paraguai: Erika aparece com `10 [Exato] / errou +6 quem passa` (cinza)
- Re-rodar sync: `POST /resultados/sincronizar` (com `X-Cron-Secret`); placar não muda mas `vencedor` se mantém em `2` (sem warning de "jogo não atualizado")

## Rollback

- **Data**: `UPDATE jogos SET vencedor = 3 WHERE id = '9d509566-...';`
- **Sync**: reverter `realmente_mudou` (1 linha)
- **UI**: reverter a renderização (3-4 linhas)
- **Helper**: deletar `statusBonusQuemPassa` e seus testes
