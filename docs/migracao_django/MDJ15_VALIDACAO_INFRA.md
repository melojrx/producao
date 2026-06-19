# MDJ15_VALIDACAO_INFRA.md — Sprint MDJ-15

> Validacao de infraestrutura VPS/EasyPanel, observabilidade e deploy operacional do backend Django.
> Data: 2026-06-15

**Status operacional (2026-06-17):** artefatos **ativos** para homologacao local e deploy VPS (MDJ-18/21). Stack prod: backend + frontend + db + nginx via `docker-compose.prod.yml`. S3 fora de escopo.

---

## Escopo implementado

- `docker-compose.prod.yml` com backend (Gunicorn) + PostgreSQL 16 + volumes persistentes
- `production.py` endurecido: seguranca basica, logging estruturado, media via env, S3 opcional
- Healthcheck robusto em `GET /health/` com verificacao de banco
- Scripts operacionais de backup/restore PostgreSQL e backup de media
- `.env.example` com variaveis de producao documentadas

---

## Arquivos principais

| Artefato | Caminho |
|---|---|
| Compose producao | `docker-compose.prod.yml` |
| Settings producao | `backend/pcp_project/config/production.py` |
| Env exemplo | `.env.example` |
| Backup PostgreSQL | `scripts/infra/backup_postgres.sh` |
| Restore PostgreSQL | `scripts/infra/restore_postgres.sh` |
| Backup media | `scripts/infra/backup_media.sh` |

---

## Decisoes

| Decisao | Motivo |
|---|---|
| Compose prod modular MDJ-18 | `docker/compose/prod.*` + nginx dominio unico |
| Frontend no compose prod | Next.js standalone — nao depende mais do Vercel para producao |
| Sem servico restore no compose prod | Restore Supabase isolado; import MDJ-20 usa snapshot congelado |
| S3 via flag `USE_S3_STORAGE` | Permite volume local na VPS ou bucket S3/CDN sem alterar services de dominio |
| `SECURE_*` desligados por padrao | EasyPanel/nginx terminam TLS; flags ligadas via env quando HTTPS estiver ativo |
| Secrets obrigatorios no compose | `DJANGO_SECRET_KEY` e `POSTGRES_PASSWORD` devem existir antes de gerar config/subir stack |
| Porta local `8002` | Homologacao local do compose prod sem conflitar com dev (`8001`) |

---

## Subir stack de producao (homologacao local)

```bash
cp .env.example .env
# Editar .env: DJANGO_SECRET_KEY, POSTGRES_PASSWORD, ALLOWED_HOSTS

docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec -T backend python manage.py migrate
docker compose -f docker-compose.prod.yml ps
curl -s http://localhost:8002/health/ | jq .
```

Resposta esperada:

```json
{"status": "ok", "database": "ok"}
```

---

## Rotina de backup operacional (VPS)

Os scripts em `scripts/infra/` carregam automaticamente variaveis do `.env` na raiz do repositorio quando o arquivo existir (`POSTGRES_DB`, `POSTGRES_USER`, etc.). Sem `.env`, os defaults do compose (`pcp_db` / `pcp_user`) continuam valendo.

```bash
# PostgreSQL (pg_dump custom)
./scripts/infra/backup_postgres.sh

# Media (tar do volume)
./scripts/infra/backup_media.sh

# Restore PostgreSQL (destructivo — backup antes)
# 1. Parar backend para evitar conexoes ativas durante o restore
docker compose -f docker-compose.prod.yml stop backend

# 2. Confirmar restore (digitar 'yes' quando solicitado)
./scripts/infra/restore_postgres.sh backups/postgres/pcp_db_YYYYMMDD_HHMMSS.dump

# 3. Subir backend e validar
docker compose -f docker-compose.prod.yml start backend
docker compose -f docker-compose.prod.yml exec -T backend python manage.py check
```

**Seguranca do restore:** `restore_postgres.sh` exige confirmacao explicita (`yes`) antes de executar `pg_restore --clean --if-exists`. Se o backend estiver em execucao, o script aborta — use `--force` apenas em emergencia. Para CI/automacao, `--yes` pula a confirmacao interativa.

Smoke test (carregamento de `.env`, sem Docker):

```bash
./scripts/infra/test_backup_env.sh
```

