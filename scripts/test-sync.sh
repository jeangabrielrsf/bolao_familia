#!/bin/bash
# Testa o sync end-to-end:
# 1. Snapshot dos jogos ANTES do sync
# 2. Dispara sync (1ª vez)
# 3. Snapshot DEPOIS + diff
# 4. Roda sync 2ª vez (idempotência — diff deve ser vazio)
# 5. Verifica que lock funciona (2 syncs simultâneos, 1 skipped)

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

LOCAL_CONTAINER="bolao-test-db"
MICROSERVICE_URL="${MICROSERVICE_URL:-http://127.0.0.1:8765}"
CRON_SECRET="${CRON_SECRET:-test-secret-local}"

# Query captura todas as colunas relevantes (formato pipe-delimited, sem header)
SNAPSHOT_QUERY="
SELECT
  id::text,
  time_a,
  time_b,
  grupo,
  status,
  resultado_a,
  resultado_b,
  vencedor,
  placar_penaltis_a,
  placar_penaltis_b,
  local,
  cidade
FROM jogos
WHERE sofascore_id IS NOT NULL
  AND data_hora >= NOW() - INTERVAL '12 hours'
ORDER BY data_hora, time_a
"

log()  { echo -e "${YELLOW}→${NC} $1"; }
ok()   { echo -e "${GREEN}✓${NC} $1"; }
err()  { echo -e "${RED}✗${NC} $1"; exit 1; }

# Verifica que o container está rodando
if ! docker ps --format '{{.Names}}' | grep -q "^${LOCAL_CONTAINER}$"; then
  err "Container $LOCAL_CONTAINER não está rodando. Rode: ./scripts/setup-test-db.sh"
fi

# Verifica que o microserviço está acessível
if ! curl -sS -f "$MICROSERVICE_URL/health" > /dev/null 2>&1; then
  err "Microserviço não está respondendo em $MICROSERVICE_URL/health"
fi

mkdir -p tmp

# 1. Snapshot ANTES
log "Snapshot ANTES do sync..."
docker exec $LOCAL_CONTAINER psql -U postgres -d bolao_test -t -A -F "|" -c "$SNAPSHOT_QUERY" > tmp/jogos_antes.txt
LINHAS_ANTES=$(wc -l < tmp/jogos_antes.txt)
ok "Snapshot OK ($LINHAS_ANTES jogos)"

# 2. 1ª execução
log "1ª execução do sync..."
RESPOSTA1=$(curl -sS -X POST "$MICROSERVICE_URL/resultados/sincronizar" \
  -H "X-Cron-Secret: $CRON_SECRET" \
  -H "X-Origem: test-script-1st")
echo "  Resposta: $RESPOSTA1"

# 3. Snapshot DEPOIS
log "Snapshot DEPOIS do sync..."
docker exec $LOCAL_CONTAINER psql -U postgres -d bolao_test -t -A -F "|" -c "$SNAPSHOT_QUERY" > tmp/jogos_depois.txt

# 4. Diff
echo ""
log "Diff entre ANTES e DEPOIS (mudanças detectadas):"
if diff -u tmp/jogos_antes.txt tmp/jogos_depois.txt > /tmp/diff_sync.log 2>&1; then
  ok "Nenhuma mudança detectada (DB já estava sincronizado)"
else
  cat /tmp/diff_sync.log
  echo ""
  MUDANCAS=$(grep -c '^+' /tmp/diff_sync.log || echo 0)
  log "Linhas alteradas: $MUDANCAS"
fi

# 5. 2ª execução (idempotência)
log "2ª execução do sync (teste de idempotência)..."
RESPOSTA2=$(curl -sS -X POST "$MICROSERVICE_URL/resultados/sincronizar" \
  -H "X-Cron-Secret: $CRON_SECRET" \
  -H "X-Origem: test-script-2nd")
echo "  Resposta: $RESPOSTA2"

# 6. Verificar idempotência (diff entre duas execuções deve ser vazio)
docker exec $LOCAL_CONTAINER psql -U postgres -d bolao_test -t -A -F "|" -c "$SNAPSHOT_QUERY" > tmp/jogos_depois2.txt

echo ""
log "Diff entre 1ª e 2ª execução (deve ser VAZIO se idempotente):"
if diff -u tmp/jogos_depois.txt tmp/jogos_depois2.txt > /tmp/diff_idemp.log 2>&1; then
  ok "IDEMPOTENTE — diff vazio"
else
  cat /tmp/diff_idemp.log
  err "NÃO IDEMPOTENTE — sync alterou dados na 2ª execução"
fi

# 7. Teste de lock (5 syncs em paralelo)
log "Teste de lock: 5 syncs em paralelo..."
PARALLEL_OUTPUT=$(mktemp)
for i in 1 2 3 4 5; do
  (curl -sS -X POST "$MICROSERVICE_URL/resultados/sincronizar" \
    -H "X-Cron-Secret: $CRON_SECRET" \
    -H "X-Origem: test-script-parallel-$i" >> $PARALLEL_OUTPUT) &
done
wait
echo ""
echo "  Respostas paralelas:"
sed 's/^/    /' $PARALLEL_OUTPUT

RODADOS=$(grep -c '"skipped":false' $PARALLEL_OUTPUT || echo 0)
SKIPPED=$(grep -c '"skipped":"sync_already_running"' $PARALLEL_OUTPUT || echo 0)
log "  Rodaram: $RODADOS  |  Skipped (lock): $SKIPPED"

if [ "$SKIPPED" -gt 0 ]; then
  ok "LOCK FUNCIONOU — pelo menos 1 requisição foi bloqueada"
else
  err "Lock não funcionou — 5 syncs rodaram em paralelo (lock ausente?)"
fi

rm -f $PARALLEL_OUTPUT

echo ""
ok "TODOS OS TESTES PASSARAM"
echo ""
echo "Snapshots salvos em:"
echo "  tmp/jogos_antes.txt  (estado inicial)"
echo "  tmp/jogos_depois.txt (após 1ª execução)"
echo "  tmp/jogos_depois2.txt (após 2ª execução)"
