#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
if [[ ! -f deploy/.env ]]; then
  echo "deploy/.env bulunamadı. Önce: cp deploy/env.example deploy/.env"
  exit 1
fi
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env build
