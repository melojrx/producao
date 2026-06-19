# Docker — guia rapido

Estrutura modular para evitar duplicacao entre compose dev, compose prod e stacks integradas.

**Migracao Django:** visao geral em `docs/migracao_django/ESTADO_ATUAL.md`. Deploy VPS: `docs/migracao_django/MDJ21_RUNBOOK_DEPLOY_VPS.md`.

## Arquivos canonicos

| Arquivo | Servicos | Quando usar |
|---|---|---|
| `docker/compose/dev.base.yml` | `db`, `backend` | So Django + PostgreSQL (MDJ-4, testes backend) |
| `docker/compose/dev.frontend.yml` | `frontend` | Overlay dev — via `dev.full.yml` |
| `docker/compose/dev.full.yml` | `db`, `backend`, `frontend` | Stack dev integrada MDJ-17 |
| `docker/frontend/Dockerfile.dev` | — | Imagem Next.js dev (hot-reload) |
| `docker/compose/prod.base.yml` | `db`, `backend` | Backend Gunicorn + PostgreSQL (MDJ-18) |
| `docker/compose/prod.frontend.yml` | `frontend` | Next.js standalone producao |
| `docker/compose/prod.proxy.yml` | `proxy` | Nginx — dominio unico |
| `docker/compose/prod.full.yml` | todos | Stack prod integrada MDJ-18 |
| `docker/frontend/Dockerfile.prod` | — | Build standalone (`output: 'standalone'`) |
| `docker/nginx/prod.conf` | — | Roteamento `/api/v1/` → backend, resto → frontend |

## Wrappers na raiz (compatibilidade)

| Wrapper | Inclui |
|---|---|
| `docker-compose.dev.yml` | `docker/compose/dev.base.yml` |
| `docker-compose.dev.full.yml` | `docker/compose/dev.full.yml` |
| `docker-compose.prod.yml` | `docker/compose/prod.full.yml` |

## Comandos do dia a dia

```bash
# Dev — stack completa
npm run dev:docker

# Dev — so backend + db
npm run dev:docker:backend

# Prod — homologacao local (porta 8080, requer .env com secrets)
npm run prod:docker
npm run prod:docker:config
node scripts/smoke-stack-prod.mjs

# Health
curl -sf http://localhost:8001/health/    # dev
curl -sf http://localhost:8080/health/    # prod local via proxy
```

## Variaveis de ambiente

- **Dev:** backend no compose; frontend via `.env.local` + `NEXT_PUBLIC_DJANGO_API_URL=http://localhost:8001`.
- **Prod:** `.env` na raiz (secrets + `NEXT_PUBLIC_*` para build do frontend). Ver `.env.example` e `MDJ18_VALIDACAO_PRODUCAO.md`.

## Nomes de projeto Compose

| Projeto | `name` no wrapper raiz | Volumes |
|---|---|---|
| Dev | `producao` (`dev.base.yml`) | `postgres_data`, `media_data` |
| Prod | `producao-prod` (`docker-compose.prod.yml`) | volumes isolados do dev |

## Hot-reload (somente dev)

- Backend: bind mount `backend/` → `/app`
- Frontend: bind mount repo + volume `node_modules`
- Producao: **sem** bind mounts — imagens imutaveis
