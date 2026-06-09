# Upload em Lote com Múltiplos Palpites por Participante

**Data:** 2026-06-09  
**Status:** Aprovado

## Contexto

O arquivo `assets/arquivos_planilhas/Bolão Copa do Mundo 2026 - preenchido.xlsx` contém várias abas:
- Aba "Modelo" (template)
- Abas individuais por participante (ex: "Leo", "Maria", "João")
- Alguns participantes têm múltiplas abas (ex: "Leo 1" e "Leo (2)")

O sistema deve suportar upload desse arquivo em lote, ignorando a aba "Modelo", criando/vinculando participantes automaticamente, e permitindo múltiplos palpites independentes por participante.

## Decisões de Design

### 1. Agrupamento de Múltiplos Palpites

**Decisão:** O parser detecta automaticamente sufixos nos nomes das abas para agrupar palpites do mesmo participante.

**Regex de detecção:**
```regex
/^(.+?)\s*(?:[-–—]\s*(?:Palpite\s*)?\d+|\(\d+\)|\d+)$/i
```

**Exemplos:**
- "Leo 1" → nome: "Leo", apelido: "Palpite 1"
- "Leo (2)" → nome: "Leo", apelido: "Palpite 2"
- "Maria" → nome: "Maria", apelido: "Palpite 1" (sem sufixo)
- "João - Palpite 3" → nome: "João", apelido: "Palpite 3"

### 2. Exibição no Ranking

**Decisão:** Cada palpite aparece como entrada independente no ranking ("Leo - Palpite 1", "Leo - Palpite 2"), cada um com sua pontuação.

### 3. Fluxo de Upload

**Decisão:** Dois fluxos coexistem na página `/admin/upload`:
- **Upload Individual** (existente): seleciona participante → envia arquivo → prévia → confirma
- **Upload em Lote** (novo): envia arquivo Excel multi-abas → prévia com tabs → confirma tudo

O fluxo individual permanece inalterado.

### 4. Modelo de Dados

**Decisão:** Criar entidade intermediária `PalpiteGrupo` para representar cada conjunto de palpites (33 jogos + 5 extras).

## Modelo de Dados

### Nova Tabela: `palpites_grupos`

```prisma
model PalpiteGrupo {
  id              String   @id @default(uuid())
  participanteId  String   @map("participante_id")
  nome            String   // ex: "Leo - Palpite 1"
  apelido         String   @map("apelido") // ex: "Palpite 1"
  fonte           Fonte    @default(excel)
  criadoEm        DateTime @default(now()) @map("criado_em")

  participante    Participante @relation(fields: [participanteId], references: [id])
  palpites        Palpite[]
  extras          PalpiteExtra[]

  @@unique([participanteId, nome])
  @@map("palpites_grupos")
}
```

### Mudanças nas Tabelas Existentes

**Palpite:**
- Remove `participanteId`
- Adiciona `palpiteGrupoId` (UUID, NOT NULL, FK para `palpites_grupos`)
- Unique constraint muda de `@@unique([participanteId, jogoId])` para `@@unique([palpiteGrupoId, jogoId])`

**PalpiteExtra:**
- Remove `participanteId`
- Adiciona `palpiteGrupoId` (UUID, NOT NULL, FK para `palpites_grupos`)
- Unique constraint muda de `@@unique([participanteId, tipo])` para `@@unique([palpiteGrupoId, tipo])`

**Participante:**
- Relação muda de `palpites: Palpite[]` e `extras: PalpiteExtra[]` para `grupos: PalpiteGrupo[]`

### Migration SQL

