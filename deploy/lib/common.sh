#!/usr/bin/env bash
# Point kurulum sihirbazı — ortak yardımcılar (source ile yüklenir)

POINT_BRAND='#16B24B'
POINT_REPO_DEFAULT='https://github.com/emirtasnettr/pointapp.git'
POINT_INSTALL_DIR_DEFAULT='/opt/point'

if [[ -t 1 ]]; then
  C_RESET='\033[0m'
  C_BOLD='\033[1m'
  C_DIM='\033[2m'
  C_GREEN='\033[0;32m'
  C_YELLOW='\033[1;33m'
  C_RED='\033[0;31m'
  C_CYAN='\033[0;36m'
  C_BRAND='\033[0;38;2;22;178;75m'
else
  C_RESET='' C_BOLD='' C_DIM='' C_GREEN='' C_YELLOW='' C_RED='' C_CYAN='' C_BRAND=''
fi

STEP_TOTAL=0
STEP_CURRENT=0

point_banner() {
  echo -e "${C_BRAND}${C_BOLD}"
  cat <<'EOF'
  ____  _       __
 |  _ \| |     / _|
 | |_) | |    | |_   Point — VPS Kurulum Sihirbazı
 |  __/| |___ |  _|  Docker · Caddy · PostgreSQL
 |_|   |_____|_|    Güvenli production kurulumu
EOF
  echo -e "${C_RESET}"
}

point_step() {
  STEP_CURRENT=$((STEP_CURRENT + 1))
  echo ""
  echo -e "${C_BRAND}${C_BOLD}━━━ Adım ${STEP_CURRENT}/${STEP_TOTAL}: $* ━━━${C_RESET}"
}

point_info()  { echo -e "${C_CYAN}ℹ${C_RESET}  $*"; }
point_ok()    { echo -e "${C_GREEN}✔${C_RESET}  $*"; }
point_warn()  { echo -e "${C_YELLOW}⚠${C_RESET}  $*"; }
point_err()   { echo -e "${C_RED}✖${C_RESET}  $*" >&2; }

point_confirm() {
  local prompt="${1:-Devam edilsin mi?}"
  local default="${2:-y}"
  if [[ "${POINT_INSTALL_NONINTERACTIVE:-0}" == "1" ]]; then
    return 0
  fi
  local hint='[E/h]'
  [[ "$default" == "n" ]] && hint='[e/H]'
  local ans
  read -r -p "$(echo -e "${C_BOLD}${prompt} ${hint}: ${C_RESET}")" ans || true
  ans="${ans:-$default}"
  [[ "$ans" =~ ^[EeYy]$ ]]
}

point_prompt() {
  local var_name="$1"
  local label="$2"
  local default="${3:-}"
  if [[ "${POINT_INSTALL_NONINTERACTIVE:-0}" == "1" ]]; then
    if [[ -z "${!var_name:-}" ]]; then
      point_err "Non-interactive mod: ${var_name} tanımlı değil"
      exit 1
    fi
    return 0
  fi
  local display="$default"
  [[ -n "$display" ]] && display=" [$display]"
  local val
  read -r -p "$(echo -e "${C_BOLD}${label}${display}: ${C_RESET}")" val || true
  val="${val:-$default}"
  printf -v "$var_name" '%s' "$val"
}

generate_secret() {
  local len="${1:-48}"
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$(( (len + 1) / 2 ))" | head -c "$len"
  else
    LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c "$len"
  fi
}

detect_public_ip() {
  local ip=''
  for url in 'https://api.ipify.org' 'https://ifconfig.me/ip' 'https://icanhazip.com'; do
    ip="$(curl -fsSL --max-time 5 "$url" 2>/dev/null | tr -d '[:space:]')" && break
  done
  if [[ -z "$ip" ]] && command -v hostname >/dev/null 2>&1; then
    ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
  fi
  echo "$ip"
}

normalize_domain() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's#^https\?://##' | sed 's#/.*##' | sed 's#:.*##'
}

validate_domain() {
  local d="$1"
  [[ "$d" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$ ]]
}

validate_email() {
  local e="$1"
  [[ "$e" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]
}

check_dns_points_to() {
  local domain="$1"
  local expected_ip="$2"
  if ! command -v getent >/dev/null 2>&1; then
    return 2
  fi
  local resolved
  resolved="$(getent ahosts "$domain" 2>/dev/null | awk '/STREAM/ {print $1; exit}')"
  [[ -n "$resolved" && "$resolved" == "$expected_ip" ]]
}

require_root_or_docker() {
  if [[ "$EUID" -eq 0 ]]; then
    point_warn "Root olarak çalışıyorsunuz. Mümkünse kurulumdan sonra ayrı bir kullanıcı tercih edin."
    return 0
  fi
  if groups | grep -q docker; then
    return 0
  fi
  point_err "Docker grubunda değilsiniz. 'sudo usermod -aG docker \$USER' ve oturumu yenileyin veya root ile çalıştırın."
  exit 1
}

compose_cmd() {
  docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env "$@"
}
