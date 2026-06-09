# PDF Upload Support - Design Document

**Data:** 2026-06-09  
**Status:** Draft

## Contexto

O sistema de upload do Bolão Copa 2026 atualmente suporta dois formatos de entrada para importação de palpites:
- **Excel (.xlsx):** processado deterministicamente via parser SheetJS
- **Imagens (.jpg, .png, .webp):** processadas via OCR com modelo de visão (OpenRouter/GPT-4o)

Participantes do bolão recebem a planilha em formato A4 e podem devolvê-la preenchida de diversas formas. Alguns participantes escaneiam a planilha preenchida e a enviam como **PDF multi-página** (2-3 páginas contendo todos os 33 jogos da fase de grupos + 5 palpites extras).

**Objetivo:** Adicionar suporte ao upload de PDFs, extraindo os palpites via OCR das páginas renderizadas como imagens.

## Decisão de Abordagem

### Abordagens Consideradas

1. **`pdfjs-dist` (Mozilla) — renderizar páginas como imagens** ✅ Escolhida
   - Extrai cada página do PDF como imagem usando `pdfjs-dist` (pure JS)
   - Envia todas as imagens ao modelo de visão em uma única chamada
   - Prós: Pure JavaScript (funciona no Vercel serverless), sem dependências nativas, bem mantido
   - Contras: Bundle maior (~500KB), requer configuração do worker

2. **`mupdf.js` — extrair imagens embutidas**
   - Extrai diretamente as imagens embutidas em cada página
   - Prós: Mais leve, extrai imagem original sem re-renderizar
   - Contras: Pode falhar com compressões não-standard; dependência nativa problemática no Vercel

3. **API externa de conversão**
   - Enviar PDF para serviço externo e receber imagens de volta
   - Prós: Zero processamento local
   - Contras: Dependência de serviço externo, latência, custo adicional

### Justificativa

A abordagem com `pdfjs-dist` foi escolhida por ser a mais confiável para o ambiente Vercel, não depender de serviços externos, e se integrar naturalmente ao fluxo OCR existente.

## Arquitetura

### Fluxo de Upload

```
Admin seleciona participante → Upload do PDF
  → POST /api/upload (extrai páginas como imagens → envia ao OCR → retorna preview)
  → Admin revisa/edita preview
  → POST /api/admin/upload/confirm (salva no DB + arquiva PDF no Storage)
```

O PDF entra como uma terceira fonte no sistema, ao lado de Excel e foto. O fluxo de 2 etapas (parse/preview → confirm) permanece inalterado.

### Componentes Afetados

| Componente | Tipo de Mudança | Descrição |
|------------|-----------------|-----------|
| `src/lib/services/upload/pdf-parser.ts` | Novo | Parser de PDF usando pdfjs-dist |
| `src/lib/services/upload/ocr-vision.ts` | Modificado | Aceitar array de imagens (multi-página) |
| `src/app/api/upload/route.ts` | Modificado | Adicionar branch para PDF |
| `src/components/admin/UploadForm.tsx` | Modificado | Aceitar .pdf no input |
| `prisma/schema.prisma` | Modificado | Adicionar `pdf` ao enum `Fonte` |

## Especificação Técnica

### 1. Parser PDF (`pdf-parser.ts`)

**Arquivo:** `src/lib/services/upload/pdf-parser.ts`

**Função principal:**
```typescript
export async function parsePdf(buffer: Buffer): Promise<UploadResult>
```

**Fluxo interno:**

1. Carrega o PDF com `pdfjs-dist` a partir do buffer
2. Para cada página (2-3 páginas esperadas):
   - Renderiza em canvas com resolução ~200 DPI (`scale: 2.0`)
   - Converte canvas para PNG em base64
3. Envia array de imagens (base64) para `parseFoto()` (refatorado para aceitar múltiplas imagens)
4. Retorna `UploadResult` com `fonte: 'pdf'`

**Configuração do pdfjs-dist no Next.js serverless:**

O `pdfjs-dist` usa um web worker para parsing. No ambiente serverless (Vercel/Node.js), o worker deve ser configurado via caminho do arquivo ou desabilitado para processamento síncrono:

```typescript
import * as pdfjsLib from 'pdfjs-dist';

// Opção A: Worker inline (recomendado para serverless)
import 'pdfjs-dist/build/pdf.worker.mjs';

// Opção B: Desabilitar worker (processamento síncrono, mais simples)
pdfjsLib.GlobalWorkerOptions.workerSrc = '';
```

A Opção B (sem worker) é mais simples para o ambiente serverless e suficiente para PDFs de 2-3 páginas.

### 2. Refatoração do OCR (`ocr-vision.ts`)

**Arquivo:** `src/lib/services/upload/ocr-vision.ts`

**Mudança principal:** A função `parseFoto()` passa a aceitar múltiplas imagens.

**Nova assinatura:**
```typescript
export async function parseFoto(
  input: Buffer | Buffer[],
  mime?: string
): Promise<UploadResult>
```

**Comportamento:**
- Se recebe 1 imagem (`Buffer`) → comportamento atual (compatibilidade)
- Se recebe array (`Buffer[]`) → envia array de `image_url` no content da mensagem

**Prompt ajustado para multi-página:**
```
A planilha está distribuída em N páginas. Extraia todos os palpites de todas 
as páginas e consolide em um único JSON. A planilha contém:
- 33 jogos da fase de grupos com placares
- 5 palpites extras: artilheiro, campeão, vice, terceiro lugar, quarto lugar
```

