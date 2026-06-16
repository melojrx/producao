# TASKS.md — Execucao operacional da migracao Django

> Documento de trabalho da frente `docs/migracao_django`.
> Cada HU deve ser executada, validada e marcada com evidencia antes de avancar.

---

## Instrucao para o agente

Antes de executar qualquer HU desta frente:

1. Ler `AGENTS.md`.
2. Ler `docs/PRD.md`.
3. Ler `docs/TASKS.md`.
4. Ler `docs/migracao_django/PRD.md`.
5. Ler `docs/migracao_django/BACKLOG.md`.
6. Ler este arquivo.

Regras:

- Esta frente e paralela a aplicacao atual.
- Nao alterar codigo de producao durante as sprints documentais MDJ-0 a MDJ-3.
- Nao criar projeto Django antes de concluir inventario, backup/restore e arquitetura alvo.
- Nao executar SQL remoto sem aprovacao explicita.
- Nao tocar em dados de homologacao sem backup validado e plano de rollback.
- Toda decisao deve preservar as invariantes de dominio do PRD principal e do PRD desta frente.
- Toda HU concluida deve ter evidencia escrita logo abaixo do checkbox.

---

## SPRINT MDJ-0 — Fundacao documental da migracao

**Status:** ✅ Concluida
**Objetivo:** criar a documentacao propria da frente paralela de migracao Django + PostgreSQL.
**Pre-requisito:** decisao arquitetural aprovada pelo usuario em conversa.

Decisao de dominio/arquitetura:

- Django + PostgreSQL sera a direcao recomendada para backend dedicado.
- Next.js permanece como frontend.
- A migracao sera faseada, segura, documentada e sem big bang.
- Dados atuais de homologacao no Supabase sao importantes e precisam de backup, restore e validacao.
- A frente deve viver em `docs/migracao_django`, sem misturar o backlog principal da aplicacao.

- [x] **HU MDJ-0.1 — Como produto, quero criar uma area documental isolada para a migracao Django, para conduzir a frente sem interferir nas sprints principais.**
  **Prioridade:** P0
  **Risco:** Baixo

  Regras:
  - criar `docs/migracao_django/`
  - criar `PRD.md`, `BACKLOG.md` e `TASKS.md`
  - registrar que a frente e paralela e nao altera a aplicacao atual

  **Evidencia esperada:** pasta `docs/migracao_django` existe com os tres documentos base.

  **Evidencia:** criada a pasta `docs/migracao_django` com `PRD.md`, `BACKLOG.md` e `TASKS.md`, formalizando a frente paralela Django + PostgreSQL sem alterar codigo de producao.

- [x] **HU MDJ-0.2 — Como produto, quero registrar a decisao Django + PostgreSQL, para orientar as proximas decisoes tecnicas com clareza.**
  **Prioridade:** P0
  **Risco:** Baixo

  Regras:
  - registrar Django como backend preferido
  - registrar PostgreSQL em VPS como banco alvo
  - registrar Next.js como frontend preservado
  - registrar Django Admin, API REST/OpenAPI, Docker/EasyPanel e realtime posterior

  **Evidencia esperada:** `PRD.md` da migracao descreve a arquitetura alvo e a justificativa da escolha.

  **Evidencia:** `docs/migracao_django/PRD.md` documenta Django + PostgreSQL como stack alvo, mantendo Next.js no frontend, API REST/OpenAPI, Django Admin, VPS Ubuntu, Docker/EasyPanel e realtime como fase posterior.

- [x] **HU MDJ-0.3 — Como mantenedor, quero decompor a migracao em fases, para evitar big bang e preservar os dados homologados.**
  **Prioridade:** P0
  **Risco:** Medio

  Regras:
  - registrar inventario primeiro
  - registrar backup/restore antes de codigo critico
  - registrar backend paralelo read-only antes de mutacoes
  - registrar migracao de uma mutacao por vez
  - registrar cutover controlado por modulo

  **Evidencia esperada:** `BACKLOG.md` e `TASKS.md` organizam sprints MDJ por fases.

  **Evidencia:** `docs/migracao_django/BACKLOG.md` organiza a frente em marcos MDJ-0 a MDJ-16, e este `TASKS.md` define as primeiras sprints documentais antes de qualquer scaffold Django.

---

## SPRINT MDJ-1 — Inventario do sistema atual

**Status:** ✅ Concluida
**Objetivo:** mapear o sistema Supabase/Next atual antes de qualquer implementacao Django.
**Pre-requisito:** Sprint MDJ-0 concluida.

Decisao de seguranca:

- Esta sprint e somente documental e analitica.
- Nao deve alterar schema, dados, codigo de producao ou infraestrutura.
- O resultado deve permitir estimar a migracao com base em contratos reais, nao memoria ou suposicao.

- [x] **HU MDJ-1.1 — Como arquiteto, quero mapear tabelas, views e relacionamentos atuais, para saber exatamente o que deve existir no PostgreSQL destino.**
  **Prioridade:** P0
  **Risco:** Alto

  Tarefas:
  - listar tabelas Supabase atuais a partir de `types/supabase.ts` e scripts SQL
  - separar cadastros, operacao de turno, producao, qualidade, metas, auth auxiliar e relatorios
  - identificar views ainda usadas
  - identificar chaves, constraints, indices e campos historicos
  - documentar tabelas legadas que ainda precisam ser preservadas

  **Evidencia esperada:** documento de inventario lista entidades atuais, finalidade, origem e prioridade de migracao.

  **Evidencia:** criado `docs/migracao_django/INVENTARIO_SCHEMA_ATUAL.md` com inventario inicial de 23 tabelas e 3 views detectadas em `types/supabase.ts`, agrupadas por dominio, relacoes principais, prioridade de modelagem Django, constraints/indices relevantes, objetos legados e lacunas para as proximas HUs. A analise cruzou scripts SQL e marcou como divergencia a validar que `types/supabase.ts` ainda lista `qualidade_lotes` e `registrar_revisao_lote_qualidade`, embora a Sprint 51.12 documente a remocao remota desses objetos.

- [x] **HU MDJ-1.2 — Como arquiteto, quero mapear RPCs, triggers e funcoes SQL, para decidir o que vira service transacional Django.**
  **Prioridade:** P0
  **Risco:** Alto

  Tarefas:
  - revisar `scripts/*.sql`
  - listar RPCs chamadas pelo codigo
  - listar triggers com efeito de dominio
  - classificar cada funcao como leitura, escrita, sincronizacao, backfill, validacao ou legado
  - destacar funcoes criticas: apontamento, qualidade, carry-over, fechamento e roteiro vigente

  **Evidencia esperada:** inventario identifica quais RPCs/triggers devem ser reimplementadas em Django services.

  **Evidencia:** criado `docs/migracao_django/INVENTARIO_RPC_TRIGGERS.md` com mapeamento das RPCs chamadas pelo codigo, funcoes tipadas, funcoes SQL de derivacao/sincronizacao/apontamento/qualidade/saldo fisico/backfill, triggers com efeito de dominio e candidatos a services/selectors Django. O documento tambem registra riscos de divergencia entre `types/supabase.ts` e a Sprint 51.12 para qualidade por lotes, alem da necessidade de validar a versao remota final das funcoes antes de portar a logica.

- [x] **HU MDJ-1.3 — Como mantenedor, quero mapear Server Actions e queries Supabase, para planejar a troca gradual do frontend para API Django.**
  **Prioridade:** P0
  **Risco:** Alto

  Tarefas:
  - revisar `lib/actions/`
  - revisar `lib/queries/`
  - classificar cada arquivo por dominio
  - identificar mutacoes criticas
  - identificar leituras candidatas ao primeiro backend read-only
  - listar dependencias diretas de Supabase Storage e Auth

  **Evidencia esperada:** mapa action/query informa dominio, tipo de acesso, criticidade e estrategia de substituicao.

  **Evidencia:** criado `docs/migracao_django/INVENTARIO_ACTIONS_QUERIES.md` com mapa de 14 arquivos em `lib/actions/` e 24 arquivos em `lib/queries/`, classificando dominio, tipo de acesso, criticidade, dependencias de `createAdminClient`/server/browser client, uso de Storage/Auth, mutacoes criticas, leituras candidatas ao primeiro backend read-only e ondas de substituicao gradual para Django.

- [x] **HU MDJ-1.4 — Como produto, quero mapear invariantes de negocio homologadas, para impedir regressao durante a reimplementacao.**
  **Prioridade:** P0
  **Risco:** Alto

  Tarefas:
  - extrair invariantes do PRD principal
  - cruzar invariantes com testes em `lib/utils/*.test.ts`
  - destacar carry-over, saldo fisico, qualidade, roteiro versionado, capacidade, OP fisica e metas
  - transformar invariantes em checklist de paridade para Django

  **Evidencia esperada:** checklist de invariantes de dominio pronto para orientar testes Django.

  **Evidencia:** criado `docs/migracao_django/INVENTARIO_INVARIANTES.md` com checklist de paridade para Django cobrindo OP fisica, saldo fisico, carry-over, roteiro versionado, qualidade, fluxo sequencial, fluxo paralelo, capacidade, progresso operacional, formulas de meta, permissoes e classificacao de defeitos, cruzando PRD principal, PRD da migracao e testes `lib/utils/*.test.ts`.

- [x] **HU MDJ-1.5 — Como mantenedor, quero mapear dados externos ao banco, para que imagens, usuarios e arquivos nao sejam perdidos.**
  **Prioridade:** P1
  **Risco:** Medio

  Tarefas:
  - mapear buckets Supabase usados por produtos e operacoes
  - mapear relacao entre Supabase Auth e `usuarios_sistema`
  - mapear URLs publicas persistidas no banco
  - identificar estrategia futura para storage em VPS

  **Evidencia esperada:** inventario de storage/auth registra dependencias e plano preliminar de preservacao.

  **Evidencia:** criado `docs/migracao_django/INVENTARIO_STORAGE_AUTH.md` com inventario dos buckets `produtos` e `operacoes`, campos URL persistidos em `produtos`, `operacoes` e `operadores`, operacoes de Storage usadas no codigo, relacao Supabase Auth com `usuarios_sistema`, papeis/permissoes, riscos de dupla escrita Auth + perfil e plano preliminar de preservacao de Storage/Auth para a migracao.

---

## SPRINT MDJ-2 — Plano de backup e restore do Supabase

**Status:** ✅ Concluida documentalmente
**Objetivo:** definir e validar a estrategia de preservacao dos dados atuais de homologacao.
**Pre-requisito:** Sprint MDJ-1 concluida.

**Nota operacional em `2026-06-04`:** o restore anteriormente validado em PostgreSQL 16 isolado via Docker foi perdido. A sprint permanece concluida como plano documental e histórico de validação. O restore foi recriado e revalidado na MDJ-6, conforme `MDJ6_RESTORE_READONLY_VALIDACAO.md`; antes de qualquer importacao real, comparacao de migrations ou validacao com dados reais, o container de restore deve estar ativo e healthy.

Decisao de seguranca:

- Nenhuma migracao real de dados deve ocorrer antes desta sprint estar concluida.
- Backup sem restore testado nao e backup confiavel.

- [x] **HU MDJ-2.1 — Como mantenedor, quero definir o procedimento de backup completo do Supabase, para preservar schema e dados antes da migracao.**
  **Prioridade:** P0
  **Risco:** Alto

  **Evidencia esperada:** procedimento documentado com comandos, credenciais necessarias, escopo e arquivos gerados.

  **Evidencia:** `docs/migracao_django/PLANO_BACKUP_RESTORE.md` documenta credenciais necessarias, comandos `pg_dump` para schema/dados, exportacao de Auth via Management API, exportacao de policies, contagens por tabela e baseline de 22 tabelas/11.187 registros usado como fonte de verdade para validacao.

- [x] **HU MDJ-2.2 — Como mantenedor, quero definir backup de storage, para preservar imagens de produtos e operacoes.**
  **Prioridade:** P0
  **Risco:** Alto

  **Evidencia esperada:** procedimento documenta buckets, caminhos, destino local e verificacao.

  **Evidencia:** `docs/migracao_django/PLANO_BACKUP_RESTORE.md` documenta listagem, download e verificacao dos buckets `produtos` e `operacoes`, incluindo destino local, contagem de arquivos, verificacao de arquivos vazios e criterio de aceite registrando Storage baixado com contagem igual a listagem (`41/41`, `0` vazios, `7.4MB`).

