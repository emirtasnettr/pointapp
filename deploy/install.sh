#!/usr/bin/env bash
# Point VPS kurulum sihirbazı
# Kullanım:
#   sudo bash deploy/install.sh              # interaktif
#   sudo bash deploy/install.sh --upgrade    # güncelleme
#   sudo bash deploy/install.sh --help
#
# Non-interactive (CI / otomasyon):
#   POINT_INSTALL_NONINTERACTIVE=1 \
#   POINT_BASE_DOMAIN=pointkurye.net.tr \
#   POINT_CADDY_EMAIL=admin@pointkurye.net.tr \
#   sudo bash deploy/install.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="${SCRIPT_DIR}/lib"

# shellcheck source=lib/common.sh
source "${LIB_DIR}/common.sh"
# shellcheck source=lib/preflight.sh
source "${LIB_DIR}/preflight.sh"
# shellcheck source=lib/write-env.sh
source "${LIB_DIR}/write-env.sh"

MODE='install'
RUN_SEED=0
INSTALL_DIR="${POINT_INSTALL_DIR:-$POINT_INSTALL_DIR_DEFAULT}"
GIT_REF="${POINT_GIT_REF:-main}"
GIT_REPO="${POINT_GIT_REPO:-$POINT_REPO_DEFAULT}"

usage() {
  cat <<EOF
Point Kurulum Sihirbazı

Kullanım:
  bash deploy/install.sh [seçenekler]

Seçenekler:
  --upgrade       Mevcut kurulumu güncelle (git pull + build + migrate + up)
  --reconfigure   Yalnızca deploy/.env yeniden oluştur (build yok)
  --seed          İlk kurulumda demo verisi yükle (staging — dikkatli!)
  --skip-firewall UFW adımını atla
  --dir PATH      Kurulum dizini (varsayılan: ${POINT_INSTALL_DIR_DEFAULT})
  --help          Bu yardım

Tek satır (VPS'te ilk kurulum):
  curl -fsSL https://raw.githubusercontent.com/emirtasnettr/pointapp/main/deploy/bootstrap.sh | sudo bash

Non-interactive ortam değişkenleri:
  POINT_INSTALL_NONINTERACTIVE=1
  POINT_BASE_DOMAIN=ornek.com
  POINT_CADDY_EMAIL=admin@ornek.com
  POINT_GIT_REPO=...  POINT_GIT_REF=main  POINT_INSTALL_DIR=/opt/point
  POINT_POSTGRES_PASSWORD=...  POINT_JWT_SECRET=...  (opsiyonel, yoksa üretilir)

EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --upgrade) MODE='upgrade' ;;
      --reconfigure) MODE='reconfigure' ;;
      --seed) RUN_SEED=1 ;;
      --skip-firewall) POINT_SKIP_FIREWALL=1 ;;
      --dir)
        shift
        INSTALL_DIR="${1:?--dir PATH gerekli}"
        ;;
      --help|-h) usage; exit 0 ;;
      *) point_err "Bilinmeyen seçenek: $1"; usage; exit 1 ;;
    esac
    shift
  done
}

is_point_repo() {
  [[ -f "${1}/package.json" && -f "${1}/deploy/docker-compose.prod.yml" ]]
}

resolve_repo_root() {
  local candidate
  candidate="$(cd "${SCRIPT_DIR}/.." && pwd)"
  if is_point_repo "$candidate"; then
    echo "$candidate"
    return 0
  fi
  if is_point_repo "$INSTALL_DIR"; then
    echo "$INSTALL_DIR"
    return 0
  fi
  echo ""
}

