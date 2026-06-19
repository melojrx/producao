#!/usr/bin/env bash
# Smoke test: valida que _load_env.sh carrega POSTGRES_* de .env customizado.
# Nao requer Docker.
#
# Uso: ./scripts/infra/test_backup_env.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TEMP_DIR}"' EXIT

FAKE_ROOT="${TEMP_DIR}/fake_repo"
mkdir -p "${FAKE_ROOT}/scripts/infra"
cp "${SCRIPT_DIR}/_load_env.sh" "${FAKE_ROOT}/scripts/infra/"

cat > "${FAKE_ROOT}/.env" <<'EOF'
POSTGRES_DB=test_custom_db
POSTGRES_USER=test_custom_user
EOF

# shellcheck source=/dev/null
source "${FAKE_ROOT}/scripts/infra/_load_env.sh"

if [[ "${ROOT_DIR}" != "${FAKE_ROOT}" ]]; then
  echo "FALHA: ROOT_DIR esperado '${FAKE_ROOT}', obtido '${ROOT_DIR}'" >&2
  exit 1
fi

if [[ "${POSTGRES_DB:-}" != "test_custom_db" ]]; then
  echo "FALHA: POSTGRES_DB esperado 'test_custom_db', obtido '${POSTGRES_DB:-}'" >&2
  exit 1
fi

if [[ "${POSTGRES_USER:-}" != "test_custom_user" ]]; then
  echo "FALHA: POSTGRES_USER esperado 'test_custom_user', obtido '${POSTGRES_USER:-}'" >&2
  exit 1
fi

echo "OK: _load_env.sh carregou POSTGRES_DB e POSTGRES_USER do .env customizado."
