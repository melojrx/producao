# MDJ-4 Scaffold Django Dockerizado — Design

## Contexto

A frente `docs/migracao_django` já concluiu documentalmente:

- `MDJ-1`: inventário do sistema atual.
- `MDJ-2`: plano de backup/restore Supabase, com nota de que o restore ativo foi perdido.
- `MDJ-3`: arquitetura Django alvo.

A `MDJ-4` abre a primeira sprint de implementação da migração Django, mas continua sem alterar o sistema Next.js atual, sem tocar no Supabase remoto e sem importar dados reais.

## Objetivo

Criar um backend Django mínimo e dockerizado, paralelo ao frontend atual, validando que a aplicação Django e um PostgreSQL local da aplicação sobem de forma reproduzível via Docker.

## Escopo Aprovado

Escopo escolhido pelo usuário: **opção 1 — scaffold mínimo dockerizado**.

Inclui:

- criar `backend/`;
- criar projeto Django;
- configurar settings modulares;
- criar `Dockerfile` multi-stage do backend;
- criar `docker-compose.dev.yml` com backend e PostgreSQL local;
- criar rota simples de healthcheck;
- validar comandos básicos dentro do container;
- registrar HUs e evidências em `docs/migracao_django/TASKS.md`.

## Fora do Escopo

Esta sprint não deve implementar:

- models de domínio PCP;
- migrations de tabelas de produção;
- apps de domínio como `turnos`, `producao`, `qualidade`, `produtos`;
- importação de dados do Supabase;
- recriação do container de restore Supabase;
- integração com Next.js;
- autenticação real;
- endpoints DRF de domínio;
- Django Admin customizado;
- alteração de schema ou dados no Supabase remoto.

## Arquitetura

### Estrutura mínima

```text
backend/
├── manage.py
├── requirements.txt
├── Dockerfile
└── pcp_project/
    ├── __init__.py
    ├── asgi.py
    ├── urls.py
    ├── wsgi.py
    └── config/
        ├── __init__.py
        ├── base.py
        ├── local.py
        └── production.py
docker-compose.dev.yml
```

### Serviços Docker

`docker-compose.dev.yml` deve conter:

- `backend`: Django em modo desenvolvimento, porta `8000`;
- `db`: PostgreSQL 16, volume `postgres_data`, healthcheck com `pg_isready`.

O banco da aplicação Django é separado do banco de restore Supabase. O restore usa estratégia própria documentada em `docs/migracao_django/PLANO_BACKUP_RESTORE.md` e não faz parte do compose principal da `MDJ-4`.

## Settings Django

`base.py` deve concentrar configuração comum:

- `INSTALLED_APPS` padrão do Django;
- `MIDDLEWARE` padrão;
- templates;
- `ROOT_URLCONF`;
- `WSGI_APPLICATION`;
- `DEFAULT_AUTO_FIELD`;
- `LANGUAGE_CODE = "pt-br"`;
- `TIME_ZONE = "America/Sao_Paulo"`.

`local.py` deve ler variáveis do container:

- `POSTGRES_DB`;
- `POSTGRES_USER`;
- `POSTGRES_PASSWORD`;
- `POSTGRES_HOST`;
- `POSTGRES_PORT`.

`production.py` deve existir como módulo funcional mínimo, herdando de `base.py`, com `DEBUG = False` e leitura de `ALLOWED_HOSTS` por variável de ambiente. Configurações finais de produção, observabilidade e hardening ficam fora desta sprint.

## Healthcheck

Criar endpoint simples:

```text
GET /health/
```

Resposta esperada:

```json
{"status":"ok"}
```

Esse endpoint não acessa banco, não exige autenticação e serve apenas para provar que o backend Django está respondendo.

## Evidências de Aceite

A sprint só pode ser marcada como concluída se houver evidência registrada de:

- `docker compose -f docker-compose.dev.yml up` sobe `backend` e `db`;
- `GET http://localhost:8000/health/` responde `{"status":"ok"}`;
- `docker compose -f docker-compose.dev.yml exec backend python manage.py check` passa;
- `docker compose -f docker-compose.dev.yml exec backend python manage.py migrate` aplica somente migrations padrão do Django;
- `git diff --check` passa;
- `docs/migracao_django/TASKS.md` registra HUs concluídas com evidências.

## HUs Propostas para TASKS.md

### HU MDJ-4.1 — Abrir oficialmente a sprint de scaffold mínimo

Objetivo: registrar em `TASKS.md` que a `MDJ-4` foi aberta por confirmação explícita do usuário e que o escopo é infraestrutura mínima.

Evidência: `TASKS.md` contém a seção `SPRINT MDJ-4`, status em andamento, objetivo, fora do escopo e HUs.

### HU MDJ-4.2 — Criar projeto Django mínimo em `backend/`

Objetivo: criar `manage.py`, pacote `pcp_project`, settings modulares e rota `/health/`.

Evidência: `docker compose -f docker-compose.dev.yml exec backend python manage.py check` passa dentro do container.

### HU MDJ-4.3 — Dockerizar o backend Django

Objetivo: criar `backend/Dockerfile` multi-stage com alvo de desenvolvimento e produção.

Evidência: imagem do backend constrói sem erro.

### HU MDJ-4.4 — Criar compose de desenvolvimento com PostgreSQL da aplicação

Objetivo: criar `docker-compose.dev.yml` com `backend` e `db`, volume `postgres_data` e healthcheck.

Evidência: compose sobe os dois serviços e Django responde em `localhost:8000`.

### HU MDJ-4.5 — Validar ambiente e registrar evidências

Objetivo: rodar checks finais e registrar evidências no `TASKS.md`.

Evidência: healthcheck, `manage.py check`, migrations padrão, `git diff --check` e notas de que não houve alteração no Supabase nem importação de dados.

## Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| Misturar `MDJ-4` com modelagem de domínio | Manter apps de domínio e models fora do escopo. |
| Confundir banco Django com banco de restore | Usar apenas `postgres_data` no compose da aplicação e manter restore documentado separadamente. |
| Criar dependência prematura do frontend | Não alterar `app/`, `lib/actions/`, `lib/queries/` ou variáveis Next.js nesta sprint. |
| Configuração de produção incompleta parecer final | `production.py` fica mínimo e documentado como não final. |
| Migrations padrão criarem falsa sensação de schema PCP | Registrar que `migrate` aplica apenas tabelas padrão do Django. |

## Critério de Não Regressão

Nenhum arquivo do frontend atual, nenhuma Server Action, nenhuma query Supabase, nenhum script SQL e nenhum dado remoto deve ser alterado nesta sprint. Qualquer necessidade fora da infraestrutura mínima deve virar HU futura, preferencialmente `MDJ-5` ou posterior.

## Próximo Passo Após Aprovação da Spec

Após aprovação desta spec, criar plano de implementação detalhado e só então executar a `MDJ-4` passo a passo, coletando evidências em cada HU.
