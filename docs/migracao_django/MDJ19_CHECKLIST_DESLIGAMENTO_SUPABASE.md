# MDJ-19 — Checklist desligamento da nuvem legada

> Pausar/excluir o projeto em nuvem exige todos os itens abaixo marcados e aceite explicito do responsavel pos-observacao.

**Data abertura:** 2026-06-22  
**Data consolidacao:** 2026-07-09  
**Responsavel operacional:** Junior Melo  
**Ambiente producao:** `https://producao.costurai.com.br`

---

## 1. Pre-requisitos concluidos (marcos anteriores)

- [x] Importacao snapshot + paridade Postgres prod (MDJ-20)
- [x] Deploy VPS + CI/CD (MDJ-21)
- [x] Cutover 8 flags Django ON em producao (2026-06-19)
- [x] `/media/` servido via nginx alias (2026-06-22)
- [x] Login + dashboard admin funcionais com JWT Django (2026-06-22)
- [x] Apontamento Django-only validado em dev (registro `ecbfd84e-1b55-4e11-b880-f95928d4327f` em 2026-06-22)
- [ ] Primeiro registro producao **novo** via Django apenas (VPS) — a validar em operacao
- [ ] Backup manual testado (`scripts/infra/backup_postgres.sh` + `backup_media.sh`)

---

## 2. Runtime frontend — zero dependencia ativa da nuvem legada

- [x] `deveUsarSupabaseBrowser()` implementado (`lib/django/flags.ts`)
- [x] Dashboard V2: polling Django substitui Realtime quando `DASHBOARD_READS` ON
- [x] `useRealtimeProducao`: desligado quando cutover completo
- [x] Console browser limpo (sem WS/CORS da nuvem legada) — dashboard confirmado operador
- [x] `turnos-client.ts` sem path obrigatorio com flags ON (guard + doc rollback)
- [x] `meta-grupo-turno-v2-client.ts` migrado para Django
- [x] Fluxo legado `configuracao_turno` / `MonitorRealtimeProducao` isolado ou removido

---

## 3. Matriz flags producao

Executar na VPS ou via smoke:

```bash
SMOKE_PROD_BASE_URL=https://producao.costurai.com.br \
SMOKE_ADMIN_EMAIL=<email> \
SMOKE_ADMIN_PASSWORD=<senha> \
node scripts/smoke-stack-prod.mjs
```

| Flag | Prod ON | Smoke |
|---|---|---|
| `NEXT_PUBLIC_USE_DJANGO_AUTH` | [x] | [x] 2026-06-22 |
| `NEXT_PUBLIC_USE_DJANGO_SCANNER_READS` | [x] | [x] |
| `NEXT_PUBLIC_USE_DJANGO_CADASTROS_READS` | [x] | [x] setores 6 |
| `NEXT_PUBLIC_USE_DJANGO_METAS_READS` | [x] | [x] |
| `NEXT_PUBLIC_USE_DJANGO_DASHBOARD_READS` | [x] | [x] dashboard API |
| `NEXT_PUBLIC_USE_DJANGO_ADMIN_WRITES` | [x] | [x] |
| `NEXT_PUBLIC_USE_DJANGO_PRODUCAO_WRITES` | [x] | [x] registros 55 |
| `NEXT_PUBLIC_USE_DJANGO_QUALIDADE_WRITES` | [x] | [x] |

Evidencia: `node scripts/smoke-stack-prod.mjs` 11/11 OK contra `https://producao.costurai.com.br`.

Validacao dev 2026-07-09 (16/16 ON — publicas + runtime SSR):
`node scripts/mdj19/verificar-flags-cutover.mjs` 16/16 OK.

---

## 4. Smoke E2E dev (pos-cutover)

Validado em 2026-07-09 no ambiente dev Docker:

- [x] Backend health `http://localhost:8001/health/` — `{"status":"ok","database":"ok"}`
- [x] Frontend login HTTP 200
- [x] Admin sem sessao redireciona para `/login`
- [x] Login Django via proxy
- [x] Endpoint `django-me` 200
- [x] Cadastros 200 (setores 6, operadores 33, produtos 38)
- [x] `npx tsc --noEmit` sem erros
- [x] `node --test lib/django/flags.test.ts` 8/8 OK
- [x] `node --test lib/utils/turno-legado.test.ts` 2/2 OK
- [x] `node scripts/smoke-stack-dev.mjs` 8/8 OK

