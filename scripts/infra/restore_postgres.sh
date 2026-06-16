#!/usr/bin/env bash
# Restore operacional do PostgreSQL da stack de producao Django.
# Uso: ./scripts/infra/restore_postgres.sh /caminho/para/backup.dump
#
# ATENCAO: sobrescreve o banco atual. Executar backup antes.

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Uso: $0 /caminho/para/backup.dump" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
DUMP_FILE="$1"

if [[ ! -f "${DUMP_FILE}" ]]; then
  echo "Arquivo de backup nao encontrado: ${DUMP_FILE}" >&2
  exit 1
fi

cd "${ROOT_DIR}"

DB_SERVICE="db"
DB_NAME="${POSTGRES_DB:-pcp_db}"
DB_USER="${POSTGRES_USER:-pcp_user}"

echo "Restaurando ${DUMP_FILE} no servico ${DB_SERVICE}..."

cat "${DUMP_FILE}" | docker compose -f "${COMPOSE_FILE}" exec -T "${DB_SERVICE}" \
  pg_restore \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --clean \
    --if-exists \
    --no-owner \
    --no-acl

echo "Restore concluido. Validar com:"
echo "  docker compose -f docker-compose.prod.yml exec -T backend python manage.py check"
