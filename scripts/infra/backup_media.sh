#!/usr/bin/env bash
# Backup do volume de media (imagens Django) da stack de producao.
# Uso: ./scripts/infra/backup_media.sh [diretorio_destino]

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
BACKUP_DIR="${1:-${ROOT_DIR}/backups/media}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
ARCHIVE="${BACKUP_DIR}/media_${TIMESTAMP}.tar.gz"

mkdir -p "${BACKUP_DIR}"

cd "${ROOT_DIR}"

echo "Gerando backup de media em ${ARCHIVE}..."

docker compose -f "${COMPOSE_FILE}" exec -T backend \
  tar -czf - -C /app/media . > "${ARCHIVE}"

echo "Backup de media concluido: ${ARCHIVE}"
ls -lh "${ARCHIVE}"
