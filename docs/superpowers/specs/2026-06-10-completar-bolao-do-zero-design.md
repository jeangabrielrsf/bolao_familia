# Design: Preenchimento do Zero (Completar Bolão Completo)

**Data:** 2026-06-10
**Status:** Aprovado

## Contexto

Atualmente, o sistema de completar bolão permite que participantes preencham apenas os 39 jogos restantes da fase de grupos (`isBolao=false`). Os 33 jogos iniciais (`isBolao=true`) são preenchidos via upload de planilha Excel pelo admin.

**Problema:** Um membro da família quer participar do bolão mas não preencheu a planilha inicial de 33 jogos. Não há forma de ele preencher os 72 jogos + extras do zero.

**Solução:** Permitir que o admin crie um "Novo Palpite" (PalpiteGrupo vazio) para participantes sem nenhum palpite. O sistema detecta automaticamente que o grupo está vazio e apresenta os 72 jogos + 5 extras para o participante preencher via link `/completar/{token}`.

## Abordagem: Detecção Automática por Contagem

Sem mudanças no schema do banco. A detecção do modo de preenchimento é feita pela contagem de palpites em jogos `isBolao=true`:

- **0 dos 33 jogos isBolao** → modo **"completo"**: 72 jogos + 5 extras
- **Algum dos 33 jogos isBolao** → modo **"restante"**: 39 jogos (comportamento atual)

## Admin: Botão "Novo Palpite"

### Modal

Localização: Dashboard `/admin/completar-bolao`, botão "Novo Palpite" no topo.

- **Select de participante:** Lista apenas participantes que **não possuem nenhum PalpiteGrupo**. Participantes que já têm grupos (mesmo vazios) não aparecem.
- **Input de apelido:** Opcional, padrão "Palpite 1".
- **Botão "Criar":** Cria o PalpiteGrupo vazio.

### API: `POST /api/admin/completar-bolao/novo-palpite`

- **Auth:** `requireAdmin()`
- **Body:** `{ participanteId: string, apelido?: string }`
- **Validações:**
  - Participante existe
  - Participante não tem nenhum PalpiteGrupo
- **Cria:** `PalpiteGrupo` com `nome: 'completo-{timestamp}'`, `apelido: apelido || 'Palpite 1'`, `fonte: 'excel'`
- **Retorna:** `{ success: true, grupo: PalpiteGrupo }`

### API: `GET /api/admin/completar-bolao/participantes-elegiveis`

- **Auth:** `requireAdmin()`
- **Retorna:** Lista de participantes sem nenhum PalpiteGrupo: `{ participantes: { id, nome }[] }`

## Participante: Experiência de Preenchimento

### Detecção de Modo

Na API `GET /api/completar/{token}/jogos`, para cada PalpiteGrupo:

1. Conta quantos palpites do grupo estão em jogos com `isBolao=true`
2. Se contagem === 0 → modo `"completo"`
3. Se contagem > 0 → modo `"restante"`

### API: `GET /api/completar/{token}/jogos` (modificada)

**Response (nova estrutura):**

```typescript
{
  grupos: (PalpiteGrupo & { modo: 'completo' | 'restante' })[],
  jogos: JogoComPalpite[],
  extras: (PalpiteExtraComPalpite | null)[]
}
```

- Cada grupo tem seu próprio `modo` (detectado individualmente)
- Quando a página está numa aba "completo": `jogos` contém os 72 jogos da fase de grupos; `extras` contém os 5 tipos de extras
- Quando a página está numa aba "restante": `jogos` contém os 39 jogos restantes; `extras` é array vazio (comportamento atual)

### API: `POST /api/completar/{token}` (modificada)

**Body (expandido):**

```typescript
{
  palpites: { jogoId: string, placarA: number, placarB: number }[],
  extras?: { tipo: string, valor: string }[],
  palpiteGrupoId?: string
}
```

- **Modo completo:** Valida que todos os 72 jogoIds são da fase de grupos (sem filtro isBolao). Aceita e salva `extras`.
- **Modo restante:** Comportamento atual (39 jogos, sem extras).

