#!/usr/bin/env bash
# İstanbul ilçe/mahalle + fiyat matrisi (demo sipariş/kullanıcı oluşturmaz)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
if [[ ! -f deploy/.env ]]; then
  echo "deploy/.env bulunamadı."
  exit 1
fi
echo "==> Coğrafya + fiyat matrisi seed (idempotent)…"
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env run --rm migrate \
  npx tsx packages/database/prisma/seed-geography-only.ts
echo "✔ Tamam."
