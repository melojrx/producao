#!/usr/bin/env bash
# Deploy producao na VPS — pull main + rebuild compose producao-prod.
# Executado localmente na VPS ou via GitHub Actions (SSH).
#
# Pre-requisitos na VPS:
#   - repo clonado em DEPLOY_PATH (default /opt/producao)
#   - .env preenchido (nao versionado)
#   - vhost nginx host apontando para 127.0.0.1:8080
#
# Uso:
#   DEPLOY_PATH=/opt/producao ./scripts/deploy/vps-production.sh
#   DEPLOY_REF=main DEPLOY_PATH=/opt/producao ./scripts/deploy/vps-production.sh

set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/producao}"
DEPLOY_REF="${DEPLOY_REF:-main}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8080/health/}"

if [[ ! -d "${DEPLOY_PATH}/.git" ]]; then
  echo "ERRO: ${DEPLOY_PATH} nao e um repositorio git." >&2
  exit 1
fi

cd "${DEPLOY_PATH}"

echo "==> Fetch ${DEPLOY_REF}"
git fetch origin "${DEPLOY_REF}"
git checkout "${DEPLOY_REF}"
git reset --hard "origin/${DEPLOY_REF}"

# Reexecuta apos atualizar o script no disco (bash nao recarrega o arquivo em execucao).
if [[ "${DEPLOY_SELF_UPDATED:-}" != "1" ]]; then
  export DEPLOY_SELF_UPDATED=1
  exec env DEPLOY_SELF_UPDATED=1 bash "$0" "$@"
fi

if [[ ! -f .env ]]; then
  echo "ERRO: .env ausente em ${DEPLOY_PATH}. Copie de .env.example e preencha secrets." >&2
  exit 1
fi

echo "==> Validar flags cutover Django (.env)"
bash scripts/mdj19/sync-runtime-django-flags.sh .env
node scripts/mdj19/verificar-flags-cutover.mjs

echo "==> Validar compose"
docker compose -f "${COMPOSE_FILE}" config >/dev/null

echo "==> Build imagens"
docker compose -f "${COMPOSE_FILE}" build

echo "==> Subir stack"
docker compose -f "${COMPOSE_FILE}" up -d

echo "==> Migrate"
docker compose -f "${COMPOSE_FILE}" exec -T backend python manage.py migrate --noinput

echo "==> Health check"
resposta="$(curl -sf "${HEALTH_URL}")"
echo "${resposta}"
if ! echo "${resposta}" | grep -qE '"status"[[:space:]]*:[[:space:]]*"ok"'; then
  echo "ERRO: health check falhou." >&2
  exit 1
fi
if ! echo "${resposta}" | grep -qE '"database"[[:space:]]*:[[:space:]]*"ok"'; then
  echo "ERRO: health check database falhou." >&2
  exit 1
fi

echo "==> Deploy concluido (${DEPLOY_REF} @ $(git rev-parse --short HEAD))"
