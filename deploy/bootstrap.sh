#!/usr/bin/env bash
# Point — tek satır VPS bootstrap
# curl -fsSL https://raw.githubusercontent.com/emirtasnettr/pointapp/main/deploy/bootstrap.sh | sudo bash
#
# Güvenlik: mümkünse önce dosyayı indirip inceleyin:
#   curl -fsSL ... -o point-bootstrap.sh && less point-bootstrap.sh && sudo bash point-bootstrap.sh

set -euo pipefail

POINT_REPO="${POINT_GIT_REPO:-https://github.com/emirtasnettr/pointapp.git}"
POINT_DIR="${POINT_INSTALL_DIR:-/opt/point}"
POINT_REF="${POINT_GIT_REF:-main}"
RAW_BASE="${POINT_RAW_BASE:-https://raw.githubusercontent.com/emirtasnettr/pointapp/main}"

if [[ "${EUID:-0}" -ne 0 ]]; then
  echo "Bu betik root olarak çalıştırılmalı: curl ... | sudo bash"
  exit 1
fi

echo "==> Point bootstrap"
echo "    Repo: ${POINT_REPO}"
echo "    Dizin: ${POINT_DIR}"

apt-get update -qq 2>/dev/null || true
apt-get install -y -qq git ca-certificates curl 2>/dev/null || true

if [[ -f "${POINT_DIR}/deploy/install.sh" ]]; then
  echo "==> Mevcut kurulum bulundu, install.sh çalıştırılıyor…"
  exec bash "${POINT_DIR}/deploy/install.sh" "$@"
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "==> install.sh indiriliyor…"
curl -fsSL "${RAW_BASE}/deploy/install.sh" -o "${TMP}/install.sh"
curl -fsSL "${RAW_BASE}/deploy/lib/common.sh" -o "${TMP}/lib/common.sh"
curl -fsSL "${RAW_BASE}/deploy/lib/preflight.sh" -o "${TMP}/lib/preflight.sh"
curl -fsSL "${RAW_BASE}/deploy/lib/write-env.sh" -o "${TMP}/lib/write-env.sh"
chmod +x "${TMP}/install.sh"

export POINT_GIT_REPO="$POINT_REPO"
export POINT_INSTALL_DIR="$POINT_DIR"
export POINT_GIT_REF="$POINT_REF"

exec bash "${TMP}/install.sh" "$@"