```sql
-- Criar tabela palpites_grupos
CREATE TABLE palpites_grupos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participante_id UUID NOT NULL REFERENCES participantes(id),
  nome TEXT NOT NULL,
  apelido TEXT NOT NULL,
  fonte TEXT NOT NULL DEFAULT 'excel',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(participante_id, nome)
);

-- Adicionar palpite_grupo_id em palpites
ALTER TABLE palpites ADD COLUMN palpite_grupo_id UUID REFERENCES palpites_grupos(id);

-- Adicionar palpite_grupo_id em palpites_extras
ALTER TABLE palpites_extras ADD COLUMN palpite_grupo_id UUID REFERENCES palpites_grupos(id);

-- Migrar dados existentes: criar um grupo por participante
INSERT INTO palpites_grupos (participante_id, nome, apelido, fonte)
SELECT DISTINCT p.id, p.nome, 'Palpite 1', COALESCE(
  (SELECT fonte FROM palpites WHERE participante_id = p.id LIMIT 1), 'excel'
)
FROM participantes p;

-- Vincular palpites existentes aos grupos
UPDATE palpites SET palpite_grupo_id = pg.id
FROM palpites_grupos pg WHERE pg.participante_id = palpites.participante_id;

-- Vincular extras existentes aos grupos
UPDATE palpites_extras SET palpite_grupo_id = pg.id
FROM palpites_grupos pg WHERE pg.participante_id = palpites_extras.participante_id;

-- Remover colunas antigas e criar constraints
ALTER TABLE palpites ALTER COLUMN palpite_grupo_id SET NOT NULL;
ALTER TABLE palpites DROP COLUMN participante_id;
ALTER TABLE palpites DROP CONSTRAINT palpites_participante_id_jogo_id_key;
ALTER TABLE palpites ADD UNIQUE(palpite_grupo_id, jogo_id);

ALTER TABLE palpites_extras ALTER COLUMN palpite_grupo_id SET NOT NULL;
ALTER TABLE palpites_extras DROP COLUMN participante_id;
ALTER TABLE palpites_extras DROP CONSTRAINT palpites_extras_participante_id_tipo_key;
ALTER TABLE palpites_extras ADD UNIQUE(palpite_grupo_id, tipo);
```

## Parser Multi-Abas

### Nova Função: `parseExcelMultiSheet`

**Localização:** `src/lib/services/upload/excel-parser.ts`

**Assinatura:**
```typescript
interface PalpiteGrupoParsed {
  nomeParticipante: string  // "Leo"
  apelido: string           // "Palpite 1", "Palpite 2"
  nomeCompleto: string      // "Leo - Palpite 1"
  palpites: PalpiteDTO[]
  extras: PalpiteExtraDTO[]
}

function parseExcelMultiSheet(
  buffer: Buffer,
  jogosIds: string[]
): PalpiteGrupoParsed[]
```

**Lógica:**
1. Ler todas as abas do workbook
2. Filtrar aba "Modelo" (case-insensitive)
3. Para cada aba restante:
   - Extrair nome base e apelido usando regex de sufixo
   - Parsear 33 jogos + 5 extras (mesma lógica de `parseExcel`)
4. Retornar array de `PalpiteGrupoParsed`

## API

### Upload em Lote

**Nova rota:** `POST /api/upload/lote`

**Request:**
- FormData com campo `file` (Excel multi-abas)
- **Sem** `participanteId`

**Response:**
```typescript
{
  grupos: Array<{
    nomeParticipante: string
    apelido: string
    nomeCompleto: string
    participanteId: string | null  // null se participante não existe
    palpites: PalpiteDTO[]
    extras: PalpiteExtraDTO[]
  }>
  validacao: ValidationResult
}
```

**Lógica:**
1. Receber arquivo Excel
2. Chamar `parseExcelMultiSheet`
3. Para cada grupo parseado:
   - Buscar participante por nome no banco
   - Se existir: marcar `participanteId`
   - Se não existir: marcar `participanteId: null` (será criado na confirmação)
4. Validar todos os grupos
5. Retornar preview

### Confirmação em Lote

**Nova rota:** `POST /api/admin/upload/confirm-lote`

**Request:**
```typescript
{
  grupos: Array<{
    nomeParticipante: string
    apelido: string
    nomeCompleto: string
    palpites: PalpiteDTO[]
    extras: PalpiteExtraDTO[]
  }>
}
```

**Response:**
```typescript
{
  success: true,
  gruposCriados: number,
  participantesCriados: number
}
```

**Lógica (transação única):**
1. Para cada grupo:
   - Buscar ou criar participante por nome
   - Verificar se já existe `PalpiteGrupo` com mesmo `participanteId + nome`
   - Se existir: deletar palpites/extras antigos do grupo (substituir)
   - Se não existir: criar novo `PalpiteGrupo`
   - Criar `Palpite` e `PalpiteExtra` vinculados ao grupo
2. Retornar estatísticas

**Comportamento de substituição:**
- Substitui apenas o grupo específico (ex: "Leo - Palpite 1"), não todos os palpites do participante
- Se "Leo" tem "Palpite 1" e "Palpite 2", e o admin reenvia só "Leo - Palpite 1", apenas o Palpite 1 é substituído

## Frontend

### Página `/admin/upload`

**Modificação:** Adicionar seletor de modo no topo.

```
┌─────────────────────────┐  ┌─────────────────────────┐
│  📄 Upload Individual   │  │  📊 Upload em Lote      │
│  Um participante por    │  │  Múltiplos participantes│
│  vez                    │  │  de uma vez             │
└─────────────────────────┘  └─────────────────────────┘
```

