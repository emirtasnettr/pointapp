#!/usr/bin/env bash
# deploy/.env oluşturma — source ile yüklenir

marketing_hosts_from_base() {
  local base="$1"
  echo "${base},www.${base}"
}

write_deploy_env() {
  local env_file="$1"
  local pg_pass="$2"
  local jwt_secret="$3"
  local api_domain="$4"
  local admin_domains="$5"
  local admin_canonical="$6"
  local customer_domain="$7"
  local caddy_email="$8"
  local pg_user="${POSTGRES_USER:-point}"
  local pg_db="${POSTGRES_DB:-point}"

  local api_origin="https://${api_domain}"
  local cors=""
  local h
  IFS=',' read -ra _adm <<< "$admin_domains"
  for h in "${_adm[@]}"; do
    h="$(echo "$h" | tr -d ' ')"
    [[ -z "$h" ]] && continue
    [[ -n "$cors" ]] && cors+=","
    cors+="https://${h}"
  done
  cors+=",https://${customer_domain}"

  cat >"$env_file" <<EOF
# Point production — $(date -u +%Y-%m-%dT%H:%M:%SZ) UTC
# Bu dosyayı asla repoya commit etmeyin. chmod 600 önerilir.

POSTGRES_USER=${pg_user}
POSTGRES_PASSWORD=${pg_pass}
POSTGRES_DB=${pg_db}
DATABASE_URL=postgresql://${pg_user}:${pg_pass}@postgres:5432/${pg_db}?schema=public

PORT=5001
HOST=0.0.0.0
JWT_SECRET=${jwt_secret}
NODE_ENV=production

PUBLIC_API_ORIGIN=${api_origin}
CORS_ORIGINS=${cors}
STORAGE_LOCAL_DIR=/app/storage/uploads
POINT_SMS_SIMULATION=0

API_DOMAIN=${api_domain}
ADMIN_DOMAINS=${admin_domains}
ADMIN_DOMAIN=${admin_canonical}
CUSTOMER_DOMAIN=${customer_domain}
CADDY_EMAIL=${caddy_email}

NEXT_PUBLIC_API_URL=${api_origin}/v1
NEXT_PUBLIC_CUSTOMER_WEB_URL=https://${customer_domain}
NEXT_PUBLIC_MARKETING_WEB_URL=https://${admin_canonical}
EOF

  chmod 600 "$env_file"
  point_ok "Ortam dosyası yazıldı: ${env_file} (izin 600)"
}

apply_base_domain_layout() {
  local base="$1"
  BASE_DOMAIN="$(normalize_domain "$base")"
  API_DOMAIN="api.${BASE_DOMAIN}"
  ADMIN_DOMAIN="www.${BASE_DOMAIN}"
  ADMIN_DOMAINS="$(marketing_hosts_from_base "$BASE_DOMAIN")"
  CUSTOMER_DOMAIN="app.${BASE_DOMAIN}"
}

