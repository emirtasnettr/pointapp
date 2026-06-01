#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
SERVICE="${1:-}"
if [[ ! -f deploy/.env ]]; then
  echo "deploy/.env yok."
  exit 1
fi
if [[ -n "$SERVICE" ]]; then
  docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env logs -f --tail=200 "$SERVICE"
else
  docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env logs -f --tail=100
fi
