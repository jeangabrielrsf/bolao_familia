# Spec: Bracket oficial FIFA 2026 + placeholders descritivos + phase titles

**Data:** 2026-06-26
**Branch:** `dev`
**Status:** Aprovado em brainstorming (5 decisões locked, m0341-m0365)

## Problema

A aba Chaveamento do `/copa` tem 3 problemas:

1. **Matchups errados no R32.** O bracket produzia matchups incorretos (mesmo time aparecendo em múltiplos jogos, jogos entre times do mesmo grupo, jogos 1X vs 1Y impossíveis). Causa: `MATRIX_TERCEIROS` tinha 3 chaves placeholder incompletas (ABCDEFGH/ABCDEFG/ABCDEFI) + `PARES_R32_FALLBACK` que jogava pareamentos 1A vs 2B duplicados quando nenhuma chave casava.
2. **Sem phase titles claros no desktop.** Phase labels só apareciam como rodapé minúsculo. Usuário não sabe "R32 = 16 jogos, Oitavas = 8 jogos".
3. **"A definir" para 3rds é confuso.** O bracket mostra "A definir" para times que dependem de quais 3rds passam, mas isso não comunica que o time VAI existir após os grupos.

## Decisões locked (brainstorming)

| # | Decisão | Alternativas descartadas |
|---|---------|--------------------------|
| 1 | **Matrix oficial FIFA 2026 fixa** + refs "3ABCDF" — single structure cobre todas as 495 combinações porque os 3rds são pré-atribuídos a sets específicos de grupos | B) Matriz completa das 495 combinações (over-engineering) |
| 2 | **Placeholder descritivo**: "3º de C, E, F, H ou I" (italic muted) quando 3rd não definido, time real quando resolvido | B) Apenas sigla "TBD" (pouco informativo) |
| 3 | **Phase titles no topo** com nº de jogos: "R32 (16 jogos)", "Oitavas (8 jogos)", "Quartas (4 jogos)", "Semi (2 jogos)", "Final (1 jogo)" | B) Sidebar (perde espaço horizontal) |
| 4 | **Escopo: página inteira** (3 abas + header) | A) só bracket (limitado) |
| 5 | **Workflow:** bracket fix primeiro, UX depois | — |

## Estrutura oficial FIFA 2026 — R32 (M73-M88)

Os 16 jogos R32 têm estrutura FIXA. 8 são `1X vs 2Y` puros, 8 envolvem um `3Y` de um set específico de grupos.

| M# | Time A | Time B | Notas |
|----|--------|--------|-------|
| 73 | 2A | 2C | 1X vs 2Y |
| 74 | 1E | 3[ABCDF] | 3rd de 5 grupos |
| 75 | 1F | 2B | 1X vs 2Y |
| 76 | 1C | 2F | 1X vs 2Y |
| 77 | 1I | 3[CDFGH] | 3rd de 5 grupos |
| 78 | 1D | 2G | 1X vs 2Y |
| 79 | 1A | 3[CEFHI] | 3rd de 5 grupos |
| 80 | 1L | 3[EHIJK] | 3rd de 5 grupos |
| 81 | 1D | 3[BEFIJ] | 3rd de 5 grupos |
| 82 | 1G | 3[AEHIJ] | 3rd de 5 grupos |
| 83 | 1H | 2J | 1X vs 2Y |
| 84 | 1B | 2E | 1X vs 2Y |
| 85 | 1K | 3[EFGIJ] | 3rd de 5 grupos |
| 86 | 1J | 2K | 1X vs 2Y |
| 87 | 1K | 3[DEIJL] | 3rd de 5 grupos |
| 88 | 1B | 2H | 1X vs 2Y |

(Fonte: Wikipedia "2026 FIFA World Cup knockout stage" + site oficial FIFA. Mapeamento para `R32-M1` a `R32-M16` é direto: M73 → R32-M1, M74 → R32-M2, ..., M88 → R32-M16.)

**Restrições respeitadas:**
- Cada 1º/2º aparece exatamente uma vez (verificado: 16 × 1X + 8 × 2Y = 24, com sobreposições intencionais entre 1X e 2Y — ex: 1A e 2A não se enfrentam)
- Nenhum confronto é entre times do mesmo grupo (ex: 1A vs 2A nunca ocorre)
- 3rds de grupos diferentes não se enfrentam diretamente
- Distribuição 4+4 entre top/bottom half do bracket

## Design técnico

### Tipo Ref extendido

```ts
// matrix.ts
type Ref = `${'1' | '2'}${string}`  // "1A".."2L"
// OU
type Ref = `${'3'}${string}${string}*`  // "3ABCDF" — set de grupos
```

Implementação: refs permanecem strings. Projector detecta o prefixo:
- `ref[0] === '1' | '2'` → comportamento atual
- `ref[0] === '3'` e `ref.length > 2` → set de grupos (todos os caracteres depois de "3" são letras de grupos)

### Projector: resolver 3rds via set de grupos

