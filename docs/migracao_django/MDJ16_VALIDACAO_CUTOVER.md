# MDJ-16 — Validacao Cutover Frontend Supabase → Django (dev local)

**Data:** 2026-06-17  
**Sprint:** MDJ-16 — Cutover controlado por modulo (dev local)  
**Status:** ✅ Concluida

---

## Ambiente dev

| Componente | Comando / URL |
|---|---|
| Backend Django | `docker compose -f docker-compose.dev.yml up -d backend` → `http://localhost:8001` |
| PostgreSQL | servico `db` no compose dev (dados importados MDJ-6) |
| Frontend Next.js | `npm run dev` na maquina host → `http://localhost:3000` |
| Health check | `GET http://localhost:8001/health/` → 200 |

**Perfil de homologacao (flags ON — apenas `.env.local`, nunca commitado):**

```bash
NEXT_PUBLIC_DJANGO_API_URL=http://localhost:8001

# Cutover completo MDJ-16 em dev local
NEXT_PUBLIC_USE_DJANGO_AUTH=true
NEXT_PUBLIC_USE_DJANGO_SCANNER_READS=true
NEXT_PUBLIC_USE_DJANGO_CADASTROS_READS=true
NEXT_PUBLIC_USE_DJANGO_METAS_READS=true
NEXT_PUBLIC_USE_DJANGO_DASHBOARD_READS=true
NEXT_PUBLIC_USE_DJANGO_ADMIN_WRITES=true
NEXT_PUBLIC_USE_DJANGO_PRODUCAO_WRITES=true
NEXT_PUBLIC_USE_DJANGO_QUALIDADE_WRITES=true

# Opcional: apontamento/revisao sem cookie de login (scanner publico)
DJANGO_DEV_ACCESS_TOKEN=<JWT supervisor ou revisor>
```

Manter variaveis Supabase existentes (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, etc.) — necessarias para fallback quando flags OFF.

---

## Matriz flag × modulo × paridade × rollback (dev)

| Flag (env) | Modulo | HU | Roteamento principal | Paridade | Rollback (dev) | Evidencia testes |
|---|---|---|---|---|---|---|
| `NEXT_PUBLIC_USE_DJANGO_CADASTROS_READS` | Cadastros e produtos (read) | 16.8 | `lib/queries/operadores.ts`, `maquinas.ts`, `setores.ts`, `operacoes.ts`, `produtos.ts` | **Completa** | Flag OFF + reiniciar `npm run dev` → listagens voltam ao Supabase | `lib/django/queries/mappers.test.ts`; evidencia HU 16.8 |
| `NEXT_PUBLIC_USE_DJANGO_SCANNER_READS` | Scanner (read) | 16.9 | `lib/queries/scanner.ts` | **Completa** | Flag OFF → fluxo scan setor/operador/demandas via Supabase | `backend/scanner/tests/test_scanner_api.py` (10); `scanner-mappers.test.ts` (5) |
| `NEXT_PUBLIC_USE_DJANGO_METAS_READS` | Metas mensais (read) | 16.10 | `lib/queries/metas-mensais.ts` | **Completa** | Flag OFF → KPIs de meta via Supabase | `backend/metas/tests/test_meta_api.py`; `metas-mappers.test.ts` |
| `NEXT_PUBLIC_USE_DJANGO_DASHBOARD_READS` | Dashboard / turnos (read) | 16.10 | `lib/queries/turnos.ts` | **Parcial** | Flag OFF → planejamento e KPIs via Supabase | `backend/turnos/tests/test_turno_read_api.py`; mappers dashboard/turnos |
| `NEXT_PUBLIC_USE_DJANGO_AUTH` | Auth admin/supervisor | 16.11 | `lib/actions/auth.ts`, `lib/supabase/proxy.ts`, `lib/auth/require-admin-user.ts` | **Completa** | Flag OFF + limpar cookies JWT → login Supabase em `/login` | `lib/django/jwt.test.ts`, `cookies.test.ts`, `sessao-django.test.ts`, `auth.test.ts` |
| `NEXT_PUBLIC_USE_DJANGO_ADMIN_WRITES` | Tipos de defeito (write) | 16.12 | `lib/actions/qualidade-defeitos.ts`, `lib/queries/qualidade-defeitos.ts` | **Completa** | Flag OFF → CRUD tipos defeito via Supabase | `qualidade-defeitos.test.ts`, `qualidade-defeitos-mappers.test.ts` |
| `NEXT_PUBLIC_USE_DJANGO_PRODUCAO_WRITES` | Apontamento produtivo (write) | 16.13 | `lib/actions/producao.ts` → `registrarProducaoOperacao` | **Parcial** | Flag OFF → RPC Supabase para apontamento scanner | `producao.test.ts`; MDJ-10 backend validado |
| `NEXT_PUBLIC_USE_DJANGO_QUALIDADE_WRITES` | Revisao qualidade (write) | 16.14 | `lib/actions/qualidade.ts` → `registrarRevisaoQualidade` | **Parcial** | Flag OFF → RPC Supabase para revisao | `qualidade.test.ts`; MDJ-11 autoria JWT |

