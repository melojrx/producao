# MDJ-20 — Validacao importacao snapshot Supabase → producao

**Data:** 2026-06-19  
**Sprint:** MDJ-20 — Migracao de dados producao (snapshot congelado)  
**VPS:** `38.52.128.62` — stack `producao-prod`  
**Dominio:** `https://producao.costurai.com.br`

---

## Premissa operacional

- Backup Supabase congelado em **2026-05-31** (`/home/jrmelo/backup-supabase-20260531`)
- **Nenhum dado novo** no Supabase remoto desde o backup (operacao congelada)
- Importacao **one-shot** — sem sync incremental

---

## Metadados do snapshot (HU 20.1)

| Campo | Valor |
|---|---|
| Data backup | 2026-05-31 |
| Caminho local origem | `/home/jrmelo/backup-supabase-20260531` |
| Caminho VPS | `/opt/producao/backups/supabase-snapshot-20260531` |
| Schema SQL | `schema_public.sql` — sha256 `b7c1885638fb0ad024f09901dcff3e855b542b4a7c37a1c7caa027da01e72836` |
| Dados SQL | `restore_dados_v2.sql` — sha256 `055cf9a98a6b5af5e138232250baab07969ca555698948a5405ab8d08fdcf273` |
| Arquivos midia | 41 arquivos em `storage/` (~29 MB total) |
| Project ref Supabase | `jsuufbgdcqxogimmocof` |

### Baseline contagens restore (postgres_restore)

| Tabela | Registros |
|---|---:|
| setores | 6 |
| tipos_maquina | 7 |
| maquinas | 16 |
| operacoes | 207 |
| operadores | 33 |
| produtos | 38 |
| produto_operacoes | 1163 |
| turnos | 58 |
| turno_ops | 171 |
| turno_setores | 274 |
| turno_setor_ops | 850 |
| turno_setor_demandas | 848 |
| turno_setor_operacoes | 5083 |
| registros_producao | 1323 |
| qualidade_registros | 68 |
| qualidade_detalhes | 19 |
| qualidade_defeitos | 8 |
| metas_mensais | 1 |
| usuarios_sistema | 3 |

---

## Pipeline executado (HU 20.2–20.4)

```bash
# Local → VPS (rsync snapshot + scripts)
./scripts/mdj20/import-producao-vps.sh --dry-run

# Import real na VPS
ssh root@38.52.128.62 '/opt/producao/scripts/mdj20/import-producao-remote.sh --skip-restore-load'
```

Artefatos:

- `docker/compose/restore.vps.yml` — postgres_restore na rede `producao-prod_default`
- `scripts/mdj20/import-producao-remote.sh` — pipeline VPS
- Logs: `/opt/producao/backups/mdj20-logs/`
- Backup pre-import: `/opt/producao/backups/postgres-pre-mdj20/`

Checks pre-import:

- `python manage.py check` — OK
- `makemigrations --check --dry-run` — OK

---

## Resultado importacao Django (HU 20.3)

| Entidade | Importados | Observacao |
|---|---:|---|
| setores | 6 | = baseline |
| tipos_maquina | 7 | = baseline |
| maquinas | 16 | = baseline |
| operacoes | 207 | = baseline |
| operadores | 33 | = baseline |
| produtos | 38 | = baseline |
| produto_operacoes | 1163 | = baseline |
| turnos | 58 | = baseline |
| turno_ops | 171 | = baseline |
| turno_setores | 274 | = baseline |
| turno_setor_ops | 850 | = baseline |
| turno_setor_demandas | 848 | +2 sinteticas (850 Django) |
| turno_setor_operacoes | 5083 | = baseline |
| registros_producao | 1321 | -2 bloqueados (sem operacao_id) |
| qualidade_registros | 68 | = baseline |
| qualidade_detalhes | 19 | = baseline |
| qualidade_defeitos | 9 | +1 sintetico legado |
| metas_mensais | 1 | = baseline |
| usuarios_sistema | 3 | = baseline |

Diferencas controladas (mesmas de `MDJ_PRE_MDJ9_IMPORTACAO_REAL.md`):

