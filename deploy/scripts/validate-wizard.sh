#!/usr/bin/env bash
# Kurulum sihirbazı doğrulama — CI / push öncesi
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
FAIL=0

say_ok() { echo "  ✔ $*"; }
say_fail() { echo "  ✖ $*" >&2; FAIL=1; }

echo "==> Bash sözdizimi"
for f in deploy/install.sh deploy/bootstrap.sh deploy/lib/*.sh deploy/scripts/*.sh; do
  if bash -n "$f" 2>/dev/null; then
    say_ok "$f"
  else
    say_fail "$f"
    bash -n "$f" || true
  fi
done

echo "==> Ortam dosyası üretimi (dry-run)"
TMP_ENV="$(mktemp)"
trap 'rm -f "$TMP_ENV"' EXIT
# shellcheck source=deploy/lib/common.sh
source deploy/lib/common.sh
# shellcheck source=deploy/lib/write-env.sh
source deploy/lib/write-env.sh

export POINT_INSTALL_NONINTERACTIVE=1
export POINT_BASE_DOMAIN=pointkurye.net.tr
export POINT_CADDY_EMAIL=admin@pointkurye.net.tr
collect_domain_config
generate_secrets
write_deploy_env "$TMP_ENV" "$POSTGRES_PASSWORD" "$JWT_SECRET" \
  "$API_DOMAIN" "$ADMIN_DOMAINS" "$ADMIN_DOMAIN" "$CUSTOMER_DOMAIN" "$CADDY_EMAIL"

grep -q '^ADMIN_DOMAINS=pointkurye.net.tr,www.pointkurye.net.tr$' "$TMP_ENV" \
  && say_ok "ADMIN_DOMAINS kök + www" \
  || say_fail "ADMIN_DOMAINS beklenen değil: $(grep ADMIN_DOMAINS "$TMP_ENV")"

grep -q 'CORS_ORIGINS=https://pointkurye.net.tr,https://www.pointkurye.net.tr,https://app.pointkurye.net.tr' "$TMP_ENV" \
  && say_ok "CORS üç origin" \
  || say_fail "CORS: $(grep CORS_ORIGINS "$TMP_ENV")"

echo "==> Caddyfile yer tutucuları"
grep -q '{\$ADMIN_DOMAINS}' deploy/Caddyfile && say_ok 'ADMIN_DOMAINS bloğu' || say_fail 'Caddyfile ADMIN_DOMAINS'

echo "==> Docker Compose config"
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  cp "$TMP_ENV" deploy/.env.test
  trap 'rm -f "$TMP_ENV" deploy/.env.test' EXIT
  if docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.test config >/dev/null 2>&1; then
    say_ok "docker compose config"
  else
    say_fail "docker compose config"
    docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.test config 2>&1 | tail -20
  fi
  rm -f deploy/.env.test
else
  echo "  ⊘ Docker yok — compose config atlandı"
fi

echo "==> API build"
if npm run build -w @point/api --silent 2>/dev/null; then
  say_ok "npm run build -w @point/api"
else
  say_fail "API build"
fi

if [[ "$FAIL" -ne 0 ]]; then
  echo ""
  echo "Doğrulama BAŞARISIZ"
  exit 1
fi

echo ""
echo "Doğrulama tamam — kurulum sihirbazı hazır."
