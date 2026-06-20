#!/usr/bin/env bash
# Wrapper local — cutover flags Django ON na VPS producao.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VPS_HOST="${VPS_HOST:-38.52.128.62}"
VPS_USER="${VPS_USER:-root}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/producao}"

rsync -avz \
  "${ROOT_DIR}/scripts/mdj20/cutover-flags-prod-remote.sh" \
  "${ROOT_DIR}/scripts/mdj20/validar-cutover-prod-remote.sh" \
  "${VPS_USER}@${VPS_HOST}:${DEPLOY_PATH}/scripts/mdj20/"

ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" \
  "chmod +x ${DEPLOY_PATH}/scripts/mdj20/cutover-flags-prod-remote.sh ${DEPLOY_PATH}/scripts/mdj20/validar-cutover-prod-remote.sh && ${DEPLOY_PATH}/scripts/mdj20/cutover-flags-prod-remote.sh"

echo "==> Validacao pos-cutover"
ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" \
  "TEST_WRITE=${TEST_WRITE:-true} ${DEPLOY_PATH}/scripts/mdj20/validar-cutover-prod-remote.sh"
