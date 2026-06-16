# MDJ-4 Scaffold Django Dockerizado Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar o scaffold mínimo Django dockerizado da `MDJ-4`, sem models de domínio, sem integração com Next.js e sem tocar no Supabase.

**Architecture:** A sprint cria `backend/` com um projeto Django mínimo, settings modulares e endpoint `/health/`. A execução local usa `docker-compose.dev.yml` com dois serviços: `backend` e `db` PostgreSQL 16, separados do container de restore Supabase. A documentação da sprint registra HUs e evidências em `docs/migracao_django/TASKS.md`.

**Tech Stack:** Django 5, Python 3.13 slim, PostgreSQL 16 Alpine, Docker Compose, Gunicorn para imagem de produção mínima.

---

## File Structure

Criar:

- `backend/manage.py` — entrada CLI do Django.
- `backend/requirements.txt` — dependências mínimas da `MDJ-4`.
- `backend/Dockerfile` — imagem multi-stage com targets `development` e `production`.
- `backend/pcp_project/__init__.py` — pacote do projeto Django.
- `backend/pcp_project/asgi.py` — ASGI padrão.
- `backend/pcp_project/wsgi.py` — WSGI padrão.
- `backend/pcp_project/urls.py` — rota `/health/` e admin padrão.
- `backend/pcp_project/tests.py` — teste focado do healthcheck.
- `backend/pcp_project/config/__init__.py` — pacote de settings.
- `backend/pcp_project/config/base.py` — settings comuns.
- `backend/pcp_project/config/local.py` — settings de desenvolvimento Docker.
- `backend/pcp_project/config/production.py` — settings mínimos de produção.
- `docker-compose.dev.yml` — compose de desenvolvimento com backend e PostgreSQL da aplicação.

Modificar:

- `docs/migracao_django/TASKS.md` — abrir `MDJ-4`, registrar HUs, marcar evidências ao final.
- `docs/migracao_django/BACKLOG.md` — mudar status da `MDJ-4` durante abertura e conclusão.

Não modificar:

- `app/`
- `components/`
- `hooks/`
- `lib/actions/`
- `lib/queries/`
- `scripts/`
- `types/supabase.ts`
- qualquer recurso remoto Supabase

---

### Task 1: Abrir Documentalmente a MDJ-4

**Files:**
- Modify: `docs/migracao_django/TASKS.md`
- Modify: `docs/migracao_django/BACKLOG.md`

- [ ] **Step 1: Atualizar o status da MDJ-4 no backlog**

Em `docs/migracao_django/BACKLOG.md`, trocar a linha da `MDJ-4` de:

```markdown
| MDJ-4 | Ambiente local Django + PostgreSQL | 🧭 Planejada | Criar backend paralelo local sem integrar ao frontend atual |
```

para:

```markdown
| MDJ-4 | Ambiente local Django + PostgreSQL | 🚧 Em andamento | Criar backend paralelo local sem integrar ao frontend atual |
```

- [ ] **Step 2: Adicionar seção da sprint antes de `Criterios para abrir implementacao Django`**

Em `docs/migracao_django/TASKS.md`, inserir a seção abaixo imediatamente antes de `## Criterios para abrir implementacao Django`:

