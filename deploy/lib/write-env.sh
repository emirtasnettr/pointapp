#!/usr/bin/env bash
# deploy/.env oluşturma — source ile yüklenir

write_deploy_env() {
  local env_file="$1"
  local pg_pass="$2"
  local jwt_secret="$3"
  local api_domain="$4"
  local admin_domain="$5"
  local customer_domain="$6"
  local caddy_email="$7"
  local pg_user="${POSTGRES_USER:-point}"
  local pg_db="${POSTGRES_DB:-point}"

  local api_origin="https://${api_domain}"
  local cors="https://${admin_domain},https://${customer_domain}"

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
ADMIN_DOMAIN=${admin_domain}
CUSTOMER_DOMAIN=${customer_domain}
CADDY_EMAIL=${caddy_email}

NEXT_PUBLIC_API_URL=${api_origin}/v1
NEXT_PUBLIC_CUSTOMER_WEB_URL=https://${customer_domain}
NEXT_PUBLIC_MARKETING_WEB_URL=https://${admin_domain}
EOF

  chmod 600 "$env_file"
  point_ok "Ortam dosyası yazıldı: ${env_file} (izin 600)"
}

collect_domain_config() {
  local server_ip
  server_ip="$(detect_public_ip)"

  if [[ -n "${POINT_BASE_DOMAIN:-}" ]]; then
    local base
    base="$(normalize_domain "$POINT_BASE_DOMAIN")"
    API_DOMAIN="${POINT_API_DOMAIN:-api.${base}}"
    ADMIN_DOMAIN="${POINT_ADMIN_DOMAIN:-www.${base}}"
    CUSTOMER_DOMAIN="${POINT_CUSTOMER_DOMAIN:-app.${base}}"
  else
    point_info "Domain örneği: pointkurye.net.tr → api / www / app alt alanları"
    [[ -n "$server_ip" ]] && point_info "Sunucu IP (DNS A kaydı): ${server_ip}"

    local base_domain=''
    point_prompt base_domain "Ana domain (ör. pointkurye.net.tr)" "${POINT_BASE_DOMAIN:-pointkurye.net.tr}"
    base_domain="$(normalize_domain "$base_domain")"
    while ! validate_domain "$base_domain"; do
      point_err "Geçersiz domain: ${base_domain}"
      point_prompt base_domain "Ana domain" "pointkurye.net.tr"
      base_domain="$(normalize_domain "$base_domain")"
    done

    API_DOMAIN="api.${base_domain}"
    ADMIN_DOMAIN="www.${base_domain}"
    CUSTOMER_DOMAIN="app.${base_domain}"

    if [[ "${POINT_INSTALL_NONINTERACTIVE:-0}" != "1" ]]; then
      point_prompt API_DOMAIN "API domain" "$API_DOMAIN"
      point_prompt ADMIN_DOMAIN "Tanıtım + yönetim domain" "$ADMIN_DOMAIN"
      point_prompt CUSTOMER_DOMAIN "Müşteri paneli domain" "$CUSTOMER_DOMAIN"
    fi
  fi

  API_DOMAIN="$(normalize_domain "$API_DOMAIN")"
  ADMIN_DOMAIN="$(normalize_domain "$ADMIN_DOMAIN")"
  CUSTOMER_DOMAIN="$(normalize_domain "$CUSTOMER_DOMAIN")"

  CADDY_EMAIL="${POINT_CADDY_EMAIL:-}"
  if [[ -z "$CADDY_EMAIL" ]]; then
    point_prompt CADDY_EMAIL "Let's Encrypt e-posta (Caddy)" "admin@${API_DOMAIN#api.}"
  fi
  while ! validate_email "$CADDY_EMAIL"; do
    point_err "Geçersiz e-posta."
    point_prompt CADDY_EMAIL "Let's Encrypt e-posta" "admin@${API_DOMAIN#api.}"
  done

  if [[ -n "$server_ip" ]]; then
    local dns_ok=0
    for d in "$API_DOMAIN" "$ADMIN_DOMAIN" "$CUSTOMER_DOMAIN"; do
      if check_dns_points_to "$d" "$server_ip"; then
        point_ok "DNS ${d} → ${server_ip}"
        dns_ok=$((dns_ok + 1))
      else
        point_warn "DNS ${d} henüz ${server_ip} adresine yönlenmiyor (veya henüz yayılmadı)."
      fi
    done
    if [[ "$dns_ok" -lt 3 && "${POINT_INSTALL_NONINTERACTIVE:-0}" != "1" ]]; then
      point_warn "TLS sertifikası DNS hazır olmadan alınamayabilir. DNS A kayıtlarını kontrol edin."
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
