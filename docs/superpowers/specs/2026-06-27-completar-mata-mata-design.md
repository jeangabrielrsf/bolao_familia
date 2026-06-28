# Completar Bolão — Fase de Mata-Mata

**Data:** 2026-06-27
**Status:** Aprovado

## Visão Geral

Extensão da feature "Completar Bolão" para permitir que participantes deem palpites nas fases do mata-mata (16 avos, oitavas, quartas, semifinal, 3º lugar, final) através do mesmo link `/completar/{token}`.

### Decisões de Design

- **Abordagem:** Seletor de fase no topo da página existente (Abordagem A)
- **Timing:** Palpites por fase — participante palpita os 16 jogos de R32, depois os 8 de R16, etc.
- **Edição:** Palpites editáveis até o início de cada fase (primeiro jogo da fase começar)
- **Configuração:** Toggle e prazo por fase, configuráveis pelo admin
- **Acessibilidade:** UI simples para idosos — botões grandes com bandeiras ao invés de dropdowns

## Modelo de Dados

### Mudança no `Palpite`

Adicionar campo nullable à tabela `palpites`:

```prisma
vencedorPalpite  Int?  @map("vencedor_palpite")  // 1=timeA, 2=timeB (só mata-mata com empate previsto)
```

- **Fase de grupos:** sempre `null` (não se aplica)
- **Mata-mata sem empate previsto:** `null` (vencedor implícito no placar)
- **Mata-mata com empate previsto:** `1` (timeA) ou `2` (timeB) — obrigatório

### Configuração por Fase

Reutilizar tabela `configuracoes` (key/value) com chaves por fase:

| Chave | Valor | Exemplo |
|-------|-------|---------|
| `prazo_mata_mata_dezesseis_avos` | ISO datetime | `2026-06-28T15:00:00Z` |
| `habilitado_mata_mata_dezesseis_avos` | boolean | `true` |
| `prazo_mata_mata_oitavas` | ISO datetime | ... |
| `habilitado_mata_mata_oitavas` | boolean | ... |
| `prazo_mata_mata_quartas` | ISO datetime | ... |
| `habilitado_mata_mata_quartas` | boolean | ... |
| `prazo_mata_mata_semifinal` | ISO datetime | ... |
| `habilitado_mata_mata_semifinal` | boolean | ... |
| `prazo_mata_mata_terceiro` | ISO datetime | ... |
| `habilitado_mata_mata_terceiro` | boolean | ... |
| `prazo_mata_mata_final` | ISO datetime | ... |
| `habilitado_mata_mata_final` | boolean | ... |

6 fases × 2 chaves = 12 novas entradas. Sem migration de schema (apenas seed de dados).

## Scoring do Mata-Mata

### Regras

**Base** (mutuamente exclusivo, por prioridade):

| Condição | Pontos |
|----------|--------|
| Placar exato (palpiteA == resultadoA && palpiteB == resultadoB) | 10 |
| Empate correto (palpite foi empate E resultado foi empate, mas placar diferente) | 6 |
| Vencedor correto (mesmo sinal da diferença, sem empate) | 6 |
| Errou | 0 |

**Bônus "Quem Passa"** (independente da base):

| Condição | Pontos |
|----------|--------|
| Palpite foi empate, resultado foi empate, vencedorPalpite == vencedor real | +6 |
| Palpite foi empate, resultado foi empate, vencedorPalpite != vencedor real | +0 |
| Palpite não foi empate (ou jogo não foi empate) | não se aplica |

**Desempate no ranking:** placares exatos → vencedores corretos → acertos de quemPassa (novo critério)

### Tabela de Cenários

| # | Palpite | Resultado | Base | Quem passa | Total |
|---|---------|-----------|------|------------|-------|
| 1 | 1x1, timeA | 1x1 (pen), timeA | 10 (exato) | +6 | **16** |
| 2 | 1x1, timeA | 1x1 (pen), timeB | 10 (exato) | +0 | **10** |
| 3 | 2x2, timeB | 2x2 (pen), timeB | 10 (exato) | +6 | **16** |
| 4 | 0x0, timeA | 0x0 (pen), timeB | 10 (exato) | +0 | **10** |
| 5 | 1x1, timeA | 2x2 (pen), timeA | 6 (empate) | +6 | **12** |
| 6 | 1x1, timeA | 2x2 (pen), timeB | 6 (empate) | +0 | **6** |
| 7 | 2x1, null | 2x1, timeA | 6 (vencedor) | — | **6** |
| 8 | 3x1, null | 3x1, timeA | 10 (exato) | — | **10** |
| 9 | 1x0, null | 0x2, timeB | 0 | — | **0** |