clone_or_update_repo() {
  local root="$1"
  if is_point_repo "$root"; then
    point_ok "Proje dizini: ${root}"
    if [[ -d "${root}/.git" ]]; then
      point_info "Git deposu güncelleniyor…"
      git -C "$root" fetch --quiet origin 2>/dev/null || true
      git -C "$root" checkout "$GIT_REF" 2>/dev/null || git -C "$root" checkout main 2>/dev/null || true
      git -C "$root" pull --ff-only origin "$GIT_REF" 2>/dev/null || point_warn "git pull atlandı (yerel değişiklik veya ağ)."
    fi
    return 0
  fi

  point_info "Repo klonlanıyor → ${INSTALL_DIR}"
  mkdir -p "$(dirname "$INSTALL_DIR")"
  if [[ -d "$INSTALL_DIR" ]]; then
    point_err "${INSTALL_DIR} var ama Point projesi değil. --dir ile başka yol verin veya dizini temizleyin."
    exit 1
  fi
  git clone --depth 1 --branch "$GIT_REF" "$GIT_REPO" "$INSTALL_DIR"
  point_ok "Klon tamam."
}

ensure_env_file() {
  local root="$1"
  local env_file="${root}/deploy/.env"

  if [[ -f "$env_file" && "$MODE" == "upgrade" ]]; then
    point_ok "Mevcut deploy/.env korunuyor."
    return 0
  fi

  if [[ -f "$env_file" && "$MODE" != "reconfigure" ]]; then
    if [[ "${POINT_INSTALL_NONINTERACTIVE:-0}" == "1" ]]; then
      point_ok "Mevcut deploy/.env kullanılıyor."
      return 0
    fi
    point_warn "deploy/.env zaten mevcut."
    if point_confirm "Mevcut ortam dosyası korunsun mu?" "y"; then
      return 0
    fi
  fi

  collect_domain_config
  generate_secrets

  echo ""
  point_info "Domain özeti:"
  echo "    API:      https://${API_DOMAIN}"
  echo "    Tanıtım:  https://${ADMIN_DOMAIN}"
  echo "    Müşteri:  https://${CUSTOMER_DOMAIN}"
  echo "    TLS:      ${CADDY_EMAIL}"
  echo ""
  point_info "Güçlü şifreler otomatik üretildi (ekranda gösterilmez)."

  if [[ "${POINT_INSTALL_NONINTERACTIVE:-0}" != "1" ]]; then
    point_confirm "deploy/.env bu değerlerle oluşturulsun mu?" "y" || exit 0
  fi

  write_deploy_env "$env_file" "$POSTGRES_PASSWORD" "$JWT_SECRET" \
    "$API_DOMAIN" "$ADMIN_DOMAIN" "$CUSTOMER_DOMAIN" "$CADDY_EMAIL"
}

