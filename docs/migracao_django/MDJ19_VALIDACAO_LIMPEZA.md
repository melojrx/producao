# MDJ-19 — Validacao limpeza legado Supabase (2026-06-22)

> Homologacao tecnica concluida; smoke browser manual confirmado pelo operador; gate HU 19.5 aguarda aceite explicito.

---

## Validacao tecnica (local + prod API)

| Check | Resultado | Comando / evidencia |
|---|---|---|
| TypeScript strict | ✅ | `npx tsc --noEmit` |
| Flags cutover | ✅ 9/9 | `node --test lib/django/flags.test.ts` |
| Turno legado guard | ✅ 2/2 | `node --test lib/utils/turno-legado.test.ts` |
| Hooks dashboard sem Supabase browser | ✅ | `useRealtimePlanejamentoTurnoV2` + `useMetaGrupoTurnoV2` usam apenas Server Actions |
| Flags env local 8/8 | ✅ | `node scripts/mdj19/verificar-flags-cutover.mjs` |
| Smoke prod API | ✅ 11/11 | `SMOKE_PROD_BASE_URL=https://producao.costurai.com.br node scripts/smoke-stack-prod.mjs` |

### Smoke prod (2026-06-22)

```
proxy-health, api-via-proxy, frontend-login, admin-redirect-sem-sessao
django-login-via-proxy (admin@costurai.com.br)
cutover-setores (6), cutover-turnos (58), cutover-dashboard
cutover-producao-registros (turno aberto, 55 registros)
```

Pendentes opcionais no smoke: `SMOKE_SCANNER_OPERADOR_TOKEN`, `SMOKE_MEDIA_PATH`.

---

## Codigo entregue (HU 19.1–19.4)

| Item | Arquivo | Status |
|---|---|---|
| Guard browser Supabase | `lib/django/flags.ts` | ✅ |
| Polling dashboard Django | `hooks/useRealtimePlanejamentoTurnoV2.ts` | ✅ |
| Meta grupo via Django API | `lib/actions/meta-grupo-turno.ts`, `lib/django/queries/meta-grupo-turno.ts` | ✅ |
| Bloqueio writes `configuracao_turno` | `lib/actions/turno.ts`, `lib/actions/turno-blocos.ts` | ✅ |
| Guards client legado | `lib/queries/producao.ts`, `meta-grupo-turno-v2-client.ts`, `turnos-client.ts` | ✅ |
| Scanner sem path legado | `lib/queries/scanner.ts` | ✅ |
| Monitor legado isolado | `components/dashboard/MonitorRealtimeProducao.tsx` | ✅ |
| Dashboard oficial V2 | `app/admin/dashboard/page.tsx` | ✅ |

---

## Smoke browser prod

Confirmado pelo operador (2026-06-22):

- [x] Login `/login` → dashboard carrega
- [x] Dashboard com cutover Django (pos-fix auth SSR)
- [ ] Console DevTools sem WS/CORS Supabase — validar manualmente se necessario
- [ ] Scanner `/scanner` — apontamento completo VPS
- [ ] Painel TV `/tv` — polling ativo
- [ ] Logout limpa sessao JWT

---

## Gate desligamento Supabase remoto

Nao executar antes de:

1. Itens operacionais do checklist (`MDJ19_CHECKLIST_DESLIGAMENTO_SUPABASE.md`)
2. Backup manual testado
3. Aceite explicito do responsavel (HU 19.5)

---

## Referencias

- Inventario: [MDJ19_INVENTARIO_SUPABASE_BROWSER.md](./MDJ19_INVENTARIO_SUPABASE_BROWSER.md)
- Checklist: [MDJ19_CHECKLIST_DESLIGAMENTO_SUPABASE.md](./MDJ19_CHECKLIST_DESLIGAMENTO_SUPABASE.md)
- Estado geral: [ESTADO_ATUAL.md](./ESTADO_ATUAL.md)