### Deferidos documentados (Supabase fallback permanece)

| Area | Motivo | Status |
|---|---|---|
| `lib/queries/turnos-client.ts` + `useRealtimePlanejamentoTurnoV2` | Refresh client-side sem JWT no browser | Supabase |
| `lib/queries/relatorios.ts` / `relatorios-v2.ts` | Fora do escopo dashboard/metas MDJ-16 | Supabase |
| Dashboard Django — eficiencia/qualidade operacional | Campos opcionais vazios ate endpoints dedicados | Parcial |
| `registrarApontamentosSupervisor` (batch) | MDJ-10 sem endpoint batch | Supabase |
| `registrarProducao` legado (`turnoSetorOpId`) | Escopo V2 scanner apenas | Supabase |
| `app/(operador)/scanner/page.tsx` → `podeRegistrarQualidade` | Lookup auth Supabase no scanner | Supabase |
| Django Admin static em producao (HU 16.5) | Adiado | MDJ-18 |
| Smoke `docker-compose.prod.yml` | Producao/VPS | MDJ-18 |

---

## Comandos de validacao automatizada

Executados em **2026-06-17** no host de desenvolvimento (`/home/jrmelo/Projetos/Producao`):

```bash
docker compose -f docker-compose.dev.yml exec -T backend python manage.py check
docker compose -f docker-compose.dev.yml exec -T backend python manage.py makemigrations --check --dry-run
docker compose -f docker-compose.dev.yml exec -T backend python manage.py test --keepdb
cd /home/jrmelo/Projetos/Producao && npx tsc --noEmit
cd /home/jrmelo/Projetos/Producao && node --test --experimental-strip-types lib/django/**/*.test.ts lib/auth/**/*.test.ts lib/actions/**/*.test.ts
git diff --check
```

**Resultados:**

| Comando | Resultado |
|---|---|
| `manage.py check` | OK — System check identified no issues (0 silenced) |
| `makemigrations --check --dry-run` | OK — No changes detected |
| `manage.py test --keepdb` | OK — **120 testes** em 9.7s |
| `npx tsc --noEmit` | OK — sem erros |
| `node --test` (lib/django, lib/auth, lib/actions) | OK — **60 testes** pass, 0 fail |
| `git diff --check` | OK |

**Correcao trivial aplicada na homologacao:** `_formatar_dia_mes` em `backend/metas/selectors/meta_mensal.py` passou a aceitar `date | str` (bug exposto pelo teste de resumo semanal de metas).

**Nota:** Comandos Django executados via container `producao-backend-1` (compose dev, porta 8001). Fallback local sem Docker documentado em HUs anteriores: `backend/.venv/bin/python manage.py test --settings=pcp_project.config.local`.

---

## Smoke manual (checklist — dev local)

Procedimento documentado para homologacao humana; nao executado automaticamente nesta HU.

### Perfil A — regressao Supabase (todas flags OFF)

- [ ] Remover ou definir `false` todas as `NEXT_PUBLIC_USE_DJANGO_*` no `.env.local`
- [ ] `npm run dev` reiniciado
- [ ] Login admin via Supabase Auth em `/login`
- [ ] Listagem cadastros (operadores, maquinas, produtos) carrega dados Supabase
- [ ] Scanner: scan setor → operador → demandas via queries Supabase

### Perfil B — cutover completo (todas flags ON)

