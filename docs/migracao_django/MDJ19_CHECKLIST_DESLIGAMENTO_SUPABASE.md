# MDJ-19 — Checklist desligamento Supabase remoto

> **NAO executar desligamento do projeto Supabase cloud sem todos os itens abaixo marcados e aceite explicito do responsavel.**

**Data abertura:** 2026-06-22  
**Responsavel operacional:** _[preencher]_  
**Ambiente producao:** `https://producao.costurai.com.br`

---

## 1. Pre-requisitos concluidos (marcos anteriores)

- [x] MDJ-20 importacao snapshot + paridade Postgres prod
- [x] MDJ-21 deploy VPS + CI/CD
- [x] Cutover 8 flags Django ON (2026-06-19)
- [x] `/media/` servido via nginx alias (2026-06-22)
- [x] Login + dashboard admin funcionais com JWT Django (2026-06-22)
- [ ] Primeiro registro producao **novo** via Django apenas (VPS)
- [ ] Backup manual testado (`scripts/infra/backup_postgres.sh` + `backup_media.sh`)

---

## 2. Runtime frontend — zero dependencia Supabase

- [x] `deveUsarSupabaseBrowser()` implementado (`lib/django/flags.ts`)
- [x] Dashboard V2: polling Django substitui Realtime quando `DASHBOARD_READS` ON
- [x] `useRealtimeProducao`: desligado quando cutover completo
- [x] Console browser limpo (sem WS/CORS Supabase) — dashboard confirmado operador; DevTools opcional
- [x] `turnos-client.ts` sem path Supabase obrigatorio com flags ON (guard + doc rollback)
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

---

## 4. Smoke E2E manual (pos-cutover)

- [ ] Login `/login` → dashboard carrega
- [ ] Scanner `/scanner` — operador + setor + apontamento
- [ ] Painel TV `/tv` — polling ativo
- [ ] Relatorios `/admin/relatorios`
- [ ] Imagem produto/operacao via `/media/...`
- [ ] Logout limpa sessao JWT

---

## 5. Dados e backup

- [ ] Backup final Supabase exportado e checksum registrado
- [ ] Backup Postgres prod pos-operacao (`scripts/infra/backup_postgres.sh`)
- [ ] Backup midia prod (`scripts/infra/backup_media.sh`)
- [ ] Restore local de contingencia testado (documentar caminho dos arquivos)
- [ ] Paridade final de contagens Django vs snapshot (referencia MDJ-20)

---

## 6. Plano rollback (se necessario)

1. Reverter flags para `false` no `.env` VPS
2. Rebuild frontend: `docker compose -f docker-compose.prod.yml up -d --build frontend`
3. Confirmar `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` validos
4. Smoke Supabase path
5. Comunicar operadores — janela de indisponibilidade

**Tempo estimado rollback:** ~15 min (rebuild frontend + restart proxy).

---

## 7. Desligamento Supabase cloud (executar somente apos aceite)

- [ ] **Usuario autoriza desligamento do Supabase remoto** — data: ___/___/___ assinatura: _______
- [ ] Pausar ou remover projeto Supabase cloud (nao executar antes da linha acima)
- [ ] Remover `NEXT_PUBLIC_SUPABASE_*` do `.env` VPS (opcional — apos periodo de observacao)
- [ ] Remover dependencias `@supabase/*` do repositorio (sprint futura pos-observacao)
- [ ] Atualizar `ESTADO_ATUAL.md` — migracao concluida

---

## Referencias

- Inventario detalhado: [MDJ19_INVENTARIO_SUPABASE_BROWSER.md](./MDJ19_INVENTARIO_SUPABASE_BROWSER.md)
- Cutover dev: [MDJ16_VALIDACAO_CUTOVER.md](./MDJ16_VALIDACAO_CUTOVER.md)
- Import producao: [MDJ20_VALIDACAO_IMPORTACAO_PRODUCAO.md](./MDJ20_VALIDACAO_IMPORTACAO_PRODUCAO.md)
- ARQUITETURA §19.5: [ARQUITETURA.md](./ARQUITETURA.md)
