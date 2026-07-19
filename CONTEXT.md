# Bolão Copa 2026

Bolão familiar para acompanhar a Copa do Mundo FIFA 2026. Participantes submetem palpites sobre os jogos da fase de grupos e cinco extras (artilheiro, campeão, vice, terceiro, quarto); admin alimenta resultados oficiais; o sistema calcula ranking on-the-fly e propaga o chaveamento do mata-mata à medida que a fase de grupos fecha.

## Atores

**Admin**:
Pessoa autorizada a operar o painel administrativo: envia palpites em nome dos participantes, libera fases, sincroniza resultados, ajusta configurações e edita palpites quando necessário.
_Avoid_: moderador, gestor, owner.

**Participante**:
Familiar cadastrado com token pessoal. Pode ter um ou mais `PalpiteGrupo`s, cada um com seu próprio conjunto de palpites e competindo de forma independente no ranking.
_Avoid_: usuário, jogador, apostador.

**Visitante**:
Qualquer pessoa acessando rotas públicas. Não autentica, não palpita, apenas visualiza jogos, ranking, classificação e chaveamento.
_Avoid_: anônimo, guest, leitor.

## Estrutura da Copa

**Copa 2026**:
Edição FIFA 2026 com 48 seleções, 104 jogos distribuídos em 13 fases.
_Avoid_: torneio, campeonato, mundial.

**Fase**:
Etapa do torneio. Define o momento em que os palpites da etapa travam e o conjunto de jogos que serão disputados.
_Avoid_: rodada, etapa, fase-do-torneio.

**Fase de grupos**:
Primeira fase. 72 jogos em 12 grupos de 4 seleções. Palpites são coletados exclusivamente nesta fase.
_Avoid_: fase-classificatória, fase-inicial.

**Mata-mata**:
Fases eliminatórias (16-avos, oitavas, quartas, semifinais, disputa de 3º, final). 32 jogos. Jogos são criados fase a fase, à medida que os times se classificam.
_Avoid_: eliminatórias, playoffs, knockout.

**Grupo**:
Conjunto de quatro seleções que se enfrentam entre si na fase de grupos. Identificado por letra (A, B, C, ...).
_Avoid_: chave, agrupamento, poule.

## Jogos e Resultados

**Jogo**:
Partida de futebol pertencente a uma fase e (na fase de grupos) a um grupo. Tem times, data/hora, local, status, placar e, em mata-mata, placar de pênaltis e times classificados.
_Avoid_: partida, match, confronto.

**Status de jogo**:
Estado do jogo. Quatro valores canônicos: `agendado` (no futuro), `ao_vivo` (em andamento), `finalizado` (apito final) e `cancelado` (não chegou a acontecer).
_Avoid_: estado-do-jogo, situação.

**Placar**:
Resultado numérico de um jogo. Par de inteiros (placar casa, placar visitante). Em mata-mata com empate após prorrogação, é complementado por placar de pênaltis para determinar o classificado.
_Avoid_: resultado-numérico, score.

**Vencedor**:
Time que ganhou o jogo. Em mata-mata é sempre definido (por prorrogação ou pênaltis); em fase de grupos pode ser `casa`, `visitante` ou `empate`.
_Avoid_: ganhador, classificado-técnico.

**Walkover (W.O.)**:
Time não comparece ou é desclassificado administrativamente. Resultado: jogo `cancelado`, ninguém pontua, vencedor é definido por decisão manual do admin fora do sistema.
_Avoid_: derrota-por-ausência, forfeit.

## Palpites

**Palpite**:
Previsão de placar de um jogo, vinculada a um `PalpiteGrupo` específico. Cada par (palpitegrupo, jogo) tem no máximo um palpite.
_Avoid_: aposta, previsão, chute.

**PalpiteGrupo**:
Conjunto de palpites (33, 39 ou 72 jogos + 5 extras) que formam uma entrada independente no ranking. Um participante pode ter vários; cada um compete sozinho. Origem mais comum: aba individual de uma planilha multi-aba.
_Avoid_: grupo-de-palpites, aposta-grupo, cartela.

