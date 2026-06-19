# MDJ-17 — Validacao Stack Docker Dev Integrada

**Data:** 2026-06-17  
**Sprint:** MDJ-17 — Stack Docker dev integrada  
**Status:** ✅ Concluida

---

## Ambiente dev integrado

| Componente | Servico Compose | URL no browser (host) |
|---|---|---|
| PostgreSQL | `db` | _(interno — porta nao publicada)_ |
| Backend Django | `backend` | `http://localhost:8001` |
| Frontend Next.js | `frontend` | `http://localhost:3000` |
| Health check Django | — | `GET http://localhost:8001/health/` → 200 |

### Comando unico para subir os tres servicos

```bash
docker compose -f docker/compose/dev.full.yml up --build
```

Alternativa via npm:

```bash
npm run dev:docker
```

Wrapper na raiz (equivalente):

```bash
docker compose -f docker-compose.dev.full.yml up --build
```

Para rodar em background:

```bash
docker compose -f docker/compose/dev.full.yml up -d --build
```

---

## URL da API Django no browser — importante

O Next.js roda **dentro** do container, mas o JavaScript executa no **browser do host**. Por isso:

| Variavel | Valor correto | Valor incorreto |
|---|---|---|
| `NEXT_PUBLIC_DJANGO_API_URL` | `http://localhost:8001` | `http://backend:8000` |
| `DJANGO_API_URL` (server-side only) | _(nao definir no host)_ | `http://backend:8000` no compose |

`NEXT_PUBLIC_*` e resolvida no browser. Nomes de servico Docker (`backend`, `db`) so existem na rede interna dos containers — use `DJANGO_API_URL` para Server Actions/SSR dentro do container frontend.

O compose define `NEXT_PUBLIC_DJANGO_API_URL=http://localhost:8001` no servico `frontend`. Variaveis Supabase e flags MDJ-16 vêm de `.env.local` (nao commitado).

---

## Perfil de flags MDJ-16 no compose integrado

Funciona **igual** ao dev host descrito em `MDJ16_VALIDACAO_CUTOVER.md`. Copie o perfil de homologacao para `.env.local` na raiz do repo:

```bash
NEXT_PUBLIC_DJANGO_API_URL=http://localhost:8001

NEXT_PUBLIC_USE_DJANGO_AUTH=true
NEXT_PUBLIC_USE_DJANGO_SCANNER_READS=true
NEXT_PUBLIC_USE_DJANGO_CADASTROS_READS=true
NEXT_PUBLIC_USE_DJANGO_METAS_READS=true
NEXT_PUBLIC_USE_DJANGO_DASHBOARD_READS=true
NEXT_PUBLIC_USE_DJANGO_ADMIN_WRITES=true
NEXT_PUBLIC_USE_DJANGO_PRODUCAO_WRITES=true
NEXT_PUBLIC_USE_DJANGO_QUALIDADE_WRITES=true

# Manter variaveis Supabase para fallback quando flags OFF
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Reinicie o servico `frontend` apos alterar `.env.local`:

```bash
docker compose -f docker/compose/dev.full.yml restart frontend
```

Referencia completa: [`MDJ16_VALIDACAO_CUTOVER.md`](./MDJ16_VALIDACAO_CUTOVER.md).

---

## Arquivos entregues

| Arquivo | Funcao |
|---|---|
| `docker/compose/dev.base.yml` | Fonte unica: `db` + `backend` |
| `docker/compose/dev.frontend.yml` | Servico `frontend` (overlay) |
| `docker/compose/dev.full.yml` | Stack integrada via `include` |
| `docker/frontend/Dockerfile.dev` | Imagem Node 20 + `npm ci` |
| `docker-compose.dev.yml` | Wrapper compatibilidade → `dev.base.yml` |
| `docker-compose.dev.full.yml` | Wrapper compatibilidade → `dev.full.yml` |
| `docker/README.md` | Cheat sheet de comandos |
| `.dockerignore` | Exclui `node_modules`, `.next`, backend cache, secrets |
| `package.json` | Scripts `dev:docker`, `dev:docker:backend` |

Refatoracao MDJ-17 (2026-06-17): eliminada duplicacao backend/db — ver `MDJ17_DOCKER_AUDIT.md`.

---

## Hot-reload

- **Backend:** volume `./backend:/app` (mesmo padrao do compose dev parcial).
- **Frontend:** volume `.:/app` na raiz do repo + volume anonimo `/app/node_modules` para evitar conflito host/container.
- **Polling:** `WATCHPACK_POLLING=true` habilitado para file watch confiavel no Docker/Linux.

---

## Variaveis de ambiente e `.env.local`

O servico `frontend` usa:

```yaml
env_file:
  - path: .env.local
    required: false
```

- Se `.env.local` **existir**, Supabase e flags MDJ-16 sao carregadas automaticamente.
- Se **nao existir**, o frontend sobe com defaults do compose (`NEXT_PUBLIC_DJANGO_API_URL` apenas). Paginas que exigem Supabase podem falhar ate criar o arquivo a partir de `.env.example`.
- **Nunca** commitar `.env.local`.

---

## Passos de verificacao manual

1. Subir stack: `docker compose -f docker/compose/dev.full.yml up -d --build`
2. Aguardar backend healthy (~10–30 s na primeira subida).
3. `curl -sf http://localhost:8001/health/` → JSON 200
4. `curl -sf -o /dev/null -w "%{http_code}" http://localhost:3000/` → `200` ou `307` (redirect login)
5. Abrir `http://localhost:3000` no browser e validar login/dashboard com flags desejadas.