Smoke VPS pendente por token/credenciais — ver `Validacao limpeza`.

---

## 5. Validacao tecnica final (HU 19.6)

| Check | Resultado | Comando / evidencia |
|---|---|---|
| TypeScript strict | ✅ | `npx tsc --noEmit` (2026-07-09) |
| Flags cutover publicas + SSR | ✅ 16/16 | `node scripts/mdj19/verificar-flags-cutover.mjs` |
| Testes flags | ✅ 8/8 | `node --test lib/django/flags.test.ts` |
| Testes turno legado guard | ✅ 2/2 | `node --test lib/utils/turno-legado.test.ts` |
| Hooks dashboard sem conexao browser legada | ✅ | `useRealtimePlanejamentoTurnoV2` + `useMetaGrupoTurnoV2` usam apenas Server Actions |
| Smoke dev stack | ✅ 8/8 | `node scripts/smoke-stack-dev.mjs` |

---

## 6. Pos-observacao — desligamento fisico do projeto em nuvem

> **AUSENCIA EXPLICITA DE ACEITE IMEDIATO.** O projeto em nuve permanece intacto e em standby ate:
>
> - periodo de observacao operacional criteriado (sugestao: 2 semanas OU 30 turnos sem regressao)
> - backup manual testado
> - restore de contingencia testado
> - paridade final de contagens Django vs snapshot
> - export do backup final da nuvem com checksum registrado
>
> Apes disto, o responsavel assina a linha abaixo. Ate la, o projeto em nuvem nao e pausado/excluido.

- [ ] Operacao estavel por periodo observado
- [ ] Backup manual Postgres prod (`scripts/infra/backup_postgres.sh`) — data e caminho registrados
- [ ] Backup manual midia prod (`scripts/infra/backup_media.sh`) — data e caminho registrados
- [ ] Restore de contingencia testado localmente (`docs/migracao_django/PLANO_BACKUP_RESTORE.md`)
- [ ] Paridade final de contagens (referencia `MDJ20_VALIDACAO_IMPORTACAO_PRODUCAO.md`)
- [ ] Export final do projeto em nuvem e checksum registrado
- [ ] Remover variaveis `NEXT_PUBLIC_SUPABASE_*` do `.env` VPS (apos periodo de observacao)
- [ ] Remover dependencias `@supabase/*` do `package.json` (sprint futura pos-observacao)

### Aceite formal

**Pendente — Junior Melo assina apos periodo de observacao acima.**

Data: ___/___/___ assinatura: _______

---

## 7. Plano rollback (se necessario)

1. Reverter flags para `false` no `.env` VPS
2. Rebuild frontend: `docker compose -f docker-compose.prod.yml up -d --build frontend`
3. Confirmar variaveis de conexao legada validas no `.env` VPS
4. Smoke pela rota em nuvem
5. Comunicar operadores — janela de indisponibilidade

**Tempo estimado rollback:** ~15 min (rebuild frontend + restart proxy).

---

## 8. Estado MDJ-19

**Status:** ✅ Concluida em 2026-07-09 (HU 19.1-19.6 concluidas; testes + smoke dev OK; flags 16/16 ON em dev e 8/8 em producao via smoke 2026-06-22).  
**Desligamento fisico da nuvem:** pende exclusivamente de aceite pos-observacao do responsavel (Junior Melo).
**Sprint futura pos-aceite:** remover dependencias `@supabase/*` do `package.json` e limpar imports residuais em `lib/supabase/`.

---

## Referencias

- Inventario detalhado: [MDJ19_INVENTARIO_SUPABASE_BROWSER.md](./MDJ19_INVENTARIO_SUPABASE_BROWSER.md)
- Cutover dev: [MDJ16_VALIDACAO_CUTOVER.md](./MDJ16_VALIDACAO_CUTOVER.md)
- Import producao: [MDJ20_VALIDACAO_IMPORTACAO_PRODUCAO.md](./MDJ20_VALIDACAO_IMPORTACAO_PRODUCAO.md)
- Validacao limpeza: [MDJ19_VALIDACAO_LIMPEZA.md](./MDJ19_VALIDACAO_LIMPEZA.md)
- ARQUITETURA §19.5: [ARQUITETURA.md](./ARQUITETURA.md)