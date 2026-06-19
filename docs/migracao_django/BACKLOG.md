# BACKLOG.md — Migracao Django + PostgreSQL

> Plano macro da frente paralela de migracao backend.
> O detalhamento operacional por HU fica em `TASKS.md`.

---

## Status geral

| Sprint | Nome | Status | Objetivo |
|---|---|---|---|
| MDJ-0 | Fundacao documental da migracao | ✅ Concluida | Criar PRD, BACKLOG e TASKS proprios da frente |
| MDJ-1 | Inventario do sistema atual | ✅ Concluida | Mapear tabelas, RPCs, triggers, Server Actions, queries, storage, auth e invariantes |
| MDJ-2 | Plano de backup e restore do Supabase | ✅ Concluida documentalmente | Definir exportacao, validacao, restore e rollback dos dados de homologacao |
| MDJ-3 | Arquitetura Django alvo | ✅ Concluida | Definir apps, camadas, API, padroes DRF/Ninja, permissoes e testes |
| MDJ-4 | Ambiente local Django + PostgreSQL | ✅ Concluida | Criar backend paralelo local sem integrar ao frontend atual |
| MDJ-5 | Modelagem inicial e migrations Django | ✅ Concluida | Recriar schema essencial em Django/PostgreSQL com constraints e indices |
| MDJ-6 | Importacao inicial read-only | ✅ Concluida | Importar dados do Supabase para banco destino e validar contagens/integridade |
| MDJ-7 | API read-only de cadastros e produtos | ✅ Concluida | Expor endpoints de leitura e comparar com Supabase atual |
| MDJ-8 | API read-only de turnos, dashboard e qualidade | ✅ Concluida | Expor leituras operacionais complexas com paridade funcional |
| MDJ-9 | Primeira mutacao nao critica | ✅ Concluida | Migrar o cadastro de tipos de defeito como escrita segura antes dos fluxos de apontamento |
| MDJ-10 | Mutacoes criticas de producao | ✅ Concluida | Migrar apontamento produtivo com transacao, saldo fisico e concorrencia |
| MDJ-11 | Mutacoes de qualidade | ✅ Concluida | Migrar revisao de qualidade, defeitos e indicadores |
| MDJ-12 | Turno, fechamento e carry-over | ✅ Concluida | Abertura, encerramento, Qualidade no roteiro, sincronizacao e carry-over portados com 63 testes |
| MDJ-13 | Auth, permissoes e Django Admin | ✅ Concluida | JWT + permissoes de dominio + autoria segura de Qualidade + Admin + 71 testes |
| MDJ-14 | Storage e arquivos | ✅ Concluida | Storage local Django para imagens de produtos/operacoes + HU 14.7 + 96 testes |
| MDJ-15 | Infra VPS, EasyPanel e observabilidade | ✅ Concluida | Scripts backup/restore, `production.py`; consumido por MDJ-18/21 |
| MDJ-16 | Cutover controlado por modulo (dev local) | ✅ Concluida (2026-06-17) | Feature flags + frontend apontando para Django em dev (`localhost:8001`) com fallback Supabase; relatorio `MDJ16_VALIDACAO_CUTOVER.md` |
| MDJ-17 | Stack Docker dev integrada | ✅ Concluida (2026-06-17) | Compose modular: `docker/compose/dev.full.yml` + wrappers raiz — `MDJ17_VALIDACAO_STACK_DEV.md`, `MDJ17_DOCKER_AUDIT.md` |
| MDJ-18 | VPS, dominio e producao | ✅ Concluida (pre-deploy) | Compose prod Docker (back+front+db+nginx), `producao.costurai.com.br`, `MDJ18_VALIDACAO_PRODUCAO.md` |
| MDJ-19 | Limpeza legado Supabase e preparacao desligamento | 🧭 Planejada | Guards browser, polling dashboard Django, deprecar `configuracao_turno`, checklist desligamento Supabase remoto |
| MDJ-20 | Migracao de dados producao (snapshot congelado) | ✅ Concluida | Import one-shot 2026-06-19 — ver `MDJ20_VALIDACAO_IMPORTACAO_PRODUCAO.md` |
| MDJ-21 | Deploy VPS producao | 🟡 **Proxima** | Subir stack em `38.52.128.62`, TLS, smoke publico — runbook `MDJ21_RUNBOOK_DEPLOY_VPS.md` |

