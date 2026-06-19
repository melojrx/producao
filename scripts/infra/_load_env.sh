#!/usr/bin/env bash
# Carrega variaveis do .env na raiz do repositorio quando existir.
# Deve ser sourced pelos scripts operacionais de backup/restore.
#
# Uso:
#   source "${SCRIPT_DIR}/_load_env.sh"

_load_env_script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -z "${ROOT_DIR:-}" ]]; then
  ROOT_DIR="$(cd "${_load_env_script_dir}/../.." && pwd)"
fi

ENV_FILE="${ROOT_DIR}/.env"
if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "${ENV_FILE}"
  set +a
fi

unset _load_env_script_dir