**Compatibilidade:** A função mantém a mesma interface de retorno (`UploadResult`), então o `route.ts` do `/api/upload` não precisa de mudanças lógicas significativas.

### 3. API Route (`/api/upload`)

**Arquivo:** `src/app/api/upload/route.ts`

**Mudanças:**

1. Adicionar `application/pdf` nos MIME types aceitos:
```typescript
const MIME_TYPES_PERMITIDOS = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg', 'image/png', 'image/webp',
  'application/pdf'  // novo
];
```

2. Adicionar branch para PDF:
```typescript
if (isExcel) {
  result = parseExcel(buffer, jogosIds);
} else if (isPdf) {
  result = await parsePdf(buffer);
} else {
  result = await parseFoto(buffer, mime);
}
```

3. Mapear `jogosIds` nos palpites retornados (mesma lógica que foto):
```typescript
if (isPdf || !isExcel) {
  const mappedPalpites = result.palpites.map((p, i) => ({
    jogoId: jogosIds[i] ?? '',
    placarA: p.placarA,
    placarB: p.placarB,
  }));
  result = { ...result, palpites: mappedPalpites };
}
```

### 4. Frontend (`UploadForm.tsx`)

**Arquivo:** `src/components/admin/UploadForm.tsx`

**Mudanças:**

1. Adicionar `.pdf` ao atributo `accept` do input:
```typescript
accept=".xlsx,.jpg,.jpeg,.png,.webp,.pdf"
```

2. Adicionar `application/pdf` na validação client-side:
```typescript
const MIME_TYPES_PERMITIDOS = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg', 'image/png', 'image/webp',
  'application/pdf'
];
```

3. Atualizar mensagem de ajuda:
```
"Envie a planilha (.xlsx), foto (.jpg, .png) ou PDF (.pdf) com os palpites"
```

### 5. Migração Prisma

**Arquivo:** `prisma/schema.prisma`

Adicionar `pdf` ao enum `Fonte`:

```prisma
enum Fonte {
  excel
  foto
  pdf  // novo
}
```

**Comando:**
```bash
npx prisma migrate dev --name add-pdf-fonte
```

Migração simples — apenas altera o enum no PostgreSQL.

## Tratamento de Erros

### Cenários de Erro e Comportamento

| Cenário | Comportamento |
|---------|---------------|
| PDF corrompido | `pdfjs-dist` lança erro → retorna 400 com mensagem "PDF inválido ou corrompido" |
| PDF sem páginas | Retorna 400 com mensagem "PDF não contém páginas" |
| PDF com mais de 10 páginas | Retorna 400 com mensagem "PDF com muitas páginas (máximo 10)" |
| Falha no OCR | Retorna 500 com mensagem "Falha ao processar PDF. Tente novamente." |
| PDF muito grande (>10MB) | Já bloqueado pela validação existente de tamanho |
| Worker do pdfjs falha | Fallback para processamento síncrono (sem worker) |

### Limites

- **Tamanho máximo do PDF:** 10MB (mesmo limite atual)
- **Máximo de páginas:** 10 páginas (limite de segurança)
- **Resolução de renderização:** 200 DPI (balanceia qualidade e performance)

## Testes

### Testes Unitários

**Arquivo:** `src/lib/services/upload/__tests__/pdf-parser.test.ts`

Casos de teste:
1. PDF válido com 2 páginas → extrai todos os 33 jogos + 5 extras
2. PDF válido com 3 páginas → extrai todos os 33 jogos + 5 extras
3. PDF corrompido → lança erro apropriado
4. PDF vazio (sem páginas) → lança erro apropriado
5. PDF com mais de 10 páginas → lança erro apropriado
6. PDF com páginas em branco → ignora páginas sem conteúdo

### Testes de Integração

- Upload de PDF via UI do admin → preview correto → confirmação salva no DB
- PDF arquivado no Supabase Storage após confirmação
- `UploadLog` criado com `tipoArquivo: 'pdf'`

## Dependências

### Nova Dependência

```bash
npm install pdfjs-dist
```

**Versão recomendada:** `^4.0.0` (estável, com suporte a ES modules)

### Dependências Existentes (sem mudança)

- `xlsx` — parser Excel
- `sharp` — processamento de imagens
- `@supabase/supabase-js` — storage

## Considerações de Performance

### Tempo de Processamento

- **PDF 2 páginas:** ~5-10 segundos (renderização + OCR)
- **PDF 3 páginas:** ~8-15 segundos (renderização + OCR)

O tempo é dominado pela chamada ao modelo de visão (OpenRouter), não pela renderização do PDF.

### Uso de Memória

- Cada página renderizada a 200 DPI consome ~2-4MB em memória
- PDF de 3 páginas: ~10-12MB de pico
- Dentro dos limites do Vercel serverless (1024MB)

### Otimizações Futuras (não escopo atual)

- Cache de worker do pdfjs entre requisições
- Renderização paralela de páginas
- Compressão de imagens antes do envio ao OCR

## Rollback

Se necessário, o rollback é simples:
1. Reverter o commit
2. Rodar `npx prisma migrate dev` para remover o enum `pdf`
3. PDFs já enviados permanecem no Storage, mas não podem ser processados

## Futuras Melhorias (Fora do Escopo)

- Suporte a PDFs nativamente via Gemini (sem renderização)
- Preview das páginas extraídas na UI antes do OCR
- Detecção automática de orientação das páginas
- Suporte a PDFs com texto selecionável (extração direta sem OCR)