**Máximo teórico por jogo do mata-mata: 16 pontos**

## UI da Página `/completar/{token}`

### Layout

```
┌──────────────────────────────────────────┐
│  [Nome do Participante]    [Badge X/Y]   │
├──────────────────────────────────────────┤
│  [Grupos] [16 avos] [Oitavas] [Quartas]  │  ← segmented control
│  [Semi] [3º Lugar] [Final]               │
├──────────────────────────────────────────┤
│  Abas de PalpiteGrupo (se múltiplos)     │
├──────────────────────────────────────────┤
│  Jogos da fase selecionada               │
│  ┌────────────────────────────────────┐  │
│  │ 28/06 16:00  🇧🇷 _ x _ 🇦🇷        │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │ 28/06 19:00  🇫🇷 1 x 1 🇩🇪        │  │
│  │ ┌──────────────────────────────┐   │  │
│  │ │  Empate! Quem passa?         │   │  │
│  │ │  [🇫🇷 França]  [🇩🇪 Alemanha] │   │  │
│  │ └──────────────────────────────┘   │  │
│  └────────────────────────────────────┘  │
├──────────────────────────────────────────┤
│            [Salvar]                      │
└──────────────────────────────────────────┘
```

### Estados do Seletor de Fase

| Estado | Visual | Comportamento |
|--------|--------|---------------|
| **Fase de grupos** | Sempre visível | Mostra 72 ou 39 jogos (modo completo/restante) |
| **Fase habilitada + dentro do prazo** | Badge verde "Aberta" | Clicável, jogos editáveis |
| **Fase habilitada + prazo expirado** | Badge amarelo "Encerrada" | Clicável, somente leitura |
| **Fase não habilitada** | Badge cinza "Em breve" | Não clicável, não mostra jogos |

### Card "Quem Passa?" (Acessível para Idosos)

Quando `placarA === placarB` em jogo do mata-mata:

- Card destacado com fundo azul claro e pergunta **"Empate! Quem passa?"**
- Dois **botões grandes** (largura total, altura ~60px) com bandeira + nome do time
- Botão selecionado: borda verde + check ✓
- Se placar mudar para não-empate: card desaparece, `vencedorPalpite` volta a `null`
- Validação: salvar empate sem escolher quem passa → bloqueia com mensagem "Escolha qual time passa neste empate"

### Lock por Fase

Jogos ficam **somente leitura** quando:
1. Prazo da fase expirou, OU
2. Primeiro jogo da fase já começou (`dataHora <= now()`)
3. Jogo individual com `status === 'finalizado'` → sempre readonly com resultado oficial

Jogos `agendado` ou `em_andamento` dentro de fase aberta e dentro do prazo → editáveis.

### Drafts

Chave: `bolao_draft_{token}_{grupoId}_{fase}` — um draft por fase por grupo.

Mesma lógica de auto-save, load on mount, clear on save, e "descartar alterações" da fase de grupos.

### Multi-tab (PalpiteGrupos)

Cada aba de PalpiteGrupo mantém seus próprios palpites por fase. Indicador (ponto laranja) independente por fase.

## API Changes

### `GET /api/completar/{token}/jogos`

Novo query param `fase` (opcional, default `'grupos'`):

- `fase=grupos`: comportamento atual (72 ou 39 jogos)
- `fase=dezesseis_avos|oitavas|quartas|semifinal|terceiro|final`: jogos da fase específica

Resposta para mata-mata:
```json
{
  "fase": "dezesseis_avos",
  "jogos": [
    {
      "id": "...",
      "timeA": "Brasil",
      "timeB": "Alemanha",
      "dataHora": "...",
      "status": "agendado",
      "palpite": { "placarA": 2, "placarB": 1, "vencedorPalpite": null }
    }
  ],
  "fasesHabilitadas": [
    { "fase": "grupos", "habilitado": true, "prazo": "..." },
    { "fase": "dezesseis_avos", "habilitado": true, "prazo": "2026-06-28T15:00:00Z" },
    { "fase": "oitavas", "habilitado": false, "prazo": null }
  ]
}
```

### `POST /api/completar/{token}`

Body adiciona `fase` (default `'grupos'`):
```json
{
  "fase": "dezesseis_avos",
  "palpites": [
    { "jogoId": "...", "placarA": 1, "placarB": 1, "vencedorPalpite": 1 }
  ],
  "palpiteGrupoId": "..."
}
```

Validações:
- Fase deve estar habilitada e dentro do prazo
- Jogo não pode ter começado (`dataHora > now()`)
- Se fase é mata-mata e palpite é empate (`placarA === placarB`), `vencedorPalpite` é obrigatório (1 ou 2)
- Max palpites: 16 (R32), 8 (R16), 4 (QF), 2 (SF), 1 (3º), 1 (Final)