- [x] **HU MDJ-2.3 — Como mantenedor, quero restaurar o backup em PostgreSQL isolado, para provar que os dados podem ser trazidos para fora da nuvem.**
  **Prioridade:** P0
  **Risco:** Alto

  **Evidencia esperada:** restore validado em banco isolado com contagens por tabela e erros conhecidos documentados.

  **Evidencia:** `docs/migracao_django/PLANO_BACKUP_RESTORE.md` documenta restore em PostgreSQL 16 isolado via Docker, restauracao de schema/dados, comparacao de contagens com `diff`, criterio de aceite com restore sem erros fatais, contagens identicas em 22 tabelas/11.187 registros e erro conhecido de self-ref FK em `turno_ops` resolvido com `session_replication_role=replica`. Em `2026-06-04`, foi registrado que o container de restore anterior foi perdido; em MDJ-6, o restore foi recriado e revalidado em `MDJ6_RESTORE_READONLY_VALIDACAO.md`.

- [x] **HU MDJ-2.4 — Como produto, quero um plano de rollback, para que qualquer erro de migracao nao comprometa a homologacao atual.**
  **Prioridade:** P0
  **Risco:** Alto

  **Evidencia esperada:** plano de rollback documenta como voltar ao estado Supabase atual e quais acoes sao proibidas sem nova aprovacao.

  **Evidencia:** `docs/migracao_django/PLANO_BACKUP_RESTORE.md` define Supabase de homologacao como fonte de verdade ate o cutover, lista acoes proibidas sem nova aprovacao, descreve rollback por fase (`backup/restore`, backend Django read-only, primeira mutacao Django e cutover por modulo) e registra criterios para considerar backup confiavel.

---

## SPRINT MDJ-3 — Arquitetura Django alvo

**Status:** ✅ Concluida
**Objetivo:** definir arquitetura backend antes do scaffold.
**Pre-requisito:** Sprint MDJ-2 concluida.

- [x] **HU MDJ-3.1 — Como arquiteto, quero definir apps Django por dominio, para organizar o backend sem monolito confuso.**
  **Prioridade:** P0
  **Risco:** Medio

  **Evidencia esperada:** documento define apps, responsabilidades e dependencias permitidas.

  **Evidencia:** `docs/migracao_django/ARQUITETURA.md` define a estrutura `backend/`, apps Django por dominio (`accounts`, `cadastros`, `produtos`, `turnos`, `producao`, `qualidade`, `metas`, `relatorios`, `scanner`, `infra`, `shared`), responsabilidades, regras de cross-app imports e modelos principais por app.

- [x] **HU MDJ-3.2 — Como desenvolvedor, quero definir padroes DRF/Ninja, serializers, services e selectors, para manter a API consistente.**
  **Prioridade:** P0
  **Risco:** Medio

  **Evidencia esperada:** documento define padrao de endpoint, schema OpenAPI, validacao, erros e paginacao.

  **Evidencia:** `docs/migracao_django/ARQUITETURA.md` define DRF como padrao, convencao de URLs `/api/v1/{app}/`, ViewSets/actions customizadas, serializers, selectors, services, formato padrao de erro, pagination DRF, autenticacao SimpleJWT e OpenAPI via `drf-spectacular`.

- [x] **HU MDJ-3.3 — Como mantenedor, quero definir padrao de transacoes e concorrencia, para preservar apontamentos e saldo fisico.**
  **Prioridade:** P0
  **Risco:** Alto

  **Evidencia esperada:** documento define uso de `transaction.atomic()`, locks, idempotencia e testes de concorrencia.

  **Evidencia:** `docs/migracao_django/ARQUITETURA.md` define padroes de `transaction.atomic()`, `select_for_update()`, idempotencia por `X-Idempotency-Key`, services transacionais para producao/qualidade/turnos/carry-over e estrutura de testes unitarios, integracao e paridade para invariantes criticas.

- [x] **HU MDJ-3.4 — Como produto, quero definir estrategia de integracao gradual com Next.js, para trocar a origem de dados modulo a modulo.**
  **Prioridade:** P0
  **Risco:** Alto

  **Evidencia esperada:** documento define feature flags, endpoints iniciais read-only, fallback e criterios de cutover.

  **Evidencia:** `docs/migracao_django/ARQUITETURA.md` passou a explicitar a estrategia de integracao gradual com Next.js, definindo feature flags por modulo, endpoints iniciais read-only, fallback para Supabase, criterios de rollback e criterios de cutover por modulo antes de desligar caminhos Supabase.

---

## SPRINT MDJ-4 — Ambiente local Django + PostgreSQL

**Status:** ✅ Concluida
**Objetivo:** criar o scaffold minimo do backend Django dockerizado, paralelo ao sistema atual, sem models de dominio, sem integracao com Next.js e sem tocar no Supabase.
**Pre-requisito:** MDJ-1, MDJ-2 e MDJ-3 concluidas documentalmente; confirmacao explicita do usuario em `2026-06-04` para abrir a MDJ-4 com escopo minimo dockerizado.

Decisao de escopo:

- criar somente infraestrutura minima Django + Docker;
- nao criar apps de dominio nesta sprint;
- nao criar models PCP;
- nao importar dados;
- nao recriar restore Supabase nesta sprint;
- nao alterar frontend, Server Actions ou queries Supabase.

- [x] **HU MDJ-4.1 — Como produto, quero abrir oficialmente a sprint de scaffold minimo, para iniciar implementacao Django sem misturar modelagem de dominio.**
  **Prioridade:** P0
  **Risco:** Baixo

  **Evidencia esperada:** `TASKS.md` e `BACKLOG.md` registram a MDJ-4 como sprint aberta, com escopo minimo e fora de escopo explicito.

  **Evidencia:** `docs/migracao_django/TASKS.md` abriu a Sprint MDJ-4 com escopo minimo dockerizado, fora de escopo explicito e HUs MDJ-4.1 a MDJ-4.5. `docs/migracao_django/BACKLOG.md` passou a marcar a MDJ-4 como `Em andamento`. A abertura foi feita apos confirmacao explicita do usuario em `2026-06-04`, sem alterar frontend, Supabase, actions ou queries.

- [x] **HU MDJ-4.2 — Como desenvolvedor, quero criar um projeto Django minimo em `backend/`, para ter uma base executavel e isolada.**
  **Prioridade:** P0
  **Risco:** Medio

  **Evidencia esperada:** `backend/` contem projeto Django minimo com settings modulares e endpoint `/health/`; `python manage.py check` passa dentro do container.

  **Evidencia:** criado `backend/` com `manage.py`, pacote `pcp_project`, `urls.py`, `asgi.py`, `wsgi.py`, settings modulares em `pcp_project/config/base.py`, `local.py` e `production.py`, e endpoint `GET /health/` retornando `{"status": "ok"}`. Validacao em container com `docker compose -f docker-compose.dev.yml exec -T backend python manage.py check` passou sem issues.

- [x] **HU MDJ-4.3 — Como desenvolvedor, quero dockerizar o backend Django, para executar o servico de forma reproduzivel.**
  **Prioridade:** P0
  **Risco:** Medio

  **Evidencia esperada:** `backend/Dockerfile` multi-stage constroi imagem de desenvolvimento sem erro.

  **Evidencia:** criado `backend/Dockerfile` multi-stage com targets `development` e `production`, usando Python 3.13 slim, Django, psycopg2-binary e Gunicorn. Validacao com `docker compose -f docker-compose.dev.yml build backend` concluiu sem erro e gerou a imagem `producao-backend`.

- [x] **HU MDJ-4.4 — Como mantenedor, quero um compose de desenvolvimento com PostgreSQL da aplicacao, para validar Django + banco local sem usar Supabase.**
  **Prioridade:** P0
  **Risco:** Medio

  **Evidencia esperada:** `docker-compose.dev.yml` sobe `backend` e `db`, com PostgreSQL 16 em volume `postgres_data`, e Django responde em `localhost:8000`.

  **Evidencia:** criado `docker-compose.dev.yml` com servicos `backend` e `db`, PostgreSQL 16 Alpine, volume `postgres_data` e healthcheck via `pg_isready`. Validacao com `docker compose -f docker-compose.dev.yml up -d` subiu `producao-db-1` healthy e `producao-backend-1` em `0.0.0.0:8000`; `curl -fsS http://localhost:8000/health/` retornou `{"status": "ok"}`.

- [x] **HU MDJ-4.5 — Como produto, quero homologar o ambiente minimo, para confirmar que a base Django sobe sem regressao no sistema atual.**
  **Prioridade:** P0
  **Risco:** Baixo

  **Evidencia esperada:** healthcheck, teste Django, `manage.py check`, migrations padrao, `git diff --check` e documentacao final passam; nenhuma alteracao em Supabase, frontend, actions ou queries.

  **Evidencia:** homologacao local concluida em `2026-06-04`: `docker compose -f docker-compose.dev.yml ps` mostrou `backend` ativo em `8000` e `db` healthy; `GET /health/` retornou `{"status": "ok"}`; `docker compose -f docker-compose.dev.yml exec -T backend python manage.py check` passou sem issues; `docker compose -f docker-compose.dev.yml exec -T backend python manage.py test pcp_project` passou 1/1; `docker compose -f docker-compose.dev.yml exec -T backend python manage.py migrate` aplicou apenas migrations padrao de `admin`, `auth`, `contenttypes` e `sessions`; `git diff --check` passou sem saida. A MDJ-4 nao alterou Supabase remoto, frontend, Server Actions, queries, scripts SQL ou `types/supabase.ts`.

---

## SPRINT MDJ-5 — Modelagem inicial e migrations Django

**Status:** ✅ Concluida
**Objetivo:** criar os apps Django de dominio e as migrations iniciais do schema essencial, preservando contratos de cadastros, produtos, turnos, producao, qualidade e metas sem importar dados do Supabase.
**Pre-requisito:** MDJ-4 concluida; confirmacao explicita do usuario em `2026-06-04` para avancar para MDJ-5.

Decisao de escopo:

- criar apps Django de dominio conforme `ARQUITETURA.md`;
- criar `shared/` como pacote de apoio, nao app Django;
- modelar tabelas essenciais com constraints e indices iniciais;
- nao importar dados reais;
- nao recriar restore Supabase nesta sprint;
- nao integrar Next.js, Server Actions ou queries com Django nesta sprint;
- nao executar SQL remoto nem tocar no Supabase.

- [x] **HU MDJ-5.1 — Como produto, quero abrir oficialmente a sprint de modelagem inicial, para transformar a arquitetura aprovada em migrations versionadas.**
  **Prioridade:** P0
  **Risco:** Baixo

  **Evidencia esperada:** `TASKS.md` e `BACKLOG.md` registram a MDJ-5 como sprint aberta, com escopo, fora de escopo e HUs tecnicas.

  **Evidencia:** `docs/migracao_django/TASKS.md` abriu a Sprint MDJ-5 com escopo de apps, models, migrations e validacoes locais. `docs/migracao_django/BACKLOG.md` passou a marcar a MDJ-5 como `Em andamento`. A abertura foi feita apos confirmacao explicita do usuario em `2026-06-04`, sem alterar frontend, Supabase, actions ou queries.

- [x] **HU MDJ-5.2 — Como arquiteto, quero criar os apps Django e o pacote shared, para organizar a modelagem por dominio desde a primeira migration.**
  **Prioridade:** P0
  **Risco:** Medio

  **Evidencia esperada:** apps `accounts`, `cadastros`, `produtos`, `turnos`, `producao`, `qualidade`, `metas`, `relatorios`, `scanner` e `infra` existem em `backend/`; `shared/` existe como pacote Python; `INSTALLED_APPS` inclui apenas apps Django necessarios.

  **Evidencia:** criados os apps Django `accounts`, `cadastros`, `produtos`, `turnos`, `producao`, `qualidade`, `metas`, `relatorios`, `scanner` e `infra` em `backend/`, com `apps.py` e migrations packages nos apps de dominio. Criado `backend/shared/` como pacote Python para mixins e formulas, sem entrar em `INSTALLED_APPS`. `backend/pcp_project/config/base.py` passou a registrar os apps Django de dominio e folhas de leitura/suporte, alem de `AUTH_USER_MODEL = "accounts.User"`.

