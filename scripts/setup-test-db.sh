#!/bin/bash
# Sobe container Postgres local + faz dump do Supabase (read-only) + restaura
# IDEMPOTENTE: pode rodar N vezes. Se container já existe, reusa.
# NÃO TOCA EM PRODUÇÃO: pg_dump é read-only, restore é em container isolado.

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

LOCAL_CONTAINER="bolao-test-db"
LOCAL_URL="postgresql://postgres:test@localhost:5433/bolao_test"
BACKUP_FILE="./tmp/backup.sql"
COMPOSE_FILE="docker-compose.test.yml"

log()  { echo -e "${YELLOW}→${NC} $1"; }
ok()   { echo -e "${GREEN}✓${NC} $1"; }
err()  { echo -e "${RED}✗${NC} $1"; exit 1; }

# 1. Carregar connection string do .env raiz
# IMPORTANTE: usar DATABASE_URL (Supavisor Session Pooler) e NÃO DIRECT_URL.
# O direct connection do Supabase é IPv6-only — containers Docker sem rota IPv6
# não conseguem alcançar. O Supavisor pooler é IPv4-compatible (recomendação
# oficial do Supabase para pg_dump em redes IPv4-only).
# Ref: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
if [ -f .env ]; then
  DUMP_URL=$(grep '^DATABASE_URL=' .env | head -1 | cut -d'"' -f2 || grep '^DATABASE_URL=' .env | head -1 | cut -d'=' -f2- | tr -d "'")
fi

if [ -z "$DUMP_URL" ]; then
  err "DATABASE_URL não definida em .env. Necessária para pg_dump via Supavisor."
fi

# Adicionar sslmode=require se não tiver (Supabase exige SSL)
if [[ "$DUMP_URL" != *"?sslmode="* ]] && [[ "$DUMP_URL" != *"&sslmode="* ]]; then
  DUMP_URL="${DUMP_URL}?sslmode=require"
fi

# Resolver IPv4 do host do Supabase e forçar via hostaddr
# (containers Docker podem tentar IPv6 primeiro e falhar)
SUPABASE_HOST=$(echo "$DUMP_URL" | sed -E 's|.*@([^:/]+).*|\1|')
if command -v getent &> /dev/null; then
  IPV4=$(getent ahosts "$SUPABASE_HOST" 2>/dev/null | awk '$1 !~ /:/ && $1 != "" {print $1; exit}')
  if [ -n "$IPV4" ]; then
    DUMP_URL="${DUMP_URL}&hostaddr=${IPV4}"
    log "Forçando IPv4 ($IPV4) para $SUPABASE_HOST"
  fi
fi

# 2. Subir container
log "Subindo container Postgres ($LOCAL_CONTAINER)..."
docker compose -f $COMPOSE_FILE up -d

# 3. Aguardar Postgres ficar pronto
log "Aguardando Postgres ficar pronto..."
for i in {1..30}; do
  if docker exec $LOCAL_CONTAINER pg_isready -U postgres > /dev/null 2>&1; then
    ok "Postgres pronto"
    break
  fi
  sleep 1
done

if ! docker exec $LOCAL_CONTAINER pg_isready -U postgres > /dev/null 2>&1; then
  err "Postgres não ficou pronto em 30s"
fi

# 4. Criar tmp/
mkdir -p tmp

# 5. Dump do Supabase (READ-ONLY)
log "Fazendo dump do Supabase (read-only)..."
docker exec $LOCAL_CONTAINER pg_dump "$DUMP_URL" \
  --no-owner --no-privileges \
  --exclude-schema=auth \
  --exclude-schema=storage \
  --exclude-schema=realtime \
  --exclude-schema=graphql \
  --exclude-schema=supabase_functions \
  --exclude-schema=supabase_migrations \
  --exclude-schema=pgbouncer \
  --exclude-schema=extensions \
  --exclude-table-data=upload_logs \
  --file=/tmp/backup.sql 2>/tmp/pg_dump_err.log

if [ $? -ne 0 ]; then
  cat /tmp/pg_dump_err.log
  err "pg_dump falhou. Verifique DIRECT_URL e conectividade."
fi

# 6. Copiar dump pra fora do container
log "Copiando dump para tmp/backup.sql..."
docker cp $LOCAL_CONTAINER:/tmp/backup.sql $BACKUP_FILE
DUMP_SIZE=$(du -h $BACKUP_FILE | cut -f1)
ok "Dump OK ($DUMP_SIZE)"

# 7. Limpar banco local (drop & recriar tudo) — garante estado limpo
log "Limpando banco local..."
docker exec $LOCAL_CONTAINER psql -U postgres -d bolao_test -c "
  DROP SCHEMA public CASCADE;
  CREATE SCHEMA public;
  GRANT ALL ON SCHEMA public TO postgres;
  GRANT ALL ON SCHEMA public TO public;
" > /dev/null

# 8. Restaurar
log "Restaurando dump no container local..."
cat $BACKUP_FILE | docker exec -i $LOCAL_CONTAINER psql -U postgres -d bolao_test -v ON_ERROR_STOP=0 > /tmp/psql_restore.log 2>&1
RESTORE_RC=${PIPESTATUS[1]}

if [ $RESTORE_RC -ne 0 ]; then
  # Mostrar últimas linhas do log (errors são esperados em extensões Supabase, ignorados)
  echo "  (alguns warnings são esperados de extensões Supabase)"
  tail -20 /tmp/psql_restore.log | sed 's/^/    /'
fi

# 9. Validar
log "Validando dados restaurados..."
TOTAL_JOGOS=$(docker exec $LOCAL_CONTAINER psql -U postgres -d bolao_test -t -A -c "SELECT COUNT(*) FROM jogos;" 2>/dev/null | xargs)
TOTAL_PALPITES=$(docker exec $LOCAL_CONTAINER psql -U postgres -d bolao_test -t -A -c "SELECT COUNT(*) FROM palpites;" 2>/dev/null | xargs)
TOTAL_PARTICIPANTES=$(docker exec $LOCAL_CONTAINER psql -U postgres -d bolao_test -t -A -c "SELECT COUNT(*) FROM participantes;" 2>/dev/null | xargs)

if [ -z "$TOTAL_JOGOS" ] || [ "$TOTAL_JOGOS" = "0" ]; then
  err "Nenhum jogo restaurado. Verifique o dump e o restore."
fi

echo ""
ok "DB de teste pronto em $LOCAL_URL"
echo ""
echo "  Jogos:         $TOTAL_JOGOS"
echo "  Palpites:      $TOTAL_PALPITES"
echo "  Participantes: $TOTAL_PARTICIPANTES"
echo ""
echo "Para conectar:"
echo "  psql $LOCAL_URL"
echo ""
echo "Para destruir:"
echo "  ./scripts/teardown-test-db.sh"
echo ""
echo "Para testar o sync:"
echo "  ./scripts/test-sync.sh"