- [ ] `docker compose -f docker-compose.dev.yml up -d backend db`
- [ ] `.env.local` com bloco de homologacao (secao acima)
- [ ] `npm run dev`
- [ ] Login Django em `/login` (usuario com `is_staff` ou supervisor ativo)
- [ ] `/admin/dashboard` carrega KPIs via Django (`dashboard_reads` + `metas_reads`)
- [ ] CRUD tipos de defeito grava no Postgres Django (`admin_writes`)
- [ ] Scanner: apontamento produtivo via `POST /api/v1/producao/apontamentos/` (`producao_writes`)
- [ ] Revisao qualidade com usuario `pode_revisar_qualidade=true` (`qualidade_writes`)

### Perfil C — rollback por flag

- [ ] Desligar uma flag (ex.: `NEXT_PUBLIC_USE_DJANGO_CADASTROS_READS=false`), reiniciar frontend
- [ ] Confirmar que apenas o modulo afetado volta ao Supabase; demais modulos permanecem no path Django

---

## Auditoria — Supabase preservado

Verificacao por grep em **2026-06-17** — caminhos Supabase **nao removidos**:

| Arquivo / area | Evidencia dual routing |
|---|---|
| `lib/actions/auth.ts` | `estaUsandoDjango('auth')` + `createClient()` Supabase no path OFF |
| `lib/actions/producao.ts` | `estaUsandoDjango('producao_writes')` + `createAdminClient()` Supabase |
| `lib/actions/qualidade.ts` | `estaUsandoDjango('qualidade_writes')` + `createAdminClient()` Supabase |
| `lib/actions/qualidade-defeitos.ts` | `estaUsandoDjango('admin_writes')` + `createAdminClient()` Supabase |
| `lib/queries/*.ts` | `operadores`, `maquinas`, `setores`, `operacoes`, `produtos`, `scanner`, `metas-mensais`, `turnos`, `qualidade-defeitos` — branches `if (estaUsandoDjango(...))` |
| `lib/supabase/client.ts`, `server.ts`, `admin.ts` | Imports ativos em actions/queries |
| `lib/django/flags.ts` | 8 flags; default OFF quando env ausente |

**Conclusao:** Supabase remoto intocado; dual routing preservado. Nenhuma flag habilitada em arquivos commitados (`.env.example` apenas documenta variaveis).

---

## Fora de escopo / proximo marco

| Marco | Escopo | Pre-requisito |
|---|---|---|
| **MDJ-21** | Deploy VPS, TLS, smoke publico | MDJ-18 ✅ |
| **MDJ-20** | Import snapshot congelado → Postgres prod | MDJ-21 |
| **MDJ-19** | Limpeza legado Supabase browser | MDJ-16 (dev) |
| Cutover flags prod | Ligacao Django em producao | MDJ-20 |
| S3 / `USE_S3_STORAGE` | Fora de escopo | — |

Visao consolidada: `ESTADO_ATUAL.md`.

---

## Pos-MDJ-19 — deferidos resolvidos vs remanescentes (2026-06-22)

| Deferido MDJ-16 | Status pos-MDJ-19 | Observacao |
|---|---|---|
| `relatorios-v2.ts` Supabase | ✅ Resolvido | Cutover Django em prod (2026-06-20) |
| Realtime dashboard V2 | 🟡 Parcial | Polling Django quando `DASHBOARD_READS` ON (HU 19.3) |
| Auth SSR JWT cookies | ✅ Resolvido | Fix refresh sem mutar cookies RSC (2026-06-22, commit `e55292b`) |
| `turnos-client.ts` Supabase | 🟡 Remanescente | Fallback quando polling OFF; meta-grupo ainda Supabase |
| `registrarApontamentosSupervisor` batch | ⏳ Pos-MDJ-19 | Endpoint batch Django futuro |
| `registrarProducao` legado V1 | ⏳ HU 19.4 | Deprecar fluxo `configuracao_turno` |
| `MonitorRealtimeProducao` | ⏳ HU 19.4 | Isolar do dashboard principal |
| Eficiencia/qualidade operacional vazios path Django | 🟡 Remanescente | Mapper Django parcial |

Inventario completo: `MDJ19_INVENTARIO_SUPABASE_BROWSER.md`. Gate desligamento: `MDJ19_CHECKLIST_DESLIGAMENTO_SUPABASE.md`.

---

## Referencias

- Contrato de flags: `ARQUITETURA.md` secao 19
- Evidencias por HU: `docs/migracao_django/TASKS.md` (16.7–16.14)
- Auth Django: `MDJ13_VALIDACAO_AUTH.md`
- Apontamento produtivo: `MDJ10_VALIDACAO_APONTAMENTO_PRODUCAO.md`
