# Estado atual da migracao Django (jun/2026)

> Ponto de entrada da documentacao de migracao. Atualizado em **2026-06-22**.
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
| Cutover flags producao | ✅ 2026-06-19 — 8 flags Django ON na VPS |
| `/media/` em producao | ✅ Fix nginx alias + volume (2026-06-22) |
| Login + dashboard admin prod | ✅ JWT Django SSR (fix cookies RSC 2026-06-22) |
| Limpeza legado Supabase browser | 🟡 MDJ-19 em andamento (HU 19.1–19.3 parcial) |
| Desligamento Supabase remoto | ⏸️ Checklist HU 19.5 — aceite explicito pendente |

**Dominio producao:** `https://producao.costurai.com.br` — DNS A → VPS `38.52.128.62` (Hostinger).

**VPS (`srvjosemaria`):** nginx host em `:80`/`:443` + finanpy (`:8001`) + brabustore (`:3001`) + Hermes. PCP entra via **`127.0.0.1:8080`** + vhost novo — sem derrubar apps existentes.

**Premissa operacional:** backup Supabase **ja realizado**; importacao MDJ-20 foi **one-shot** do snapshot (2026-05-31), sem sync incremental. Supabase remoto permanece intacto ate checklist MDJ-19 HU 19.5 e aceite explicito.

---

## Correcoes pos-cutover (2026-06-22)

| Problema | Causa | Fix | Commit |
|---|---|---|---|
| `/media/` 404 em prod | nginx encaminhava ao Django; `DEBUG=False` nao serve arquivos | `docker/nginx/prod.conf` alias + volume `media_data` no proxy | `eec09a7` |
| Build prod quebrado | `turnos-client` puxava `supabase/server` no bundle client | Split `qualidade-turno-client-base.ts` | `a0e4a98` |
| Dashboard erro generico + sessao expirada | Refresh JWT mutava cookies dentro de Server Components | Refresh em memoria por request (`React cache()`) | `e55292b` |

**Evidencias operacionais:**
- `/media/` VPS: HTTP 200 na imagem de teste
- Dashboard prod: usuario confirmou acesso pos-login
- Apontamento Django-only: validado em **dev** (registro `ecbfd84e-1b55-4e11-b880-f95928d4327f`); VPS pendente

---

## MDJ-19 — progresso codigo (2026-06-22)

| HU | Status | Evidencia |
|---|---|---|
| 19.1 Inventario browser | 🟡 Parcial | `MDJ19_INVENTARIO_SUPABASE_BROWSER.md` |
| 19.2 Guard Supabase browser | ✅ | `deveUsarSupabaseBrowser()`, `useRealtimeProducao` desligado |
| 19.3 Polling dashboard Django | ✅ | Meta grupo via Django API + polling planejamento |
| 19.4 Deprecar `configuracao_turno` | ✅ | Bloqueio writes, guards client, monitor legado isolado |
| 19.5 Checklist desligamento | 🟡 Doc criado | Execucao + aceite pendente |
| 19.6 Homologacao | 🟡 Parcial | `MDJ19_VALIDACAO_LIMPEZA.md` — smoke browser prod pendente |

**Validacao tecnica:** `npx tsc --noEmit` OK; `flags.test.ts` + `turno-legado.test.ts` 9/9 OK.

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
4. Pos-cutover  /media/, auth SSR, build client ✅ (2026-06-22)
5. MDJ-19  Limpeza legado Supabase browser + checklist desligamento 🟡
6. MDJ-19 HU 19.5  Desligamento Supabase remoto ⏸️ (aceite explicito)
```

---

## Documentos por funcao

### Planejamento e progresso

| Documento | Uso |
|---|---|
| [BACKLOG.md](./BACKLOG.md) | Marcos MDJ-0 a MDJ-21, fases A–E |
| [TASKS.md](./TASKS.md) | HUs detalhadas, evidencias, checkboxes |
| [PRD.md](./PRD.md) | Regras de negocio da migracao |

### MDJ-19 (desligamento Supabase)

| Documento | Uso |
|---|---|
| [MDJ19_INVENTARIO_SUPABASE_BROWSER.md](./MDJ19_INVENTARIO_SUPABASE_BROWSER.md) | Inventario client/server Supabase remanescente |
| [MDJ19_CHECKLIST_DESLIGAMENTO_SUPABASE.md](./MDJ19_CHECKLIST_DESLIGAMENTO_SUPABASE.md) | Gate formal antes de pausar Supabase cloud |

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
| [MDJ21_VALIDACAO_DEPLOY_VPS.md](./MDJ21_VALIDACAO_DEPLOY_VPS.md) | Evidencias deploy + pos-cutover |
| [docker/README.md](../../docker/README.md) | Comandos Compose do dia a dia |

### Validacoes por sprint

Relatorios `MDJ*_VALIDACAO_*.md` — evidencias de homologacao por marco (auth, turno, storage, cutover dev, stack dev, etc.).

---

## Regras atuais (jun/2026)

- **Proximo marco operacional:** concluir MDJ-19 (HU 19.4–19.6) e executar checklist HU 19.5 com aceite explicito.
- **Flags Django ON** em producao desde 2026-06-19; dashboard usa polling Django (nao Realtime Supabase).
- **S3 fora de escopo** — midia em volume Docker `media_data`.
- **Supabase remoto** permanece intacto; desligamento so com checklist MDJ-19 HU 19.5 assinado.
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

Smoke prod contra VPS:

```bash
SMOKE_PROD_BASE_URL=https://producao.costurai.com.br \
SMOKE_ADMIN_EMAIL=<email> \
SMOKE_ADMIN_PASSWORD=<senha> \
node scripts/smoke-stack-prod.mjs
```

(Ajustar variaveis conforme `MDJ21_RUNBOOK_DEPLOY_VPS.md`.)
