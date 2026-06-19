#!/usr/bin/env bash
# Executado NA VPS — import MDJ-20 snapshot → Postgres producao.
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/producao}"
BACKUP_MOUNT="${BACKUP_MOUNT:-${DEPLOY_PATH}/backups/supabase-snapshot-20260531}"
COMPOSE_PROD="${COMPOSE_PROD:-docker-compose.prod.yml}"
COMPOSE_RESTORE="${COMPOSE_RESTORE:-docker/compose/restore.vps.yml}"
RESTORE_HOST="${RESTORE_HOST:-postgres_restore}"
RESTORE_PASSWORD="${RESTORE_PASSWORD:-restore_senha_local}"
LOG_DIR="${LOG_DIR:-${DEPLOY_PATH}/backups/mdj20-logs}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

DRY_RUN_ONLY=false
SKIP_BACKUP=false
SKIP_MEDIA=false
SKIP_RESTORE_LOAD=false

for arg in "$@"; do
  case "${arg}" in
    --dry-run) DRY_RUN_ONLY=true ;;
    --skip-backup) SKIP_BACKUP=true ;;
    --skip-media) SKIP_MEDIA=true ;;
    --skip-restore-load) SKIP_RESTORE_LOAD=true ;;
    *) echo "Argumento desconhecido: ${arg}" >&2; exit 1 ;;
  esac
done

cd "${DEPLOY_PATH}"
mkdir -p "${LOG_DIR}"

log() { echo "[$(date -Iseconds)] $*"; }

require_file() {
  if [[ ! -f "${1}" ]]; then
    echo "ERRO: arquivo ausente: ${1}" >&2
    exit 1
  fi
}

require_file "${BACKUP_MOUNT}/schema_public.sql"
require_file "${BACKUP_MOUNT}/restore_dados_v2.sql"
require_file "scripts/mdj20/baseline-counts-restore.sql"

log "Checksum snapshot"
sha256sum "${BACKUP_MOUNT}/schema_public.sql" "${BACKUP_MOUNT}/restore_dados_v2.sql" \
  | tee "${LOG_DIR}/checksum_${TIMESTAMP}.txt"

if [[ "${SKIP_BACKUP}" != "true" && "${DRY_RUN_ONLY}" != "true" ]]; then
  log "Backup Postgres prod"
  ./scripts/infra/backup_postgres.sh "${DEPLOY_PATH}/backups/postgres-pre-mdj20"
fi

log "Subir postgres_restore"
export BACKUP_MOUNT
docker compose -f "${COMPOSE_RESTORE}" up -d

log "Aguardar postgres_restore healthy"
for _ in $(seq 1 60); do
  status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' producao-postgres-restore 2>/dev/null || echo starting)"
  if [[ "${status}" == "healthy" ]]; then
    break
  fi
  sleep 2
done

TABLES="$(docker compose -f "${COMPOSE_RESTORE}" exec -T postgres_restore \
  psql -U restore_user -d supabase_restore_test -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" \
  | tr -d '[:space:]')"

if [[ "${SKIP_RESTORE_LOAD}" != "true" && "${TABLES:-0}" -lt 5 ]]; then
  log "Restaurar schema + dados (tabelas atuais: ${TABLES:-0})"
  docker compose -f "${COMPOSE_RESTORE}" exec -T postgres_restore \
    psql -U restore_user -d supabase_restore_test -v ON_ERROR_STOP=1 \
    -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" \
    -f /backups/schema_public.sql \
    2>&1 | tee "${LOG_DIR}/restore_schema_${TIMESTAMP}.log"

  docker compose -f "${COMPOSE_RESTORE}" exec -T postgres_restore \
    psql -U restore_user -d supabase_restore_test -v ON_ERROR_STOP=1 \
    -f /backups/restore_dados_v2.sql \
    2>&1 | tee "${LOG_DIR}/restore_dados_${TIMESTAMP}.log"
fi

log "Baseline contagens restore"
docker compose -f "${COMPOSE_RESTORE}" exec -T postgres_restore \
  psql -U restore_user -d supabase_restore_test \
  < scripts/mdj20/baseline-counts-restore.sql \
  | tee "${LOG_DIR}/baseline_restore_${TIMESTAMP}.txt"

