#!/usr/bin/env bash
# Cutover flags Django ON na VPS producao (MDJ-20 pos-import).
# Rebuild frontend obrigatorio — NEXT_PUBLIC_* embutidas no build Next.js.
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/producao}"
COMPOSE_PROD="${COMPOSE_PROD:-docker-compose.prod.yml}"

cd "${DEPLOY_PATH}"

log() { echo "[$(date -Iseconds)] $*"; }

FLAGS=(
  NEXT_PUBLIC_USE_DJANGO_AUTH
  NEXT_PUBLIC_USE_DJANGO_SCANNER_READS
  NEXT_PUBLIC_USE_DJANGO_CADASTROS_READS
  NEXT_PUBLIC_USE_DJANGO_METAS_READS
  NEXT_PUBLIC_USE_DJANGO_DASHBOARD_READS
  NEXT_PUBLIC_USE_DJANGO_ADMIN_WRITES
  NEXT_PUBLIC_USE_DJANGO_PRODUCAO_WRITES
  NEXT_PUBLIC_USE_DJANGO_QUALIDADE_WRITES
)

python3 <<'PYEOF'
from pathlib import Path

env_path = Path("/opt/producao/.env")
text = env_path.read_text()
flags = [
    "NEXT_PUBLIC_USE_DJANGO_AUTH",
    "NEXT_PUBLIC_USE_DJANGO_SCANNER_READS",
    "NEXT_PUBLIC_USE_DJANGO_CADASTROS_READS",
    "NEXT_PUBLIC_USE_DJANGO_METAS_READS",
    "NEXT_PUBLIC_USE_DJANGO_DASHBOARD_READS",
    "NEXT_PUBLIC_USE_DJANGO_ADMIN_WRITES",
    "NEXT_PUBLIC_USE_DJANGO_PRODUCAO_WRITES",
    "NEXT_PUBLIC_USE_DJANGO_QUALIDADE_WRITES",
]
updates = {k: "true" for k in flags}
lines = []
seen = set()
for line in text.splitlines():
    key = line.split("=", 1)[0].strip() if "=" in line else None
    if key in updates:
        lines.append(f"{key}={updates[key]}")
        seen.add(key)
    else:
        lines.append(line)
for key, val in updates.items():
    if key not in seen:
        lines.append(f"{key}={val}")
env_path.write_text("\n".join(lines) + "\n")
print("OK: flags Django ON no .env")
PYEOF

log "Flags atuais:"
grep NEXT_PUBLIC_USE_DJANGO "${DEPLOY_PATH}/.env"

log "Rebuild frontend (embed flags no bundle)"
docker compose -f "${COMPOSE_PROD}" build frontend
docker compose -f "${COMPOSE_PROD}" up -d frontend

log "Aguardar frontend"
sleep 5
curl -sf -o /dev/null -w "login:%{http_code}\n" http://127.0.0.1:8080/login
curl -sf http://127.0.0.1:8080/health/

log "Cutover flags concluido"