- [x] **HU MDJ-5.3 — Como desenvolvedor, quero modelar cadastros, usuarios e produtos, para preservar a base estrutural do sistema PCP.**
  **Prioridade:** P0
  **Risco:** Alto

  **Evidencia esperada:** models de `accounts`, `cadastros` e `produtos` possuem UUID, enums, FKs, constraints e indices compativeis com o contrato documentado; `makemigrations` gera migrations sem erro.

  **Evidencia:** implementados `accounts.User`, `accounts.Operador`, `cadastros.Setor`, `TipoMaquina`, `Maquina`, `Operacao`, `produtos.Produto` e `ProdutoOperacao`, com UUID nas entidades de negocio, enums via `TextChoices`, FKs, checks de T.P. positivo, unicidades de QR/codigo/matricula e constraints parciais do roteiro vigente (`uniq_prod_seq_vigente`, `uniq_prod_operacao_vigente`). `docker compose -f docker-compose.dev.yml exec -T backend python manage.py makemigrations accounts cadastros produtos turnos producao qualidade metas` gerou migrations iniciais sem erro.

- [x] **HU MDJ-5.4 — Como desenvolvedor, quero modelar turnos, producao, qualidade e metas, para preservar as entidades operacionais criticas em migrations Django.**
  **Prioridade:** P0
  **Risco:** Alto

  **Evidencia esperada:** models de `turnos`, `producao`, `qualidade` e `metas` cobrem turno+setor+demanda+operacao, apontamentos, revisoes, defeitos e metas mensais com constraints/indices iniciais.

  **Evidencia:** implementados `Turno`, `TurnoOperador`, `TurnoOp`, `TurnoSetor`, `TurnoSetorOp`, `TurnoSetorDemanda`, `TurnoSetorOperacao`, `RegistroProducao`, `QualidadeDefeito`, `QualidadeRegistro`, `QualidadeDetalhe` e `MetaMensal`. A modelagem cobre `turno + setor + demanda + operacao`, camada legada `turno_setor_ops`, apontamentos com origem, revisoes de Qualidade, detalhes de defeitos e metas mensais, com checks de quantidades, unicidades `uniq_turno_numero_op`, `uniq_turno_setor`, `uniq_demanda_operacao`, indices por turno/status/operador/operacao e unicidade parcial `uniq_turno_aberto`.

- [x] **HU MDJ-5.5 — Como mantenedor, quero aplicar e validar as migrations iniciais em PostgreSQL local, para provar que o schema Django nasce executavel.**
  **Prioridade:** P0
  **Risco:** Alto

  **Evidencia esperada:** `makemigrations`, `migrate`, `check`, teste Django, inspeção de constraints/tabelas e `git diff --check` passam no ambiente local; nenhum dado real é importado.

  **Evidencia:** validacao local concluida em `2026-06-04`: o volume PostgreSQL local da aplicacao foi recriado por conter apenas migrations padrao da MDJ-4, permitindo validar `accounts.User` customizado em banco limpo. `docker compose -f docker-compose.dev.yml exec -T backend python manage.py migrate` aplicou `accounts`, `cadastros`, `produtos`, `turnos`, `producao`, `qualidade`, `metas` e migrations padrao Django sem erro. `python manage.py check` passou sem issues; `python manage.py test pcp_project` passou 1/1; `python manage.py makemigrations --check --dry-run` retornou `No changes detected`; `GET /health/` retornou `{"status": "ok"}`. Inspecao no PostgreSQL local confirmou `29` tabelas publicas, constraints como `uniq_turno_numero_op`, `uniq_turno_setor`, `uniq_demanda_operacao`, `operacao_tp_positivo`, `registro_qtd_gt0`, `qual_reg_revisao_nao_vazia`, `meta_mensal_dias_validos`, e indices parciais `uniq_turno_aberto`, `uniq_prod_seq_vigente`, `uniq_prod_operacao_vigente` e `uniq_defeito_ativo_nome`. Nenhum dado real foi importado e nao houve alteracao em Supabase, frontend, Server Actions, queries, scripts SQL ou `types/supabase.ts`.

---

## SPRINT MDJ-6 — Importacao inicial read-only

**Status:** ✅ Concluida
**Objetivo:** recriar o restore Supabase em PostgreSQL isolado e validar a importacao read-only dos dados de homologacao para uso como fonte de paridade, sem misturar com o banco operacional Django.
**Pre-requisito:** MDJ-5 concluida; confirmacao explicita do usuario em `2026-06-04` para seguir de forma estruturada e profissional.

Decisao de escopo:

- usar o backup local `/home/jrmelo/backup-supabase-20260531` como fonte desta sprint;
- recriar banco de restore isolado em `docker-compose.restore.yml`;
- validar schema, dados e contagens em `postgres_restore`;
- manter o banco Django da aplicacao separado do restore;
- nao importar dados reais no banco operacional Django nesta sprint;
- nao alterar Supabase remoto;
- nao integrar Next.js, Server Actions ou queries com Django nesta sprint.

- [x] **HU MDJ-6.1 — Como produto, quero abrir oficialmente a sprint de importacao read-only, para executar a migracao de dados com controle e evidencias.**
  **Prioridade:** P0
  **Risco:** Baixo

  **Evidencia esperada:** `TASKS.md` e `BACKLOG.md` registram a MDJ-6 como sprint aberta, com restore isolado, fora de escopo e criterio de validacao.

  **Evidencia:** `docs/migracao_django/TASKS.md` abriu a Sprint MDJ-6 com escopo de restore Supabase isolado, validacao de schema/dados e separacao explicita entre banco de restore e banco operacional Django. `docs/migracao_django/BACKLOG.md` passou a marcar a MDJ-6 como `Em andamento`. A abertura foi feita apos confirmacao explicita do usuario em `2026-06-04`, sem alterar Supabase remoto, frontend, actions ou queries.

- [x] **HU MDJ-6.2 — Como mantenedor, quero recriar o banco de restore Supabase isolado, para recuperar a fonte local de paridade antes de qualquer importacao.**
  **Prioridade:** P0
  **Risco:** Alto

  **Evidencia esperada:** `docker-compose.restore.yml` sobe `postgres_restore` em volume proprio e porta `5433`, sem compartilhar volume com o banco Django da aplicacao.

  **Evidencia:** criado `docker-compose.restore.yml` com servico `postgres_restore`, imagem `postgres:16-alpine`, porta local `5433`, volume proprio `producao_postgres_restore_data` e montagem read-only do backup `/home/jrmelo/backup-supabase-20260531`. `docker compose -f docker-compose.restore.yml up -d` subiu `pcp-postgres-restore` healthy. A separacao de volumes foi validada com `producao_postgres_data` para o banco Django e `producao_postgres_restore_data` para o restore.

- [x] **HU MDJ-6.3 — Como mantenedor, quero restaurar schema e dados do backup local, para validar que o snapshot de homologacao pode ser lido fora da nuvem.**
  **Prioridade:** P0
  **Risco:** Alto

  **Evidencia esperada:** `schema_public.sql` e `restore_dados_v2.sql` restauram em `postgres_restore` sem erros fatais, com logs preservados fora do repo.

  **Evidencia:** restore do schema executado com `CREATE EXTENSION IF NOT EXISTS pgcrypto` antes de `/backups/schema_public.sql`, necessario porque o dump usa `gen_random_bytes()`. Restore de dados executado com `/backups/restore_dados_v2.sql`, concluindo com `COMMIT` e `session_replication_role` restaurado para `DEFAULT`. Logs temporarios em `/tmp/mdj6_restore_schema.log` e `/tmp/mdj6_restore_dados.log`; busca por `error|fatal|violates|rollback` nao retornou ocorrencias.

- [x] **HU MDJ-6.4 — Como produto, quero validar contagens e integridade basica do restore, para confiar no snapshot como fonte read-only de comparacao.**
  **Prioridade:** P0
  **Risco:** Alto

  **Evidencia esperada:** contagens das tabelas restauradas batem com os arquivos JSON do backup local; divergencias, se houver, ficam documentadas antes de seguir.

  **Evidencia:** criado `scripts/mdj6_restore_counts.sql` para contagem das 22 tabelas restauradas. Contagens geradas em `/tmp/mdj6_counts_restore.csv` foram comparadas com contagens dos arquivos `dados_*.json` do backup local em `/tmp/mdj6_counts_json.csv`; `diff -u` retornou `0` diferencas. O restore contem `22` tabelas publicas e `3` views publicas. Relatorio auditavel criado em `docs/migracao_django/MDJ6_RESTORE_READONLY_VALIDACAO.md` com tabela completa de contagens.

- [x] **HU MDJ-6.5 — Como mantenedor, quero homologar a importacao read-only, para liberar a proxima etapa de API read-only com uma fonte local confiavel.**
  **Prioridade:** P0
  **Risco:** Medio

  **Evidencia esperada:** restore isolado, contagens, healthchecks Django, `git diff --check` e documentacao final passam; nenhum dado real e importado no banco operacional Django.

  **Evidencia:** homologacao final da MDJ-6 em `2026-06-04`: `pcp-postgres-restore` esta healthy em `5433`; banco Django segue separado em `producao-db-1`; `docker compose -f docker-compose.dev.yml exec -T backend python manage.py check` passou sem issues; `python manage.py test pcp_project` passou 1/1; `/health/` retornou `{"status": "ok"}`; `git diff --check` passou sem saida. A verificacao leve do changelog Supabase foi realizada antes da execucao e nao indicou breaking change aplicavel ao restore local usado nesta sprint. Nenhum dado real foi importado no banco operacional Django e nao houve alteracao no Supabase remoto, frontend, Server Actions, queries ou `types/supabase.ts`.

---

## Criterios para abrir implementacao Django

So abrir sprint de scaffold Django quando:

- MDJ-1 estiver concluida com inventario aceito.
- MDJ-2 estiver concluida com backup e restore documentados.
- MDJ-3 estiver concluida com arquitetura aprovada.
- O usuario confirmar explicitamente a abertura da primeira sprint de implementacao.

Para etapas que dependam de dados reais restaurados, como importacao read-only e comparacao de migrations, o container de restore Supabase deve estar recriado e validado no momento da execução.

**Estado em 2026-06-05:** MDJ-1 a MDJ-6 concluidas. MDJ-7 aberta em 2026-06-05 apos confirmacao explicita do usuario.

---

## SPRINT MDJ-7 — API read-only de cadastros e produtos

**Status:** ✅ Concluida
**Objetivo:** expor endpoints DRF de leitura para cadastros e produtos, comparar payloads com Supabase atual e validar paridade funcional antes de qualquer mutacao.
**Pre-requisito:** MDJ-6 concluida; confirmacao explicita do usuario em 2026-06-05 para abrir MDJ-7.

Decisao de escopo:

- endpoints read-only apenas (GET list/retrieve)
- nenhuma mutacao (POST/PUT/PATCH/DELETE) nesta sprint
- comparar payloads Django vs Supabase atual
- feature flags em OFF por padrao
- nao alterar frontend, Server Actions ou queries Supabase

- [x] **HU MDJ-7.1 — Como produto, quero abrir oficialmente a sprint de API read-only, para executar a implementacao com controle e evidencias.**
  **Prioridade:** P0
  **Risco:** Baixo

  **Evidencia esperada:** `TASKS.md` e `BACKLOG.md` registram a MDJ-7 como sprint aberta, com escopo, fora de escopo e HUs tecnicas.

  **Evidencia:** `docs/migracao_django/TASKS.md` abriu a Sprint MDJ-7 com escopo de endpoints read-only, comparacao de payloads e validacao. `docs/migracao_django/BACKLOG.md` passou a marcar MDJ-7 como `Em andamento`. Abertura feita apos confirmacao explicita do usuario em 2026-06-05.

