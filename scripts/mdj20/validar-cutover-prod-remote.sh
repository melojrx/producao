#!/usr/bin/env bash
# Validacao pos-cutover Django em producao — scanner + cadastros + apontamento.
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/producao}"
BASE_URL="${BASE_URL:-http://127.0.0.1:8080}"
CREDS_FILE="${CREDS_FILE:-/root/producao-bootstrap-credentials.txt}"
TEST_WRITE="${TEST_WRITE:-false}"

cd "${DEPLOY_PATH}"

log() { echo "[$(date -Iseconds)] $*"; }
ok() { echo "OK  $1 — $2"; }
fail() { echo "FAIL $1 — $2"; exit 1; }

ADMIN_EMAIL="$(grep '^admin_email=' "${CREDS_FILE}" | cut -d= -f2-)"
ADMIN_PASS="$(grep '^admin_password=' "${CREDS_FILE}" | cut -d= -f2-)"

TOKEN="$(curl -sf -X POST "${BASE_URL}/api/v1/accounts/login/" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"senha\":\"${ADMIN_PASS}\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access'])")"
ok "django-login" "token obtido"

auth_hdr=(-H "Authorization: Bearer ${TOKEN}")

SETOR_COUNT="$(curl -sf "${auth_hdr[@]}" "${BASE_URL}/api/v1/cadastros/setores/" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")"
[[ "${SETOR_COUNT}" -gt 0 ]] && ok "cadastros-setores" "${SETOR_COUNT} setores" || fail "cadastros-setores" "vazio"

TURNO_COUNT="$(curl -sf "${auth_hdr[@]}" "${BASE_URL}/api/v1/turnos/" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")"
[[ "${TURNO_COUNT}" -gt 0 ]] && ok "turnos" "${TURNO_COUNT} turnos" || fail "turnos" "vazio"

OPERADOR_TOKEN="$(docker compose -f docker-compose.prod.yml exec -T db psql -U pcp_user -d pcp_db -tAc \
  "SELECT trim(qr_code_token) FROM accounts_operador WHERE status='ativo' LIMIT 1;" | tr -d '[:space:]')"
[[ -n "${OPERADOR_TOKEN}" ]] || fail "scanner-operador" "token ativo ausente"

SCAN_HTTP="$(curl -s -o /tmp/scan_op.json -w '%{http_code}' "${BASE_URL}/api/v1/scanner/operador/${OPERADOR_TOKEN}/")"
if [[ "${SCAN_HTTP}" == "200" ]]; then
  SCAN_OP="$(python3 -c "import json; print(json.load(open('/tmp/scan_op.json')).get('nome',''))")"
  ok "scanner-operador" "${SCAN_OP}"
else
  fail "scanner-operador" "HTTP ${SCAN_HTTP}"
fi

SETOR_TOKEN="$(docker compose -f docker-compose.prod.yml exec -T db psql -U pcp_user -d pcp_db -tAc \
  "SELECT trim(ts.qr_code_token) FROM turnos_turnosetor ts JOIN turnos_turno t ON t.id=ts.turno_id WHERE t.status='aberto' LIMIT 1;" | tr -d '[:space:]')"
SETOR_NOME="$(docker compose -f docker-compose.prod.yml exec -T db psql -U pcp_user -d pcp_db -tAc \
  "SELECT s.nome FROM turnos_turnosetor ts JOIN turnos_turno t ON t.id=ts.turno_id JOIN cadastros_setor s ON s.id=ts.setor_id WHERE t.status='aberto' LIMIT 1;" | tr -d '[:space:]')"

if [[ -n "${SETOR_TOKEN// }" ]]; then
  curl -sf "${BASE_URL}/api/v1/scanner/setor/${SETOR_TOKEN}/" >/dev/null \
    && ok "scanner-setor" "${SETOR_NOME:-setor aberto}" \
    || fail "scanner-setor" "HTTP erro"
  DEM_COUNT="$(curl -sf "${BASE_URL}/api/v1/scanner/setor/${SETOR_TOKEN}/demandas/" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")"
  ok "scanner-demandas" "${DEM_COUNT} demandas"
else
  ok "scanner-setor" "SKIP — nenhum turno aberto no snapshot"
  ok "scanner-demandas" "SKIP"
fi

DASH_CODE="$(curl -sf -o /dev/null -w '%{http_code}' "${auth_hdr[@]}" "${BASE_URL}/api/v1/relatorios/dashboard/")"
[[ "${DASH_CODE}" == "200" ]] && ok "dashboard" "HTTP 200" || fail "dashboard" "HTTP ${DASH_CODE}"

META_CODE="$(curl -s -o /dev/null -w '%{http_code}' "${auth_hdr[@]}" "${BASE_URL}/api/v1/metas/resumo/")"
[[ "${META_CODE}" == "200" ]] && ok "metas" "HTTP 200" || ok "metas" "HTTP ${META_CODE} (endpoint opcional)"

if [[ "${TEST_WRITE}" == "true" ]]; then
  TSO_ROW="$(docker compose -f docker-compose.prod.yml exec -T db psql -U pcp_user -d pcp_db -tA -F'|' -c "
SELECT tso.id::text,
       (SELECT id::text FROM accounts_operador WHERE status='ativo' LIMIT 1),
       GREATEST((tso.quantidade_planejada - tso.quantidade_realizada)::int, 0)
FROM turnos_turnosetoroperacao tso
JOIN turnos_turnosetor ts ON ts.id = tso.turno_setor_id
JOIN turnos_turno t ON t.id = ts.turno_id
WHERE t.status = 'aberto'
  AND tso.quantidade_realizada < tso.quantidade_planejada
LIMIT 1;
")"
  IFS='|' read -r TSO_ID OPERADOR_ID SALDO <<< "${TSO_ROW}"
  TSO_ID="${TSO_ID// /}"
  OPERADOR_ID="${OPERADOR_ID// /}"
  if [[ -n "${TSO_ID// }" && "${SALDO:-0}" -gt 0 ]]; then
    AP_CODE="$(curl -s -o /tmp/apont.json -w '%{http_code}' -X POST "${auth_hdr[@]}" "${BASE_URL}/api/v1/producao/apontamentos/" \
      -H 'Content-Type: application/json' \
      -d "{\"turno_setor_operacao\":\"${TSO_ID}\",\"operador\":\"${OPERADOR_ID}\",\"quantidade\":1,\"origem_apontamento\":\"operador_qr\"}")"
    if [[ "${AP_CODE}" == "201" ]]; then
      ok "producao-apontamento" "HTTP 201 qty=1"
    elif [[ "${AP_CODE}" == "400" ]] && grep -q "saldo fisico" /tmp/apont.json 2>/dev/null; then
      ok "producao-apontamento" "HTTP 400 regra saldo (rota Django ativa)"
    else
      fail "producao-apontamento" "HTTP ${AP_CODE} $(cat /tmp/apont.json 2>/dev/null)"
    fi
  else
    ok "producao-apontamento" "SKIP — sem saldo em turno aberto"
  fi
else
  AP_UNAUTH="$(curl -s -o /dev/null -w '%{http_code}' -X POST "${BASE_URL}/api/v1/producao/apontamentos/" -H 'Content-Type: application/json' -d '{}')"
  [[ "${AP_UNAUTH}" == "401" || "${AP_UNAUTH}" == "403" ]] \
    && ok "producao-apontamento-auth" "HTTP ${AP_UNAUTH} sem token" \
    || fail "producao-apontamento-auth" "HTTP ${AP_UNAUTH}"
fi

log "Validacao cutover concluida"