```ts
function resolver3roSet(grupos: string, input: Input): string | null {
  // grupos é ex: "ABCDF"
  // Pega todos os 3rds qualificados cujo grupo está no set
  // Retorna o melhor (por pontos desc, ou primeiro da lista ordenada)
  // Retorna null se nenhum dos grupos está entre os 8 qualificados
  const candidatos = input.melhoresTerceiros
    .filter(t => grupos.includes(t.grupo))
    .sort((a, b) => b.pontos - a.pontos)  // getMelhores8Terceiros já ordena
  return candidatos[0]?.time || null
}
```

Nota: `getMelhores8Terceiros` (em `best-thirds.ts`) já retorna os 8 ordenados por pontos desc, saldo, gols pró. Quando um set tem múltiplos grupos qualificados, pegamos o primeiro (mais bem colocado). Quando só 1 dos 5 está qualificado, pegamos ele. Quando nenhum está, retornamos null (placeholder descritivo entra em ação).

### Placeholder descritivo no BracketMatch

BracketMatch recebe `slot: BracketSlot` que tem `sourceGrupo?: { timeA: { grupo, posicao }, timeB: { grupo, posicao } }`. Quando `timeA === null` E `sourceGrupo.timeA.posicao === 3`, exibir texto descritivo:

```tsx
// Extrai os grupos do ref: se sourceGrupo.timeA.grupo contém múltiplas letras (set), exibe lista
function placeholderText(sourceGrupo?: BracketSlot['sourceGrupo'], lado: 'A' | 'B'): string | null {
  if (!sourceGrupo) return null
  if (sourceGrupo[`time${lado}`].posicao !== 3) return null
  // se o "grupo" for "ABCDF", trata como set; senão, é grupo único
  // ...
}
```

**Decisão:** o sourceGrupo atual é `{ grupo: string, posicao: 1|2|3 }` — armazena um único grupo. Para suportar sets, estendo o tipo:

```ts
// types.ts
sourceGrupo?: {
  timeA: { grupo: string; posicao: 1 | 2 | 3; gruposAlternativos?: string[] }
  timeB: { grupo: string; posicao: 1 | 2 | 3; gruposAlternativos?: string[] }
}
```

Para refs `1A` ou `2A`: `gruposAlternativos` fica undefined (já sabemos o grupo).
Para refs `3ABCDF`: `grupo` = primeiro candidato (ou 'A' como placeholder), `gruposAlternativos` = `['A', 'B', 'C', 'D', 'F']`.

BrackerMatch renderiza:
- Se `timeA === null` E `gruposAlternativos?.length > 1`: "3º de A, B, C, D ou F" (italic muted)
- Se `timeA === null` E `gruposAlternativos === undefined` (1X/2X ainda sem vencedor): "A definir" (atual)
- Se `timeA !== null`: nome do time (atual)

### Phase titles no topo do BracketGrid

Layout novo (desktop ≥ lg):

```
R32 (16 jogos)    Oitavas (8 jogos)    Quartas (4 jogos)    Semi (2 jogos)    Final (1 jogo)    3º lugar
[grid columns with matches]
```

O grid em si não muda (continua 6 colunas, 16 rows). Só move os labels de baixo pra cima com informação adicional.

## Tarefas

| # | Tarefa | Tipo |
|---|--------|------|
| 1 | Rewriter `matrix.ts` com estrutura oficial FIFA M73-M88 + `Ref` type com sets | TDD (matrix.test.ts) |
| 2 | Update `projector.ts` para resolver refs `3ABCDF` + estender `sourceGrupo` com `gruposAlternativos` | TDD (projector.test.ts) |
| 3 | Update `bracket-match.tsx` para renderizar placeholder descritivo "3º de X, Y ou Z" | TDD (bracket-match.test.tsx) |
| 4 | Mover phase titles para topo do `bracket-grid.tsx` + adicionar contagem "R32 (16 jogos)" | TDD (bracket.test.tsx) |
| 5 | Verificar que UI funciona com database real (smoke test) | manual |

## Critérios de aceite

- [ ] Todos os 16 R32 matchups estão corretos conforme tabela oficial FIFA
- [ ] Cada 1º/2º aparece no máximo 1× no R32
- [ ] Nenhum confronto entre times do mesmo grupo
- [ ] Quando 3rd ainda não foi decidido, mostra "3º de X, Y ou Z" em italic muted
- [ ] Quando 3rd foi decidido, mostra nome do time
- [ ] Phase titles no topo do grid (desktop)
- [ ] Phase titles: "R32 (16 jogos)", "Oitavas (8 jogos)", "Quartas (4 jogos)", "Semi (2 jogos)", "Final (1 jogo)"
- [ ] Mobile mantém layout atual (fase por fase, scroll vertical)
- [ ] Testes passam (matrix + projector + bracket-match + bracket)
- [ ] Lint clean, build OK

## YAGNI

- Não mexer nas outras abas (Classificação, Simulador) nesta task
- Não mexer no header (será Fase 2)
- Não criar design tokens novos — reusar Tailwind utilities
- Não internacionalizar (projeto é pt-BR)
- Não fazer 495 combinações (single structure cobre todas)