---

## Direcao aprovada

Arquitetura alvo (visao de longo prazo):

- Next.js continua como frontend.
- Django assume o dominio de negocio.
- PostgreSQL vira banco principal (hoje: container local em dev).
- API REST documentada por OpenAPI sera o contrato entre frontend e backend.
- Realtime sera tratado depois da paridade funcional, com polling/SSE antes de WebSocket.

### Fases operacionais (decisao em 2026-06-15)

| Fase | Sprint | Quando | O que fazer |
|---|---|---|---|
| **A — Dev** | MDJ-16 | ✅ Concluida (2026-06-17) | Cutover por modulo no ambiente de desenvolvimento. Supabase remoto como fallback via flags OFF. |
| **B — Stack integrada** | MDJ-17 | ✅ Concluida (2026-06-17) | Compose modular dev: `docker/compose/dev.full.yml`. |
| **C — Producao** | MDJ-18 + MDJ-21 | Artefatos ✅; **deploy VPS proximo** | MDJ-18 entregou compose prod; MDJ-21 executa deploy em `producao.costurai.com.br`. Media em volume local — **S3 fora de escopo**. |
| **D — Pos-cutover** | MDJ-19 | Apos MDJ-16 (paralelo OK) | Limpar legado Supabase no browser, polling Django, checklist desligamento Supabase remoto. |
| **E — Dados producao** | MDJ-20 | Apos deploy MDJ-21 | Snapshot congelado (backup ja feito; zero dados novos) → Postgres prod + midia + paridade. |

**Regras atuais (jun/2026):**

- **Proximo marco:** deploy VPS (MDJ-21) — runbook `MDJ21_RUNBOOK_DEPLOY_VPS.md`.
- Visao consolidada: `ESTADO_ATUAL.md`.
- **Flags Django OFF** na primeira subida em producao; cutover apos MDJ-20.
- Storage de imagens: volume Docker local (`media_data`), como na MDJ-14.
- **S3 fora de escopo** ate nova decisao explicita.
- Dev: `npm run dev` + compose dev **ou** `npm run dev:docker`.
- Backup Supabase **congelado** — sem novos dados desde o backup; importacao MDJ-20 e one-shot.

Arquitetura alvo (referencia):

- Django Admin apoia suporte; **nao** exposto publicamente na v1 (conflito rota `/admin/` Next.js).
- Docker Compose na VPS Ubuntu — dominio unico via nginx.

---

## Marco MDJ-0 — Fundacao documental

**Status:** ✅ Concluida documentalmente

Nota operacional em `2026-06-04`: o restore validado anteriormente em container PostgreSQL separado foi perdido. O marco permanece concluído como documentação e histórico de validação. O restore foi recriado e revalidado na MDJ-6, conforme `MDJ6_RESTORE_READONLY_VALIDACAO.md`; qualquer importação real futura deve confirmar o container de restore ativo e healthy antes de executar.

Entregaveis:

- `docs/migracao_django/PRD.md`
- `docs/migracao_django/BACKLOG.md`
- `docs/migracao_django/TASKS.md`

Objetivo:

- Registrar a decisao Django + PostgreSQL.
- Separar a frente de migracao da sprint principal.
- Definir estrategia faseada, sem big bang.
- Registrar que os dados de homologacao no Supabase sao patrimonio operacional e precisam de backup/restore testado.

---

## Marco MDJ-1 — Inventario do sistema atual

**Status:** ✅ Concluida

Objetivo:

Mapear o sistema atual antes de qualquer scaffold Django.

Entregaveis:

- mapa de tabelas, views e relacionamentos ✅ iniciado em `INVENTARIO_SCHEMA_ATUAL.md`
- mapa de RPCs e triggers ✅ iniciado em `INVENTARIO_RPC_TRIGGERS.md`
- mapa de Server Actions e queries Supabase ✅ documentado em `INVENTARIO_ACTIONS_QUERIES.md`
- mapa de buckets/storage ✅ documentado em `INVENTARIO_STORAGE_AUTH.md`
- mapa de Auth e usuarios ✅ documentado em `INVENTARIO_STORAGE_AUTH.md`
- lista de invariantes por dominio ✅ documentada em `INVENTARIO_INVARIANTES.md`
- lista de testes existentes que devem ser reaproveitados como oraculo de paridade ✅ documentada em `INVENTARIO_INVARIANTES.md`