- **Upload Individual:** fluxo atual (select de participante → UploadForm → PreviewTable)
- **Upload em Lote:** UploadForm sem select de participante

### Prévia do Upload em Lote

**Componente:** `BatchPreviewTabs`

**Estrutura:**
1. **Resumo no topo:** "5 participantes detectados, 2 novos, 3 existentes"
2. **Tabs horizontais** (shadcn/ui Tabs):
   - Uma tab por grupo: "Leo - Palpite 1", "Leo - Palpite 2", "Maria", etc.
   - Badge colorido: verde = participante existe, amarelo = novo (será criado)
3. **Conteúdo da tab ativa:** `PreviewTable` editável (reutilizado)
4. **Botões:** "Cancelar" e "Confirmar Tudo"

### Estados

```typescript
type BatchStep = 'select-mode' | 'upload-lote' | 'preview-lote' | 'confirming-lote' | 'success' | 'error'

interface BatchGrupoPreview {
  nomeParticipante: string
  apelido: string
  nomeCompleto: string
  participanteId: string | null
  palpites: PalpiteDTO[]
  extras: PalpiteExtraDTO[]
}
```

## Ranking e Páginas Públicas

### Ranking (`/ranking`)

**Query:** `getRanking()` busca `PalpiteGrupo` ao invés de `Participante`.

**Tipo atualizado:**
```typescript
interface RankingEntry {
  palpiteGrupoId: string
  participanteId: string
  nomeParticipante: string  // "Leo"
  nomeGrupo: string         // "Leo - Palpite 1"
  apelido: string           // "Palpite 1"
  fotoUrl: string | null
  pontos: number
  placaresExatos: number
  vencedoresCorretos: number
}
```

**UI:** Cada linha mostra "Leo - Palpite 1" como entrada independente.

### Página de Participantes (`/participantes`)

Cada card mostra quantos palpites o participante tem:

```
┌─────────────────────────────┐
│  [foto] Leo                 │
│         2 palpites          │
└─────────────────────────────┘
```

Ao clicar, abre tela/modal com tabs para cada palpite, mostrando ranking individual.

### Página de Jogos (`/jogos`)

Para cada jogo, mostrar palpites agrupados por participante:

```
Leo:
  Palpite 1: Brasil 2 x 1 Alemanha
  Palpite 2: Brasil 3 x 0 Alemanha
Maria:
  Palpite 1: Brasil 1 x 1 Alemanha
```

## Operações no Supabase

Usar MCP do Supabase para:
- **Migration:** `supabase_apply_migration` para criar tabela `palpites_grupos` e alterar `palpites`/`palpites_extras`
- **Migração de dados:** `supabase_execute_sql` para migrar dados existentes
- **Queries:** `supabase_execute_sql` para testes e validações

## Escopo

**Incluído:**
- Migration do schema (tabela `palpites_grupos`, alterações em `palpites` e `palpites_extras`)
- Parser multi-abas (`parseExcelMultiSheet`)
- API de upload em lote (`POST /api/upload/lote`)
- API de confirmação em lote (`POST /api/admin/upload/confirm-lote`)
- Frontend do upload em lote (seletor de modo, prévia com tabs)
- Atualização do ranking para usar `PalpiteGrupo`
- Atualização da página de participantes (mostrar contagem de palpites)
- Atualização da página de jogos (agrupar por participante)

**Não incluído:**
- Upload individual (permanece inalterado)
- Exportação de resultados
- Notificações por email
- Validação de duplicidade de palpites (mesmo participante, mesmo arquivo)

## Riscos e Considerações

1. **Performance:** Upload de arquivo grande com muitas abas pode ser lento. Considerar limite de 50 abas.
2. **Conflito de nomes:** Se dois participantes tiverem nomes muito similares (ex: "Leo" e "Leonardo"), o parser pode agrupar errado. O admin deve revisar a prévia.
3. **Idempotência:** Se o admin enviar o mesmo arquivo duas vezes, apenas os grupos específicos são substituídos (ex: "Leo - Palpite 1"), não todos os palpites do participante. A API de confirmação verifica `participanteId + nome do grupo` e deleta os palpites antigos antes de inserir os novos.
4. **Compatibilidade:** Arquivos Excel com formato diferente do template podem falhar no parse. Manter validação rigorosa.
5. **Migration de dados existentes:** A migration deve tratar participantes sem palpites (não criar grupo para eles). A query de migração usa `INNER JOIN` implícito ao buscar fontes de `palpites`, então participantes sem palpites não terão grupos criados (correto).
