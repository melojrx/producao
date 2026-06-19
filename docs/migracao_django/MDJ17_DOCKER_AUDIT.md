# MDJ-17 — Auditoria e refatoracao Docker

**Data:** 2026-06-17  
**Escopo:** Organizar infra Docker dev sem duplicacao; preservar compatibilidade com docs MDJ existentes.

---

## Resumo executivo

Antes da refatoracao, `docker-compose.dev.full.yml` **copiava integralmente** os blocos `backend` e `db` de `docker-compose.dev.yml` (39 linhas duplicadas) e adicionava apenas o servico `frontend`. Isso violava a pratica Compose de modularizar com `include` ou merge multi-arquivo.

A refatoracao extraiu a stack base para `docker/compose/dev.base.yml`, isolou o frontend em `docker/compose/dev.frontend.yml` e compôs a stack integrada via `include` em `docker/compose/dev.full.yml`. Wrappers na raiz mantêm os 50+ comandos documentados em MDJ-4…MDJ-16 funcionando.

---

## Estado anterior (before)

```
/
├── docker-compose.dev.yml          # backend + db (MDJ-4)
├── docker-compose.dev.full.yml     # DUPLICA backend+db + frontend (MDJ-17)
├── docker-compose.prod.yml         # producao MDJ-15/18
├── docker-compose.restore.yml      # restore Supabase isolado
├── Dockerfile.frontend.dev         # frontend dev na raiz
├── .dockerignore                   # contexto build frontend (raiz)
└── backend/
    ├── Dockerfile                  # multi-stage dev+prod
    └── .dockerignore
```

### O que era duplicado vs legitimo

| Item | Veredito |
|---|---|
| `backend` + `db` em `dev.full.yml` | **Duplicacao** — copy-paste de `dev.yml` |
| `docker-compose.prod.yml` | **Legitimo** — ambiente producao distinto (Gunicorn, secrets, healthcheck) |
| `docker-compose.restore.yml` | **Legitimo** — caso de uso especializado (porta 5433, volume separado) |
| `backend/Dockerfile` (targets dev/prod) | **Legitimo** — multi-stage e padrao recomendado |
| Dois `.dockerignore` (raiz + backend) | **Legitimo** — contextos de build diferentes |
| `Dockerfile.frontend.dev` na raiz | **Desorganizado** — fora de namespace `docker/` |

### Gaps vs best practices (antes)

1. **Servicos duplicados** entre compose parcial e full — risco de drift ao alterar portas/volumes/env.
2. **Sem modularizacao** — nenhum uso de `include` ou overlays.
3. **Dockerfile frontend solto na raiz** — mistura infra com codigo da aplicacao.
4. **Sem README operacional** — desenvolvedor precisava ler MDJ17_VALIDACAO para saber qual arquivo usar.
5. **`package.json`** apontava apenas para wrapper full, sem script canonico para backend-only.

---

## Estado alvo (after)

```
/
├── docker-compose.dev.yml              # wrapper → docker/compose/dev.base.yml
├── docker-compose.dev.full.yml         # wrapper → docker/compose/dev.full.yml
├── docker-compose.prod.yml             # inalterado
├── docker-compose.restore.yml          # inalterado
├── .dockerignore                       # inalterado (contexto frontend = raiz)
└── docker/
    ├── README.md                       # cheat sheet
    ├── compose/
    │   ├── dev.base.yml                # db + backend (fonte unica)
    │   ├── dev.frontend.yml            # so frontend
    │   └── dev.full.yml                # include base + frontend
    └── frontend/
        └── Dockerfile.dev              # movido de Dockerfile.frontend.dev
```

### Estrategia de merge escolhida

**Opcao A — `include`** (Compose 2.20+):

```yaml
# docker/compose/dev.full.yml
include:
  - path: dev.base.yml
  - path: dev.frontend.yml
```

Caminhos em arquivos incluidos resolvem **relativos ao diretorio do arquivo incluido** (`docker/compose/`), por isso volumes e build contexts usam `../../backend` e `../..` para a raiz do repo.

### Compatibilidade retroativa

| Referencia historica | Comportamento pos-refatoracao |
|---|---|
| `docker compose -f docker-compose.dev.yml ...` | Wrapper `include` → mesmo stack base |
| `docker compose -f docker-compose.dev.full.yml ...` | Wrapper `include` → stack integrada |
| Docs MDJ-4…16 com `docker-compose.dev.yml exec` | **Sem mudanca** de comando |

---

## Arquivos removidos

| Arquivo | Motivo |
|---|---|
| `Dockerfile.frontend.dev` (raiz) | Movido para `docker/frontend/Dockerfile.dev` |
| Blocos `backend`/`db` duplicados em `dev.full.yml` | Substituídos por `include` de `dev.base.yml` |

## Arquivos nao alterados (proposito)

- `docker-compose.prod.yml` — workflow MDJ-18
- `docker-compose.restore.yml` — restore Supabase MDJ-6
- `backend/Dockerfile` — multi-stage dev/prod
- `backend/.dockerignore`

---

## Comandos canonicos (pos-refatoracao)

```bash
# Stack integrada (recomendado MDJ-17)
npm run dev:docker
docker compose -f docker/compose/dev.full.yml up --build

# Backend + db apenas
npm run dev:docker:backend
docker compose -f docker-compose.dev.yml up --build

# Validacao
docker compose -f docker-compose.dev.yml config
docker compose -f docker/compose/dev.full.yml config
docker compose -f docker/compose/dev.full.yml build frontend
curl -sf http://localhost:8001/health/
```

---

## Referencias ainda apontando para caminhos antigos (nao atualizados)

Docs historicos de sprints MDJ-4…MDJ-16 continuam citando `docker-compose.dev.yml` — **intencional**, pois o wrapper na raiz preserva esses comandos. Nenhuma acao necessaria.

Referencias ao arquivo removido `Dockerfile.frontend.dev` foram atualizadas em:

- `docs/migracao_django/MDJ17_VALIDACAO_STACK_DEV.md`
- `docs/migracao_django/BACKLOG.md` (marco MDJ-17)
- `docs/migracao_django/TASKS.md` (nota HU 17.2/17.3)

Demais arquivos MDJ (MDJ-4…MDJ-16) nao foram reescritos — wrappers garantem paridade.

---

## Resultados de validacao

Executados em **2026-06-17** apos refatoracao modular:

| Comando | Resultado |
|---|---|
| `docker compose -f docker-compose.dev.yml config` | ✅ Exit 0 — project `producao`, servicos `db`, `backend` |
| `docker compose -f docker/compose/dev.full.yml config` | ✅ Exit 0 — project `producao`, servicos `db`, `backend`, `frontend` |
| `docker compose -f docker-compose.dev.full.yml config --services` | ✅ `db`, `backend`, `frontend` |
| `docker compose -f docker/compose/dev.full.yml build frontend` | ✅ Exit 0 — imagem `producao-frontend` |
| `docker compose -f docker-compose.dev.yml up -d --build` | ✅ Exit 0 — backend healthy |
| `curl -sf http://localhost:8001/health/` | ✅ `{"status": "ok", "database": "ok"}` |
| `git diff --check` | ✅ Sem erros de whitespace |

**Nota:** `name: producao` explicito em `dev.base.yml` e `dev.full.yml` garante volumes/containers consistentes entre wrapper raiz e caminho canonico `docker/compose/`.
