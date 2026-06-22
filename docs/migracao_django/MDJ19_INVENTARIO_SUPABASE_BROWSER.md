# MDJ-19 — Inventario Supabase no browser e server (2026-06-22)

> Atualizar a cada HU concluida. Objetivo: operacao **100% Django + Next.js** sem dependencia runtime do Supabase.

---

## Estado do cutover producao (2026-06-22)

| Item | Status |
|---|---|
| 8 flags `NEXT_PUBLIC_USE_DJANGO_*` | ✅ ON na VPS |
| Login admin `/login` | ✅ JWT Django (cookies httpOnly) |
| Dashboard `/admin/dashboard` | ✅ SSR Django + polling client (pos-fix auth SSR) |
| `/media/` via nginx | ✅ HTTP 200 (alias volume) |
| Realtime Supabase no dashboard V2 | 🟡 Desligado quando `DASHBOARD_READS` ON — polling Django |
| Supabase remoto (cloud) | ⏸️ Intacto — desligamento so via checklist HU 19.5 |

---

## Helpers MDJ-19 (codigo)

| Helper | Arquivo | Regra |
|---|---|---|
| `deveUsarSupabaseBrowser()` | `lib/django/flags.ts` | `false` quando **todas** as 8 flags ON → browser nao abre Realtime Supabase |
| `deveUsarRealtimeSupabaseDashboard()` | `lib/django/flags.ts` | `false` quando `NEXT_PUBLIC_USE_DJANGO_DASHBOARD_READS=true` |
| `INTERVALO_POLLING_DASHBOARD_MS` | `lib/constants.ts` | 15_000 ms — refresh dashboard via Django |
| `buscarPlanejamentoTurnoDashboardAction` | `lib/actions/dashboard-turno.ts` | Server Action — polling SSR Django |

---

## Inventario por camada

### Client Components — Realtime / Supabase browser

| Arquivo | Uso Supabase | Com flags ON (prod) | Acao MDJ-19 |
|---|---|---|---|
| `hooks/useRealtimePlanejamentoTurnoV2.ts` | Realtime channel + `turnos-client` | **Polling Django** via Server Action | ✅ HU 19.2/19.3 |
| `hooks/useRealtimeProducao.ts` | Realtime + views legado | **Desligado** (`status: desligado`) | ✅ HU 19.2 |
| `lib/queries/turnos-client.ts` | `createClient()` extensivo | Ainda Supabase se polling OFF | 🟡 HU 19.3 — path Django client futuro ou manter SSR-only |
| `lib/queries/meta-grupo-turno-v2-client.ts` | KPI meta grupo | Supabase se invocado | 🟡 HU 19.3 |
| `lib/queries/producao.ts` (client) | Views `vw_*` legado | Usado so por `MonitorRealtimeProducao` | 🟡 HU 19.4 deprecar monitor legado |
| `lib/queries/eficiencia-operacional-turno-client.ts` | Queries turno | Supabase | 🟡 Pos-HU 19.3 |
| `components/dashboard/MonitorRealtimeProducao.tsx` | `useRealtimeProducao` | Legado V1 — fora do dashboard principal | 🟡 HU 19.4 isolar/redirect |

### Server Components / Actions — roteamento dual

| Modulo | Arquivo principal | Flag cutover | Path prod |
|---|---|---|---|
| Auth admin | `lib/auth/require-admin-user.ts` | `auth` | ✅ Django JWT |
| Turnos dashboard | `lib/queries/turnos.ts` | `dashboard_reads` | ✅ Django API |
| Metas | `lib/queries/metas-mensais.ts` | `metas_reads` | ✅ Django API |
| Cadastros read | `lib/queries/produtos.ts`, `operadores.ts`, etc. | `cadastros_reads` | ✅ Django API |
| Scanner read | `lib/queries/scanner.ts` | `scanner_reads` | ✅ Django API |
| Apontamento write | `lib/actions/producao.ts` | `producao_writes` | ✅ Django API |
| Qualidade write | `lib/actions/qualidade.ts` | `qualidade_writes` | ✅ Django API |
| Admin writes | `lib/actions/*` (CRUD) | `admin_writes` | ✅ Django API (maioria) |
| Relatorios V2 | `lib/queries/relatorios-v2.ts` | `dashboard_reads` | ✅ Django (cutover 2026-06-20) |

### Server — ainda importa Supabase (fallback quando flag OFF)

| Arquivo | Motivo | Remover quando |
|---|---|---|
| `lib/supabase/server.ts` | Fallback dev / rollback | HU 19.5 pos-aceite |
| `lib/supabase/admin.ts` | Service role em actions legadas | HU 19.4 + 19.5 |
| `lib/supabase/client.ts` | Browser Realtime fallback | HU 19.2 completa + flags ON permanente |
| `lib/supabase/proxy.ts` | Middleware auth Supabase | Flag `auth` OFF apenas rollback |

---

## Matriz deferidos MDJ-16 → status MDJ-19

| Deferido MDJ-16 | Status 2026-06-22 | HU |
|---|---|---|
| `turnos-client` + Realtime dashboard | Polling Django quando `dashboard_reads` ON | 19.3 ✅ parcial |
| `relatorios-v2` Supabase | Cutover Django em prod (2026-06-20) | — ✅ |
| Eficiencia/qualidade operacional vazios path Django | Ainda parcial no mapper Django | 19.3 backlog |
| `registrarApontamentosSupervisor` batch | Supabase RPC | Pos-MDJ-19 (endpoint batch Django) |
| `registrarProducao` legado V1 | Supabase | 19.4 deprecar |
| Scanner `podeRegistrarQualidade` | Django JWT (2026-06-20) | — ✅ |
| Auth SSR cookies JWT | Fix refresh sem mutar cookies RSC (2026-06-22) | — ✅ |

---

## Criterio "100% Django" (runtime producao)

Para desligar Supabase remoto, **todas** as condicoes abaixo devem ser verdadeiras:

1. 8 flags ON em producao + smoke E2E verde
2. Console browser sem erros CORS/WebSocket Supabase em `/admin/dashboard`, `/scanner`, `/tv`
3. Nenhum hook client abre Realtime Supabase com flags ON
4. Backup final Supabase arquivado + restore local testado
5. Checklist `MDJ19_CHECKLIST_DESLIGAMENTO_SUPABASE.md` assinado pelo responsavel
6. Plano rollback documentado (flags OFF + reativar env Supabase)

---

## Proximas acoes (ordem)

1. **HU 19.4** — deprecar `MonitorRealtimeProducao` / `configuracao_turno` no fluxo principal
2. **HU 19.3** — `useMetaGrupoTurnoV2` via Django; reduzir `turnos-client` Supabase
3. **HU 19.5** — checklist formal + validacao paridade final
4. **HU 19.6** — `MDJ19_VALIDACAO_LIMPEZA.md` + smoke browser prod
5. Desligamento Supabase cloud — **somente apos checkbox HU 19.5**