collect_domain_config() {
  local server_ip
  server_ip="$(detect_public_ip)"

  if [[ -n "${POINT_BASE_DOMAIN:-}" ]]; then
    apply_base_domain_layout "$POINT_BASE_DOMAIN"
    if [[ -n "${POINT_API_DOMAIN:-}" ]]; then
      API_DOMAIN="$(normalize_domain "$POINT_API_DOMAIN")"
    fi
    if [[ -n "${POINT_CUSTOMER_DOMAIN:-}" ]]; then
      CUSTOMER_DOMAIN="$(normalize_domain "$POINT_CUSTOMER_DOMAIN")"
    fi
    if [[ -n "${POINT_ADMIN_DOMAINS:-}" ]]; then
      ADMIN_DOMAINS="$POINT_ADMIN_DOMAINS"
    fi
  else
    point_info "Tanıtım + yönetim hem kök hem www üzerinden açılır (ör. pointkurye.net.tr + www.…)"
    [[ -n "$server_ip" ]] && point_info "Sunucu IP (DNS A kaydı): ${server_ip}"

    local base_domain=''
    point_prompt base_domain "Ana domain (ör. pointkurye.net.tr)" "pointkurye.net.tr"
    while ! validate_domain "$(normalize_domain "$base_domain")"; do
      point_err "Geçersiz domain: ${base_domain}"
      point_prompt base_domain "Ana domain" "pointkurye.net.tr"
    done
    apply_base_domain_layout "$base_domain"

    if [[ "${POINT_INSTALL_NONINTERACTIVE:-0}" != "1" ]]; then
      point_prompt API_DOMAIN "API domain" "$API_DOMAIN"
      point_info "Tanıtım hostları (otomatik): ${ADMIN_DOMAINS}"
      point_prompt CUSTOMER_DOMAIN "Müşteri paneli domain" "$CUSTOMER_DOMAIN"
    fi
  fi

  API_DOMAIN="$(normalize_domain "$API_DOMAIN")"
  ADMIN_DOMAIN="$(normalize_domain "$ADMIN_DOMAIN")"
  CUSTOMER_DOMAIN="$(normalize_domain "$CUSTOMER_DOMAIN")"
  # ADMIN_DOMAINS: normalize each segment
  local normalized_admin=''
  local part
  IFS=',' read -ra _admin_parts <<< "$ADMIN_DOMAINS"
  for part in "${_admin_parts[@]}"; do
    part="$(normalize_domain "$part")"
    [[ -n "$normalized_admin" ]] && normalized_admin+=","
    normalized_admin+="$part"
  done
  ADMIN_DOMAINS="$normalized_admin"

  CADDY_EMAIL="${POINT_CADDY_EMAIL:-}"
  if [[ -z "$CADDY_EMAIL" ]]; then
    point_prompt CADDY_EMAIL "Let's Encrypt e-posta (Caddy)" "admin@${BASE_DOMAIN:-${API_DOMAIN#api.}}"
  fi
  while ! validate_email "$CADDY_EMAIL"; do
    point_err "Geçersiz e-posta."
    point_prompt CADDY_EMAIL "Let's Encrypt e-posta" "admin@${BASE_DOMAIN:-pointkurye.net.tr}"
  done

  if [[ -n "$server_ip" ]]; then
    local dns_ok=0
    local dns_total=0
    local d
    for d in "$API_DOMAIN" "$CUSTOMER_DOMAIN"; do
      dns_total=$((dns_total + 1))
      if check_dns_points_to "$d" "$server_ip"; then
        point_ok "DNS ${d} → ${server_ip}"
        dns_ok=$((dns_ok + 1))
      else
        point_warn "DNS ${d} henüz ${server_ip} adresine yönlenmiyor."
      fi
    done
    IFS=',' read -ra _check_admin <<< "$ADMIN_DOMAINS"
    for d in "${_check_admin[@]}"; do
      dns_total=$((dns_total + 1))
      if check_dns_points_to "$d" "$server_ip"; then
        point_ok "DNS ${d} → ${server_ip}"
        dns_ok=$((dns_ok + 1))
      else
        point_warn "DNS ${d} henüz ${server_ip} adresine yönlenmiyor."
      fi
    done
    if [[ "$dns_ok" -lt "$dns_total" && "${POINT_INSTALL_NONINTERACTIVE:-0}" != "1" ]]; then
      point_warn "TLS için tüm A kayıtları (api, app, kök, www) sunucu IP’sine yönlenmeli."
      point_confirm "DNS henüz hazır olmasa da devam edilsin mi?" "y" || exit 0
    fi
  fi
}

generate_secrets() {
  POSTGRES_PASSWORD="${POINT_POSTGRES_PASSWORD:-$(generate_secret 32)}"
  JWT_SECRET="${POINT_JWT_SECRET:-$(generate_secret 64)}"
  if [[ ${#JWT_SECRET} -lt 32 ]]; then
    JWT_SECRET="$(generate_secret 64)"
  fi
}
