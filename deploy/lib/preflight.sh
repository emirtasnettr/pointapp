#!/usr/bin/env bash
# Ön kontroller — source ile yüklenir

preflight_check_os() {
  if [[ -f /etc/os-release ]]; then
    # shellcheck source=/dev/null
    . /etc/os-release
    point_info "İşletim sistemi: ${PRETTY_NAME:-bilinmiyor}"
    case "${ID:-}" in
      ubuntu|debian) ;;
      *)
        point_warn "Resmi olarak Ubuntu/Debian test edildi. Devam edebilirsiniz ama sorun çıkarsa OS farkından kaynaklanabilir."
        ;;
    esac
  fi
}

preflight_check_resources() {
  local mem_kb
  mem_kb="$(awk '/MemTotal/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)"
  if [[ "$mem_kb" -gt 0 && "$mem_kb" -lt 3500000 ]]; then
    point_warn "RAM 4 GB altında görünüyor. Docker build yavaşlayabilir veya swap gerekebilir."
  fi
  local disk_avail
  disk_avail="$(df -Pk . 2>/dev/null | awk 'NR==2 {print $4}')"
  if [[ -n "$disk_avail" && "$disk_avail" -lt 10485760 ]]; then
    point_warn "Disk boş alanı 10 GB altında. İmaj build için en az 15 GB önerilir."
  fi
}

preflight_check_docker() {
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    point_ok "Docker: $(docker --version | head -1)"
    if docker compose version >/dev/null 2>&1; then
      point_ok "Docker Compose: $(docker compose version --short 2>/dev/null || docker compose version | head -1)"
    else
      point_err "Docker Compose v2 bulunamadı. 'docker compose' komutu gerekli."
      exit 1
    fi
    return 0
  fi

  point_warn "Docker kurulu değil veya çalışmıyor."
  if [[ "${POINT_INSTALL_NONINTERACTIVE:-0}" == "1" ]]; then
    point_err "Non-interactive mod: Docker önceden kurulu olmalı."
    exit 1
  fi
  if point_confirm "Docker otomatik kurulsun mu? (get.docker.com)" "y"; then
    point_info "Docker kuruluyor…"
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker 2>/dev/null || service docker start 2>/dev/null || true
    if [[ "$EUID" -ne 0 ]] && command -v usermod >/dev/null 2>&1; then
      usermod -aG docker "${SUDO_USER:-$USER}" 2>/dev/null || true
      point_warn "Docker grubuna eklendiniz. Kurulum bitince oturumu kapatıp açmanız gerekebilir."
    fi
    point_ok "Docker kuruldu."
  else
    point_err "Docker olmadan devam edilemez."
    exit 1
  fi
}

preflight_check_ports() {
  local blockers=''
  if command -v ss >/dev/null 2>&1; then
    blockers="$(ss -tlnH 2>/dev/null | awk '$4 ~ /:80$/ || $4 ~ /:443$/ {print}' || true)"
  elif command -v lsof >/dev/null 2>&1; then
    blockers="$(lsof -i :80 -i :443 2>/dev/null | grep LISTEN || true)"
  fi
  if [[ -n "$blockers" ]]; then
    point_warn "80 veya 443 portunda başka bir servis dinliyor olabilir:"
    echo "$blockers" | sed 's/^/    /'
    if systemctl is-active nginx >/dev/null 2>&1 || systemctl is-active apache2 >/dev/null 2>&1; then
      point_info "Nginx/Apache tespit edildi. Point Caddy ile 80/443 kullanır."
      if [[ "${POINT_INSTALL_NONINTERACTIVE:-0}" != "1" ]] && point_confirm "Nginx/Apache durdurulsun mu?" "n"; then
        systemctl stop nginx 2>/dev/null || true
        systemctl stop apache2 2>/dev/null || true
        systemctl disable nginx 2>/dev/null || true
        systemctl disable apache2 2>/dev/null || true
        point_ok "Web sunucusu durduruldu."
      else
        point_warn "Port çakışması devam ederse Caddy başlamayabilir."
      fi
    fi
  else
    point_ok "80/443 portları (dinleyen servis) uygun görünüyor."
  fi
}

preflight_check_git() {
  if ! command -v git >/dev/null 2>&1; then
    if [[ "$EUID" -eq 0 ]] || command -v sudo >/dev/null 2>&1; then
      point_info "git kuruluyor…"
      apt-get update -qq && apt-get install -y -qq git ca-certificates curl 2>/dev/null \
        || yum install -y git ca-certificates curl 2>/dev/null \
        || true
    fi
  fi
  command -v git >/dev/null 2>&1 || {
    point_err "git gerekli."
    exit 1
  }
  point_ok "git: $(git --version | head -1)"
}

preflight_setup_firewall() {
  if ! command -v ufw >/dev/null 2>&1; then
    point_info "ufw yok — firewall atlandı."
    return 0
  fi
  if [[ "${POINT_SKIP_FIREWALL:-0}" == "1" ]]; then
    return 0
  fi
  if [[ "${POINT_INSTALL_NONINTERACTIVE:-0}" == "1" ]]; then
    ufw allow OpenSSH >/dev/null 2>&1 || true
    ufw allow 80/tcp >/dev/null 2>&1 || true
    ufw allow 443/tcp >/dev/null 2>&1 || true
    ufw --force enable >/dev/null 2>&1 || true
    point_ok "UFW: 22, 80, 443 açıldı."
    return 0
  fi
  if point_confirm "UFW firewall yapılandırılsın mı? (SSH + 80 + 443)" "y"; then
    ufw allow OpenSSH >/dev/null 2>&1 || true
    ufw allow 80/tcp >/dev/null 2>&1 || true
    ufw allow 443/tcp >/dev/null 2>&1 || true
    ufw --force enable >/dev/null 2>&1 || true
    point_ok "UFW etkin."
  fi
}

preflight_run_all() {
  preflight_check_os
  preflight_check_resources
  require_root_or_docker
  preflight_check_git
  preflight_check_docker
  preflight_check_ports
}