run_build() {
  local root="$1"
  cd "$root"
  point_info "Docker imajları build ediliyor (10–30 dk sürebilir)…"
  chmod +x deploy/scripts/*.sh 2>/dev/null || true
  compose_cmd build
  point_ok "Build tamam."
}

run_migrate() {
  local root="$1"
  cd "$root"
  point_info "Veritabanı migration çalıştırılıyor…"
  compose_cmd --profile init run --rm migrate
  point_ok "Migration tamam."
}

run_up() {
  local root="$1"
  cd "$root"
  point_info "Servisler başlatılıyor…"
  compose_cmd up -d
  point_ok "Konteynerler çalışıyor."
}

run_seed() {
  local root="$1"
  cd "$root"
  if [[ "$RUN_SEED" -ne 1 ]]; then
    if [[ "${POINT_INSTALL_NONINTERACTIVE:-0}" == "1" ]]; then
      return 0
    fi
    if point_confirm "Demo seed verisi yüklensin mi? (staging — production'da önerilmez)" "n"; then
      RUN_SEED=1
    else
      return 0
    fi
  fi
  point_info "Seed çalıştırılıyor…"
  compose_cmd --profile init run --rm migrate npm run db:seed -w @point/database || {
    point_warn "Seed atlandı veya zaten uygulanmış olabilir."
  }
}

wait_for_health() {
  local root="$1"
  cd "$root"
  # shellcheck disable=SC1091
  set -a && source deploy/.env && set +a
  local url="${PUBLIC_API_ORIGIN}/v1/health"
  point_info "Sağlık kontrolü: ${url}"
  local i
  for i in $(seq 1 60); do
    if curl -fsSL --max-time 5 "$url" >/dev/null 2>&1; then
      point_ok "API yanıt veriyor."
      return 0
    fi
    sleep 5
  done
  point_warn "HTTPS health henüz yanıt vermedi (DNS/TLS henüz hazır olmayabilir)."
  point_info "Yerel konteyner: docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env logs api"
}

print_summary() {
  local root="$1"
  cd "$root"
  # shellcheck disable=SC1091
  set -a && source deploy/.env && set +a

  echo ""
  echo -e "${C_GREEN}${C_BOLD}╔══════════════════════════════════════════════════════════════╗${C_RESET}"
  echo -e "${C_GREEN}${C_BOLD}║  Point kurulumu tamamlandı                                   ║${C_RESET}"
  echo -e "${C_GREEN}${C_BOLD}╚══════════════════════════════════════════════════════════════╝${C_RESET}"
  echo ""
  echo -e "  ${C_BOLD}Tanıtım + yönetim:${C_RESET}  https://${ADMIN_DOMAIN}"
  echo -e "  ${C_BOLD}Müşteri paneli:${C_RESET}     https://${CUSTOMER_DOMAIN}"
  echo -e "  ${C_BOLD}API:${C_RESET}                https://${API_DOMAIN}/v1/health"
  echo ""
  echo -e "  ${C_BOLD}Proje dizini:${C_RESET}       ${root}"
  echo -e "  ${C_BOLD}Ortam dosyası:${C_RESET}      ${root}/deploy/.env ${C_DIM}(chmod 600 — yedekleyin)${C_RESET}"
  echo ""
  echo -e "  ${C_BOLD}Yararlı komutlar:${C_RESET}"
  echo "    cd ${root}"
  echo "    ./deploy/scripts/prod-status.sh"
  echo "    ./deploy/scripts/prod-logs.sh api"
  echo "    ./deploy/install.sh --upgrade"
  echo ""
  echo -e "  ${C_YELLOW}İlk admin:${C_RESET} Seed kullandıysanız docs/DEPLOYMENT.md içindeki demo bilgilere bakın."
  echo -e "  ${C_YELLOW}Güvenlik:${C_RESET} deploy/.env asla GitHub'a yüklemeyin. Secret rotate: docs/SECURITY.md"
  echo ""
}

main() {
  parse_args "$@"

  STEP_TOTAL=8
  point_banner

  case "$MODE" in
    upgrade) STEP_TOTAL=5; point_info "Mod: güncelleme" ;;
    reconfigure) STEP_TOTAL=3; point_info "Mod: ortam yeniden yapılandırma" ;;
    *) point_info "Mod: yeni kurulum" ;;
  esac

  point_step "Ön kontroller"
  preflight_run_all

  point_step "Proje dizini"
  local root
  root="$(resolve_repo_root)"
  if [[ -z "$root" ]]; then
    preflight_setup_firewall
    clone_or_update_repo "$INSTALL_DIR"
    root="$INSTALL_DIR"
  else
    clone_or_update_repo "$root"
  fi
  cd "$root"

  if [[ "$MODE" == "reconfigure" ]]; then
    point_step "Ortam dosyası"
    ensure_env_file "$root"
    point_ok "deploy/.env güncellendi. Değişiklik için: ./deploy/scripts/prod-build.sh && ./deploy/scripts/prod-up.sh"
    exit 0
  fi

  point_step "Ortam dosyası (deploy/.env)"
  ensure_env_file "$root"

  if [[ "$MODE" == "upgrade" ]]; then
    point_step "Build"
    run_build "$root"
    point_step "Migration"
    run_migrate "$root"
    point_step "Servisler"
    run_up "$root"
    point_step "Doğrulama"
    wait_for_health "$root"
    print_summary "$root"
    exit 0
  fi

  point_step "Firewall (opsiyonel)"
  preflight_setup_firewall

  point_step "Docker build"
  run_build "$root"

  point_step "Veritabanı migration"
  run_migrate "$root"

  point_step "Servisleri başlat"
  run_up "$root"

  point_step "Seed (opsiyonel)"
  run_seed "$root"

  point_step "Doğrulama"
  wait_for_health "$root"

  print_summary "$root"
}

main "$@"