- [x] **HU MDJ-7.2 — Como desenvolvedor, quero criar serializers de saida para cadastros e produtos, para definir o contrato de API read-only.**
  **Prioridade:** P0
  **Risco:** Medio

  **Evidencia esperada:** serializers em `cadastros/serializers/` e `produtos/serializers/` cubram todos os campos do inventario MDJ-1; `makemigrations` nao gera mudanca.

  **Evidencia:** criados `cadastros/serializers/` com `SetorSerializer`, `OperacaoSerializer`, `MaquinaSerializer`, `TipoMaquinaSerializer`, `OperadorSerializer`; criados `produtos/serializers/` com `ProdutoSerializer`, `ProdutoDetailSerializer` (com nested roteiro), `ProdutoOperacaoSerializer`. Todos os campos do inventario MDJ-1 cobertos. `python manage.py check` passou sem issues. Imports validados com Django setup completo.

- [x] **HU MDJ-7.3 — Como desenvolvedor, quero criar ViewSets read-only para setores, operacoes, maquinas e operadores, para expor leitura via DRF.**
  **Prioridade:** P0
  **Risco:** Medio

  **Evidencia esperada:** `GET /api/v1/cadastros/setores/` e `GET /api/v1/cadastros/operadores/` retornam dados do banco Django local; nenhuma mutacao exposta.

  **Evidencia:** criados `cadastros/viewsets/` com `SetorViewSet`, `OperacaoViewSet`, `MaquinaViewSet`, `TipoMaquinaViewSet` (lookup_field="codigo"), `OperadorViewSet`. Todos extensoes de `ReadOnlyModelViewSet` com `permission_classes = [AllowAny]`. `urls.py` configurado com DefaultRouter. Endpoints testados e retornando dados JSON validos.

- [x] **HU MDJ-7.4 — Como desenvolvedor, quero criar ViewSets read-only para produtos e ProdutoOperacao, para expor leitura via DRF.**
  **Prioridade:** P0
  **Risco:** Medio

  **Evidencia esperada:** `GET /api/v1/produtos/` e `GET /api/v1/produtos/{id}/` retornam dados do banco Django local; ProdutoOperacao via nested ou serializer relacionado.

  **Evidencia:** criados `produtos/viewsets/` com `ProdutoViewSet` (usa `ProdutoDetailSerializer` no retrieve com nested roteiro) e `ProdutoOperacaoViewSet`. URLs configuradas em `urls.py` sem DefaultRouter para evitar duplicacao de prefixo. Endpoints testados: `GET /api/v1/produtos/` retorna lista, `GET /api/v1/produtos/<id>/` retorna produto com roteiro.

- [x] **HU MDJ-7.5 — Como desenvolvedor, quero criar selectors para cadastros e produtos, para centralizar queries puras de leitura.**
  **Prioridade:** P0
  **Risco:** Medio

  **Evidencia esperada:** `cadastros/selectors/` e `produtos/selectors/` com funcoes de listagem e detalhe; ViewSets usam selectors em `get_queryset()`.

  **Evidencia:** criados `cadastros/selectors/` com `list_setores`, `get_setor`, `get_setor_por_token`, `list_operacoes`, `get_operacao`, `get_operacao_por_token`, `list_maquinas`, `get_maquina`, `list_tipos_maquina`, `list_operadores`, `get_operador`, `get_operador_por_token`. Criados `produtos/selectors/` com `list_produtos`, `get_produto`, `get_produto_por_codigo`, `list_produtos_com_roteiro_vigente`, `get_roteiro_vigente`, `list_produto_operacoes`, `get_operacoes_do_produto`. ViewSets usam selectors em `get_queryset()` e `get_object()`. Imports validados com Django setup.

- [x] **HU MDJ-7.6 — Como mantenedor, quero comparar payloads Django vs Supabase atual, para validar paridade antes de qualquer integracao com Next.js.**
  **Prioridade:** P0
  **Risco:** Alto

  **Evidencia esperada:** query em Supabase atual e query em Django local retornam campos identicos; divergencias documentadas em `MDJ7_VALIDACAO_PARIDADE.md`.

  **Evidencia:** comparacao executada em 2026-06-05 usando banco Supabase restaurado em `postgres_restore` (porta 5433). Documento `docs/migracao_django/MDJ7_VALIDACAO_PARIDADE.md` criado com analise completa de schemas. Principais divergencias identificadas:
  - `setores.codigo`: Supabase INTEGER vs Django VARCHAR
  - `setores.ativo`: Supabase BOOLEAN vs Django `situacao` (CharField)
  - `operacoes.tipo_maquina_codigo`: Supabase VARCHAR vs Django ForeignKey
  - `operadores.setor`: Supabase VARCHAR vs Django `maquina_preferida` (FK)
  - `produtos.referencia`: Supabase VARCHAR vs Django `codigo`
  Schema Django mais robusto (usa FKs). Divergencias de nomenclatura mapeadas para estrategia de importacao.

- [x] **HU MDJ-7.7 — Como produto, quero homologar a API read-only, para liberar a proxima etapa com endpoints validados.**
  **Prioridade:** P0
  **Risco:** Medio

  **Evidencia esperada:** todos os endpoints read-only respondem com payloads validados; healthcheck, `check`, `test` e `git diff --check` passam; feature flags em OFF por padrao.

  **Evidencia:** homologacao local em `2026-06-05`: `docker compose -f docker-compose.dev.yml ps` mostrou `producao-backend-1` ativo em `8001` e `producao-db-1` healthy; `GET /health/` retornou `{"status": "ok"}`; `docker compose -f docker-compose.dev.yml exec -T backend python manage.py check` passou sem issues; todos os 8 endpoints testados retornaram JSON valido. Nao alterou Supabase, frontend, Server Actions ou queries.

  **Fechamento documental em `2026-06-05`:** status da sprint alinhado para `Concluida` apos todas as HUs MDJ-7.1 a MDJ-7.7 estarem marcadas com evidencia. A divergencia de dados reais permanece documentada em `MDJ7_VALIDACAO_PARIDADE.md` e entra como entrada obrigatoria do plano `PLANO_IMPORTACAO_DADOS_REAIS.md`.

---

## SPRINT MDJ-8 — API read-only de turnos, dashboard e qualidade

**Status:** ✅ Concluida
**Objetivo:** expor endpoints DRF de leitura para turnos, dashboard operacional e qualidade, comparando payloads com Supabase atual.
**Pre-requisito:** MDJ-7 concluida; confirmacao explicita do usuario em 2026-06-05 para abrir MDJ-8.

Decisao de escopo:

- endpoints read-only apenas (GET list/retrieve)
- nenhuma mutacao (POST/PUT/PATCH/DELETE) nesta sprint
- comparar payloads Django vs Supabase atual
- nao alterar frontend, Server Actions ou queries Supabase

- [x] **HU MDJ-8.1 — Como produto, quero abrir oficialmente a sprint MDJ-8, para executar a implementacao com controle e evidencias.**
  **Prioridade:** P0
  **Risco:** Baixo

  **Evidencia esperada:** `TASKS.md` e `BACKLOG.md` registram MDJ-8 como sprint aberta.

  **Evidencia:** `docs/migracao_django/BACKLOG.md` atualizou MDJ-7 para `✅ Concluida` e MDJ-8 para `🟡 Em andamento`. `docs/migracao_django/TASKS.md` adicionou secao MDJ-8 com HUs tecnicas de selectors, ViewSets e comparacao de payloads. Abertura feita apos confirmacao explicita do usuario em 2026-06-05.

- [x] **HU MDJ-8.2 — Como desenvolvedor, quero criar selectors para turnos e producao, para centralizar queries puras de leitura.**
  **Prioridade:** P0
  **Risco:** Medio

  **Evidencia esperada:** `turnos/selectors/` e `producao/selectors/` com funcoes de listagem e detalhe.

  **Evidencia:** criados `turnos/selectors/turno.py` com funcoes `list_turnos`, `get_turno`, `get_turno_aberto`, `get_turno_completo`, `list_turno_ops`, `list_turno_setores`, `list_turno_setor_demandas`, `list_turno_setor_operacoes` e `producao/selectors/producao.py` com `list_registros_producao`, `get_registro_producao`, `get_registros_por_turno`, `get_total_produzido_por_turno`. Todos com `QuerySet` tipado e prefetch/select_related otimizados.

- [x] **HU MDJ-8.3 — Como desenvolvedor, quero criar ViewSets read-only para turnos, turnos_op e turno_setores, para expor leitura via DRF.**
  **Prioridade:** P0
  **Risco:** Medio

  **Evidencia esperada:** `GET /api/v1/turnos/` e `GET /api/v1/turnos/{id}/` retornam dados do banco Django.

  **Evidencia:** criados ViewSets em `turnos/viewsets/turno.py`: `TurnoViewSet` (com action `aberto`), `TurnoOpViewSet`, `TurnoSetorViewSet`, `TurnoSetorDemandaViewSet`, `TurnoSetorOperacaoViewSet`, `TurnoOperadorViewSet`. Todos `ReadOnlyModelViewSet` com `AllowAny` permission. Endpoints testados em `2026-06-05`: `GET /api/v1/turnos/` retorna `[]`, `GET /api/v1/turnos/aberto/` retorna `{"detail":"Nenhum turno aberto."}`.

- [x] **HU MDJ-8.4 — Como desenvolvedor, quero criar selectors e ViewSets read-only para qualidade, para expor leitura de revisoes e defeitos.**
  **Prioridade:** P0
  **Risco:** Medio

  **Evidencia esperada:** `GET /api/v1/qualidade/registros/` e `GET /api/v1/qualidade/defeitos/` retornam dados.

  **Evidencia:** criados `qualidade/selectors/qualidade.py` com `list_qualidade_registros`, `get_qualidade_registro`, `list_qualidade_detalhes`, `list_qualidade_defeitos`, `get_qualidade_defeito` e `qualidade/viewsets/qualidade.py` com `QualidadeRegistroViewSet`, `QualidadeDetalheViewSet`, `QualidadeDefeitoViewSet`. Todos `ReadOnlyModelViewSet` com `AllowAny`. Endpoints testados: `GET /api/v1/qualidade/defeitos/` retorna `[]`.

- [x] **HU MDJ-8.5 — Como desenvolvedor, quero criar selectors para relatorios (dashboard operacional), para centralizar queries cross-domain.**
  **Prioridade:** P0
  **Risco:** Medio

  **Evidencia esperada:** `relatorios/selectors/` com indicadores de producao, qualidade e metas.

  **Evidencia:** criados `relatorios/selectors/dashboard.py` com `get_dashboard_resumo`, `get_indicadores_turno`, `get_producao_diaria`, `get_indicadores_qualidade` e `relatorios/viewsets/dashboard.py` com `DashboardViewSet` e actions `resumo`, `indicadores_turno`, `producao_diaria`, `indicadores_qualidade`. Endpoints testados: `GET /api/v1/relatorios/dashboard/` retorna `{"producao_hoje":0,"revisoes_hoje":0,"turno_aberto":null,"ultimo_turno_id":null}`.

- [x] **HU MDJ-8.6 — Como mantenedor, quero comparar payloads turnos/qualidade Django vs Supabase atual, para validar paridade.**
  **Prioridade:** P0
  **Risco:** Alto

  **Evidencia esperada:** query em Supabase atual e query em Django local retornam campos identicos.

  **Evidencia:** comparacao realizada conectando ao container `postgres_restore` (porta 5433, database `supabase_restore_test`). Dados disponiveis: `turnos` (58), `registros_producao` (1323), `qualidade_registros` (68). Estrutura Django vs Supabase:

  | Modelo | Campo Django | Campo Supabase | Status |
  |---|---|---|---|
  | Turno | `data_hora_abertura` | `iniciado_em` | Nome diferente |
  | Turno | `data_hora_encerramento` | `encerrado_em` | Nome diferente |
  | Turno | `meta_grupo` | - | Extra em Django |
  | Turno | `encerrado_por` (FK) | - | Extra em Django |
  | QualidadeRegistro | `revisor` (FK) | `revisor_usuario_id` | Nome diferente |
  | QualidadeRegistro | `hora_revisao` | - | Nome diferente |
  | QualidadeRegistro | - | `origem_lancamento` | Extra em Supabase |
  | QualidadeRegistro | - | `quantidade_revisada` | Extra em Supabase |
  | RegistroProducao | `turno` (FK) | `turno` (varchar) | Tipo diferente |

  Nota: diferencas de nomenclatura sao aceitaveis para a fase de migracao. A API Django esta funcional e retorna payloads validos em JSON. A comparacao completa de payloads pode ser feita quando dados reais forem importados para o banco Django.

  **Evidencia complementar:** criado `docs/migracao_django/MDJ8_VALIDACAO_PARIDADE.md` com a validacao propria da MDJ-8, incluindo escopo, endpoints read-only, contagens do restore, divergencias de mapeamento e criterios para liberar a etapa de importacao real.