---

## Marco MDJ-2 — Backup e restore

**Status:** ✅ Concluida

Objetivo:

Definir a estrategia de preservacao dos dados atuais de homologacao.

Entregaveis:

- comando/processo de exportacao do schema ✅ documentado em `PLANO_BACKUP_RESTORE.md`
- comando/processo de exportacao dos dados ✅ documentado em `PLANO_BACKUP_RESTORE.md`
- inventario de storage ✅ documentado em `INVENTARIO_STORAGE_AUTH.md` e `PLANO_BACKUP_RESTORE.md`
- banco PostgreSQL de restore ✅ documentado em `PLANO_BACKUP_RESTORE.md` e revalidado em `MDJ6_RESTORE_READONLY_VALIDACAO.md`
- validacao por contagem/checksum ✅ baseline de 22 tabelas/11.187 registros documentado
- plano de rollback ✅ documentado em `PLANO_BACKUP_RESTORE.md`
- criterio de aceite para considerar backup confiavel ✅ documentado em `PLANO_BACKUP_RESTORE.md`

---

## Marco MDJ-3 — Arquitetura Django alvo

**Status:** ✅ Concluida

Objetivo:

Definir como o dominio sera organizado no backend dedicado antes de criar codigo.

Entregaveis:

- apps Django ✅ documentados em `ARQUITETURA.md`
- camadas internas: models, selectors, services, serializers, views, permissions ✅ documentadas em `ARQUITETURA.md`
- padrao de transacoes ✅ documentado em `ARQUITETURA.md`
- padrao de erros de dominio ✅ documentado em `ARQUITETURA.md`
- padrao de testes ✅ documentado em `ARQUITETURA.md`
- padrao de OpenAPI ✅ documentado em `ARQUITETURA.md`
- padrao de integracao gradual com Next.js ✅ documentado em `ARQUITETURA.md`

---

## Marco MDJ-4 — Ambiente local Django + PostgreSQL

**Status:** ✅ Concluida

Objetivo:

Criar o scaffold minimo Django dockerizado, paralelo ao sistema atual, sem models de dominio, sem integracao com Next.js e sem tocar no Supabase.

Entregaveis:

- `backend/` com projeto Django minimo ✅ criado
- settings modulares `base.py`, `local.py` e `production.py` ✅ criados
- endpoint `GET /health/` ✅ criado e validado
- `backend/Dockerfile` multi-stage ✅ criado e buildado
- `docker-compose.dev.yml` com `backend` e `db` PostgreSQL 16 ✅ criado e validado
- migrations padrao Django ✅ aplicadas no banco local da aplicacao
- teste focado do healthcheck ✅ passou

---

## Marco MDJ-5 — Modelagem inicial e migrations Django

**Status:** ✅ Concluida

Objetivo:

Recriar o schema essencial em Django/PostgreSQL com apps de dominio, models, constraints e indices iniciais, sem importar dados reais e sem integrar o frontend.

Entregaveis:

- apps Django `accounts`, `cadastros`, `produtos`, `turnos`, `producao`, `qualidade`, `metas`, `relatorios`, `scanner` e `infra` ✅ criados
- pacote Python `shared/` ✅ criado
- models de usuarios, operadores, cadastros e produtos/roteiro versionado ✅ criados
- models de turnos, demandas setoriais, operacoes atomicas, producao, qualidade e metas ✅ criados
- migrations iniciais dos apps de dominio ✅ geradas
- migrations aplicadas em PostgreSQL local limpo ✅ validadas
- constraints e indices criticos iniciais ✅ inspecionados no banco local

---

## Marco MDJ-6 — Importacao inicial read-only

**Status:** ✅ Concluida

Objetivo:

Recriar o restore Supabase em PostgreSQL isolado e validar o snapshot de homologacao como fonte read-only de paridade, sem misturar dados reais no banco operacional Django.

Entregaveis:

