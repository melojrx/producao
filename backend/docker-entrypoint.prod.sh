#!/bin/sh
set -e

echo "Aplicando migrations..."
python manage.py migrate --noinput

echo "Coletando arquivos estaticos..."
python manage.py collectstatic --noinput

echo "Iniciando Gunicorn..."
exec gunicorn pcp_project.wsgi:application --bind 0.0.0.0:8000