```markdown
## SPRINT MDJ-4 — Ambiente local Django + PostgreSQL

**Status:** 🚧 Em andamento
**Objetivo:** criar o scaffold mínimo do backend Django dockerizado, paralelo ao sistema atual, sem models de domínio, sem integração com Next.js e sem tocar no Supabase.
**Pré-requisito:** MDJ-1, MDJ-2 e MDJ-3 concluídas documentalmente; confirmação explícita do usuário em `2026-06-04` para abrir a MDJ-4 com escopo mínimo dockerizado.

Decisão de escopo:

- criar somente infraestrutura mínima Django + Docker;
- não criar apps de domínio nesta sprint;
- não criar models PCP;
- não importar dados;
- não recriar restore Supabase nesta sprint;
- não alterar frontend, Server Actions ou queries Supabase.

- [ ] **HU MDJ-4.1 — Como produto, quero abrir oficialmente a sprint de scaffold mínimo, para iniciar implementação Django sem misturar modelagem de domínio.**
  **Prioridade:** P0
  **Risco:** Baixo

  **Evidência esperada:** `TASKS.md` e `BACKLOG.md` registram a MDJ-4 como sprint aberta, com escopo mínimo e fora de escopo explícito.

- [ ] **HU MDJ-4.2 — Como desenvolvedor, quero criar um projeto Django mínimo em `backend/`, para ter uma base executável e isolada.**
  **Prioridade:** P0
  **Risco:** Médio

  **Evidência esperada:** `backend/` contém projeto Django mínimo com settings modulares e endpoint `/health/`; `python manage.py check` passa dentro do container.

- [ ] **HU MDJ-4.3 — Como desenvolvedor, quero dockerizar o backend Django, para executar o serviço de forma reproduzível.**
  **Prioridade:** P0
  **Risco:** Médio

  **Evidência esperada:** `backend/Dockerfile` multi-stage constrói imagem de desenvolvimento sem erro.

- [ ] **HU MDJ-4.4 — Como mantenedor, quero um compose de desenvolvimento com PostgreSQL da aplicação, para validar Django + banco local sem usar Supabase.**
  **Prioridade:** P0
  **Risco:** Médio

  **Evidência esperada:** `docker-compose.dev.yml` sobe `backend` e `db`, com PostgreSQL 16 em volume `postgres_data`, e Django responde em `localhost:8000`.

- [ ] **HU MDJ-4.5 — Como produto, quero homologar o ambiente mínimo, para confirmar que a base Django sobe sem regressão no sistema atual.**
  **Prioridade:** P0
  **Risco:** Baixo

  **Evidência esperada:** healthcheck, teste Django, `manage.py check`, migrations padrão, `git diff --check` e documentação final passam; nenhuma alteração em Supabase, frontend, actions ou queries.
```

- [ ] **Step 3: Verificar a abertura documental**

Run:

```bash
git diff --check -- docs/migracao_django/TASKS.md docs/migracao_django/BACKLOG.md
```

Expected: sem saída.

- [ ] **Step 4: Checkpoint sem commit**

Run:

```bash
git diff -- docs/migracao_django/TASKS.md docs/migracao_django/BACKLOG.md
```

Expected: diff mostra apenas abertura documental da `MDJ-4`.

Não executar `git commit` nesta etapa, a menos que o usuário peça explicitamente.

---

### Task 2: Criar Projeto Django Mínimo

**Files:**
- Create: `backend/manage.py`
- Create: `backend/requirements.txt`
- Create: `backend/pcp_project/__init__.py`
- Create: `backend/pcp_project/asgi.py`
- Create: `backend/pcp_project/wsgi.py`
- Create: `backend/pcp_project/config/__init__.py`
- Create: `backend/pcp_project/config/base.py`
- Create: `backend/pcp_project/config/local.py`
- Create: `backend/pcp_project/config/production.py`

- [ ] **Step 1: Criar `backend/requirements.txt`**

Criar `backend/requirements.txt` com:

```text
Django>=5.0,<6.0
psycopg2-binary>=2.9,<3.0
gunicorn>=21.2,<24.0
```

- [ ] **Step 2: Criar `backend/manage.py`**

Criar `backend/manage.py` com:

```python
#!/usr/bin/env python
"""Django command-line utility for administrative tasks."""

import os
import sys


def main() -> None:
    """Run administrative tasks."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pcp_project.config.local")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Is it installed and available on your PYTHONPATH?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Criar arquivos de pacote Django**

Criar `backend/pcp_project/__init__.py` vazio.

Criar `backend/pcp_project/config/__init__.py` vazio.

- [ ] **Step 4: Criar `backend/pcp_project/asgi.py`**

Criar `backend/pcp_project/asgi.py` com:

```python
"""ASGI config for pcp_project."""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pcp_project.config.local")