- `docker-compose.restore.yml` com `postgres_restore` isolado ✅ criado
- restore de `schema_public.sql` em PostgreSQL 16 ✅ validado
- restore de `restore_dados_v2.sql` ✅ validado
- contagens comparadas contra `dados_*.json` ✅ sem divergencias
- relatorio `MDJ6_RESTORE_READONLY_VALIDACAO.md` ✅ criado
- banco Django e banco de restore separados por volumes distintos ✅ validado

---

## Marco MDJ-7 — API read-only de cadastros e produtos

**Status:** ✅ Concluida

Objetivo:

Expor endpoints DRF de leitura para cadastros e produtos, mantendo o backend Django paralelo e sem mutacoes.

Entregaveis:

- serializers de cadastros e produtos ✅ criados
- selectors de cadastros e produtos ✅ criados
- ViewSets read-only para setores, operacoes, maquinas, tipos de maquina, operadores, produtos e roteiro ✅ criados
- endpoints locais respondendo JSON valido ✅ validados
- POST/PUT/PATCH/DELETE fora do escopo ✅ preservado
- relatorio `MDJ7_VALIDACAO_PARIDADE.md` ✅ criado
- divergencias de mapeamento encaminhadas para `PLANO_IMPORTACAO_DADOS_REAIS.md` ✅ documentadas

---

## Marco MDJ-8 — API read-only de turnos, dashboard e qualidade

**Status:** ✅ Concluida

Objetivo:

Expor leituras operacionais complexas de turnos, producao, qualidade e dashboard antes de qualquer mutacao Django.

Entregaveis:

- selectors de turnos, producao, qualidade e dashboard ✅ criados
- ViewSets read-only de turnos, OPs, setores, demandas, operacoes, producao e qualidade ✅ criados
- endpoints de dashboard operacional ✅ criados
- comparacao contra restore Supabase local ✅ documentada
- relatorio `MDJ8_VALIDACAO_PARIDADE.md` ✅ criado
- plano `PLANO_IMPORTACAO_DADOS_REAIS.md` ✅ criado como gate antes da MDJ-9

---

## Marco MDJ-9 — Primeira mutacao nao critica

**Status:** ✅ Concluida

Objetivo:

Migrar a primeira escrita Django em escopo controlado, usando o cadastro de tipos de defeito (`qualidade_defeitos`) como mutacao nao critica antes de abrir apontamento produtivo, turno, saldo fisico, revisao de qualidade operacional ou integracao com o frontend.

Entregaveis planejados:

- escopo da primeira mutacao documentado ✅ aberto em `TASKS.md`
- service transacional para criar, editar, inativar e reativar tipos de defeito ✅ criado
- endpoint DRF de mutacao isolado para o catalogo de defeitos ✅ criado
- protecao contra exclusao destrutiva de defeitos com historico
- testes de service/API cobrindo validacao, transacao e historico ✅ criados
- validacao local com dados reais importados em `MDJ_PRE_MDJ9_IMPORTACAO_REAL.md` ✅ registrada em `MDJ9_VALIDACAO_MUTACAO_NAO_CRITICA.md`
- nenhuma alteracao no Supabase remoto, frontend, Server Actions ou queries Next.js ✅ preservada

---

## Marco MDJ-10 — Mutacoes criticas de producao

**Status:** ✅ Concluida

Objetivo:

Migrar o apontamento produtivo atomico por operacao para Django, preservando transacao, locks, saldo fisico da OP, linhagem de carry-over, consolidacao de progresso e isolamento em relacao ao frontend e ao Supabase remoto.

Entregaveis planejados:

- escopo da sprint e primeira mutacao critica documentados ✅ aberto em `TASKS.md`
- selector/domain function para linhagem de OP e saldo fisico restante por operacao ✅ criado
- service transacional de apontamento atomico por `TurnoSetorOperacao` ✅ criado
- consolidacao explicita de `RegistroProducao`, `TurnoSetorOperacao`, `TurnoSetorDemanda` e `TurnoOp` ✅ criada
- endpoint DRF isolado para apontamento atomico ✅ criado
- testes unitarios e API ✅ criados; locks transacionais implementados no service
- validacao local com dados reais importados e rollback controlado ✅ registrada em `MDJ10_VALIDACAO_APONTAMENTO_PRODUCAO.md`
- nenhuma alteracao no Supabase remoto, frontend, Server Actions ou queries Next.js ✅ preservada

---