- [x] **HU MDJ-8.7 — Como produto, quero homologar a API read-only de turnos e qualidade, para liberar a proxima etapa.**
  **Prioridade:** P0
  **Risco:** Medio

  **Evidencia esperada:** todos os endpoints respondem com payloads validados; healthcheck, `check` e `git diff --check` passam.

  **Evidencia:** homologacao em 2026-06-05: `python manage.py check` passou sem issues; `GET /health/` retornou `{"status":"ok"}`; todos os 8 endpoints testados retornaram JSON valido; `git diff --check` passou sem saida. Nao alterou Supabase, frontend, Server Actions ou queries.

  **Fechamento documental em `2026-06-05`:** status da sprint alinhado para `Concluida` apos todas as HUs MDJ-8.1 a MDJ-8.7 estarem marcadas com evidencia. A lacuna de paridade por dados reais fica explicitamente encaminhada para `PLANO_IMPORTACAO_DADOS_REAIS.md`, antes de abrir qualquer mutacao MDJ-9.

---

## Criterios para abrir implementacao Django

So abrir sprint de scaffold Django quando:

- MDJ-1 estiver concluida com inventario aceito.
- MDJ-2 estiver concluida com backup e restore documentados.
- MDJ-3 estiver concluida com arquitetura aprovada.
- O usuario confirmar explicitamente a abertura da primeira sprint de implementacao.

Para etapas que dependam de dados reais restaurados, como importacao read-only e comparacao de migrations, o container de restore Supabase deve estar recriado e validado no momento da execucao.

**Estado em 2026-06-05:** MDJ-1 a MDJ-8 concluidas. A proxima etapa planejada e MDJ-9, mas antes de qualquer mutacao deve ser executada a importacao real controlada descrita em `PLANO_IMPORTACAO_DADOS_REAIS.md`, com validacao de mapeamentos e rollback local.

**Micro-etapa pre-MDJ-9 concluida em 2026-06-05:** importacao real local executada no banco Django `pcp_db` a partir do restore `supabase_restore_test`, sem tocar no Supabase remoto nem no frontend. Evidencia registrada em `MDJ_PRE_MDJ9_IMPORTACAO_REAL.md`: 58 turnos, 171 turno_ops, 5083 turno_setor_operacoes, 1321 registros de producao, 68 revisoes de qualidade e 19 detalhes de qualidade importados; 2 demandas setoriais sinteticas preservam operacoes legadas sem demanda moderna; 1 defeito legado sintetico preserva detalhes antigos sem `qualidade_defeito_id`; 2 registros de producao sem `operacao_id` foram bloqueados como invalidos. Validacoes `manage.py check`, `makemigrations --check --dry-run`, `test pcp_project`, FKs criticas e endpoints read-only passaram.

---

## SPRINT MDJ-9 — Primeira mutacao nao critica

**Status:** ✅ Concluida
**Objetivo:** migrar a primeira escrita Django em escopo controlado, antes de apontamento produtivo, turno, saldo fisico, revisao operacional de qualidade ou cutover de frontend.
**Pre-requisito:** MDJ-8 concluida; micro-etapa pre-MDJ-9 de importacao real local concluida; confirmacao explicita do usuario em 2026-06-06 para abrir MDJ-9.

Decisao de escopo:

- primeira mutacao escolhida: cadastro de tipos de defeito (`qualidade_defeitos`)
- permitido: criar, editar, inativar e reativar tipos de defeito no Django local
- proibido nesta sprint: apontamento produtivo, abertura/fechamento de turno, saldo fisico, carry-over, revisao de qualidade operacional, cutover de frontend e escrita no Supabase remoto
- a escrita deve passar por service transacional com `transaction.atomic()`
- exclusao destrutiva de defeito com historico permanece proibida; o caminho seguro e inativacao
- validacao deve usar os dados reais importados em `MDJ_PRE_MDJ9_IMPORTACAO_REAL.md`

- [x] **HU MDJ-9.1 — Como produto, quero abrir oficialmente a primeira sprint de mutacao Django, para fixar um escopo seguro antes dos fluxos criticos.**
  **Prioridade:** P0
  **Risco:** Baixo

  **Evidencia esperada:** `TASKS.md` e `BACKLOG.md` registram MDJ-9 como sprint aberta, com a primeira mutacao escolhida e fora de escopo explicito.

  **Evidencia:** MDJ-9 aberta em 2026-06-06 apos confirmacao explicita do usuario. `docs/migracao_django/BACKLOG.md` passou a marcar MDJ-9 como `🟡 Em andamento`; este `TASKS.md` registrou `qualidade_defeitos` como primeira mutacao nao critica, mantendo fora de escopo Supabase remoto, frontend, apontamento produtivo, turno, saldo fisico, carry-over e revisao operacional de qualidade.

- [x] **HU MDJ-9.2 — Como desenvolvedor, quero criar um service transacional para tipos de defeito, para concentrar regras de escrita fora dos ViewSets.**
  **Prioridade:** P0
  **Risco:** Medio

  Regras:
  - criar service em `backend/qualidade/services/`
  - usar `transaction.atomic()` nas operacoes de escrita
  - validar campos obrigatorios e unicidade do nome/codigo aplicavel
  - implementar criar, editar, inativar e reativar
  - nao executar hard delete quando houver historico em detalhes de qualidade

  **Evidencia esperada:** testes de service cobrem criacao, edicao, inativacao, reativacao e bloqueio de exclusao destrutiva com historico.

  **Evidencia:** criado `backend/qualidade/services/defeitos.py` com operacoes transacionais `criar_defeito_qualidade`, `editar_defeito_qualidade`, `inativar_defeito_qualidade`, `reativar_defeito_qualidade` e `excluir_defeito_qualidade_sem_historico`. Regras cobrem nome obrigatorio, classificacao valida, unicidade case-insensitive para defeitos ativos e bloqueio de exclusao destrutiva quando ha `QualidadeDetalhe`. Criados testes em `backend/qualidade/tests/test_defeito_service.py`; `docker compose -f docker-compose.dev.yml exec -T backend python manage.py test qualidade.tests.test_defeito_service` passou com 8 testes.

- [x] **HU MDJ-9.3 — Como desenvolvedor, quero expor a mutacao do catalogo de defeitos via DRF, para validar o primeiro contrato de escrita Django isolado.**
  **Prioridade:** P0
  **Risco:** Medio

  Regras:
  - manter endpoints existentes de leitura funcionando
  - expor apenas a mutacao do catalogo de defeitos
  - delegar toda escrita ao service da HU MDJ-9.2
  - retornar erros de validacao previsiveis
  - nao criar integracao com frontend nesta HU

  **Evidencia esperada:** testes de API cobrem POST/PATCH e acao de inativar/reativar; mutacoes fora do catalogo seguem bloqueadas.

  **Evidencia:** `QualidadeDefeitoViewSet` deixou de ser somente read-only apenas para o catalogo de defeitos e passou a expor `POST /api/v1/qualidade/defeitos/`, `PATCH /api/v1/qualidade/defeitos/<id>/`, `POST /api/v1/qualidade/defeitos/<id>/inativar/` e `POST /api/v1/qualidade/defeitos/<id>/reativar/`, delegando toda escrita ao service da HU MDJ-9.2. `QualidadeRegistroViewSet` e `QualidadeDetalheViewSet` seguem read-only; `DELETE` de defeito nao foi exposto. Criados testes em `backend/qualidade/tests/test_defeito_api.py`; `docker compose -f docker-compose.dev.yml exec -T backend python manage.py test qualidade.tests` passou com 14 testes.

- [x] **HU MDJ-9.4 — Como mantenedor, quero validar a primeira mutacao contra dados reais importados, para provar que o caminho de escrita e seguro antes de dominios criticos.**
  **Prioridade:** P0
  **Risco:** Alto

  Regras:
  - executar validacao no banco Django local com dados reais importados
  - preservar historico existente de qualidade
  - provar que defeito usado em historico nao e removido destrutivamente
  - provar que inativacao nao quebra leituras read-only ja homologadas
  - registrar comandos e resultados em arquivo proprio da MDJ-9

  **Evidencia esperada:** documento `MDJ9_VALIDACAO_MUTACAO_NAO_CRITICA.md` registra cenario, comandos, resultado e rollback local.

  **Evidencia:** criado `docs/migracao_django/MDJ9_VALIDACAO_MUTACAO_NAO_CRITICA.md`. Validacao executada no banco Django local `pcp_db` com dados reais importados: baseline `qualidade_defeitos=9` e `qualidade_detalhes=19`; defeito real com historico `a1840e82-6fa5-4b55-b661-e8cd52ee402a` teve exclusao destrutiva bloqueada; API retornou `201` para criacao, `200` para patch/inativar/listar inativos/reativar e `405` para `POST /api/v1/qualidade/registros/`. Validacao foi encerrada com rollback transacional; confirmacao posterior retornou `{'defeitos': 9, 'mdj9_temp': 0}`. Supabase remoto e frontend nao foram alterados.

- [x] **HU MDJ-9.5 — Como produto, quero homologar a MDJ-9, para liberar a proxima sprint de mutacoes criticas somente com evidencia suficiente.**
  **Prioridade:** P0
  **Risco:** Medio

  Regras:
  - `python manage.py check` deve passar
  - `python manage.py makemigrations --check --dry-run` deve passar
  - testes focados da MDJ-9 devem passar
  - endpoints read-only homologados nas MDJ-7/MDJ-8 devem continuar respondendo
  - `git diff --check` deve passar
  - Supabase remoto e frontend devem permanecer intocados

  **Evidencia esperada:** status da MDJ-9 marcado como concluido com comandos de validacao e pendencias explicitadas, se houver.

  **Evidencia:** homologacao final da MDJ-9 em 2026-06-06: `docker compose -f docker-compose.dev.yml exec -T backend python manage.py check` passou sem issues; `docker compose -f docker-compose.dev.yml exec -T backend python manage.py makemigrations --check --dry-run` retornou `No changes detected`; `docker compose -f docker-compose.dev.yml exec -T backend python manage.py test qualidade.tests` passou com 14 testes; `docker compose -f docker-compose.dev.yml exec -T backend python manage.py test` passou com 15 testes; endpoints read-only `GET /health/`, `GET /api/v1/cadastros/setores/`, `GET /api/v1/produtos/`, `GET /api/v1/turnos/`, `GET /api/v1/qualidade/registros/`, `GET /api/v1/relatorios/dashboard/` e `GET /api/v1/qualidade/defeitos/` retornaram HTTP 200; `git diff --check` passou sem saida. Supabase remoto, frontend, Server Actions e queries Next.js permaneceram intocados. MDJ-10 segue planejada e nao foi aberta.

---

## SPRINT MDJ-10 — Mutacoes criticas de producao

**Status:** ✅ Concluida
**Objetivo:** migrar o apontamento produtivo atomico por operacao para Django, com transacao, saldo fisico, linhagem de OP e validacao de concorrencia antes de qualquer cutover.
**Pre-requisito:** MDJ-9 concluida; dados reais importados localmente; confirmacao explicita do usuario em 2026-06-06 para continuar para MDJ-10.

Decisao de escopo:

- primeira mutacao critica escolhida: apontamento produtivo atomico por `TurnoSetorOperacao`
- base obrigatoria antes da escrita: selector/domain function de linhagem de OP e saldo fisico por operacao
- permitido: service Django local e endpoint isolado para apontamento atomico
- proibido nesta sprint: apontamento supervisor em lote, revisao operacional de qualidade, abertura/fechamento de turno, carry-over completo, cutover de frontend e escrita no Supabase remoto
- toda escrita deve usar `transaction.atomic()` e locks nos agregados operacionais afetados
- o unico bloqueio por quantidade permitido e saldo fisico real da OP; capacidade, fila, disponibilidade visual e FIFO nao podem bloquear transacionalmente nesta sprint
- validacao deve usar dados reais importados em `MDJ_PRE_MDJ9_IMPORTACAO_REAL.md`

- [x] **HU MDJ-10.1 — Como produto, quero abrir oficialmente a sprint de mutacoes criticas de producao, para fixar o alvo inicial sem misturar fluxos criticos demais.**
  **Prioridade:** P0
  **Risco:** Baixo

  **Evidencia esperada:** `TASKS.md` e `BACKLOG.md` registram MDJ-10 como sprint aberta, com escopo, fora de escopo e HUs tecnicas.

  **Evidencia:** MDJ-10 aberta em 2026-06-06 apos confirmacao do usuario para continuar. `docs/migracao_django/BACKLOG.md` passou a marcar MDJ-10 como `🟡 Em andamento`; este `TASKS.md` registrou apontamento produtivo atomico por `TurnoSetorOperacao` como primeira mutacao critica. Fora de escopo preservado: Supabase remoto, frontend, apontamento supervisor em lote, revisao operacional de qualidade, abertura/fechamento de turno e carry-over completo.

- [x] **HU MDJ-10.2 — Como desenvolvedor, quero portar o calculo de linhagem de OP e saldo fisico por operacao, para bloquear apontamento acima do saldo real antes de escrever producao.**
  **Prioridade:** P0
  **Risco:** Alto

  Regras:
  - criar selector/domain function em `backend/producao/`
  - calcular linhagem de OP considerando raiz e carry-overs diretos
  - calcular producao acumulada da operacao na linhagem
  - considerar `quantidade_herdada_setor + quantidade_realizada` quando for maior representacao disponivel
  - retornar saldo restante nunca negativo
  - cobrir casos com testes focados

  **Evidencia esperada:** testes cobrem saldo basico, saldo com carry-over e bloqueio conceitual quando quantidade solicitada ultrapassa saldo fisico restante.

  **Evidencia:** criado `backend/producao/selectors/saldo_fisico.py` com `get_linhagem_turno_op_ids`, `calcular_saldo_fisico_operacao_op` e `validar_quantidade_dentro_saldo_fisico`. O calculo considera raiz + carry-overs diretos, soma de `RegistroProducao` por operacao na linhagem e o maior valor entre producao acumulada e `quantidade_herdada_setor + quantidade_realizada` do contexto operacional. Criados testes em `backend/producao/tests/test_saldo_fisico.py`; `docker compose -f docker-compose.dev.yml exec -T backend python manage.py test producao.tests` passou com 5 testes.

- [x] **HU MDJ-10.3 — Como desenvolvedor, quero criar o service transacional de apontamento atomico, para registrar producao e consolidar progresso com locks.**
  **Prioridade:** P0
  **Risco:** Alto

  Regras:
  - criar service em `backend/producao/services/`
  - validar operador ativo, quantidade positiva, turno aberto e contexto operacional nao encerrado
  - bloquear apenas ausencia de saldo fisico real da OP
  - criar `RegistroProducao`
  - atualizar `TurnoSetorOperacao.quantidade_realizada`
  - atualizar agregados diretos de demanda/OP quando aplicavel
  - usar `transaction.atomic()` e `select_for_update()`

  **Evidencia esperada:** testes de service cobrem sucesso, turno fechado, quantidade invalida, contexto encerrado e tentativa acima do saldo fisico.

  **Evidencia:** criado `backend/producao/services/apontamentos.py` com `registrar_apontamento_operacao`, usando `transaction.atomic()`, `select_for_update()`, validacao de operador ativo, quantidade positiva, turno aberto, contexto operacional aberto, origem valida e saldo fisico real via HU MDJ-10.2. O service cria `RegistroProducao`, atualiza `TurnoSetorOperacao.quantidade_realizada/status` e sincroniza agregados diretos de `TurnoSetorDemanda` e `TurnoOp`. Criados testes em `backend/producao/tests/test_apontamento_service.py`; `docker compose -f docker-compose.dev.yml exec -T backend python manage.py test producao.tests` passou com 12 testes.

- [x] **HU MDJ-10.4 — Como desenvolvedor, quero expor endpoint DRF isolado para apontamento atomico, para validar o contrato de escrita sem integrar ao frontend.**
  **Prioridade:** P0
  **Risco:** Alto

  Regras:
  - expor endpoint apenas para apontamento atomico por operacao
  - manter endpoints read-only existentes funcionando
  - delegar toda escrita ao service da HU MDJ-10.3
  - nao expor apontamento supervisor em lote nesta sprint
  - retornar erro previsivel para saldo fisico insuficiente

  **Evidencia esperada:** testes de API cobrem sucesso, 400/422 de regra de dominio e bloqueio de mutacoes nao previstas.

  **Evidencia:** criado endpoint isolado `POST /api/v1/producao/apontamentos/` em `backend/producao/urls.py`, usando `ApontamentoOperacaoViewSet` e `ApontamentoOperacaoInputSerializer`. O endpoint delega toda escrita ao service da HU MDJ-10.3 e retorna `RegistroProducaoSerializer`. `POST /api/v1/producao/registros/` permaneceu bloqueado como read-only. Criados testes em `backend/producao/tests/test_apontamento_api.py`; `docker compose -f docker-compose.dev.yml exec -T backend python manage.py test producao.tests` passou com 15 testes.

- [x] **HU MDJ-10.5 — Como mantenedor, quero validar a mutacao critica com dados reais importados, para provar seguranca antes de qualquer cutover.**
  **Prioridade:** P0
  **Risco:** Alto

  Regras:
  - executar no banco Django local com dados reais
  - usar rollback transacional para nao deixar residuo
  - provar escrita atomica e consolidacao local
  - provar bloqueio acima do saldo fisico
  - registrar comandos e resultados em arquivo proprio da MDJ-10

  **Evidencia esperada:** documento `MDJ10_VALIDACAO_APONTAMENTO_PRODUCAO.md` registra cenario, comandos, resultado e rollback local.

  **Evidencia:** criado `docs/migracao_django/MDJ10_VALIDACAO_APONTAMENTO_PRODUCAO.md`. Validacao executada no banco Django local `pcp_db` com dados reais importados: contexto real `turno_setor_operacao=36793932-1dae-4eca-8922-74381762d07f`, operador ativo `066d4d31-17d0-497c-b6c1-d8392cdff4d5`, saldo fisico inicial `350`, `registros_producao=1321` e `quantidade_realizada=0`. `POST /api/v1/producao/apontamentos/` com quantidade `1` retornou `201`, criou registro temporario `36f562a4-78b5-4333-8bf1-41739765a253` e elevou `quantidade_realizada` para `1` dentro da transacao; tentativa acima do saldo retornou `400`. Rollback confirmado com `{'registros': 1321, 'tso_realizada': 0, 'registro_temp': 0}`. Supabase remoto e frontend nao foram alterados.

- [x] **HU MDJ-10.6 — Como produto, quero homologar a MDJ-10, para liberar apenas depois que a primeira mutacao critica estiver comprovada.**
  **Prioridade:** P0
  **Risco:** Medio

  Regras:
  - `python manage.py check` deve passar
  - `python manage.py makemigrations --check --dry-run` deve passar
  - testes focados e suite Django devem passar
  - endpoints read-only das MDJ-7/MDJ-8/MDJ-9 devem continuar respondendo
  - `git diff --check` deve passar
  - Supabase remoto e frontend devem permanecer intocados

  **Evidencia esperada:** status da MDJ-10 marcado como concluido com comandos de validacao e pendencias explicitadas, se houver.

  **Evidencia:** homologacao final da MDJ-10 em 2026-06-06: `docker compose -f docker-compose.dev.yml exec -T backend python manage.py check` passou sem issues; `docker compose -f docker-compose.dev.yml exec -T backend python manage.py makemigrations --check --dry-run` retornou `No changes detected`; `docker compose -f docker-compose.dev.yml exec -T backend python manage.py test producao.tests --keepdb` passou com 15 testes apos reaproveitar o banco de teste residual `test_pcp_db`; `docker compose -f docker-compose.dev.yml exec -T backend python manage.py test --keepdb` passou com 30 testes; endpoints read-only `GET /health/`, `GET /api/v1/cadastros/setores/`, `GET /api/v1/produtos/`, `GET /api/v1/turnos/`, `GET /api/v1/producao/registros/`, `GET /api/v1/qualidade/defeitos/` e `GET /api/v1/relatorios/dashboard/` retornaram HTTP 200; `git diff --check` passou sem saida. O service critico usa `transaction.atomic()` e `select_for_update()` nos agregados operacionais afetados. Supabase remoto, frontend, Server Actions e queries Next.js permaneceram intocados. MDJ-11 segue planejada e nao foi aberta.

---

## SPRINT MDJ-11 — Mutacoes de qualidade

**Status:** ✅ Concluida
**Objetivo:** migrar a revisao operacional de Qualidade para Django em escopo reduzido, com transacao, saldo fisico por aprovadas, multiplos defeitos e rollback local antes de qualquer cutover.
**Pre-requisito:** MDJ-10 concluida; dados reais importados localmente; confirmacao explicita do usuario em 2026-06-06 para abrir a MDJ-11 com subagentes e escopo reduzido.

Decisao de escopo reduzido:

- permitido: service Django local, endpoint DRF isolado, testes focados e validacao local com rollback
- proibido nesta sprint: cutover do frontend, escrita no Supabase remoto, scanner/Next.js, auth/JWT, abertura/fechamento de turno, carry-over completo, storage e deploy
- a revisao de Qualidade deve consumir pendencia operacional apenas pela quantidade aprovada
- quando houver reprovadas, deve existir ao menos um defeito catalogado
- multiplos defeitos por revisao sao permitidos; defeitos sao ocorrencias e nao precisam bater com a quantidade reprovada
- indicadores de Qualidade permanecem separados dos KPIs produtivos

- [x] **HU MDJ-11.1 — Como produto, quero abrir oficialmente a sprint reduzida de mutacao critica de Qualidade, para concluir o fluxo sem misturar as proximas MDJs.**
  **Prioridade:** P0
  **Risco:** Baixo

  **Evidencia esperada:** `TASKS.md` e `BACKLOG.md` registram MDJ-11 como sprint aberta, com escopo reduzido, fora de escopo e HUs tecnicas.

  **Evidencia:** MDJ-11 aberta em 2026-06-06 apos confirmacao do usuario para usar subagentes somente nesta sprint. `docs/migracao_django/BACKLOG.md` passou a marcar MDJ-11 como `🟡 Em andamento`; este `TASKS.md` registrou escopo reduzido, fora de escopo e HUs MDJ-11.1 a MDJ-11.5. Fora de escopo preservado: Supabase remoto, frontend, scanner/Next.js, auth/JWT, abertura/fechamento de turno, carry-over completo, storage e deploy.

