#!/bin/sh
set -e

if [ -n "${GUNICORN_CMD_ARGS:-}" ]; then
  # shellcheck disable=SC2086
  exec gunicorn pcp_project.wsgi:application --bind 0.0.0.0:8000 ${GUNICORN_CMD_ARGS}
fi

exec gunicorn pcp_project.wsgi:application --bind 0.0.0.0:8000