Agendar via cron no host ou job EasyPanel. Retencao recomendada: 7 dias local + copia off-site.

Complemento: backup Supabase de homologacao permanece em `PLANO_BACKUP_RESTORE.md` (MDJ-2).

---

## Storage em producao

| Modo | Configuracao |
|---|---|
| Volume local (padrao) | `USE_S3_STORAGE=false`, volume `media_data:/app/media`, servir `/media/` via nginx/EasyPanel |
| S3 compativel | `USE_S3_STORAGE=true` + credenciais AWS/S3; opcional `AWS_S3_CUSTOM_DOMAIN` para CDN |

---

## Comandos de homologacao (dev stack — regressao)

```bash
docker compose -f docker-compose.dev.yml exec -T backend python manage.py check
docker compose -f docker-compose.dev.yml exec -T backend python manage.py makemigrations --check --dry-run
docker compose -f docker-compose.dev.yml exec -T backend python manage.py test --keepdb
git diff --check
```

Build production:

```bash
DJANGO_SECRET_KEY=test-secret POSTGRES_PASSWORD=test-password docker compose -f docker-compose.prod.yml build backend
```

---

## Resultado em 2026-06-15

| Verificacao | Resultado |
|---|---|
| `manage.py check` | OK |
| `makemigrations --check --dry-run` | No changes detected |
| Suite completa | 97 testes OK |
| `GET /health/` | HTTP 200, `database: ok` |
| Build target `production` | OK |
| `git diff --check` | OK |

---

## HU 15.8 — Homologacao complementar

Ajuste realizado em `2026-06-15` para fechar dois riscos antes da MDJ-16:

- URL absoluta retornada por storage externo/S3 e preservada sem prefixo de `MEDIA_BASE_URL`
- `docker-compose.prod.yml` falha cedo se `DJANGO_SECRET_KEY` ou `POSTGRES_PASSWORD` nao forem definidos

Validacoes especificas:

```bash
docker compose -f docker-compose.dev.yml exec -T backend python manage.py test infra.tests.test_arquivos.ConstruirUrlPublicaArquivoTests.test_preserva_url_absoluta_retornada_pelo_storage --keepdb
docker compose -f docker-compose.prod.yml config  # esperado: falha sem secrets obrigatorios
DJANGO_SECRET_KEY=test-secret POSTGRES_PASSWORD=test-password docker compose -f docker-compose.prod.yml config
```

Resultado:

- teste de URL absoluta passou apos RED confirmado
- compose sem secrets retorna erro de interpolacao obrigatoria
- compose com secrets definidos gera configuracao valida

---

## Fora de escopo (preservado)

- Frontend Next.js e Server Actions Supabase
- Supabase remoto e Auth remoto
- Cutover por modulo (MDJ-16)
- Migracao em massa de arquivos Supabase Storage para volume/S3

---

## Proximo passo

MDJ-16 — Cutover controlado por modulo: trocar origem de dados do frontend por feature flag, com rollback operacional.

---

## CORS e origens confiaveis (MDJ-16 / HU 16.3)

O frontend Next.js (Vercel) consome a API Django via JWT no header `Authorization`. Em producao, `production.py` ativa `django-cors-headers` **somente** quando `CORS_ALLOWED_ORIGINS` ou `CORS_ALLOWED_ORIGIN_REGEXES` estiverem definidos e nao vazios.

| Variavel | Uso |
|---|---|
| `CORS_ALLOWED_ORIGINS` | Lista separada por virgula de origens exatas (`https://app.seudominio.com.br`) |
| `CORS_ALLOWED_ORIGIN_REGEXES` | Regex para previews Vercel, ex.: `^https://.*\.vercel\.app$` |
| `CSRF_TRUSTED_ORIGINS` | Origens confiaveis para CSRF (Admin Django, forms com cookie) |

Notas:

- `django-cors-headers` **nao** aceita wildcard `*.vercel.app` em `CORS_ALLOWED_ORIGINS` — use origens explicitas ou regex.
- `CORS_ALLOW_CREDENTIALS=false` (padrao em producao): API JWT nao depende de cookies cross-origin.
- Dev (`local.py`) permanece sem CORS; habilitar apenas se testar frontend local contra backend Docker.

Testes: `pcp_project.tests.test_cors_production` (preflight OPTIONS permitido vs origem rejeitada).
