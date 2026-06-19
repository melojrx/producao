# MDJ-18 — Validacao stack producao Docker (pre-deploy)

**Data:** 2026-06-17  
**Sprint:** MDJ-18 — VPS, dominio e producao  
**Status:** Artefatos prontos — **deploy VPS pendente (MDJ-21)**

> Indice geral: `ESTADO_ATUAL.md` | Runbook deploy: `MDJ21_RUNBOOK_DEPLOY_VPS.md`

---

## Escopo entregue

| Artefato | Caminho |
|---|---|
| Compose modular producao | `docker/compose/prod.base.yml`, `prod.frontend.yml`, `prod.proxy.yml`, `prod.full.yml` |
| Wrapper raiz | `docker-compose.prod.yml` |
| Frontend producao (standalone) | `docker/frontend/Dockerfile.prod` |
| Proxy dominio unico | `docker/nginx/prod.conf` |
| Static Django Admin | `STATIC_ROOT` + WhiteNoise + `collectstatic` no entrypoint |
| Entrypoint backend | `backend/docker-entrypoint.prod.sh` |
| Smoke homologacao local | `scripts/smoke-stack-prod.mjs` |

**Dominio alvo (VPS):** `https://producao.costurai.com.br` — DNS A já configurado na Hostinger → `38.52.128.62`.

**Ambientes:**

| Ambiente | URL | Como subir |
|---|---|---|
| Dev | `localhost:3000` + `localhost:8001` | `npm run dev:docker` |
| Prod (homologacao local) | `http://localhost:8080` | `npm run prod:docker` |
| Prod (VPS) | `https://producao.costurai.com.br` | Mesmo compose; `PROD_HTTP_PORT=80` + TLS |

---

## Arquitetura producao

```text
producao.costurai.com.br (nginx proxy :80/:443)
├── /api/v1/*  → backend:8000 (Gunicorn)
├── /health/   → backend
├── /media/    → backend
├── /static/   → backend (WhiteNoise)
└── /*         → frontend:3000 (Next.js standalone)
```

Servicos internos (`backend`, `frontend`, `db`) **nao** publicados na internet. Backend opcional em `127.0.0.1:8002` para debug local.

Volumes isolados do dev: projeto Compose `producao-prod` (`postgres_data`, `media_data`).

---

## Homologacao local (sem deploy)

### 1. Preparar `.env`

```bash
cp .env.example .env
# Editar: DJANGO_SECRET_KEY, POSTGRES_PASSWORD
# Opcional: copiar NEXT_PUBLIC_SUPABASE_* de .env.local para build do frontend
```

### 2. Validar sintaxe

```bash
npm run prod:docker:config
```

### 3. Build e subir

```bash
npm run prod:docker
```

**Importante:** variáveis `NEXT_PUBLIC_*` entram no **build** (args) e no **runtime** do container frontend (server/proxy). Alterou flag ou URL → `docker compose -f docker-compose.prod.yml build frontend && docker compose -f docker-compose.prod.yml up -d frontend`.

### 4. Smoke

```bash
curl -s http://localhost:8080/health/ | jq .
node scripts/smoke-stack-prod.mjs
```

Resposta esperada do health: `{"status":"ok","database":"ok"}`.

### 5. Parar (sem afetar dev)

```bash
docker compose -f docker-compose.prod.yml down
```

---

## Variaveis VPS (checklist pre-deploy)

Quando for deploy real em `38.52.128.62`:

```bash
ALLOWED_HOSTS=producao.costurai.com.br,localhost,127.0.0.1,backend
NEXT_PUBLIC_DJANGO_API_URL=https://producao.costurai.com.br
MEDIA_BASE_URL=https://producao.costurai.com.br
CORS_ALLOWED_ORIGINS=https://producao.costurai.com.br
CSRF_TRUSTED_ORIGINS=https://producao.costurai.com.br
PROD_HTTP_PORT=80

SECURE_SSL_REDIRECT=true
SESSION_COOKIE_SECURE=true
CSRF_COOKIE_SECURE=true
SECURE_HSTS_SECONDS=31536000
```

**Rebuild obrigatorio** do frontend apos alterar `NEXT_PUBLIC_*` (valores embutidos no build).

TLS: terminar HTTPS no proxy (certbot/Let's Encrypt ou painel da VPS) com `X-Forwarded-Proto: https`.

---

## Checklist pre-deploy (HU 18.1)

- [x] Dominio definido: `producao.costurai.com.br`
- [x] DNS A na Hostinger → VPS
- [x] Compose prod: backend + frontend + db + nginx
- [x] Sem `npm run build` no host — build dentro do Docker
- [ ] Secrets reais na VPS (`.env` nao commitado)
- [x] Smoke local OK (`smoke-stack-prod.mjs` — 5/5 em 2026-06-19)
- [ ] Deploy VPS executado (`MDJ21_RUNBOOK_DEPLOY_VPS.md`)
- [ ] Flags Django OFF na primeira subida em producao
- [ ] Firewall VPS: apenas 22, 80, 443

---

## Comandos de regressao (dev intocado)

```bash
docker compose -f docker-compose.dev.yml config
docker compose -f docker/compose/dev.full.yml config
docker compose -f docker-compose.dev.yml exec -T backend python manage.py test --keepdb
npx tsc --noEmit
git diff --check
```

---

## Fora de escopo desta entrega

- Deploy efetivo na VPS → **MDJ-21** (`MDJ21_RUNBOOK_DEPLOY_VPS.md`)
- Importacao de dados → **MDJ-20**
- Certificado TLS na VPS (documentado no runbook MDJ-21)
- S3 / `USE_S3_STORAGE`
- Cutover flags Django em producao
- MDJ-19 (limpeza Supabase browser)

---

## Referencias

- `ESTADO_ATUAL.md` — visao geral da migracao
- `MDJ21_RUNBOOK_DEPLOY_VPS.md` — deploy na VPS
- `docker/README.md` — comandos dev e prod
- `.env.example` — variaveis producao
- `MDJ15_VALIDACAO_INFRA.md` — backups e decisoes de infra
