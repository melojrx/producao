#!/usr/bin/env bash
# Wrapper local — rsync snapshot + scripts para VPS e executa import MDJ-20.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VPS_HOST="${VPS_HOST:-38.52.128.62}"
VPS_USER="${VPS_USER:-root}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/producao}"
BACKUP_LOCAL="${BACKUP_LOCAL:-/home/jrmelo/backup-supabase-20260531}"
BACKUP_MOUNT="${BACKUP_MOUNT:-${DEPLOY_PATH}/backups/supabase-snapshot-20260531}"

if [[ ! -d "${BACKUP_LOCAL}" ]]; then
  echo "ERRO: snapshot local ausente: ${BACKUP_LOCAL}" >&2
  exit 1
fi

echo "==> Sync snapshot para VPS"
ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" "mkdir -p '${BACKUP_MOUNT}'"
rsync -avz "${BACKUP_LOCAL}/" "${VPS_USER}@${VPS_HOST}:${BACKUP_MOUNT}/"

echo "==> Sync scripts MDJ-20"
rsync -avz \
  "${ROOT_DIR}/scripts/mdj20/" \
  "${VPS_USER}@${VPS_HOST}:${DEPLOY_PATH}/scripts/mdj20/"
rsync -avz \
  "${ROOT_DIR}/docker/compose/restore.vps.yml" \
  "${VPS_USER}@${VPS_HOST}:${DEPLOY_PATH}/docker/compose/restore.vps.yml"

echo "==> Executar import na VPS"
ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" \
  "chmod +x ${DEPLOY_PATH}/scripts/mdj20/import-producao-remote.sh && ${DEPLOY_PATH}/scripts/mdj20/import-producao-remote.sh $*"
