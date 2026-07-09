# Estado atual da migracao Django (jul/2026)

> Ponto de entrada da documentacao de migracao. Atualizado em **2026-07-09**.
> Frente ativa: operacao estavel em producao; fase de observacao anterior ao desligamento fisico da nuvem legada.

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
| Limpeza legado Supabase browser | ✅ MDJ-19 concluido em 2026-07-09 |
| Desligamento nuvem legada | ⏸️ Pos-observacao — pendente aceite Junior Melo |

**Smoke prod (2026-06-22):** 11/11 OK — inclui `cutover-producao-registros` (55 items).
**Smoke dev (2026-07-09):** 8/8 OK — backend, frontend, login, admin redirect, django-me, cadastros (setores 6, operadores 33, produtos 38).
**Flags cutover (2026-07-09):** 16/16 ON (8 publicas + 8 runtime SSR).

**Dominio producao:** `https://producao.costurai.com.br` — DNS A → VPS `38.52.128.62` (Hostinger).

**VPS (`srvjosemaria`):** nginx host em `:80`/`:443` + finanpy (`:8001`) + brabustore (`:3001`) + Hermes. PCP entra via **`127.0.0.1:8080`** + vhost novo — sem derrubar apps existentes.

**Premissa operacional:** backup do snapshot da nuvem legada ja realizado (2026-05-31); importacao MDJ-20 foi **one-shot** sem sync incremental. O projeto em nuvem permanece intacto em standby ate o gate pos-observacao do checklist MDJ-19 ser assinado por Junior Melo.

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

## MDJ-19 — progresso codigo (finalizado 2026-07-09)

| HU | Status | Evidencia |
|---|---|---|
| 19.1 Inventario browser | ✅ | `MDJ19_INVENTARIO_SUPABASE_BROWSER.md` |
| 19.2 Guard browser legado | ✅ | `deveUsarSupabaseBrowser()`, `useRealtimeProducao` desligado |
| 19.3 Polling dashboard Django | ✅ | Meta grupo via Django API + polling planejamento |
| 19.4 Deprecar `configuracao_turno` | ✅ | Bloqueio writes, guards client, monitor legado isolado |
| 19.5 Checklist desligamento | ✅ | Doc completa com gate pos-observacao pendente aceite |
| 19.6 Homologacao | ✅ | `MDJ19_VALIDACAO_LIMPEZA.md` — tsc + 10/10 testes + 8/8 smoke dev OK |

**Validacao tecnica (2026-07-09):** `npx tsc --noEmit` OK; `flags.test.ts` 8/8 + `turno-legado.test.ts` 2/2 + `verificar-flags-cutover.mjs` 16/16 + `smoke-stack-dev.mjs` 8/8 OK.

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
2. MDJ-20  Snapshot congelado -> Postgres prod + midia + paridade ✅
3. Cutover  Flags Django ON em producao (2026-06-19) ✅
4. Pos-cutover  /media/, auth SSR, build client ✅ (2026-06-22)
5. MDJ-19  Limpeza legado browser + checklist desligamento ✅ (2026-07-09)
6. Desligamento fisico da nuvem + remocao @supabase/* do package.json ⏸️ pos-observacao
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

## Regras atuais (jul/2026)

- **Proximo marco operacional:** periodo de observacao em producao; depois disso, desligamento fisico da nuvem legada e remocao das dependencias `@supabase/*` do `package.json` (sprint futura pos-aceite de Junior Melo).
- **Flags Django ON** em producao desde 2026-06-19; dashboard usa polling Django (nao Realtime).
- **S3 fora de escopo** — midia em volume Docker `media_data`.
- **Nuvem legada** permanece intacta em standby; desligamento fisico so com checklist MDJ-19 assinado pos-observacao.
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
