#!/usr/bin/env bash
# Point — tek satır VPS bootstrap
# curl -fsSL https://raw.githubusercontent.com/emirtasnettr/pointapp/main/deploy/bootstrap.sh | sudo bash

set -euo pipefail

POINT_REPO="${POINT_GIT_REPO:-https://github.com/emirtasnettr/pointapp.git}"
POINT_DIR="${POINT_INSTALL_DIR:-/opt/point}"
POINT_REF="${POINT_GIT_REF:-main}"

if [[ "${EUID:-0}" -ne 0 ]]; then
  echo "Bu betik root olarak çalıştırılmalı: curl ... | sudo bash"
  exit 1
fi

echo "==> Point bootstrap"
echo "    Repo: ${POINT_REPO}"
echo "    Dizin: ${POINT_DIR}"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq 2>/dev/null || true
apt-get install -y -qq git ca-certificates curl 2>/dev/null || true

mkdir -p "$(dirname "$POINT_DIR")"

if [[ -f "${POINT_DIR}/deploy/install.sh" ]]; then
  echo "==> Mevcut kurulum — güncelleniyor…"
  if [[ -d "${POINT_DIR}/.git" ]]; then
    git -C "$POINT_DIR" fetch --depth 1 origin "$POINT_REF" 2>/dev/null || git -C "$POINT_DIR" fetch origin 2>/dev/null || true
    git -C "$POINT_DIR" checkout "$POINT_REF" 2>/dev/null || true
    git -C "$POINT_DIR" pull --ff-only origin "$POINT_REF" 2>/dev/null || true
  fi
elif [[ -d "${POINT_DIR}/.git" ]]; then
  echo "==> Dizin var, install.sh eksik — repo yeniden klonlanıyor…"
  rm -rf "${POINT_DIR}"
  git clone --depth 1 --branch "$POINT_REF" "$POINT_REPO" "$POINT_DIR"
else
  echo "==> Repo klonlanıyor…"
  git clone --depth 1 --branch "$POINT_REF" "$POINT_REPO" "$POINT_DIR"
fi

chmod +x "${POINT_DIR}/deploy/install.sh" "${POINT_DIR}/deploy/scripts/"*.sh 2>/dev/null || true

export POINT_GIT_REPO="$POINT_REPO"
export POINT_INSTALL_DIR="$POINT_DIR"
export POINT_GIT_REF="$POINT_REF"

exec bash "${POINT_DIR}/deploy/install.sh" "$@"
