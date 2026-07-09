# MDJ-19 — Validacao limpeza legado Supabase

> Homologacao tecnica concluida em 2026-07-09; gate de desligamento fisico da nuvem aguarda aceite pos-observacao do responsavel (Junior Melo).

---

## Validacao tecnica (dev 2026-07-09 + prod API 2026-06-22)

| Check | Resultado | Comando / evidencia |
|---|---|---|
| TypeScript strict | ✅ | `npx tsc --noEmit` (2026-07-09) |
| Flags cutover publicas + SSR | ✅ 16/16 | `node scripts/mdj19/verificar-flags-cutover.mjs` (2026-07-09) |
| Testes flags | ✅ 8/8 | `node --test lib/django/flags.test.ts` (2026-07-09) |
| Turno legado guard | ✅ 2/2 | `node --test lib/utils/turno-legado.test.ts` (2026-07-09) |
| Hooks dashboard sem conexao browser legada | ✅ | `useRealtimePlanejamentoTurnoV2` + `useMetaGrupoTurnoV2` usam apenas Server Actions |
| Smoke dev stack | ✅ 8/8 | `node scripts/smoke-stack-dev.mjs` (2026-07-09) |
| Smoke prod API | ✅ 11/11 | `SMOKE_PROD_BASE_URL=https://producao.costurai.com.br node scripts/smoke-stack-prod.mjs` (2026-06-22) |

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
- [ ] Console DevTools sem WS/CORS legado — validar manualmente se necessario
- [ ] Scanner `/scanner` — apontamento completo VPS
- [ ] Painel TV `/tv` — polling ativo
- [ ] Logout limpa sessao JWT

Itens restantes sao operacionais na VPS e pendem de credenciais/visitacao presencial; nao bloqueiem a conclusao tecnica de MDJ-19 (HU 19.6), apenas o desligamento fisico da nuvem (gate pos-observacao).

---

## Gate desligamento fisico da nuvem

> Concluido em codigo/doc. O desligamento fisico (pausar/excluir o projeto em nuvem) e a remocao fisica das dependencias `@supabase/*` do `package.json` ficam pendentas de:

1. Operacao estavel por periodo observado (sugestao: 2 semanas OU 30 turnos sem regressao)
2. Backup manual Postgres prod + midia testados
3. Restore de contingencia testado
4. Paridade final de contagens Django vs snapshot
5. Export final do projeto em nuvem com checksum registrado
6. **Aceite explicito do responsavel (Junior Melo)** — ver `MDJ19_CHECKLIST_DESLIGAMENTO_SUPABASE.md` secao 6

Ate la, o projeto em nuve permanece intacto e as variaveis `NEXT_PUBLIC_SUPABASE_*` no `.env.example` ficam comentadas como fallback de rollback.

---

## Referencias

- Inventario: [MDJ19_INVENTARIO_SUPABASE_BROWSER.md](./MDJ19_INVENTARIO_SUPABASE_BROWSER.md)
- Checklist: [MDJ19_CHECKLIST_DESLIGAMENTO_SUPABASE.md](./MDJ19_CHECKLIST_DESLIGAMENTO_SUPABASE.md)
- Estado geral: [ESTADO_ATUAL.md](./ESTADO_ATUAL.md)