**isBolao**:
Marcador de um jogo na fase de grupos. `true` indica que o jogo entrou na planilha/foto enviada originalmente; `false` indica que o jogo ficou de fora e deve ser completado pelo participante via link.
_Avoid_: flag-de-bolão, marcador-de-coleta.

**PalpiteExtra**:
Previsão não-placar: artilheiro do torneio, campeão, vice, terceiro e quarto colocados. Cinco por `PalpiteGrupo`. Definidos uma única vez, seja via upload inicial (planilha/foto) seja via completar pelo site. Imutáveis a partir da criação.
_Avoid_: extra, palpite-bônus, chute-extra.

**PalpiteExtraStatus**:
Indicador visual de acerto ou erro de um `PalpiteExtra` comparado com o `ResultadoExtra` oficial. Três estados canônicos: `acertou` (palpite bate com resultado, +10 pts), `errou` (palpite diverge, 0 pts), `pendente` (resultado oficial ainda não preenchido). Exibido na página do participante com ícones (✅/❌) e tooltip quando há empate na artilharia.
_Avoid_: status-do-extra, indicador-de-acerto.

**ResultadoExtraParcial**:
Estado em que alguns dos cinco `ResultadoExtra`s ainda não foram preenchidos no banco. Exemplo canônico: após a disputa de 3º lugar, admin preenche campeão/vice/3º/4º, mas artilheiro só será conhecido no dia seguinte (após final da Copa). Linhas de extras pendentes são ocultadas da página do participante até que o resultado oficial exista.
_Avoid_: extra-incompleto, resultado-pendente.

**ResumoDeExtras**:
Seção no topo da página do participante com cards visuais mostrando acertos por tipo de extra (ex: "Campeão: ✅", "Vice: ❌", "3º: ✅", "4º: ✅", "Artilheiro: pendente"). Agregação por `PalpiteGrupo` quando há múltiplos grupos.
_Avoid_: painel-de-extras, dashboard-de-extras.

**Artilheiro**:
Jogador com mais gols no torneio inteiro (todos os 104 jogos). Critério de match: a string apostada deve estar entre os artilheiros oficiais (em caso de empate na artilharia, todos os empatados valem).
_Avoid_: goleador, top-scorer, artilheiro-de-grupo.

**Campeão, Vice, Terceiro, Quarto**:
Quatro extras clássicos. Campeão e vice definidos pela final; terceiro e quarto definidos pela disputa de 3º lugar.
_Avoid_: vencedor-final, perdedor-final.

## Resultados Oficiais

**Resultado de jogo**:
Placar e demais dados de uma partida (status, vencedor, local). Preenchidos automaticamente a partir de APIs externas (football-data.org como primário, worldcup26.ir como fallback) e propagados para o banco.
_Avoid_: resultado-final, placar-oficial.

**ResultadoExtra**:
Valor oficial de um dos cinco extras (artilheiro, campeão, vice, terceiro, quarto). Preenchido em modo híbrido: APIs externas sugerem, admin confirma ou corrige.
_Avoid_: gabarito, resposta-certa.

## Pontuação

**Pontuação de jogo de grupo**:
Pontos por palpite de jogo na fase de grupos. `10` para placar exato, `6` para tendência correta (casa/visitante/empate) sem cravar placar, `0` caso contrário.
_Avoid_: pontos-grupo, scoring-grupo.

**Pontuação de jogo de mata-mata**:
Pontos por palpite de jogo no mata-mata. `10` para placar exato (90min + prorrogação), `6` para vencedor correto (90min + prorrogação) sem cravar placar, `0` caso contrário — mais o bônus de classificado.
_Avoid_: pontos-mata-mata, scoring-knockout.

**Bônus de classificado**:
Pontos extras no mata-mata: `+6` se o palpite do placar (90min + prorrogação) for correto E o time que avança (sobreviveu aos pênaltis) coincidir com o palpite; `+0` se o classificado real divergir.
_Avoid_: bônus-avanço, bônus-pênalti.

**Pontuação de extra**:
Pontos por acerto de qualquer um dos cinco extras: `10` por match. Em caso de empate de artilheiro, qualquer um dos artilheiros reais confere os 10 pontos ao palpite.
_Avoid_: pontos-extra, pontos-de-bônus.