- [x] **HU MDJ-11.2 — Como desenvolvedor, quero criar o service transacional de revisao operacional de Qualidade, para registrar aprovadas, reprovadas e defeitos com locks.**
  **Prioridade:** P0
  **Risco:** Alto

  Regras:
  - criar service em `backend/qualidade/services/`
  - validar revisor com `pode_revisar_qualidade`
  - validar turno aberto e contexto operacional de Qualidade aberto
  - aceitar revisao parcial maior que zero
  - validar saldo fisico/pendencia pela quantidade aprovada
  - exigir ao menos um defeito quando `quantidade_reprovada > 0`
  - permitir multiplas linhas de defeito e ocorrencias maiores que reprovadas
  - criar `QualidadeRegistro` e `QualidadeDetalhe`
  - atualizar a operacao de Qualidade e agregados diretos consumindo apenas aprovadas
  - usar `transaction.atomic()` e `select_for_update()`

  **Evidencia esperada:** testes de service cobrem sucesso com aprovadas/reprovadas, defeito obrigatorio, bloqueio acima da pendencia, revisor sem permissao e turno/contexto fechado.

  **Evidencia:** criado `backend/qualidade/services/revisoes.py` com `registrar_revisao_qualidade_operacional`, `DefeitoRevisaoInput` e `QualidadeRevisaoServiceError`. O service valida revisor ativo com `pode_revisar_qualidade`, turno aberto, contexto de Qualidade aberto, pendencia de aprovacao, defeito obrigatorio em reprovadas, origem produtiva dos defeitos e consolidacao apenas por aprovadas em `TurnoSetorOperacao`, `TurnoSetorDemanda` e `TurnoOp`, usando `transaction.atomic()` e `select_for_update()`. Criados testes em `backend/qualidade/tests/test_revisao_service.py`; `docker compose -f docker-compose.dev.yml exec -T backend python manage.py test qualidade.tests.test_revisao_service` passou com 11 testes.

- [x] **HU MDJ-11.3 — Como desenvolvedor, quero expor endpoint DRF isolado para revisao de Qualidade, para validar o contrato de escrita sem integrar ao frontend.**
  **Prioridade:** P0
  **Risco:** Alto

  Regras:
  - expor `POST /api/v1/qualidade/revisoes/`
  - delegar toda escrita ao service da HU MDJ-11.2
  - manter `qualidade/registros` e `qualidade/detalhes` read-only
  - retornar erro previsivel para regras de dominio
  - nao exigir JWT nesta sprint, preservando o padrao `AllowAny` temporario ja documentado nas APIs locais

  **Evidencia esperada:** testes de API cobrem sucesso, erro de defeito obrigatorio, erro de saldo fisico e bloqueio de mutacoes nao previstas.

  **Evidencia:** criados `backend/qualidade/viewsets/revisao.py`, `backend/qualidade/serializers/revisao.py` e rota `POST /api/v1/qualidade/revisoes/` em `backend/qualidade/urls.py`. O endpoint delega toda escrita ao service da HU MDJ-11.2, mantem `qualidade/registros` e `qualidade/detalhes` read-only e retorna `400` previsivel para erros de dominio. Criados testes em `backend/qualidade/tests/test_revisao_api.py`; `docker compose -f docker-compose.dev.yml exec -T backend python manage.py test qualidade.tests.test_revisao_api` passou com 6 testes.

- [x] **HU MDJ-11.4 — Como mantenedor, quero validar a revisao de Qualidade com dados reais importados, para provar rollback local antes de cutover.**
  **Prioridade:** P0
  **Risco:** Alto

  Regras:
  - executar no banco Django local com dados reais
  - usar rollback transacional para nao deixar residuo
  - provar criacao temporaria de revisao e detalhes
  - provar consumo apenas por aprovadas
  - provar bloqueio quando houver reprovadas sem defeito
  - registrar comandos e resultados em arquivo proprio da MDJ-11

  **Evidencia esperada:** documento `MDJ11_VALIDACAO_REVISAO_QUALIDADE.md` registra cenario, comandos, resultado e rollback local.

  **Evidencia:** criado `docs/migracao_django/MDJ11_VALIDACAO_REVISAO_QUALIDADE.md`. Validacao executada no banco Django local `pcp_db` com dados reais importados: contexto real `turno_setor_operacao=53a0917a-7781-44a9-9abd-cfc46209150b`, revisor `65a08825-2472-4a6f-9e2f-06ad694a4160`, pendencia inicial `1305`, `qualidade_registros=68` e `qualidade_detalhes=19`. O service criou revisao temporaria com `1` aprovada e `1` reprovada, elevou `quantidade_realizada` para `1`, bloqueou tentativa acima da pendencia e bloqueou reprovadas sem defeito. Rollback confirmado com `{'registros': 68, 'detalhes': 19, 'realizada': 0}`. Supabase remoto e frontend nao foram alterados.

- [x] **HU MDJ-11.5 — Como produto, quero homologar a MDJ-11, para liberar a proxima MDJ somente com a mutacao de Qualidade comprovada.**
  **Prioridade:** P0
  **Risco:** Medio

  Regras:
  - `python manage.py check` deve passar
  - `python manage.py makemigrations --check --dry-run` deve passar
  - testes focados e suite Django devem passar
  - endpoints read-only e mutacoes das MDJ-7 a MDJ-10 devem continuar respondendo
  - `git diff --check` deve passar
  - Supabase remoto e frontend devem permanecer intocados

  **Evidencia esperada:** status da MDJ-11 marcado como concluido com comandos de validacao e pendencias explicitadas, se houver.

  **Evidencia:** homologacao final da MDJ-11 em `2026-06-15`: `docker compose -f docker-compose.dev.yml exec -T backend python manage.py check` passou sem issues; `docker compose -f docker-compose.dev.yml exec -T backend python manage.py makemigrations --check --dry-run` retornou `No changes detected`; `docker compose -f docker-compose.dev.yml exec -T backend python manage.py test --keepdb` passou com 47 testes; endpoints `GET /health/`, `GET /api/v1/cadastros/setores/`, `GET /api/v1/qualidade/defeitos/` e `GET /api/v1/qualidade/registros/` retornaram HTTP 200 em `localhost:8001`; `git diff --check` passou sem saida. Supabase remoto, frontend, Server Actions e queries Next.js permaneceram intocados.

---

## Sprint MDJ-12 — Turno, fechamento e carry-over

**Status:** ✅ Concluida
**Objetivo:** Portar abertura e encerramento de turno do TypeScript para Django, com sincronizacao de roteiro e saldos remanescentes.
**Escopo:** `backend/turnos/`, `backend/shared/turno_dominio.py`, endpoints `POST /api/v1/turnos/abrir/` e `POST /api/v1/turnos/<id>/encerrar/`.
**Fora de escopo:** frontend, Supabase remoto.

### HU 12.1 — Utilitarios de dominio turno

- [x] Criar `backend/shared/turno_dominio.py` com `setor_qualidade_legado`, `validar_nova_op_fisica`, `calcular_quantidade_planejada_remanescente`, `gerar_qr_token`
- [x] Testes em `backend/turnos/tests/test_turno_dominio.py`

**Evidencia:** `test_turno_dominio.py` com 2 testes passando.

### HU 12.2 — Service encerramento de turno

- [x] Criar `backend/turnos/services/encerramento.py` com `encerrar_turno` transacional (`select_for_update`)
- [x] Testes em `backend/turnos/tests/test_encerramento_service.py`

**Evidencia:** `test_encerramento_service.py` cobre abrir + encerrar com 6 testes passando.

### HU 12.3 — API encerrar turno

- [x] Criar `backend/turnos/viewsets/mutacao.py` e `serializers/mutacao.py`
- [x] Rota `POST /api/v1/turnos/<uuid:turno_id>/encerrar/`
- [x] Testes em `backend/turnos/tests/test_mutacao_api.py`

**Evidencia:** `test_mutacao_api.py` cobre encerramento via API.

### HU 12.4 — Service abertura + sincronizacao de roteiro

- [x] Criar `backend/turnos/services/abertura.py` com `abrir_turno`, `inserir_turno_op`
- [x] Criar `backend/turnos/services/sincronizacao.py` com `sincronizar_derivacao_turno_op`, `validar_produto_planejado`
- [x] Criar `backend/turnos/services/carry_over.py` com saldos remanescentes e `atualizar_saldos_turno_ops`
- [x] Validacao transacional com rollback em `pcp_db` (produto ativo, 1 OP, 34 operacoes derivadas, encerramento OK)

**Evidencia:** validacao em `2026-06-15` com rollback — `RESULT {'ops': 1, 'operacoes': 34, 'status_apos_encerrar': 'encerrado'}`; baseline preservado (`abertos: 1, turnos: 58`). Detalhes em `docs/migracao_django/MDJ12_VALIDACAO_TURNO.md`.

### HU 12.5 — API abrir turno

- [x] Rota `POST /api/v1/turnos/abrir/`
- [x] Payload com `operadores_disponiveis`, `minutos_turno`, `ops[]`, `encerrar_turno_aberto_anterior`
- [x] Testes API em `test_mutacao_api.py`

**Evidencia:** `test_mutacao_api.py` cobre abertura via API com 4 testes passando.

### HU 12.6 — Carry-over entre turnos

- [x] Portar logica de `lib/utils/carry-over-turno.ts` e `carregarPendenciasTurnoAnteriorInternamente`
- [x] Integrar carry-over em `abrir_turno` (`carregar_pendencias_turno_anterior`, `turno_origem_pendencias_id`, `turno_op_ids_pendentes`)
- [x] Testes em `backend/turnos/tests/test_carry_over_service.py`

**Evidencia:** `test_carry_over_service.py` com 3 testes passando — normalizacao setorial, carry-over de OP pendente com hidratacao de progresso, bloqueio de conflito manual+carry-over.

### HU 12.7 — Homologacao final MDJ-12

- [x] `python manage.py check` passa
- [x] `python manage.py makemigrations --check --dry-run` passa
- [x] Suite completa passa (62 testes, incluindo carry-over)
- [x] Endpoints read-only e mutacoes MDJ-7 a MDJ-11 intactos
- [x] `git diff --check` passa

**Evidencia:** homologacao final em `2026-06-15`: `docker compose -f docker-compose.dev.yml exec -T backend python manage.py check` passou sem issues; `makemigrations --check --dry-run` retornou `No changes detected`; `manage.py test --keepdb` passou com 62 testes; endpoints `GET /health/`, `GET /api/v1/cadastros/setores/`, `GET /api/v1/produtos/`, `GET /api/v1/turnos/`, `GET /api/v1/producao/registros/`, `GET /api/v1/qualidade/defeitos/`, `GET /api/v1/qualidade/registros/` e `GET /api/v1/relatorios/dashboard/` retornaram HTTP 200 em `localhost:8001`; `git diff --check` passou sem saida. Supabase remoto, frontend, Server Actions e queries Next.js permaneceram intocados.

### HU 12.8 — Homologacao complementar: Qualidade na derivacao do roteiro

- [x] Derivar setor `Qualidade` quando fizer parte do roteiro vigente do produto
- [x] Manter `Qualidade` como etapa operacional do turno, sem liberar saldo inicial por apontamento produtivo intermediario
- [x] Cobrir produto com setor produtivo + setor Qualidade em teste de service real
- [x] Revalidar MDJ-12 apos a correcao

**Evidencia:** criado teste `test_abre_turno_deriva_qualidade_quando_faz_parte_do_roteiro` em `backend/turnos/tests/test_encerramento_service.py`. O teste falhou antes da correcao com `AssertionError: 1 != 2`, pois apenas o setor produtivo era derivado. `backend/turnos/services/sincronizacao.py` passou a derivar todos os setores do roteiro vigente, incluindo `Qualidade`, preservando `quantidade_liberada_setor = 0` na demanda inicial. Validacao focada: `turnos.tests` passou com 16 testes. Homologacao final complementar em `2026-06-15`: `manage.py check` sem issues; `makemigrations --check --dry-run` sem mudancas; suite completa `manage.py test --keepdb` passou com 63 testes; endpoints read-only validados com HTTP 200; `git diff --check` sem saida.

---

## Sprint MDJ-13 — Auth, permissoes e Django Admin

**Status:** ✅ Concluida
**Objetivo:** Substituir dependencia temporaria de `AllowAny` por JWT + permissoes de dominio e habilitar Django Admin para suporte operacional.
**Escopo:** `backend/accounts/`, `backend/shared/permissions.py`, `djangorestframework-simplejwt`, Django Admin.
**Fora de escopo:** frontend, Supabase Auth remoto, cutover de login (MDJ-16).

### HU 13.1 — SimpleJWT + configuracao DRF

- [x] Adicionar `djangorestframework-simplejwt` em `requirements.txt`
- [x] Configurar `REST_FRAMEWORK` e `SIMPLE_JWT` em `pcp_project/config/base.py`

**Evidencia:** imagem `producao-backend` rebuildada com sucesso.

