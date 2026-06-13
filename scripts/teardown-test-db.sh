#!/bin/bash
# Para container e remove volume (estado limpo para próximo teste)
# Seguro de rodar múltiplas vezes.

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

LOCAL_CONTAINER="bolao-test-db"
COMPOSE_FILE="docker-compose.test.yml"

log()  { echo -e "${YELLOW}→${NC} $1"; }
ok()   { echo -e "${GREEN}✓${NC} $1"; }

# Para e remove
log "Parando container e removendo volume..."
docker compose -f $COMPOSE_FILE down -v 2>/dev/null || true

# Limpa backup local (opcional — descomente se quiser)
# rm -f tmp/backup.sql
# rm -f tmp/jogos_antes.txt tmp/jogos_depois.txt tmp/jogos_depois2.txt

ok "Container removido. Volume apagado (dados zerados)."
echo ""
echo "Para subir novamente:"
echo "  ./scripts/setup-test-db.sh"