**Pontuação máxima**:
Total teórico somando todos os jogos e extras. Fase de grupos (72 jogos × 10) + 5 extras × 10 = 770. Mata-mata (32 jogos × 16) = 512. Com mata-mata completo: 1282.
_Avoid_: teto-de-pontos, máximo-absoluto.

**Critério de desempate**:
Ordem de ranqueamento entre `PalpiteGrupo`s com mesma pontuação. Primeiro: maior número de placares exatos. Segundo: maior número de tendências corretas. Empate nos dois critérios: mesma posição compartilhada (sem sorteio, sem critério terciário).
_Avoid_: tie-breaker, critério-de-ordenação.

## Lock e Edição

**Lock de fase**:
Momento em que os palpites de uma fase ficam read-only para participantes: instante do primeiro jogo da fase. Após o lock, a única forma de editar é via admin.
_Avoid_: fechamento, deadline-por-fase.

**Bypass de admin**:
Admin pode editar palpites de qualquer participante a qualquer momento, inclusive após lock da fase, para corrigir erros de preenchimento (planilha ilegível, foto ruim, etc.).
_Avoid_: override, edição-forçada.

**Liberação de fase**:
Admin pode reabrir, para um participante específico, a edição de uma fase que já travou. Outros participantes seguem trancados. Usado quando alguém esqueceu de preencher.
_Avoid_: unlock, desbloqueio.

**Imutabilidade de extra**:
`PalpiteExtra` é write-once: definido no momento do upload (planilha/foto) ou no completar (site), jamais alterado depois — nem pelo admin, nem pelo participante. Exceção: admin pode editar palpites de extras somente antes do "lock conceitual" que é o próprio momento de criação.
_Avoid_: extra-fixo, write-once.

## Coleta de Palpites

**Token de participante**:
Identificador UUID por participante, sem expiração, enviado por WhatsApp. Cobre todos os `PalpiteGrupo`s do participante. Pode ser regenerado pelo admin (invalida o anterior).
_Avoid_: link, código-de-acesso, magic-link.

**Completar bolão**:
Página `/completar/{token}` onde o participante preenche os jogos restantes da fase de grupos que não vieram da planilha/foto original. Após salvar todos, a fase de grupos fica read-only; novas fases liberadas voltam a aparecer como editáveis.
_Avoid_: link-de-completar, página-de-preenchimento.

**Habilitar fase**:
Admin libera, via painel, a coleta de palpites de uma fase do mata-mata (16-avos, oitavas, etc.). Participantes passam a ver os jogos correspondentes na mesma página de completar.
_Avoid_: ativar-fase, abrir-coleta.

## Bracket e Sincronização

**Bracket**:
Chaveamento do mata-mata. Após cada sync bem-sucedido, o sistema lê a classificação dos grupos, projeta os confrontos da próxima fase e grava os times nos jogos correspondentes. Jogos mata-mata não existem no banco até a fase anterior fechar.
_Avoid_: chaveamento, árvore, mata-mata-tree.

**Resultado parcial**:
Placar e vencedor de um jogo atualizados repetidamente enquanto `ao_vivo`. Sync corrige placar se API externa atrasar.
_Avoid_: placar-ao-vivo, live-score.

## Configuração

**Configuração do bolão**:
Pares chave-valor editáveis pelo admin: pontuação por tipo de acerto, prazo para completar bolão da fase de grupos, toggle geral de habilitação de coleta.
_Avoid_: settings, preferências, parâmetros.

**Prazo de completar**:
Data limite para participantes preencherem os jogos restantes da fase de grupos via link. Após o prazo, a fase trava para participantes (admin segue podendo editar).
_Avoid_: deadline-grupo, data-limite.

## Calendário e Localização

**Data/hora do jogo**:
Armazenada em UTC. Exibida sempre em horário de Brasília (UTC-3) nas interfaces. Sede do jogo define offset usado no seed para converter horário local → UTC.
_Avoid_: timestamp, datetime, hora-local.

**Local e cidade**:
Estádio e cidade-sede da partida. Podem vir das APIs externas durante o sync; se ausentes, preserva-se o valor previamente gravado.
_Avoid_: arena, estádio, venue.
