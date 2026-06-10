# Bandeiras nos Cards de Jogos

**Data:** 2026-06-09  
**Status:** Aprovado

## Contexto

Atualmente, os cards de jogos exibem os nomes dos times como texto puro (ex: "Brasil", "Estados Unidos"). O objetivo é adicionar bandeiras dos países ao lado dos nomes, tanto na página de listagem (`/jogos`) quanto na página de detalhe de cada jogo (`/jogos/[id]`).

## Requisitos

- Exibir bandeira ao lado do nome de cada time
- Usar API externa (flagcdn.com) para as imagens
- Mapear nomes em português para códigos ISO dos países
- Aplicar apenas aos 48 times confirmados da Copa 2026

## Solução

### Abordagem: Componente Flag + Utilitário de Lookup

Criar um componente `Flag` reutilizável e um utilitário que mapeia nomes de times para códigos ISO. Sem alterações no schema do banco.

### Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    Componentes UI                            │
├─────────────────────────────────────────────────────────────┤
│  GameCard.tsx          │  jogos/[id]/page.tsx               │
│  (bandeira 20px)       │  (bandeira 28px)                   │
└──────────┬─────────────┴─────────────┬──────────────────────┘
           │                           │
           │ getTimeFlag(nome)         │ getTimeFlag(nome)
           ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│              src/lib/utils/flags.ts                         │
├─────────────────────────────────────────────────────────────┤
│  TIME_CODIGOS: Record<string, string>                       │
│  getTimeFlag(nome: string): string | null                   │
└─────────────────────────────────────────────────────────────┘
           │
           │ codigoIso
           ▼
┌─────────────────────────────────────────────────────────────┐
│              src/components/ui/flag.tsx                     │
├─────────────────────────────────────────────────────────────┤
│  Flag({ codigoIso, size })                                  │
│  - preconnect para flagcdn.com                              │
│  - loading="lazy"                                           │
│  - aria-hidden="true"                                       │
└─────────────────────────────────────────────────────────────┘
           │
           │ Image src
           ▼
    https://flagcdn.com/w{size*2}/{codigoIso}.png
```

## Componentes

### 1. `src/lib/utils/flags.ts`

Utilitário com mapeamento estático dos 48 times confirmados para códigos ISO alpha-2.

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

### 2. `src/components/ui/flag.tsx`

Componente que renderiza a bandeira via `<Image>` do Next.js.

```typescript
interface FlagProps {
  codigoIso: string
  size?: number // default: 20
  className?: string
}