## Marco MDJ-11 — Mutacoes de qualidade

**Status:** ✅ Concluida

Objetivo:

Migrar a revisao operacional de Qualidade para Django em escopo reduzido, preservando transacao, locks, validacao de saldo fisico por aprovadas, multiplos defeitos, indicadores separados da producao e isolamento em relacao ao frontend e ao Supabase remoto.

Entregaveis planejados:

- escopo reduzido da sprint documentado em `TASKS.md` ✅
- service transacional de revisao operacional de Qualidade ✅ criado
- endpoint DRF isolado para registrar revisao de Qualidade ✅ criado
- testes de service e API cobrindo aprovadas, reprovadas, defeitos obrigatorios e bloqueios de dominio ✅ criados
- validacao local com dados reais importados e rollback controlado ✅ registrada em `MDJ11_VALIDACAO_REVISAO_QUALIDADE.md`
- nenhuma alteracao no Supabase remoto, frontend, Server Actions ou queries Next.js ✅ preservada

---

## Marco MDJ-14 — Storage e arquivos

**Status:** ✅ Concluida

Complemento HU 14.7: rollback pos-commit ajustado para preservar a nova imagem quando a limpeza do arquivo anterior falhar; suite revalidada com 96 testes OK.

Objetivo:

Migrar storage de imagens de produtos e operacoes para Django com volume local, validacao equivalente ao TypeScript e endpoints API protegidos por JWT.

Entregaveis:

- configuracao `MEDIA_ROOT` / `MEDIA_URL` + volume Docker ✅
- utilitarios em `shared/` e service generico em `infra/services/` ✅
- services transacionais de upload/remocao para produto e operacao ✅
- endpoints DRF multipart com `IsSupervisor` ✅
- testes de service e API (+25) ✅
- relatorio `MDJ14_VALIDACAO_STORAGE.md` ✅
- nenhuma alteracao no Supabase remoto, frontend ou Server Actions ✅

---

## Marco MDJ-15 — Infra VPS, EasyPanel e observabilidade

**Status:** ✅ Concluida — scripts e settings consumidos por MDJ-18/21

> Artefatos implementados antecipadamente. Permanecem no repositorio para a fase de producao futura. **Nao e necessario subir `docker-compose.prod.yml`, configurar S3 ou CORS de Vercel durante a migracao em dev.**

Complemento HU 15.8: URL absoluta de storage externo/S3 preservada sem prefixo indevido de `MEDIA_BASE_URL`; compose prod agora exige `DJANGO_SECRET_KEY` e `POSTGRES_PASSWORD` antes de gerar config/subir stack; suite revalidada com 97 testes OK.

Objetivo:

Preparar deploy operacional do backend Django em VPS com Docker Compose de producao, settings endurecidos, healthcheck robusto, rotina de backup/restore e storage configuravel (volume local ou S3).

Entregaveis:

- `docker-compose.prod.yml` com backend + db + volumes `postgres_data` e `media_data` ✅
- `backend/pcp_project/config/production.py` endurecido (seguranca, logging, media, S3 opcional) ✅
- scripts operacionais `scripts/infra/backup_postgres.sh`, `restore_postgres.sh`, `backup_media.sh` ✅
- healthcheck com verificacao de banco em `GET /health/` e healthchecks no compose ✅
- `.env.example` com variaveis de producao documentadas ✅
- relatorio `MDJ15_VALIDACAO_INFRA.md` ✅
- nenhuma alteracao no frontend Next.js, Supabase remoto ou cutover MDJ-16 ✅

---

## Marco MDJ-16 — Cutover controlado por modulo (dev local)

**Status:** ✅ Concluida (2026-06-17)

Objetivo:

Trocar a origem de dados do frontend Next.js para o backend Django **em desenvolvimento local**, por modulo, com feature flags, fallback imediato para Supabase e rollback operacional — sem big bang, sem VPS e sem remover caminhos Supabase antes da homologacao de cada modulo.

Ambiente alvo desta sprint:

- Backend: `docker compose -f docker-compose.dev.yml` (porta **8001**)
- Frontend: `npm run dev` na maquina host (integracao em container → MDJ-17)
- Banco: PostgreSQL do compose dev + dados importados (MDJ-6)
- Storage: volume `media_data` local (MDJ-14) — sem S3

