#!/usr/bin/env bash
# Restore operacional do PostgreSQL da stack de producao Django.
# Uso: ./scripts/infra/restore_postgres.sh [--yes] [--force] /caminho/para/backup.dump
#
# ATENCAO: sobrescreve o banco atual. Executar backup antes.
# Recomendacao: parar o backend antes do restore destrutivo.

set -euo pipefail

CONFIRM_YES=false
FORCE=false
DUMP_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes)
      CONFIRM_YES=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    -*)
      echo "Opcao desconhecida: $1" >&2
      exit 1
      ;;
    *)
      if [[ -n "${DUMP_FILE}" ]]; then
        echo "Argumento extra: $1" >&2
        exit 1
      fi
      DUMP_FILE="$1"
      shift
      ;;
  esac
done

if [[ -z "${DUMP_FILE}" ]]; then
  echo "Uso: $0 [--yes] [--force] /caminho/para/backup.dump" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_load_env.sh
source "${SCRIPT_DIR}/_load_env.sh"

COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"

if [[ ! -f "${DUMP_FILE}" ]]; then
  echo "Arquivo de backup nao encontrado: ${DUMP_FILE}" >&2
  exit 1
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "Arquivo compose nao encontrado: ${COMPOSE_FILE}" >&2
  exit 1
fi

cd "${ROOT_DIR}"

DB_SERVICE="db"
BACKEND_SERVICE="backend"
DB_NAME="${POSTGRES_DB:-pcp_db}"
DB_USER="${POSTGRES_USER:-pcp_user}"

backend_em_execucao() {
  docker compose -f "${COMPOSE_FILE}" ps --status running -q "${BACKEND_SERVICE}" 2>/dev/null | grep -q .
}

if backend_em_execucao; then
  echo "AVISO: o servico '${BACKEND_SERVICE}' esta em execucao." >&2
  echo "  Conexoes ativas podem interferir no restore destrutivo." >&2
  echo "  Pare o backend antes do restore:" >&2
  echo "    docker compose -f docker-compose.prod.yml stop ${BACKEND_SERVICE}" >&2
  if [[ "${FORCE}" != "true" ]]; then
    echo "  Ou use --force para continuar mesmo assim (nao recomendado)." >&2
    exit 1
  fi
  echo "  Continuando com --force..." >&2
fi

if [[ "${CONFIRM_YES}" != "true" ]]; then
  echo ""
  echo "================================================================"
  echo " ATENCAO: RESTORE DESTRUTIVO"
  echo "================================================================"
  echo " Esta operacao sobrescreve o banco '${DB_NAME}' com:"
  echo "   ${DUMP_FILE}"
  echo ""
  echo " pg_restore sera executado com --clean --if-exists:"
  echo "   objetos existentes serao removidos antes da restauracao."
  echo ""
  echo " Recomendacao: pare o backend antes do restore:"
  echo "   docker compose -f docker-compose.prod.yml stop ${BACKEND_SERVICE}"
  echo ""
  read -r -p "Digite 'yes' para confirmar: " confirmacao
  if [[ "${confirmacao}" != "yes" ]]; then
    echo "Restore cancelado."
    exit 1
  fi
fi

echo "Restaurando ${DUMP_FILE} no servico ${DB_SERVICE}..."
echo "  Banco: ${DB_NAME} | Usuario: ${DB_USER}"

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
