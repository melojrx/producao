#!/usr/bin/env bash
# Backup do volume de media (imagens Django) da stack de producao.
# Uso: ./scripts/infra/backup_media.sh [diretorio_destino]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_load_env.sh
source "${SCRIPT_DIR}/_load_env.sh"

COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
BACKUP_DIR="${1:-${ROOT_DIR}/backups/media}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
ARCHIVE="${BACKUP_DIR}/media_${TIMESTAMP}.tar.gz"

mkdir -p "${BACKUP_DIR}"

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "Arquivo compose nao encontrado: ${COMPOSE_FILE}" >&2
  exit 1
fi

cd "${ROOT_DIR}"

echo "Gerando backup de media em ${ARCHIVE}..."

docker compose -f "${COMPOSE_FILE}" exec -T backend \
  tar -czf - -C /app/media . > "${ARCHIVE}"

echo "Backup de media concluido: ${ARCHIVE}"
ls -lh "${ARCHIVE}"
