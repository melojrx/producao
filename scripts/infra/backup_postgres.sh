#!/usr/bin/env bash
# Backup operacional do PostgreSQL da stack de producao Django.
# Uso: ./scripts/infra/backup_postgres.sh [diretorio_destino]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_load_env.sh
source "${SCRIPT_DIR}/_load_env.sh"

COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
BACKUP_DIR="${1:-${ROOT_DIR}/backups/postgres}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUTPUT_FILE="${BACKUP_DIR}/pcp_db_${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "Arquivo compose nao encontrado: ${COMPOSE_FILE}" >&2
  exit 1
fi

cd "${ROOT_DIR}"

DB_SERVICE="db"
DB_NAME="${POSTGRES_DB:-pcp_db}"
DB_USER="${POSTGRES_USER:-pcp_user}"

echo "Gerando backup PostgreSQL em ${OUTPUT_FILE}..."
echo "  Banco: ${DB_NAME} | Usuario: ${DB_USER}"

docker compose -f "${COMPOSE_FILE}" exec -T "${DB_SERVICE}" \
  pg_dump \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --format=custom \
    --no-owner \
    --no-acl \
  > "${OUTPUT_FILE}"

echo "Backup concluido: ${OUTPUT_FILE}"
ls -lh "${OUTPUT_FILE}"