application = get_asgi_application()
```

- [ ] **Step 5: Criar `backend/pcp_project/wsgi.py`**

Criar `backend/pcp_project/wsgi.py` com:

```python
"""WSGI config for pcp_project."""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pcp_project.config.local")

application = get_wsgi_application()
```

- [ ] **Step 6: Criar `backend/pcp_project/config/base.py`**

Criar `backend/pcp_project/config/base.py` com:

```python
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = "mdj4-dev-only-change-in-production"

DEBUG = False

ALLOWED_HOSTS: list[str] = []

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "pcp_project.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "pcp_project.wsgi.application"

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
```

- [ ] **Step 7: Criar `backend/pcp_project/config/local.py`**

Criar `backend/pcp_project/config/local.py` com:

```python
import os

from .base import *

DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "pcp_db"),
        "USER": os.environ.get("POSTGRES_USER", "pcp_user"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "pcp_password"),
        "HOST": os.environ.get("POSTGRES_HOST", "db"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
    }
}
```

- [ ] **Step 8: Criar `backend/pcp_project/config/production.py`**

Criar `backend/pcp_project/config/production.py` com:

```python
import os

from .base import *

DEBUG = False

ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get("ALLOWED_HOSTS", "").split(",")
    if host.strip()
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "pcp_db"),
        "USER": os.environ.get("POSTGRES_USER", "pcp_user"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "pcp_password"),
        "HOST": os.environ.get("POSTGRES_HOST", "db"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
    }
}
```

- [ ] **Step 9: Checkpoint sem commit**

Run:

```bash
git diff -- backend/manage.py backend/requirements.txt backend/pcp_project
```

Expected: diff contém apenas scaffold Django mínimo.

Não executar `git commit` nesta etapa, a menos que o usuário peça explicitamente.

---

### Task 3: Criar Healthcheck Testável

**Files:**
- Create: `backend/pcp_project/urls.py`
- Create: `backend/pcp_project/tests.py`

- [ ] **Step 1: Criar teste do healthcheck antes da implementação da rota**

Criar `backend/pcp_project/tests.py` com:

```python
from django.test import SimpleTestCase