### `GET /api/token/{token}`

Resposta adiciona `fasesHabilitadas[]`:
```json
{
  "valido": true,
  "participanteId": "...",
  "nome": "João",
  "fasesHabilitadas": [
    { "fase": "grupos", "habilitado": true, "prazo": "..." },
    { "fase": "dezesseis_avos", "habilitado": true, "prazo": "..." }
  ]
}
```

## Queries (completar-bolao.ts)

### Novas funções

| Função | Descrição |
|--------|-----------|
| `getJogosFase(fase)` | Jogos de uma fase do mata-mata com times resolvidos |
| `getFasesHabilitadas()` | Retorna fases com toggle + prazo |
| `getPalpitesFase(grupoId, fase)` | Palpites existentes de uma fase |
| `salvarPalpitesFase(participanteId, palpites, grupoId, fase)` | Salva palpites de uma fase do mata-mata |
| `getConfigFaseMataMata(fase)` | Toggle + prazo de uma fase específica |
| `setConfigFaseMataMata(fase, habilitado, prazo)` | Admin atualiza config de uma fase |
| `isFaseEditavel(fase)` | Verifica se fase está habilitada, dentro do prazo, e primeiro jogo não começou |

### Funções existentes (sem mudança)

`getParticipanteByToken()`, `getGruposParticipante()`, `salvarPalpitesCompletar()`, `getStatusCompletarBolao()`, etc.

## Admin

### Nova seção em `/admin/completar-bolao`

Lista das 6 fases do mata-mata, cada uma com:
- **Toggle:** switch on/off
- **Prazo:** datetime picker (horário de Brasília)
- **Status visual:** "Fechada" / "Aberta" (verde) / "Encerrada" (amarelo)

Layout: cards empilhados, um por fase, com ícone da fase (troféu, etc.)

### API Admin

- `GET /api/admin/completar-bolao/fases` — lista todas as fases com config
- `PUT /api/admin/completar-bolao/fases/[fase]` — atualiza toggle + prazo de uma fase

## Ranking

`src/lib/db/queries/ranking.ts` — transparente:

- Ao iterar palpites, se o jogo for mata-mata (`fase !== 'grupos'`), usa `calcularPontosMataMata()` ao invés de `calcularPontosJogo()`
- Novo critério de desempate: acertos de `vencedorPalpite` (contagem de "quem passa" corretos)
- Palpites de mata-mata com `vencedorPalpite === null` em jogo de empate → 0 pontos no bônus

## Sync de Resultados e Bracket

### Sync (verificado — sem mudanças necessárias)

- Microserviço Python já cobre mata-mata via `sofascoreId`
- `football-data.org` retorna `vencedor` + `placarPenaltisA/B`
- `sync_writer.py` já escreve todos os campos necessários
- Auto-sync (GitHub Actions `*/15`) já funciona
- **Ressalva:** `worldcup26.ir` (fallback) não retorna penaltis. Penaltis dependem do football-data.org.

### Bracket /copa (verificado — sem mudanças necessárias)

- `atualizarBracket()` resolve times do bracket a cada 60s (cache)
- `projector.vencedorDoJogo()` considera penaltis (`placarPenaltisA/B`)
- Confrontos das próximas fases aparecem automaticamente conforme jogos são finalizados
- Escrita de volta (`timeA`/`timeB`) no DB já funciona

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `prisma/schema.prisma` | Adicionar `vencedorPalpite` ao `Palpite` |
| `src/lib/utils/helpers.ts` | Nova função `calcularPontosMataMata()` |
| `src/lib/db/queries/completar-bolao.ts` | Novas queries para fases + salvar |
| `src/lib/db/queries/ranking.ts` | Integrar scoring mata-mata + desempate |
| `src/app/(public)/completar/[token]/page.tsx` | Seletor de fase + card "quem passa" |
| `src/app/api/completar/[token]/jogos/route.ts` | Param `fase` + fasesHabilitadas |
| `src/app/api/completar/[token]/route.ts` | Body `fase` + validações mata-mata |
| `src/app/api/token/[token]/route.ts` | Retornar fasesHabilitadas |
| `src/app/admin/completar-bolao/page.tsx` | Seção de config por fase |
| `src/app/api/admin/completar-bolao/fases/route.ts` | Novo endpoint |
| `scripts/seed.ts` | Seed das 12 configs de fase |

## Não Afetados

- `microservice/` — sync já funciona para mata-mata
- `src/app/(public)/copa/` — bracket já atualiza automaticamente
- `src/components/public/bracket.tsx` — sem mudanças
- `src/lib/services/upload/` — upload não muda