- 2 registros producao sem `operacao_id` bloqueados
- 2 demandas setoriais sinteticas
- 1 defeito legado sintetico
- 78 avisos operador/setor textual legado (lacuna de modelagem)

### FKs criticas pos-import

| Check | Resultado |
|---|---:|
| `turnos_turnosetoroperacao.turno_setor_demanda_id IS NULL` | 0 |
| `producao_registroproducao.operacao_id IS NULL` | 0 |
| `qualidade_qualidaderegistro.revisor_id IS NULL` | 0 |

---

## Midia (HU 20.4)

- 41 arquivos copiados para `/app/media/` (produtos + operacoes)
- URLs no banco permanecem apontando Supabase Storage (compativel enquanto Supabase ativo)
- Arquivos locais disponiveis para cutover futuro de URLs
- Auditoria read-only em 2026-06-22: arquivo real encontrado em `/app/media/operacoes/5af9b936-7789-479e-bccf-303393bc0089/1776976008975-36ce80df-7fae-4871-bb60-f7b2876b567a.jpg`, mas `GET /media/operacoes/...jpg` retornou HTTP 404 via `127.0.0.1:8080` e via backend `127.0.0.1:8002`.
- Causa provavel: nginx prod encaminha `/media/` para o backend; o Django so registra rota de media local quando `DEBUG=True`. Em producao `DEBUG=False`, entao o volume existe, mas nao esta publicado por rota/alias.

---

## Usuarios Django (HU 20.5)

- Superuser bootstrap recriado: `admin@costurai.com.br` (credenciais em `/root/producao-bootstrap-credentials.txt`)
- 3 usuarios importados do snapshot (`usuarios_sistema`)
- Smoke login Django: OK (`scripts/smoke-stack-prod.mjs` 5/5)

---

## Paridade endpoints (HU 20.6)

Com JWT admin via proxy:

| Endpoint | Resultado |
|---|---|
| `GET /api/v1/cadastros/setores/` | 6 setores |
| `GET /api/v1/turnos/` | 58 turnos |
| `GET /api/v1/qualidade/defeitos/` | 8 catalogo (+1 sintetico filtrado ou inativo) |
| `GET /health/` | `{"status":"ok","database":"ok"}` |
| Smoke prod 5/5 | OK |

---

## Gate retomada operacional (HU 20.7)

- [x] Importacao + paridade OK
- [x] **Cutover flags Django ON** — executado em 2026-06-19 apos aceite
- [ ] Primeiro registro novo apenas via Django (pos-cutover) — dev OK 2026-06-22; VPS pendente
- [ ] MDJ-19 HU 19.5 desligamento Supabase — posterior, aceite explicito

**Estado atual:** cutover flags Django **ON** em 2026-06-19; frontend rebuildado; dashboard e login JWT Django validados em prod (2026-06-22).

### Pos-cutover correcoes (2026-06-22)

| Item | Status |
|---|---|
| `/media/` via nginx alias | ✅ HTTP 200 VPS |
| Build prod client bundle | ✅ Split `qualidade-turno-client-base.ts` |
| Dashboard SSR auth JWT | ✅ Refresh em memoria por request |
| MDJ-19 guards + polling | 🟡 Em andamento — ver `ESTADO_ATUAL.md` |

### Cutover flags producao (2026-06-19)

- 8 flags `NEXT_PUBLIC_USE_DJANGO_*=true` no `.env` VPS + rebuild frontend
- Validacao: login, 6 setores, 58 turnos, scanner operador/setor/demandas, dashboard, metas
- Apontamento: rota Django ativa (HTTP 400 saldo fisico no snapshot — esperado)
- Scripts: `scripts/mdj20/cutover-flags-prod-vps.sh`, `validar-cutover-prod-remote.sh`

---

## Proximo marco

1. Concluir MDJ-19 HU 19.4–19.6 (deprecar legado, homologacao browser)
2. Primeiro registro novo via Django em producao VPS (dev validado 2026-06-22)
3. Backup manual testado (`scripts/infra/backup_postgres.sh` + `backup_media.sh`)
4. Executar checklist `MDJ19_CHECKLIST_DESLIGAMENTO_SUPABASE.md` + aceite explicito HU 19.5