Entregaveis concluidos:

- hardening dos scripts operacionais de backup/restore ✅ (util para dev; producao → MDJ-18)
- CORS/S3/prod settings ✅ preparatorios (MDJ-15/16.3–16.4); **nao bloqueiam dev**
- ~~`STATIC_ROOT` + collectstatic VPS~~ → adiado para MDJ-18
- cliente HTTP/JWT Django no frontend (`lib/django/`) apontando para `http://localhost:8001` ✅
- utilitario de feature flags com 8 flags `NEXT_PUBLIC_USE_DJANGO_*` desligadas por padrao ✅
- cutover read-only por modulo (cadastros, scanner, dashboard/metas) com testes de paridade ✅
- cutover de auth JWT e de escritas criticas com aceite documentado ✅
- relatorio `MDJ16_VALIDACAO_CUTOVER.md` com matriz flag × modulo × rollback **em dev** ✅
- Supabase remoto permanece intacto; caminhos Supabase no frontend preservados enquanto flag estiver OFF ✅

Referencia vinculante: `ARQUITETURA.md` secao 19 (flags, fallback, criterios de cutover).

---

## Marco MDJ-17 — Stack Docker dev integrada

**Status:** ✅ Concluida (2026-06-17)

**Pre-requisito:** MDJ-16 concluida e homologada em dev (frontend host + backend container).

Objetivo:

Unificar o ambiente de desenvolvimento em um unico Docker Compose com tres servicos: **Django (dev)**, **PostgreSQL** e **Next.js (dev)** — reproduzindo a integracao real sem VPS, dominio ou S3.

Entregaveis:

- `docker/compose/dev.base.yml` — fonte unica backend+db ✅
- `docker/compose/dev.frontend.yml` + `docker/compose/dev.full.yml` (include) ✅
- `docker/frontend/Dockerfile.dev` (Node 20, `npm ci`) ✅
- Wrappers `docker-compose.dev.yml` / `docker-compose.dev.full.yml` na raiz ✅
- `docker/README.md` — cheat sheet ✅
- `.dockerignore` na raiz ✅
- scripts `dev:docker`, `dev:docker:backend` em `package.json` ✅
- `NEXT_PUBLIC_DJANGO_API_URL=http://localhost:8001` (browser no host, nao `backend:8000`) ✅
- hot-reload via volumes (`.:/app` + volume anonimo `node_modules`) ✅
- relatorios `MDJ17_VALIDACAO_STACK_DEV.md`, `MDJ17_DOCKER_AUDIT.md` ✅

---

## Marco MDJ-18 — VPS, dominio e producao

**Status:** ✅ Concluida (artefatos pre-deploy — 2026-06-17)

**Dominio:** `producao.costurai.com.br` (DNS A → VPS `38.52.128.62`).

Entregue:

- compose prod modular: backend + frontend standalone + db + nginx (`docker/compose/prod.*`)
- `Dockerfile.prod`, `docker/nginx/prod.conf`, wrapper `docker-compose.prod.yml`
- `STATIC_ROOT` + WhiteNoise + `collectstatic` no entrypoint
- CORS/CSRF documentados para dominio unico
- `MDJ18_VALIDACAO_PRODUCAO.md` + `scripts/smoke-stack-prod.mjs`
- **sem** deploy VPS executado; **sem** S3

Deploy na VPS: seguir checklist em `MDJ18_VALIDACAO_PRODUCAO.md`.

---

## Marco MDJ-19 — Limpeza legado Supabase e preparacao desligamento

**Status:** 🧭 Planejada

**Pre-requisito:** MDJ-16 concluida; MDJ-17 recomendada. Executavel em paralelo com MDJ-18.

Objetivo:

Fechar deferidos da MDJ-16 que ainda puxam Supabase no browser (Realtime, refresh auth, `configuracao_turno` legado) e preparar — sem executar ainda — o desligamento do Supabase remoto.

Entregaveis previstos:

- helper `deveUsarSupabaseBrowser()` + guards em hooks Realtime
- polling Django no dashboard V2 (substitui WebSocket Supabase)
- deprecacao de `configuracao_turno` / monitor legado no frontend
- `MDJ19_CHECKLIST_DESLIGAMENTO_SUPABASE.md` + `MDJ19_VALIDACAO_LIMPEZA.md`
- **nao** desliga Supabase remoto sem checkbox de aceite do usuario (HU 19.5)