---

## Comandos de validacao automatizada

Executados em **2026-06-17** no host (`/home/jrmelo/Projetos/Producao`):

```bash
docker compose -f docker-compose.dev.yml config
docker compose -f docker/compose/dev.full.yml config
docker compose -f docker/compose/dev.full.yml build frontend
docker compose -f docker/compose/dev.full.yml up -d
curl -sf http://localhost:8001/health/
curl -sf -o /dev/null -w "%{http_code}" http://localhost:3000/
git diff --check
```

Resultados registrados na secao abaixo apos execucao.

### Resultados (2026-06-17)

| Comando | Resultado |
|---|---|
| `docker compose -f docker-compose.dev.full.yml config` | ✅ Exit 0 — 3 servicos (`db`, `backend`, `frontend`) |
| `docker compose -f docker-compose.dev.full.yml build frontend` | ✅ Exit 0 — `npm ci` (439 pacotes), imagem `producao-frontend` |
| `docker compose -f docker-compose.dev.full.yml up -d` | ✅ Exit 0 — `db` healthy, `backend` e `frontend` running |
| `curl -sf http://localhost:8001/health/` | ✅ `{"status": "ok", "database": "ok"}` |
| `curl -sf -o /dev/null -w "%{http_code}" http://localhost:3000/` | ✅ `307` (redirect esperado para login) |
| `git diff --check` | ✅ Sem erros de whitespace |

**Nota:** `.env.local` presente no host — Supabase vars carregadas via `env_file` com `required: false`. Sem o arquivo, o frontend ainda sobe com `NEXT_PUBLIC_DJANGO_API_URL` do compose.

---

## Validacao pos-refatoracao (2026-06-17)

Refatoracao modular Docker (`include`, `docker/compose/*`) — ver `MDJ17_DOCKER_AUDIT.md`.

| Comando | Resultado |
|---|---|
| `docker compose -f docker-compose.dev.yml config` | ✅ project `producao`, 2 servicos |
| `docker compose -f docker/compose/dev.full.yml config` | ✅ project `producao`, 3 servicos |
| `docker compose -f docker/compose/dev.full.yml build frontend` | ✅ Exit 0 |
| `docker compose -f docker-compose.dev.yml up -d --build` | ✅ backend healthy |
| `curl -sf http://localhost:8001/health/` | ✅ `{"status": "ok", "database": "ok"}` |
| `git diff --check` | ✅ OK |

---

## Validacao E2E runtime (2026-06-17 17:42 BRT)

Auditoria anterior validou apenas `config`/`build`. Esta secao registra **stack recriada do zero** e testada no host.

### Procedimento

```bash
docker compose -f docker/compose/dev.full.yml down
docker compose -f docker-compose.dev.yml down
docker compose -f docker/compose/dev.full.yml up -d --build
```

### Containers UP apos subida (projeto `producao`)

| Container | Imagem | Portas | Status |
|---|---|---|---|
| `producao-db-1` | `postgres:16-alpine` | interno 5432 | healthy |
| `producao-backend-1` | `producao-backend` | `8001→8000` | running |
| `producao-frontend-1` | `producao-frontend` | `3000→3000` | running |

**Orfao no mesmo network (outro compose):** `pcp-postgres-restore` na porta `5433` — restore Supabase, nao faz parte da stack dev integrada.

### Testes HTTP

| Teste | Resultado |
|---|---|
| `GET http://localhost:8001/health/` | ✅ `{"status": "ok", "database": "ok"}` |
| `GET http://localhost:3000/` | ✅ HTTP 307 → `/login` |
| `GET http://localhost:3000/login` | ✅ HTTP 200 |
| `GET http://localhost:8001/api/v1/cadastros/setores/` (sem auth) | ✅ HTTP 401 JSON (`Authentication credentials were not provided.`) — API viva |

### Logs relevantes

- **Backend:** Django 5.2.15, `pcp_project.config.local`, StatReloader OK, zero issues no system check.
- **Frontend:** Next.js 16.2.1 (Turbopack), `.env.local` carregado, Ready em ~462ms.

---

## Limitacoes conhecidas

| Limitacao | Mitigacao |
|---|---|
| Primeiro `npm ci` no build do frontend e lento | Cache de layers Docker; rebuilds subsequentes mais rapidos |
| `.env.local` ausente | Criar a partir de `.env.example`; Supabase obrigatorio para fallback OFF |
| `NEXT_PUBLIC_*` exige restart do frontend apos mudanca | `docker compose ... restart frontend` |
| Compose parcial (`docker-compose.dev.yml`) ainda valido | Wrapper inclui `dev.base.yml` — backend+db apenas |

---

## Proximo marco

**MDJ-21** — Deploy VPS producao (`MDJ21_RUNBOOK_DEPLOY_VPS.md`, dominio unico, smoke staging).
