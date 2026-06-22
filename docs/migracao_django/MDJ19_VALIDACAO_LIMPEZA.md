# MDJ-19 — Validacao limpeza legado Supabase (2026-06-22)

> Homologacao parcial — smoke browser prod pendente (HU 19.6).

---

## Validacao tecnica (local)

| Check | Resultado | Comando |
|---|---|---|
| TypeScript strict | ✅ | `npx tsc --noEmit` |
| Flags cutover | ✅ 7/7 | `node --test lib/django/flags.test.ts` |
| Turno legado guard | ✅ 2/2 | `node --test lib/utils/turno-legado.test.ts` |

---

## Codigo entregue (HU 19.1–19.4)

| Item | Arquivo | Status |
|---|---|---|
| Guard browser Supabase | `lib/django/flags.ts` | ✅ |
| Polling dashboard Django | `hooks/useRealtimePlanejamentoTurnoV2.ts` | ✅ |
| Meta grupo via Django API | `lib/actions/meta-grupo-turno.ts`, `lib/django/queries/meta-grupo-turno.ts` | ✅ |
| Bloqueio writes `configuracao_turno` | `lib/actions/turno.ts`, `lib/actions/turno-blocos.ts` | ✅ |
| Guards client legado | `lib/queries/producao.ts`, `lib/queries/meta-grupo-turno-v2-client.ts` | ✅ |
| Scanner sem path legado | `lib/queries/scanner.ts` | ✅ |
| Monitor legado isolado | `components/dashboard/MonitorRealtimeProducao.tsx` | ✅ |
| Dashboard oficial V2 | `app/admin/dashboard/page.tsx` | ✅ |

---

## Smoke browser prod (pendente)

Executar manualmente com flags ON em `https://producao.costurai.com.br`:

- [ ] Console DevTools sem erros WebSocket/CORS Supabase em `/admin/dashboard`
- [ ] Indicador de conexao mostra **atualização automática** (polling)
- [ ] Meta do Grupo atualiza apos apontamento
- [ ] Login/logout JWT Django intacto
- [ ] `/scanner` funcional sem referencia a blocos legados

---

## Gate desligamento Supabase remoto

Nao executar antes de:

1. Smoke browser acima ✅
2. Checklist `MDJ19_CHECKLIST_DESLIGAMENTO_SUPABASE.md` assinado
3. Aceite explicito do responsavel (HU 19.5)

---

## Referencias

- Inventario: [MDJ19_INVENTARIO_SUPABASE_BROWSER.md](./MDJ19_INVENTARIO_SUPABASE_BROWSER.md)
- Checklist: [MDJ19_CHECKLIST_DESLIGAMENTO_SUPABASE.md](./MDJ19_CHECKLIST_DESLIGAMENTO_SUPABASE.md)
- Estado geral: [ESTADO_ATUAL.md](./ESTADO_ATUAL.md)