log "Checks Django pre-import"
docker compose -f "${COMPOSE_PROD}" exec -T backend python manage.py check
docker compose -f "${COMPOSE_PROD}" exec -T backend python manage.py makemigrations --check --dry-run

IMPORT_ARGS=(--restore-host "${RESTORE_HOST}" --restore-password "${RESTORE_PASSWORD}" --flush)

if [[ "${DRY_RUN_ONLY}" == "true" ]]; then
  log "Dry-run importacao"
  docker compose -f "${COMPOSE_PROD}" exec -T backend \
    python manage.py import_supabase_restore "${IMPORT_ARGS[@]}" --dry-run \
    2>&1 | tee "${LOG_DIR}/import_dry_run_${TIMESTAMP}.log"
  exit 0
fi

log "Importacao real"
docker compose -f "${COMPOSE_PROD}" exec -T backend \
  python manage.py import_supabase_restore "${IMPORT_ARGS[@]}" \
  2>&1 | tee "${LOG_DIR}/import_real_${TIMESTAMP}.log"

log "Contagens Django pos-import"
# shellcheck disable=SC1091
source .env
docker compose -f "${COMPOSE_PROD}" exec -T db \
  psql -U "${POSTGRES_USER:-pcp_user}" -d "${POSTGRES_DB:-pcp_db}" -c "
SELECT 'setores' t, COUNT(*) FROM cadastros_setor
UNION ALL SELECT 'operadores', COUNT(*) FROM accounts_operador
UNION ALL SELECT 'produtos', COUNT(*) FROM produtos_produto
UNION ALL SELECT 'turnos', COUNT(*) FROM turnos_turno
UNION ALL SELECT 'registros_producao', COUNT(*) FROM producao_registroproducao
UNION ALL SELECT 'qualidade_registros', COUNT(*) FROM qualidade_qualidaderegistro
ORDER BY 1;
" | tee "${LOG_DIR}/counts_django_${TIMESTAMP}.txt"

if [[ "${SKIP_MEDIA}" != "true" && -d "${BACKUP_MOUNT}/storage" ]]; then
  log "Copiar midia para volume Django"
  BACKEND_ID="$(docker compose -f "${COMPOSE_PROD}" ps -q backend)"
  docker compose -f "${COMPOSE_PROD}" exec -T backend sh -c 'mkdir -p /app/media/produtos /app/media/operacoes'
  if [[ -d "${BACKUP_MOUNT}/storage/produtos" ]]; then
    docker cp "${BACKUP_MOUNT}/storage/produtos/." "${BACKEND_ID}:/app/media/produtos/"
  fi
  if [[ -d "${BACKUP_MOUNT}/storage/operacoes" ]]; then
    docker cp "${BACKUP_MOUNT}/storage/operacoes/." "${BACKEND_ID}:/app/media/operacoes/"
  fi
  docker compose -f "${COMPOSE_PROD}" exec -T backend find /app/media -type f | wc -l \
    | tee "${LOG_DIR}/media_files_${TIMESTAMP}.txt"
fi

log "Garantir superuser bootstrap"
CREDS_FILE="/root/producao-bootstrap-credentials.txt"
if [[ -f "${CREDS_FILE}" ]]; then
  ADMIN_EMAIL="$(grep '^admin_email=' "${CREDS_FILE}" | cut -d= -f2-)"
  ADMIN_PASS="$(grep '^admin_password=' "${CREDS_FILE}" | cut -d= -f2-)"
  ADMIN_USER="$(grep '^admin_username=' "${CREDS_FILE}" | cut -d= -f2-)"
  docker compose -f "${COMPOSE_PROD}" exec -T backend python manage.py shell -c "
from accounts.models import User
email = '${ADMIN_EMAIL}'
if not User.objects.filter(email=email).exists():
    User.objects.create_superuser('${ADMIN_USER}', email, '${ADMIN_PASS}')
    print('superuser recriado:', email)
else:
    u = User.objects.get(email=email)
    u.set_password('${ADMIN_PASS}')
    u.is_superuser = True
    u.is_staff = True
    u.save()
    print('superuser atualizado:', email)
"
fi

log "Health pos-import"
curl -sf http://127.0.0.1:8080/health/
echo ""
log "MDJ-20 concluido. Logs: ${LOG_DIR}/"