export function Flag({ codigoIso, size = 20, className }: FlagProps) {
  // preconnect para flagcdn.com (feito uma vez)
  // src: https://flagcdn.com/w{size*2}/{codigoIso}.png
  // width/height: size * 1.5 / size (proporção 3:2)
  // loading="lazy"
  // aria-hidden="true" (decorativa)
}
```

**Detalhes técnicos:**
- `preconnect('https://flagcdn.com')` via React DOM resource hints
- `loading="lazy"` — bandeiras não são críticas
- Dimensões explícitas para evitar CLS
- `aria-hidden="true"` — bandeira é decorativa (nome já está visível)
- Fallback: se `codigoIso` for null/undefined, não renderiza nada

### 3. Modificações no GameCard

**Arquivo:** `src/components/public/GameCard.tsx`

Layout atual:
```
[timeA direita] | [placar] | [timeB esquerda]
```

Novo layout:
```
[flag 20px] [timeA direita] | [placar] | [timeB esquerda] [flag 20px]
```

- Bandeira do timeA à esquerda do nome
- Bandeira do timeB à direita do nome
- Tamanho: 20px

### 4. Modificações na Página de Detalhe

**Arquivo:** `src/app/(public)/jogos/[id]/page.tsx`

Mesmo padrão do GameCard, mas com bandeira de 28px.

## Mapeamento dos 48 Times Confirmados

| País (PT-BR) | Código ISO | Bandeira |
|--------------|------------|----------|
| Argentina | ar | 🇦🇷 |
| Alemanha | de | 🇩🇪 |
| Argélia | dz | 🇩🇿 |
| Áustria | at | 🇦🇹 |
| África do Sul | za | 🇿🇦 |
| Austrália | au | 🇦🇺 |
| Bélgica | be | 🇧🇪 |
| Bósnia | ba | 🇧🇦 |
| Brasil | br | 🇧🇷 |
| Canadá | ca | 🇨🇦 |
| Cabo Verde | cv | 🇨🇻 |
| Catar | qa | 🇶🇦 |
| Colômbia | co | 🇨🇴 |
| Congo | cg | 🇨🇬 |
| Coreia do Sul | kr | 🇰🇷 |
| Costa do Marfim | ci | 🇨🇮 |
| Croácia | hr | 🇭🇷 |
| Curaçao | cw | 🇨🇼 |
| Dinamarca | dk | 🇩🇰 |
| Egito | eg | 🇪🇬 |
| Equador | ec | 🇪🇨 |
| Escócia | gb-sct | 🏴󠁧󠁢󠁳󠁣󠁴󠁿 |
| Espanha | es | 🇪🇸 |
| EUA | us | 🇺🇸 |
| França | fr | 🇫🇷 |
| Gana | gh | 🇬🇭 |
| Haiti | ht | 🇭🇹 |
| Holanda | nl | 🇳🇱 |
| Inglaterra | gb-eng | 🏴󠁧󠁢󠁥󠁮󠁧󠁿 |
| Irã | ir | 🇮🇷 |
| Iraque | iq | 🇮🇶 |
| Japão | jp | 🇯🇵 |
| Jordânia | jo | 🇯🇴 |
| Marrocos | ma | 🇲🇦 |
| México | mx | 🇲🇽 |
| Noruega | no | 🇳🇴 |
| Nova Zelândia | nz | 🇳🇿 |
| Panamá | pa | 🇵🇦 |
| Paraguai | py | 🇵🇾 |
| Polônia | pl | 🇵🇱 |
| Portugal | pt | 🇵🇹 |
| República Checa | cz | 🇨🇿 |
| Arábia Saudita | sa | 🇸🇦 |
| Senegal | sn | 🇸🇳 |
| Suécia | se | 🇸🇪 |
| Suíça | ch | 🇨🇭 |
| Tunísia | tn | 🇹🇳 |
| Turquia | tr | 🇹🇷 |
| Uruguai | uy | 🇺🇾 |
| Uzebequistão | uz | 🇺🇿 |

**Total:** 48 times (50 entradas no mapeamento, pois Escócia e Inglaterra usam subdivisões do GB)

## Considerações Técnicas

### Performance
- `preconnect` para flagcdn.com — estabelece conexão antecipadamente
- `loading="lazy"` — bandeiras não são críticas para renderização inicial
- Dimensões explícitas (`width`/`height`) — evita Cumulative Layout Shift (CLS)
- Imagens servidas via CDN global (flagcdn.com)

### Acessibilidade
- `aria-hidden="true"` — bandeira é decorativa, nome do time já está visível
- Leitores de tela ignoram a imagem, leem apenas o nome do time

### Fallback
- Se time não estiver no mapeamento, `getTimeFlag()` retorna `null`
- Componente `Flag` não renderiza nada se `codigoIso` for null/undefined
- Layout não quebra — apenas a bandeira não aparece

### Responsividade
- Tamanhos fixos (20px e 28px) funcionam em todos os breakpoints
- Imagem escala proporcionalmente (proporção 3:2)

## Escopo

### Inclui
- Componente `Flag` reutilizável
- Utilitário `getTimeFlag()` com mapeamento dos 48 times
- Integração no `GameCard` (página `/jogos`)
- Integração na página de detalhe (`/jogos/[id]`)
- `preconnect` para flagcdn.com

### Não inclui
- Alterações no schema do banco de dados
- Modificações no microserviço
- Bandeiras em outros componentes (participantes, ranking, etc.)
- Upload/admin de bandeiras customizadas
- Suporte a times não confirmados (extras como campeão/vice)

## Arquivos Afetados

### Novos
- `src/lib/utils/flags.ts`
- `src/components/ui/flag.tsx`

### Modificados
- `src/components/public/GameCard.tsx`
- `src/app/(public)/jogos/[id]/page.tsx`

## Referências

- [flagcdn.com](https://flagcdn.com/) — API de bandeiras
- [React DOM Resource Hints](https://react.dev/reference/react-dom#resource-preloading-apis) — preconnect, prefetchDNS
- [Next.js Image Component](https://nextjs.org/docs/app/api-reference/components/image) — otimização de imagens
