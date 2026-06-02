#!/usr/bin/env bash
# Üyeliksiz gönderi için BM000099 müşteri profili (demo seed gerekmez)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
if [[ ! -f deploy/.env ]]; then
  echo "deploy/.env bulunamadı."
  exit 1
fi
echo "==> migrate imajı…"
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env build migrate
echo "==> Misafir gönderi profili (BM000099)…"
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env run --rm migrate \
  sh -c "npm run db:generate && npx tsx packages/database/prisma/ensure-guest-customer.ts"
echo "✔ Tamam."