**Validações para modo completo:**
- Todos os 72 jogos devem ter placarA e placarB preenchidos (0-99)
- Todos os 5 extras devem ter valor não-vazio
- Máximo de 72 palpites de jogos

### Página `/completar/{token}` (modificada)

**Modo completo — diferenças visuais:**

- **72 jogos** agrupados por grupo (A-L), ordenados por data
- **Seção de extras** no final da lista, após os jogos:
  - Artilheiro (input texto)
  - Campeão (input texto)
  - Vice (input texto)
  - 3º lugar (input texto)
  - 4º lugar (input texto)
- **Barra de progresso:** "X/72 jogos + Y/5 extras preenchidos"
- **Botão "Salvar":** Habilitado somente quando todos os 72 jogos + 5 extras estiverem preenchidos
- **Auto-save localStorage:** Funciona normalmente (chave: `bolao_draft_{token}_{grupoId}`)
- **Após salvar:** Modo somente leitura (igual ao fluxo atual)

**Modo restante:** Sem mudanças — comportamento atual preservado.

## Admin Dashboard: Status e Sortear

### Tabela de Participantes (`getStatusCompletarBolao()`)

Para cada PalpiteGrupo de cada participante:

1. Detecta o modo (contagem de palpites isBolao)
2. Exibe status apropriado:
   - Modo completo: "Completo (72+extras)" ou "X/72 jogos + Y/5 extras"
   - Modo restante: "Completo (39)" ou "X/39 jogos" (comportamento atual)

### Sortear (`sortearPalpites()`)

- **Modo completo:** Sorteia 72 jogos (placarA/B 0-5) + 5 extras aleatórios (valores de seleções)
- **Modo restante:** Sorteia 39 jogos (comportamento atual)

### Admin Editar Palpites (`/admin/participantes/[id]/editar-palpites`)

- Detecta modo do grupo selecionado
- Modo completo: mostra 72 jogos + extras
- Modo restante: mostra 39 jogos (comportamento atual)

## Queries Modificadas (`src/lib/db/queries/completar-bolao.ts`)

### `getJogosRestantesComPalpites()` → renomeada para `getJogosComPalpites()`

- Aceita parâmetro `modo: 'completo' | 'restante'`
- Modo completo: busca 72 jogos (`fase: 'grupos'`, sem filtro isBolao) + extras
- Modo restante: busca 39 jogos (`isBolao: false, fase: 'grupos'`) — comportamento atual

### `detectarModoGrupo(palpiteGrupoId)`

- Nova função auxiliar
- Conta palpites do grupo em jogos `isBolao=true`
- Retorna `'completo'` se 0, `'restante'` se > 0

### `salvarPalpitesCompletar()`

- Aceita parâmetro opcional `extras: { tipo, valor }[]`
- Em modo completo: salva extras via upsert na tabela `palpites_extras`

### `getStatusCompletarBolao()`

- Para cada grupo, detecta modo e retorna contagem apropriada (72+extras ou 39)

### `sortearPalpites()`

- Para cada grupo, detecta modo
- Modo completo: sorteia 72 jogos + 5 extras
- Modo restante: sorteia 39 jogos (comportamento atual)

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/db/queries/completar-bolao.ts` | Novas funções + modificações |
| `src/app/api/completar/[token]/jogos/route.ts` | Retorna modo + extras |
| `src/app/api/completar/[token]/route.ts` | Aceita extras, valida modo |
| `src/app/api/admin/completar-bolao/novo-palpite/route.ts` | **Novo** |
| `src/app/api/admin/completar-bolao/participantes-elegiveis/route.ts` | **Novo** |
| `src/app/api/admin/completar-bolao/status/route.ts` | Status por modo |
| `src/app/api/admin/completar-bolao/sortear/route.ts` | Sortear por modo |
| `src/app/(public)/completar/[token]/page.tsx` | UI modo completo + extras |
| `src/app/admin/completar-bolao/page.tsx` | Botão "Novo Palpite" + modal + status |

## Não Afeta

- Schema do banco (zero migrations)
- Fluxo de upload Excel
- Cálculo de pontuação / ranking
- Middleware de auth
- Microserviço de resultados
