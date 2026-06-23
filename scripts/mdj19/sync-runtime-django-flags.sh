#!/usr/bin/env bash
# Espelha NEXT_PUBLIC_USE_DJANGO_* → USE_DJANGO_* no .env da VPS (runtime SSR).
# Idempotente: nao altera linhas USE_DJANGO_* existentes.
set -euo pipefail

ENV_FILE="${1:-.env}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ERRO: ${ENV_FILE} nao encontrado." >&2
  exit 1
fi

pares=(
  "USE_DJANGO_SCANNER_READS:NEXT_PUBLIC_USE_DJANGO_SCANNER_READS"
  "USE_DJANGO_CADASTROS_READS:NEXT_PUBLIC_USE_DJANGO_CADASTROS_READS"
  "USE_DJANGO_METAS_READS:NEXT_PUBLIC_USE_DJANGO_METAS_READS"
  "USE_DJANGO_DASHBOARD_READS:NEXT_PUBLIC_USE_DJANGO_DASHBOARD_READS"
  "USE_DJANGO_AUTH:NEXT_PUBLIC_USE_DJANGO_AUTH"
  "USE_DJANGO_ADMIN_WRITES:NEXT_PUBLIC_USE_DJANGO_ADMIN_WRITES"
  "USE_DJANGO_PRODUCAO_WRITES:NEXT_PUBLIC_USE_DJANGO_PRODUCAO_WRITES"
  "USE_DJANGO_QUALIDADE_WRITES:NEXT_PUBLIC_USE_DJANGO_QUALIDADE_WRITES"
)

for par in "${pares[@]}"; do
  use="${par%%:*}"
  pub="${par##*:}"
  if grep -q "^${use}=" "${ENV_FILE}"; then
    continue
  fi
  valor="$(grep -E "^${pub}=" "${ENV_FILE}" | tail -1 | cut -d= -f2- || true)"
  valor="${valor:-true}"
  echo "${use}=${valor}" >> "${ENV_FILE}"
  echo "Adicionado ${use}=${valor}"
done

echo "Concluido. Rode: node scripts/mdj19/verificar-flags-cutover.mjs"
