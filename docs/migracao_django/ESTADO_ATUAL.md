# Estado atual da migracao Django (jun/2026)

> Ponto de entrada da documentacao de migracao. Atualizado em **2026-06-19**.
> Frente ativa: **MDJ-19 — Limpeza legado Supabase e preparacao desligamento**.

---

## Resumo executivo

| Item | Status |
|---|---|
| Backend Django + API REST | ✅ Homologado em dev (MDJ-4 a MDJ-14) |
| Cutover por flags no frontend | ✅ Dev local (MDJ-16) |
| Stack Docker dev integrada | ✅ MDJ-17 |
| Stack Docker prod (artefatos) | ✅ MDJ-18 — smoke local 5/5 |
| **Auditoria VPS** | ✅ `MDJ21_VPS_AUDITORIA.md` (multi-app, nginx host) |
| **Deploy VPS** | ✅ MDJ-21 (2026-06-19) |
| **Importacao dados** | ✅ MDJ-20 (snapshot 2026-05-31) |
| Cutover flags producao | ✅ 2026-06-19 — Django ON na VPS |
| Limpeza legado Supabase browser | 🧭 MDJ-19 (dev em paralelo OK) |

**Dominio producao:** `https://producao.costurai.com.br` — DNS A → VPS `38.52.128.62` (Hostinger).

**VPS (`srvjosemaria`):** nginx host em `:80`/`:443` + finanpy (`:8001`) + brabustore (`:3001`) + Hermes. PCP entra via **`127.0.0.1:8080`** + vhost novo — sem derrubar apps existentes.

**Premissa operacional:** backup Supabase **ja realizado**; desde entao **nenhum dado novo** entrou no sistema ate o cutover. A importacao MDJ-20 foi **one-shot** do snapshot, sem sync incremental. Supabase remoto permanece intacto ate checklist MDJ-19 HU 19.5 e aceite explicito.

---

## Ambientes

| Ambiente | URL | Como subir |
|---|---|---|
| Dev (host + backend Docker) | `localhost:3000` + `localhost:8001` | `npm run dev` + `docker compose -f docker-compose.dev.yml up` |
| Dev (stack integrada) | `localhost:3000` via compose | `npm run dev:docker` |
| Prod (homologacao local) | `http://localhost:8080` | `npm run prod:docker` |
| **Prod (VPS)** | `https://producao.costurai.com.br` | Auditoria + runbook `MDJ21_VPS_AUDITORIA.md`, `MDJ21_RUNBOOK_DEPLOY_VPS.md` |

Volumes Compose **isolados**: dev `producao` vs prod `producao-prod`.

---

## Roadmap pos-MDJ-18

```text
1. MDJ-21  Deploy VPS (stack inicial com flags OFF, TLS) ✅
2. MDJ-20  Snapshot congelado → Postgres prod + midia + paridade ✅
3. Cutover  Flags Django ON em producao (2026-06-19) ✅
4. MDJ-19  Limpeza legado Supabase browser + checklist desligamento remoto 🟡
```

MDJ-19 e a proxima frente operacional. O desligamento remoto do Supabase continua proibido sem checklist HU 19.5 e aceite explicito.

---

## Documentos por funcao

### Planejamento e progresso

| Documento | Uso |
|---|---|
| [BACKLOG.md](./BACKLOG.md) | Marcos MDJ-0 a MDJ-21, fases A–E |
| [TASKS.md](./TASKS.md) | HUs detalhadas, evidencias, checkboxes |
| [PRD.md](./PRD.md) | Regras de negocio da migracao |

### Arquitetura e inventario

| Documento | Uso |
|---|---|
| [ARQUITETURA.md](./ARQUITETURA.md) | Backend Django, Docker, flags, cutover |
| [INVENTARIO_*.md](./INVENTARIO_SCHEMA_ATUAL.md) | Schema, RPCs, actions, storage, invariantes |

### Dados e backup

| Documento | Uso |
|---|---|
| [PLANO_BACKUP_RESTORE.md](./PLANO_BACKUP_RESTORE.md) | Backup/restore Supabase |
| [PLANO_IMPORTACAO_DADOS_REAIS.md](./PLANO_IMPORTACAO_DADOS_REAIS.md) | Pipeline de importacao |
| [MDJ_PRE_MDJ9_IMPORTACAO_REAL.md](./MDJ_PRE_MDJ9_IMPORTACAO_REAL.md) | Ensaio local ja executado |

### Infra e deploy

| Documento | Uso |
|---|---|
| [MDJ15_VALIDACAO_INFRA.md](./MDJ15_VALIDACAO_INFRA.md) | Backups, scripts ops |
| [MDJ18_VALIDACAO_PRODUCAO.md](./MDJ18_VALIDACAO_PRODUCAO.md) | Stack prod, homologacao local |
| [MDJ21_VPS_AUDITORIA.md](./MDJ21_VPS_AUDITORIA.md) | **Auditoria VPS** — apps existentes, portas, estrategia complementar |
| [MDJ21_RUNBOOK_DEPLOY_VPS.md](./MDJ21_RUNBOOK_DEPLOY_VPS.md) | Deploy passo a passo (nginx host + compose :8080) |
| [docker/README.md](../../docker/README.md) | Comandos Compose do dia a dia |

### Validacoes por sprint

Relatorios `MDJ*_VALIDACAO_*.md` — evidencias de homologacao por marco (auth, turno, storage, cutover dev, stack dev, etc.).

---

## Regras atuais (jun/2026)

- **Proximo marco operacional:** MDJ-19 — limpeza legado Supabase no browser e checklist de desligamento.
- **Flags Django ON** em producao desde 2026-06-19; validar pendencias pos-cutover antes de desligar Supabase remoto.
- **S3 fora de escopo** — midia em volume Docker `media_data`.
- **Supabase remoto** permanece intacto; desligamento so com checklist MDJ-19 HU 19.5.
- **Dois ambientes** apenas: dev local e producao (`producao.costurai.com.br`).
- Build de producao **sempre dentro do Docker** — nao usar `npm run build` no host para deploy.

---

## Comandos rapidos

```bash
# Dev integrado
npm run dev:docker

# Prod local (homologar antes do deploy)
cp .env.example .env   # preencher secrets
npm run prod:docker
node scripts/smoke-stack-prod.mjs

# Regressao (nao afeta dev ao parar prod)
docker compose -f docker-compose.prod.yml down
```

Smoke prod contra VPS (apos MDJ-21):

```bash
SMOKE_PROD_BASE_URL=https://producao.costurai.com.br \
SMOKE_ADMIN_EMAIL=<email> \
SMOKE_ADMIN_PASSWORD=<senha> \
node scripts/smoke-stack-prod.mjs
```

(Ajustar variaveis conforme `MDJ21_RUNBOOK_DEPLOY_VPS.md`.)
