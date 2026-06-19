#!/bin/sh
set -e

echo "Aplicando migrations..."
python manage.py migrate --noinput

echo "Coletando arquivos estaticos..."
python manage.py collectstatic --noinput

echo "Iniciando Gunicorn..."
if [ -n "${GUNICORN_CMD_ARGS:-}" ]; then
  # shellcheck disable=SC2086
  exec gunicorn pcp_project.wsgi:application --bind 0.0.0.0:8000 ${GUNICORN_CMD_ARGS}
fi
exec gunicorn pcp_project.wsgi:application --bind 0.0.0.0:8000