class HealthcheckTests(SimpleTestCase):
    def test_healthcheck_returns_ok(self) -> None:
        response = self.client.get("/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})
```

- [ ] **Step 2: Criar `backend/pcp_project/urls.py` com rota de healthcheck**

Criar `backend/pcp_project/urls.py` com:

```python
from django.contrib import admin
from django.http import JsonResponse
from django.urls import path


def healthcheck(request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", healthcheck, name="healthcheck"),
]
```

- [ ] **Step 3: Checkpoint sem commit**

Run:

```bash
git diff -- backend/pcp_project/urls.py backend/pcp_project/tests.py
```

Expected: diff mostra rota `/health/` e teste `HealthcheckTests`.

Não executar `git commit` nesta etapa, a menos que o usuário peça explicitamente.

---

### Task 4: Dockerizar o Backend Django

**Files:**
- Create: `backend/Dockerfile`

- [ ] **Step 1: Criar `backend/Dockerfile` multi-stage**

Criar `backend/Dockerfile` com:

```dockerfile
# syntax=docker/dockerfile:1

FROM python:3.13-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

FROM base AS development

COPY . .

EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

FROM base AS production

COPY . .

EXPOSE 8000
CMD ["gunicorn", "pcp_project.wsgi:application", "--bind", "0.0.0.0:8000"]
```

- [ ] **Step 2: Checkpoint sem commit**

Run:

```bash
git diff -- backend/Dockerfile
```

Expected: diff mostra Dockerfile com targets `development` e `production`.

Não executar `git commit` nesta etapa, a menos que o usuário peça explicitamente.

---

### Task 5: Criar Compose de Desenvolvimento

**Files:**
- Create: `docker-compose.dev.yml`

- [ ] **Step 1: Criar `docker-compose.dev.yml`**

Criar `docker-compose.dev.yml` na raiz com:

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: development
    ports:
      - "8000:8000"
    environment:
      DJANGO_SETTINGS_MODULE: pcp_project.config.local
      POSTGRES_DB: pcp_db
      POSTGRES_USER: pcp_user
      POSTGRES_PASSWORD: pcp_password
      POSTGRES_HOST: db
      POSTGRES_PORT: "5432"
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: pcp_db
      POSTGRES_USER: pcp_user
      POSTGRES_PASSWORD: pcp_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "pcp_user", "-d", "pcp_db"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

- [ ] **Step 2: Build da imagem de desenvolvimento**

Run:

```bash
docker compose -f docker-compose.dev.yml build backend
```

Expected: build conclui sem erro.

- [ ] **Step 3: Checkpoint sem commit**

Run:

```bash
git diff -- docker-compose.dev.yml
```

Expected: diff mostra compose com serviços `backend` e `db`, volume `postgres_data` e healthcheck.

Não executar `git commit` nesta etapa, a menos que o usuário peça explicitamente.

---

### Task 6: Validar Ambiente Dockerizado

**Files:**
- No new files
- Runtime verification only

- [ ] **Step 1: Subir serviços em segundo plano**

Run:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Expected: serviços `backend` e `db` sobem sem erro.

- [ ] **Step 2: Verificar status dos containers**

Run:

```bash
docker compose -f docker-compose.dev.yml ps
```

Expected: `db` healthy e `backend` running.

- [ ] **Step 3: Rodar check Django dentro do container**

Run:

```bash
docker compose -f docker-compose.dev.yml exec backend python manage.py check
```

Expected: saída contém `System check identified no issues`.

- [ ] **Step 4: Rodar teste do healthcheck dentro do container**

Run:

```bash
docker compose -f docker-compose.dev.yml exec backend python manage.py test pcp_project
```

Expected: teste `HealthcheckTests.test_healthcheck_returns_ok` passa.

- [ ] **Step 5: Aplicar migrations padrão do Django**

Run:

```bash
docker compose -f docker-compose.dev.yml exec backend python manage.py migrate
```

Expected: migrations padrão de `admin`, `auth`, `contenttypes` e `sessions` aplicam sem erro. Não deve haver migrations PCP.

- [ ] **Step 6: Validar healthcheck via HTTP**

Run:

```bash
curl -sS http://localhost:8000/health/
```

Expected:

```json
{"status":"ok"}
```

- [ ] **Step 7: Validar diff sem espaços problemáticos**

Run:

```bash
git diff --check -- backend docker-compose.dev.yml docs/migracao_django/TASKS.md docs/migracao_django/BACKLOG.md
```

Expected: sem saída.

- [ ] **Step 8: Desligar containers após validação**

Run:

```bash
docker compose -f docker-compose.dev.yml down
```

Expected: containers removidos. O volume `postgres_data` permanece, porque `down -v` não deve ser usado sem aprovação explícita.

---

### Task 7: Registrar Evidências e Fechar MDJ-4

**Files:**
- Modify: `docs/migracao_django/TASKS.md`
- Modify: `docs/migracao_django/BACKLOG.md`

- [ ] **Step 1: Marcar HUs da MDJ-4 como concluídas com evidências**

Em `docs/migracao_django/TASKS.md`, trocar o status da sprint para:

```markdown
**Status:** ✅ Concluida
```

Marcar HUs `MDJ-4.1` a `MDJ-4.5` como `[x]` e adicionar evidências reais abaixo de cada HU. Usar o modelo abaixo, substituindo somente tempos/saídas se a execução real indicar valores diferentes:

```markdown
  **Evidência:** `docs/migracao_django/TASKS.md` e `docs/migracao_django/BACKLOG.md` registraram a abertura oficial da MDJ-4, com escopo mínimo dockerizado e exclusão explícita de models de domínio, Supabase, restore e integração com Next.js.
```

```markdown
  **Evidência:** criado `backend/` com projeto Django mínimo `pcp_project`, settings modulares em `pcp_project/config/`, rota `/health/` e teste `HealthcheckTests`. Validação dentro do container com `python manage.py check` passou sem issues.
```

```markdown
  **Evidência:** criado `backend/Dockerfile` multi-stage com targets `development` e `production`; `docker compose -f docker-compose.dev.yml build backend` concluiu sem erro.
```

```markdown
  **Evidência:** criado `docker-compose.dev.yml` com serviços `backend` e `db`, PostgreSQL 16 em volume `postgres_data`, healthcheck com `pg_isready` e backend exposto em `localhost:8000`; `docker compose -f docker-compose.dev.yml up -d` subiu os serviços e `/health/` respondeu `{"status":"ok"}`.
```

```markdown
  **Evidência:** validações finais passaram: `python manage.py check`, `python manage.py test pcp_project`, `python manage.py migrate` com migrations padrão do Django, `curl -sS http://localhost:8000/health/` retornando `{"status":"ok"}` e `git diff --check` sem saída. Nenhum arquivo do frontend, Server Actions, queries Supabase, scripts SQL ou dados remotos foi alterado.
```

- [ ] **Step 2: Atualizar o status da MDJ-4 no backlog**

Em `docs/migracao_django/BACKLOG.md`, trocar a linha da `MDJ-4` para:

```markdown
| MDJ-4 | Ambiente local Django + PostgreSQL | ✅ Concluida | Criar backend paralelo local sem integrar ao frontend atual |
```

- [ ] **Step 3: Rodar validação documental final**

Run:

```bash
git diff --check -- docs/migracao_django/TASKS.md docs/migracao_django/BACKLOG.md
```

Expected: sem saída.

- [ ] **Step 4: Verificar arquivos alterados**

Run:

```bash
git diff --name-only -- backend docker-compose.dev.yml docs/migracao_django/TASKS.md docs/migracao_django/BACKLOG.md
```

Expected: lista inclui apenas arquivos da `MDJ-4` e documentação da frente Django.

- [ ] **Step 5: Checkpoint final sem commit**

Run:

```bash
git diff --stat -- backend docker-compose.dev.yml docs/migracao_django/TASKS.md docs/migracao_django/BACKLOG.md
```

Expected: resumo mostra scaffold Django, compose e documentação da `MDJ-4`.

Não executar `git commit` nesta etapa, a menos que o usuário peça explicitamente.

---

## Self-Review

Spec coverage:
- Abertura oficial da `MDJ-4`: Task 1.
- `backend/` com Django mínimo: Task 2.
- Healthcheck testável: Task 3.
- Dockerfile multi-stage: Task 4.
- Compose com PostgreSQL da aplicação: Task 5.
- Evidências técnicas: Task 6.
- Fechamento documental com evidências: Task 7.

Scope boundaries:
- Nenhum app de domínio é criado.
- Nenhum model PCP é criado.
- Nenhuma integração com Next.js é feita.
- Nenhuma operação Supabase é executada.
- O container de restore Supabase não é recriado nesta sprint.

Verification commands:
- `docker compose -f docker-compose.dev.yml build backend`
- `docker compose -f docker-compose.dev.yml up -d`
- `docker compose -f docker-compose.dev.yml ps`
- `docker compose -f docker-compose.dev.yml exec backend python manage.py check`
- `docker compose -f docker-compose.dev.yml exec backend python manage.py test pcp_project`
- `docker compose -f docker-compose.dev.yml exec backend python manage.py migrate`
- `curl -sS http://localhost:8000/health/`
- `git diff --check -- backend docker-compose.dev.yml docs/migracao_django/TASKS.md docs/migracao_django/BACKLOG.md`

No commit policy:
- Este plano não inclui commits automáticos porque commits só devem ocorrer mediante pedido explícito do usuário neste repositório.
