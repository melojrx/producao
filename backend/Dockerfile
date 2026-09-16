# syntax=docker/dockerfile:1

FROM python:3.13-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.13-slim AS development

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY --from=builder /install /usr/local
COPY . .

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

FROM python:3.13-slim AS assets

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=pcp_project.config.production

WORKDIR /app

COPY --from=builder /install /usr/local
COPY . .

RUN DJANGO_SECRET_KEY=build-time-secret \
    POSTGRES_DB=build_db \
    POSTGRES_USER=build_user \
    POSTGRES_PASSWORD=build_password \
    python manage.py collectstatic --noinput

FROM python:3.13-slim AS production-base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=pcp_project.config.production

WORKDIR /app

COPY --from=builder /install /usr/local
COPY . .
COPY --from=assets /app/staticfiles /app/staticfiles

EXPOSE 8000

FROM production-base AS web

RUN chmod +x docker-entrypoint-web.sh

CMD ["./docker-entrypoint-web.sh"]

FROM production-base AS migrate

RUN chmod +x docker-entrypoint-migrate.sh

CMD ["./docker-entrypoint-migrate.sh"]

FROM production-base AS production

RUN chmod +x docker-entrypoint.prod.sh

ENTRYPOINT ["./docker-entrypoint.prod.sh"]
