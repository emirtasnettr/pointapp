#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
[[ -f deploy/.env ]] && set -a && source deploy/.env && set +a

C_GREEN='\033[0;32m'
C_RED='\033[0;31m'
C_RESET='\033[0m'

if [[ ! -f deploy/.env ]]; then
  echo "deploy/.env yok. Önce: bash deploy/install.sh"
  exit 1
fi

echo "Point production durumu"
echo "========================"
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env ps

echo ""
echo "Sağlık:"
if curl -fsSL --max-time 5 "${PUBLIC_API_ORIGIN:-http://localhost:5001}/v1/health" 2>/dev/null; then
  echo ""
else
  echo -e "${C_RED}API health yanıt vermedi${C_RESET}"
fi

echo ""
echo "Domainler (deploy/.env):"
echo "  API:      ${API_DOMAIN:-—}"
echo "  Tanıtım:  ${ADMIN_DOMAINS:-${ADMIN_DOMAIN:-—}}"
echo "  Müşteri:  ${CUSTOMER_DOMAIN:-—}"
