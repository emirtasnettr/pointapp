#!/usr/bin/env bash
# Kurulum sihirbazı uçtan uca test (lokal / CI)
#   bash deploy/scripts/test-install-e2e.sh
#   bash deploy/scripts/test-install-e2e.sh --quick   # Docker build atlanır
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
QUICK=0
[[ "${1:-}" == "--quick" ]] && QUICK=1

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'
fail() { echo -e "${RED}✖ $*${NC}" >&2; exit 1; }
ok() { echo -e "${GREEN}✔ $*${NC}"; }

E2E_ENV="${ROOT}/deploy/.env.e2e-test"
DEPLOY_ENV="${ROOT}/deploy/.env"
ENV_BACKUP=""
cleanup() {
  if [[ "${KEEP_E2E:-0}" != "1" ]]; then
    docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env down -v --remove-orphans 2>/dev/null || true
    if [[ -n "$ENV_BACKUP" && -f "$ENV_BACKUP" ]]; then
      cp "$ENV_BACKUP" "$DEPLOY_ENV"
      rm -f "$ENV_BACKUP"
    elif [[ -f "$DEPLOY_ENV" ]] && [[ -f "$E2E_ENV" ]] && cmp -s "$DEPLOY_ENV" "$E2E_ENV" 2>/dev/null; then
      rm -f "$DEPLOY_ENV"
    fi
    rm -f "$E2E_ENV"
  fi
}
trap cleanup EXIT

echo "========== 1/7 validate-wizard =========="
bash deploy/scripts/validate-wizard.sh
ok "validate-wizard"

echo ""
echo "========== 2/7 bootstrap sözdizimi + install --help =========="
bash -n deploy/bootstrap.sh
POINT_INSTALL_NONINTERACTIVE=1 bash deploy/install.sh --help >/dev/null
ok "bootstrap + install --help"

echo ""
echo "========== 3/7 non-interactive env (sihirbaz mantığı) =========="
# shellcheck source=deploy/lib/common.sh
source deploy/lib/common.sh
# shellcheck source=deploy/lib/write-env.sh
source deploy/lib/write-env.sh
export POINT_INSTALL_NONINTERACTIVE=1
export POINT_BASE_DOMAIN=pointkurye.net.tr
export POINT_CADDY_EMAIL=admin@pointkurye.net.tr
export POINT_POSTGRES_PASSWORD="e2e_test_pg_$(generate_secret 16)"
export POINT_JWT_SECRET="$(generate_secret 64)"
collect_domain_config
generate_secrets
write_deploy_env "$E2E_ENV" "$POSTGRES_PASSWORD" "$JWT_SECRET" \
  "$API_DOMAIN" "$ADMIN_DOMAINS" "$ADMIN_DOMAIN" "$CUSTOMER_DOMAIN" "$CADDY_EMAIL"
[[ -f "$E2E_ENV" ]] || fail "E2E env oluşmadı"
if [[ -f "$DEPLOY_ENV" ]]; then
  ENV_BACKUP="$(mktemp)"
  cp "$DEPLOY_ENV" "$ENV_BACKUP"
fi
cp "$E2E_ENV" "$DEPLOY_ENV"
chmod 600 "$DEPLOY_ENV"
ok "deploy/.env (compose env_file ile uyumlu)"

echo ""
echo "========== 4/7 prod script'leri (env yolu) =========="
for s in prod-build prod-migrate prod-up prod-status; do
  bash -n "deploy/scripts/${s}.sh"
done
# compose env_file .env — deploy/deploy/.env hatası olmamalı
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env config >/tmp/point-compose-config.yml
if grep -q 'deploy/deploy' /tmp/point-compose-config.yml 2>/dev/null; then
  fail "compose hâlâ deploy/deploy/.env kullanıyor"
fi
ok "docker compose config (repo kökünden)"

echo ""
echo "========== 5/7 Dockerfile.web (her iki web app) =========="
if [[ "$QUICK" -eq 1 ]]; then
  echo "  ⊘ --quick: Docker build atlandı"
  else
  if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
    fail "Docker gerekli (test-install-e2e). --quick ile atlayabilirsiniz."
  fi
  echo "  → API imajı build…"
  docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env build api
  ok "Docker build api"
  echo "  → web-customer imajı build…"
  docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env build web-customer
  ok "Docker build web-customer"
  echo "  → web-admin imajı build…"
  docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env build web-admin
  ok "Docker build web-admin"
  echo "  → migrate imajı build…"
  docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env build migrate
  ok "Docker build migrate"
fi

echo ""
echo "========== 6/7 postgres + migration =========="
if [[ "$QUICK" -eq 1 ]]; then
  echo "  ⊘ --quick: migration atlandı"
else
  docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d postgres
  echo "  → Postgres hazır bekleniyor…"
  for i in $(seq 1 30); do
    if docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env exec -T postgres pg_isready -U point -d point >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done
  docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env exec -T postgres pg_isready -U point -d point \
    || fail "Postgres ayakta değil"
  ok "Postgres healthy"
  docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env --profile init run --rm migrate
  ok "Prisma migrate deploy"
fi

echo ""
echo "========== 7/7 tam stack (api + web + caddy) =========="
if [[ "$QUICK" -eq 1 ]]; then
  echo "  ⊘ --quick: stack up atlandı"
else
  docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d
  # API iç ağ — host port yok; exec ile health (ilk boot daha uzun sürebilir)
  echo "  → API health bekleniyor…"
  API_OK=0
  for i in $(seq 1 30); do
    if docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env exec -T api \
      node -e "fetch('http://127.0.0.1:5001/v1/health').then(r=>r.json()).then(j=>{if(!j.database)process.exit(1)}).catch(()=>process.exit(1))" \
      >/dev/null 2>&1; then
      API_OK=1
      break
    fi
    sleep 2
  done
  if [[ "$API_OK" -eq 1 ]]; then
    ok "API /v1/health (konteyner içi)"
  else
    docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env logs api --tail 80
    fail "API health başarısız"
  fi
  docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env ps
  ok "Tüm servisler ayakta"
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  Kurulum sihirbazı E2E testi BAŞARILI${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