Remanescente pos-MDJ-19 (fora de escopo):

- `relatorios-v2.ts` cutover completo
- Django Channels / WebSocket nativo
- models Django para `configuracao_turno` (historico opcional)

---

## Marco MDJ-20 — Migracao de dados producao (snapshot congelado)

**Status:** 🧭 Planejada

**Pre-requisito:** MDJ-18 deploy na VPS concluido (`MDJ21_RUNBOOK_DEPLOY_VPS.md`); ensaio local opcional com `docker-compose.prod.yml`.

**Premissa (2026-06-17):** backup Supabase **ja realizado**; desde entao o sistema **nao recebe dados novos** e so voltara a operar quando Django estiver funcional em producao. Importacao e **one-shot** do snapshot — **sem sync incremental** com Supabase remoto.

Objetivo:

Popular Postgres de producao com dados reais, midia e usuarios Django; validar paridade; liberar gate para cutover de flags.

Entregaveis previstos:

- metadados + baseline de contagens do snapshot (`HU 20.1`)
- import Postgres prod via pipeline `PLANO_IMPORTACAO_DADOS_REAIS.md` (referencia: `MDJ_PRE_MDJ9_IMPORTACAO_REAL.md`)
- midia no volume `media_data`
- usuarios admin/supervisor Django
- `MDJ20_VALIDACAO_IMPORTACAO_PRODUCAO.md`
- gate HU 20.7 antes de flags Django ON em producao

Ordem macro pos-MDJ-18:

```text
MDJ-21 (deploy VPS) → MDJ-20 (dados snapshot) → cutover flags prod → MDJ-19 desligamento Supabase (aceite explicito)
```

MDJ-19 pode avancar em **dev** em paralelo; nao substitui MDJ-20.

---

## Marco MDJ-21 — Deploy VPS producao

**Status:** 🟡 Proxima sprint operacional

**Pre-requisito:** MDJ-18 concluida (artefatos + smoke local 5/5).

**Objetivo:** Subir stack Docker prod na VPS Hostinger (`38.52.128.62`), TLS em `producao.costurai.com.br`, smoke publico, backups agendados. Banco com schema migrado e **sem dados de negocio** (import MDJ-20 depois).

Entregaveis:

- runbook `MDJ21_RUNBOOK_DEPLOY_VPS.md`
- evidencia `MDJ21_VALIDACAO_DEPLOY_VPS.md` (pos-execucao)
- flags Django **OFF** na primeira subida

Fora de escopo: importacao de dados, cutover flags, desligamento Supabase.

---

## Marco MDJ-7 em diante

MDJ-7 e MDJ-8 foram concluidas como APIs read-only. A importacao real controlada descrita em `PLANO_IMPORTACAO_DADOS_REAIS.md` foi executada localmente antes da MDJ-9 e registrada em `MDJ_PRE_MDJ9_IMPORTACAO_REAL.md`, usando `MDJ7_VALIDACAO_PARIDADE.md` e `MDJ8_VALIDACAO_PARIDADE.md` como entradas de mapeamento. A MDJ-9 foi aberta para uma mutacao nao critica e isolada no catalogo de defeitos.

O criterio de seguranca e simples: primeiro entender, proteger e provar paridade com dados reais locais; depois migrar mutacoes.

---

## Dependencias macro

```text
MDJ-0 -> MDJ-1 -> MDJ-2 -> MDJ-3 -> MDJ-4 -> MDJ-5 -> MDJ-6
                                               -> MDJ-7 -> MDJ-8
MDJ-8 -> MDJ-9 -> MDJ-10 -> MDJ-11 -> MDJ-12 -> MDJ-13 -> MDJ-14 -> MDJ-15 -> MDJ-16 -> MDJ-17 -> MDJ-18 -> MDJ-21 -> MDJ-20
                                                                                              \-> MDJ-19 (paralelo pos-16, dev)
MDJ-20 -> cutover flags prod -> MDJ-19 HU 19.5 (desligamento Supabase remoto, aceite explicito)
```

Sprints de implementacao Django nao devem iniciar antes da conclusao do inventario, backup/restore e arquitetura alvo.
