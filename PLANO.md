# Plano — Quem Passa + Read-only Mata-Mata

## Problema 1: Exibir `vencedorPalpite` na página `/jogos/[id]`

### Contexto

A página `/jogos/[id]` mostra todos os palpites de um jogo específico. Para jogos de mata-mata (fase ≠ `grupos`), participantes podem prever empate e selecionar qual time avança (`vencedorPalpite`: 1 = timeA, 2 = timeB). Atualmente:

- A página **não exibe** `vencedorPalpite` na tabela de palpites
- Usa `calcularPontosJogo` (lógica de grupos) para **todos** os jogos, ignorando `vencedorPalpite`
- O ranking (`ranking.ts`) usa `calcularPontosMataMata` corretamente, mas a página do jogo não

### Arquivo: `src/app/(public)/jogos/[id]/page.tsx`

### Mudanças

1. **Importar `calcularPontosMataMata`** de `@/lib/utils/helpers`

2. **Detectar fase mata-mata** no loop de palpites:
   ```ts
   const isMataMata = jogo.fase !== 'grupos'
   ```

3. **Usar a função correta de pontuação**:
   - Se `isMataMata`: chamar `calcularPontosMataMata(palpite.placarA, palpite.placarB, palpite.vencedorPalpite, jogo.resultadoA, jogo.resultadoB, jogo.vencedor, config)`
   - Senão: manter `calcularPontosJogo(...)`
   - O resultado de `calcularPontosMataMata` retorna `{ pontos, tipo, quemPassa }` — usar `quemPassa` para decidir se exibe badge "+QP"

4. **Exibir "quem passa" na coluna Palpite** (linha 183 atual):
   - Quando `isMataMata && palpite.placarA === palpite.placarB && palpite.vencedorPalpite`:
     - Renderizar em 2 linhas: placar + `→ [bandeira] [nome do time] passa`
     - Bandeira via `Flag` component com `getTimeFlag(timeA)` ou `getTimeFlag(timeB)` conforme `vencedorPalpite`
   - Quando não for empate ou não for mata-mata: manter `placarA x placarB` normal

5. **Badge "+QP"** na coluna Pontos:
   - Quando `resultado.quemPassa === true`: exibir badge roxa "+QP" ao lado de "Exato"/"Vencedor"

### Exemplo visual (opção 1 aprovada):

```
| João | 2 × 2          | 16  [Exato] [+QP] |
|      | → 🇷 Brasil passa |                  |
```

### Arquivos modificados

- `src/app/(public)/jogos/[id]/page.tsx`

---

## Problema 2: Read-only no mata-mata após salvar

### Contexto

Na página `/completar/[token]`, quando o participante salva todos os 39 jogos da fase de grupos, a página entra em modo somente leitura (`estaCompleto`). No mata-mata, o `disabled` dos inputs é controlado apenas por `mataMataEditavel` (vindo de `isFaseEditavel()` no servidor), que só desabilita quando o prazo expira ou o jogo começa. O participante pode salvar e continuar editando livremente.

### Arquivos: `src/app/(public)/completar/[token]/page.tsx`

### Mudanças

1. **Criar `mataMataEstaCompleto`** (similar a `estaCompleto` dos grupos):
   ```ts
   const mataMataEstaCompleto = mataMataPreenchidos === mataMataTotal
       && !hasUnsavedChanges(mataMataInputs, mataMataOriginais)
   ```

2. **Aplicar `desabilitado` em `MataMataJogosLista`**:
   - Atual: `desabilitado={!mataMataEditavel}`
   - Novo: `desabilitado={!mataMataEditavel || mataMataEstaCompleto}`

3. **Esconder botão "Salvar"** do mata-mata quando `mataMataEstaCompleto` for true:
   - Atual: `{mataMataEditavel && <Button>Salvar</Button>}`
   - Novo: `{mataMataEditavel && !mataMataEstaCompleto && <Button>Salvar</Button>}`

4. **Mostrar indicador visual** de "todos os palpites salvos" (similar ao badge "Palpites computados" dos grupos):
   - Quando `mataMataEstaCompleto`: exibir texto/badge informando que os palpites estão salvos e só o admin pode alterar

### Arquivos modificados

- `src/app/(public)/completar/[token]/page.tsx`

---

## Resumo de arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/app/(public)/jogos/[id]/page.tsx` | Usar `calcularPontosMataMata` + exibir vencedorPalpite com bandeira |
| `src/app/(public)/completar/[token]/page.tsx` | Adicionar `mataMataEstaCompleto` para read-only após salvar |