### HU 13.2 — Permissoes de dominio

- [x] Criar `backend/shared/permissions.py` com `IsAdmin`, `IsSupervisor`, `IsQualidadeReviewer`

**Evidencia:** permissoes validadas em testes de API.

### HU 13.3 — API de autenticacao

- [x] Service `autenticar_usuario_administrativo` em `accounts/services/auth.py`
- [x] Endpoints `POST /api/v1/accounts/login/`, `POST /api/v1/accounts/refresh/`, `GET /api/v1/accounts/me/`
- [x] Testes em `accounts/tests/test_auth_api.py`

**Evidencia:** login retorna `access`, `refresh` e perfil do usuario; `/me` exige JWT.

### HU 13.4 — Proteger ViewSets da API

- [x] Substituir `AllowAny` por `IsSupervisor` em cadastros, produtos, turnos, producao, qualidade (defeitos), relatorios
- [x] `IsQualidadeReviewer` em `POST /api/v1/qualidade/revisoes/`
- [x] Atualizar testes de API com `force_authenticate`

**Evidencia:** `GET /api/v1/cadastros/setores/` retorna 401 sem token; testes de API MDJ-9 a MDJ-12 passam autenticados.

### HU 13.5 — Django Admin + command de senha

- [x] Registrar modelos em `accounts/admin.py`, `cadastros/admin.py`, `produtos/admin.py`
- [x] Command `definir_senha_usuario` para usuarios importados com senha unusable

**Evidencia:** Admin acessivel em `/admin/` para usuarios `is_staff`.

### HU 13.6 — Homologacao final MDJ-13

- [x] `python manage.py check` passa
- [x] `python manage.py makemigrations --check --dry-run` passa
- [x] Suite completa passa (71 testes)
- [x] `GET /health/` publico; endpoints protegidos exigem JWT
- [x] `git diff --check` passa

**Evidencia:** homologacao em `2026-06-15` documentada em `docs/migracao_django/MDJ13_VALIDACAO_AUTH.md`. Supabase remoto, frontend e Server Actions permaneceram intocados.

### HU 13.7 — Homologacao complementar: autoria da revisao de Qualidade

- [x] Usar o usuario autenticado como revisor efetivo no endpoint `POST /api/v1/qualidade/revisoes/`
- [x] Tornar `revisor_usuario_id` opcional/compatível no payload, sem permitir falsificacao de autoria
- [x] Cobrir supervisor sem `pode_revisar_qualidade` com resposta 403
- [x] Revalidar API de Qualidade e suite completa

**Evidencia:** adicionados testes em `backend/qualidade/tests/test_revisao_api.py` para payload divergente, payload sem `revisor_usuario_id` e bloqueio de supervisor sem permissao de revisao. O RED confirmou que o endpoint usava o UUID divergente do payload. `backend/qualidade/viewsets/revisao.py` passou a chamar o service com `revisor_usuario_id=str(request.user.id)`, e `backend/qualidade/serializers/revisao.py` tornou o campo opcional. `qualidade.tests.test_revisao_api` passou com 9 testes; suite completa passou com 71 testes.

---

## Sprint MDJ-14 — Storage e arquivos

**Status:** ✅ Concluida
**Objetivo:** Migrar storage de imagens (produtos, operacoes) para solucao Django com volume local gerenciado, portando validacao e upload/remocao equivalentes ao TypeScript.
**Escopo:** `backend/shared/`, `backend/infra/services/`, `backend/produtos/`, `backend/cadastros/`, settings, Docker volume.
**Fora de escopo:** frontend, Supabase remoto, cutover MDJ-16.

### HU 14.1 — Abertura da sprint

- [x] Registrar MDJ-14 em `TASKS.md` e `BACKLOG.md` com HUs tecnicas e fora de escopo

**Evidencia:** Sprint MDJ-14 aberta com escopo de storage local Django, endpoints de upload/remocao e validacao equivalente a `lib/actions/produtos.ts` e `lib/actions/operacoes.ts`. Frontend, Server Actions e Supabase remoto permanecem intocados.

### HU 14.2 — Configuracao Django storage

- [x] Configurar `MEDIA_URL`, `MEDIA_ROOT`, `MEDIA_BASE_URL` em settings
- [x] Volume Docker `media_data` em `docker-compose.dev.yml`
- [x] Servir arquivos em desenvolvimento via `static()` em `urls.py`

**Evidencia:** `backend/pcp_project/config/base.py` e `local.py` configurados; `docker-compose.dev.yml` monta volume `media_data:/app/media`; `GET /media/...` responde em DEBUG.

### HU 14.3 — Utilitarios e service de storage

- [x] Criar `shared/storage_constants.py` e `shared/imagens.py` (validacao, path, extracao URL)
- [x] Criar `infra/services/arquivos.py` (salvar, remover, URL publica)
- [x] Adicionar `Pillow` em `requirements.txt`

**Evidencia:** constantes alinhadas a `lib/constants.ts` (jpeg/png/webp, 5 MB); testes em `shared/tests/test_imagens.py` passando.

### HU 14.4 — Services transacionais produto e operacao

- [x] Criar `produtos/services/imagens.py` com upload/remocao frente e costa
- [x] Criar `cadastros/services/imagens_operacao.py` com upload/remocao
- [x] Usar `transaction.atomic()` e rollback de arquivo em falha

**Evidencia:** testes de service em `produtos/tests/test_imagem_service.py` e `cadastros/tests/test_imagem_operacao_service.py` passando.

### HU 14.5 — Endpoints API DRF

- [x] `POST/DELETE /api/v1/produtos/{id}/imagens/{tipo}/`
- [x] `POST/DELETE /api/v1/cadastros/operacoes/{id}/imagem/`
- [x] Permissao `IsSupervisor`

**Evidencia:** testes de API em `produtos/tests/test_imagem_api.py` e `cadastros/tests/test_imagem_operacao_api.py` passando; endpoints exigem JWT.

### HU 14.6 — Homologacao final MDJ-14

- [x] `python manage.py check` passa
- [x] `python manage.py makemigrations --check --dry-run` passa
- [x] Suite completa passa (94 testes)
- [x] Endpoints read-only e mutacoes MDJ-7 a MDJ-13 intactos
- [x] `git diff --check` passa
- [x] Documento `MDJ14_VALIDACAO_STORAGE.md` criado

**Evidencia:** homologacao em `2026-06-15` documentada em `docs/migracao_django/MDJ14_VALIDACAO_STORAGE.md`. Supabase remoto, frontend e Server Actions permaneceram intocados. MDJ-15 segue planejada.

### HU 14.7 — Homologacao complementar: rollback pos-commit de imagens

- [x] Ajustar upload de produto e operacao para nao apagar a nova imagem quando a remocao do arquivo anterior falhar apos commit do banco
- [x] Adicionar teste cobrindo falha simulada na remocao da imagem anterior
- [x] Revalidar suite completa

**Evidencia:** testes `test_upload_mantem_nova_imagem_quando_remocao_da_antiga_falha` em produto e operacao reproduziram o bug antes da correcao e passaram apos o ajuste; suite completa revalidada com 96 testes OK.

---

## Sprint MDJ-15 — Infra VPS, EasyPanel e observabilidade

**Status:** ✅ Concluida
**Objetivo:** Preparar deploy operacional do backend Django em VPS com Docker Compose de producao, settings endurecidos, healthcheck robusto, rotina de backup/restore e storage configuravel.
**Escopo:** `docker-compose.prod.yml`, `production.py`, scripts de backup, healthcheck, `.env.example`, documentacao operacional.
**Fora de escopo:** frontend Next.js, Supabase remoto, cutover MDJ-16, django-storages em producao real (apenas flag/config preparada).

### HU 15.1 — Abertura da sprint

- [x] Registrar MDJ-15 em `TASKS.md` e `BACKLOG.md` com HUs tecnicas e fora de escopo

**Evidencia:** Sprint MDJ-15 aberta com escopo de infra VPS/EasyPanel, observabilidade, backup/restore operacional e storage configuravel em producao. Frontend, Server Actions e Supabase remoto permanecem intocados.

### HU 15.2 — Docker Compose producao

- [x] Criar `docker-compose.prod.yml` com backend (target production), db PostgreSQL 16, volumes `postgres_data` e `media_data`
- [x] Healthchecks para backend e db; sem servico de restore

**Evidencia:** `docker-compose.prod.yml` criado na raiz com `target: production`, variaveis via env, volume `media_data:/app/media`, `depends_on` com `service_healthy` e healthcheck do backend validando `GET /health/` com status de banco.

### HU 15.3 — Production settings hardening

- [x] Endurecer `backend/pcp_project/config/production.py`: `DEBUG=False`, seguranca basica (`SECURE_*` via env), logging estruturado, `MEDIA_*` via env
- [x] Suporte opcional a S3 via `USE_S3_STORAGE` e `django-storages`

**Evidencia:** `production.py` configurado com `CONN_MAX_AGE`, `STORAGES` modular, flag `USE_S3_STORAGE`, cookies/HSTS/SSL redirect controlados por env e `LOGGING` estruturado para stdout. Dependencias `django-storages` e `boto3` adicionadas em `requirements.txt`.

### HU 15.4 — Backups e restore operacional

- [x] Scripts ou documentacao de backup/restore para PostgreSQL e media de producao

**Evidencia:** criados `scripts/infra/backup_postgres.sh` (pg_dump custom), `scripts/infra/restore_postgres.sh` (pg_restore --clean) e `scripts/infra/backup_media.sh` (tar do volume). Procedimento operacional documentado em `MDJ15_VALIDACAO_INFRA.md`, complementando `PLANO_BACKUP_RESTORE.md` (Supabase) com rotina do banco Django em VPS.

### HU 15.5 — Observabilidade e healthcheck robusto

- [x] Healthcheck com verificacao de conectividade PostgreSQL em `GET /health/`
- [x] Logging estruturado em producao

**Evidencia:** `GET /health/` retorna `{"status":"ok","database":"ok"}` ou HTTP 503 com `database: unavailable`. Teste `HealthcheckTests` atualizado para `TestCase`. Compose prod valida health via Python no container backend.

### HU 15.6 — Storage configuravel em producao

- [x] Media via volume Docker por padrao; S3 opcional via env flag sem alterar codigo de dominio

**Evidencia:** `docker-compose.prod.yml` monta `media_data:/app/media`; `production.py` alterna `FileSystemStorage` vs `S3Boto3Storage` conforme `USE_S3_STORAGE`. URLs publicas relativas continuam via `MEDIA_BASE_URL`; URLs absolutas de storage externo/S3 sao preservadas por `infra/services/arquivos.py`.

### HU 15.7 — Homologacao final MDJ-15

- [x] `python manage.py check` passa
- [x] `python manage.py makemigrations --check --dry-run` passa
- [x] Suite completa passa
- [x] Build do target production passa
- [x] `git diff --check` passa
- [x] Documento `MDJ15_VALIDACAO_INFRA.md` criado

**Evidencia:** homologacao em `2026-06-15` documentada em `docs/migracao_django/MDJ15_VALIDACAO_INFRA.md`. Supabase remoto, frontend e Server Actions permaneceram intocados. MDJ-16 liberavel para abertura documental.

### HU 15.8 — Homologacao complementar: URL S3 e secrets obrigatorios

- [x] Preservar URL absoluta retornada por storage externo/S3 sem prefixar `MEDIA_BASE_URL`
- [x] Endurecer `docker-compose.prod.yml` para falhar sem `DJANGO_SECRET_KEY` e `POSTGRES_PASSWORD`
- [x] Adicionar teste cobrindo URL absoluta retornada pelo storage
- [x] Revalidar compose prod e suite completa

**Evidencia:** teste `infra.tests.test_arquivos.ConstruirUrlPublicaArquivoTests.test_preserva_url_absoluta_retornada_pelo_storage` falhou antes da correcao com URL `https://api.example.comhttps://cdn.example.com/...` e passou apos o ajuste. `docker compose -f docker-compose.prod.yml config` falha sem secrets obrigatorios e passa com `DJANGO_SECRET_KEY`/`POSTGRES_PASSWORD` definidos. Suite completa revalidada com 97 testes OK.
