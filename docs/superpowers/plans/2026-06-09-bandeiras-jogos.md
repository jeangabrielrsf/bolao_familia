# Bandeiras nos Cards de Jogos — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar bandeiras dos países ao lado dos nomes dos times nos cards de jogos (página `/jogos`) e na página de detalhe (`/jogos/[id]`).

**Architecture:** Componente `Flag` reutilizável que carrega imagens via flagcdn.com, com utilitário `getTimeFlag()` que mapeia nomes em português para códigos ISO. Sem alterações no schema do banco.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, next/image

---

## Estrutura de Arquivos

| Ação | Arquivo | Responsabilidade |
|------|---------|------------------|
| Criar | `src/lib/utils/flags.ts` | Mapeamento time→código ISO + função `getTimeFlag()` |
| Criar | `src/components/ui/flag.tsx` | Componente `Flag` reutilizável |
| Modificar | `next.config.ts` | Adicionar flagcdn.com em remotePatterns |
| Modificar | `src/components/public/GameCard.tsx` | Integrar Flag (20px) |
| Modificar | `src/app/(public)/jogos/[id]/page.tsx` | Integrar Flag (28px) |

---

### Task 1: Configurar next.config.ts para flagcdn.com

**Files:**
- Modify: `next.config.ts:6-11`

- [ ] **Step 1: Adicionar flagcdn.com em remotePatterns**

Abra `next.config.ts` e adicione o padrão para flagcdn.com:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['canvas', '@napi-rs/canvas'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 2: Verificar que o build não quebra**

Run: `npm run build`
Expected: Build completa sem erros

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "chore: add flagcdn.com to image remote patterns"
```

---

### Task 2: Criar utilitário flags.ts

**Files:**
- Create: `src/lib/utils/flags.ts`

- [ ] **Step 1: Criar arquivo com mapeamento dos 48 times**

Crie `src/lib/utils/flags.ts`:

```typescript
export const TIME_CODIGOS: Record<string, string> = {
  'Argentina': 'ar',
  'Alemanha': 'de',
  'Argélia': 'dz',
  'Áustria': 'at',
  'África do Sul': 'za',
  'Austrália': 'au',
  'Bélgica': 'be',
  'Bósnia': 'ba',
  'Brasil': 'br',
  'Canadá': 'ca',
  'Cabo Verde': 'cv',
  'Catar': 'qa',
  'Colômbia': 'co',
  'Congo': 'cg',
  'Coreia do Sul': 'kr',
  'Costa do Marfim': 'ci',
  'Croácia': 'hr',
  'Curaçao': 'cw',
  'Dinamarca': 'dk',
  'Egito': 'eg',
  'Equador': 'ec',
  'Escócia': 'gb-sct',
  'Espanha': 'es',
  'EUA': 'us',
  'França': 'fr',
  'Gana': 'gh',
  'Haiti': 'ht',
  'Holanda': 'nl',
  'Inglaterra': 'gb-eng',
  'Irã': 'ir',
  'Iraque': 'iq',
  'Japão': 'jp',
  'Jordânia': 'jo',
  'Marrocos': 'ma',
  'México': 'mx',
  'Noruega': 'no',
  'Nova Zelândia': 'nz',
  'Panamá': 'pa',
  'Paraguai': 'py',
  'Polônia': 'pl',
  'Portugal': 'pt',
  'República Checa': 'cz',
  'Arábia Saudita': 'sa',
  'Senegal': 'sn',
  'Suécia': 'se',
  'Suíça': 'ch',
  'Tunísia': 'tn',
  'Turquia': 'tr',
  'Uruguai': 'uy',
  'Uzebequistão': 'uz',
}

export function getTimeFlag(nome: string): string | null {
  return TIME_CODIGOS[nome] ?? null
}
```

- [ ] **Step 2: Verificar que o TypeScript compila**

Run: `npx tsc --noEmit`
Expected: Sem erros

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils/flags.ts
git commit -m "feat: add time-to-country-code mapping utility"
```

---

### Task 3: Criar componente Flag

**Files:**
- Create: `src/components/ui/flag.tsx`

- [ ] **Step 1: Criar componente Flag**

Crie `src/components/ui/flag.tsx`:

```tsx
"use client"

import { preconnect } from "react-dom"
import { cn } from "@/lib/utils"

interface FlagProps {
  codigoIso: string
  size?: number
  className?: string
}

let preconnected = false

export function Flag({ codigoIso, size = 20, className }: FlagProps) {
  if (!preconnected) {
    preconnect("https://flagcdn.com")
    preconnected = true
  }

  const width = Math.round(size * 1.5)
  const height = size
  const src = `https://flagcdn.com/w${width * 2}/${codigoIso}.png`

  return (
    <img
      src={src}
      width={width}
      height={height}
      loading="lazy"
      aria-hidden="true"
      className={cn("object-contain inline-block", className)}
    />
  )
}
```

- [ ] **Step 2: Verificar que o TypeScript compila**

Run: `npx tsc --noEmit`
Expected: Sem erros

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/flag.tsx
git commit -m "feat: add Flag component with flagcdn.com integration"
```

---

### Task 4: Integrar Flag no GameCard

**Files:**
- Modify: `src/components/public/GameCard.tsx`

- [ ] **Step 1: Adicionar import do Flag e getTimeFlag**

No início de `src/components/public/GameCard.tsx`, adicione os imports:

```tsx
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Flag } from "@/components/ui/flag"
import { FASE_LABELS } from "@/lib/utils/constants"
import { getTimeFlag } from "@/lib/utils/flags"
import { Calendar, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
```

- [ ] **Step 2: Modificar o layout para incluir bandeiras**

Localize a seção de times (linhas 42-52) e substitua por:

```tsx
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-right flex items-center justify-end gap-2">
            {getTimeFlag(timeA) && <Flag codigoIso={getTimeFlag(timeA)!} size={20} />}
            <span className="font-display text-lg tracking-wide">{timeA}</span>
          </div>
          <div className="shrink-0">
            {finalizado ? (
              <span className="text-2xl font-display font-bold text-primary tabular-nums">{resultadoA} - {resultadoB}</span>
            ) : (
              <span className="text-sm font-medium text-muted-foreground">vs</span>
            )}
          </div>
          <div className="flex-1 text-left flex items-center gap-2">
            <span className="font-display text-lg tracking-wide">{timeB}</span>
            {getTimeFlag(timeB) && <Flag codigoIso={getTimeFlag(timeB)!} size={20} />}
          </div>
        </div>
```

- [ ] **Step 3: Verificar que o TypeScript compila**

Run: `npx tsc --noEmit`
Expected: Sem erros

- [ ] **Step 4: Commit**

```bash
git add src/components/public/GameCard.tsx
git commit -m "feat: add country flags to GameCard component"
```

---

### Task 5: Integrar Flag na página de detalhe do jogo

**Files:**
- Modify: `src/app/(public)/jogos/[id]/page.tsx`

- [ ] **Step 1: Adicionar import do Flag e getTimeFlag**

No início de `src/app/(public)/jogos/[id]/page.tsx`, adicione os imports:

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getJogoById } from '@/lib/db/queries/jogos'
import { getConfiguracao } from '@/lib/db/queries/config'
import { getRanking } from '@/lib/db/queries/ranking'
import { calcularPontosJogo } from '@/lib/utils/helpers'
import { getTimeFlag } from '@/lib/utils/flags'
import { FASE_LABELS } from '@/lib/utils/constants'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Flag } from '@/components/ui/flag'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Calendar, ChevronLeft } from 'lucide-react'
```

- [ ] **Step 2: Modificar o layout para incluir bandeiras**

Localize a seção de times (linhas 98-112) e substitua por:

```tsx
          <div className="flex items-center justify-center gap-6 py-4">
            <div className="flex-1 text-right flex items-center justify-end gap-3">
              {getTimeFlag(jogo.timeA) && <Flag codigoIso={getTimeFlag(jogo.timeA)!} size={28} />}
              <span className="text-xl sm:text-2xl font-display tracking-wide">{jogo.timeA}</span>
            </div>
            <div className="shrink-0">
              {jogo.status === 'finalizado' ? (
                <span className="text-3xl sm:text-4xl font-display font-bold text-primary tabular-nums">{jogo.resultadoA} - {jogo.resultadoB}</span>
              ) : (
                <span className="text-lg font-medium text-muted-foreground">vs</span>
              )}
            </div>
            <div className="flex-1 text-left flex items-center gap-3">
              <span className="text-xl sm:text-2xl font-display tracking-wide">{jogo.timeB}</span>
              {getTimeFlag(jogo.timeB) && <Flag codigoIso={getTimeFlag(jogo.timeB)!} size={28} />}
            </div>
          </div>
```

- [ ] **Step 3: Verificar que o TypeScript compila**

Run: `npx tsc --noEmit`
Expected: Sem erros

- [ ] **Step 4: Commit**

```bash
git add src/app/\(public\)/jogos/\[id\]/page.tsx
git commit -m "feat: add country flags to game detail page"
```

---

### Task 6: Verificação Final

- [ ] **Step 1: Rodar build completo**

Run: `npm run build`
Expected: Build completa sem erros

- [ ] **Step 2: Rodar lint**

Run: `npm run lint`
Expected: Sem erros de lint

- [ ] **Step 3: Rodar testes (se existirem)**

Run: `npm test`
Expected: Testes passam (ou "no tests found")

- [ ] **Step 4: Verificar visualmente**

Run: `npm run dev`

Abra no navegador:
- http://localhost:3000/jogos — verificar bandeiras nos cards
- Clicar em um jogo — verificar bandeiras na página de detalhe

Expected:
- Bandeiras aparecem ao lado dos nomes dos times
- Tamanho correto (20px nos cards, 28px na página de detalhe)
- Carregamento lazy funciona (verificar network tab)
- Sem erros no console

- [ ] **Step 5: Commit final (se necessário)**

Se houve ajustes visuais:

```bash
git add .
git commit -m "fix: adjustments after visual verification"
```

---

## Resumo de Commits

1. `chore: add flagcdn.com to image remote patterns`
2. `feat: add time-to-country-code mapping utility`
3. `feat: add Flag component with flagcdn.com integration`
4. `feat: add country flags to GameCard component`
5. `feat: add country flags to game detail page`
6. `fix: adjustments after visual verification` (se necessário)

---

## Checklist de Verificação

- [ ] flagcdn.com adicionado em remotePatterns
- [ ] Utilitário `flags.ts` criado com 48+ times
- [ ] Componente `Flag` criado com preconnect, lazy loading, aria-hidden
- [ ] GameCard exibe bandeiras de 20px
- [ ] Página de detalhe exibe bandeiras de 28px
- [ ] Build passa sem erros
- [ ] Lint passa sem erros
- [ ] Verificação visual OK
