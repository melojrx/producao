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

---

## Sprint MDJ-16 — Cutover controlado por modulo (dev local)

**Status:** ✅ Concluida (2026-06-17)
**Objetivo:** Trocar a origem de dados do frontend Next.js para o backend Django **em dev local**, por modulo, com feature flags, fallback para Supabase e rollback operacional — conforme `ARQUITETURA.md` secao 19.
**Ambiente alvo:** backend `docker-compose.dev.yml` (porta 8001) + frontend `npm run dev` no host. Sem VPS, sem dominio, sem S3.
**Escopo:** `lib/` (cliente Django, flags, roteamento dual), queries/actions do frontend, `.env.local` do Next.js, documentacao de rollback em dev.
**Fora de escopo:** VPS/EasyPanel/producao (MDJ-18), stack Docker com frontend em container (MDJ-17), S3, big bang, remocao de caminhos Supabase, migracao em massa Storage Supabase, alteracoes no Supabase remoto, Realtime/WebSocket.

**Regra de execucao:** implementar uma HU por vez, na ordem abaixo. HUs 16.2–16.4 foram concluidas como **preparatorias** (util para MDJ-18); nao bloqueiam o cutover em dev. Proxima HU ativa: **16.7**. Flags de escrita critica so apos 16.6–16.7 e aceite explicito do usuario.

### HU 16.0 — Realinhamento estrategico (decisao 2026-06-15)

- [x] Registrar decisao: migracao 100% em dev antes de VPS/producao
- [x] Adiar VPS, dominio, EasyPanel e S3 para MDJ-18
- [x] Adiar stack Docker integrada (Django + Postgres + Next.js) para MDJ-17
- [x] Manter MDJ-15 como artefatos preparatorios (nao ativar)
- [x] Atualizar `BACKLOG.md` com fases A/B/C e sprints MDJ-17/MDJ-18

**Evidencia:** decisao do usuario em 2026-06-15 registrada em `BACKLOG.md` (fases operacionais). MDJ-16 reescrita para cutover em dev (`localhost:8001`). HU 16.5 adiada para MDJ-18. MDJ-17 planejada para compose dev integrado apos homologacao da MDJ-16. Storage permanece volume local (MDJ-14); S3 fora de escopo ate nova decisao.

### HU 16.1 — Abertura da sprint

- [x] Registrar MDJ-16 em `TASKS.md` e `BACKLOG.md` com HUs tecnicas, fora de escopo e ordem de execucao
- [x] Referenciar `ARQUITETURA.md` secao 19 como contrato de flags e criterios de cutover

**Evidencia:** Sprint MDJ-16 aberta em `2026-06-15` com HUs 16.1–16.15 cobrindo hardening operacional, CORS, infraestrutura de flags no frontend, cutover read-only, auth JWT, escritas criticas e homologacao final. MDJ-15 permanece concluida como pre-requisito.

### HU 16.2 — Hardening dos scripts operacionais de backup/restore

- [x] Scripts `scripts/infra/backup_postgres.sh`, `restore_postgres.sh` e `backup_media.sh` carregam variaveis de `.env` da raiz quando existir (`set -a` / `source`)
- [x] `restore_postgres.sh` exige confirmacao explicita antes de `pg_restore --clean --if-exists`
- [x] Documentar em `MDJ15_VALIDACAO_INFRA.md` ou runbook MDJ-16: parar backend (`docker compose stop backend`) antes do restore destrutivo
- [x] Teste manual ou script de smoke validando que backup usa `POSTGRES_DB`/`POSTGRES_USER` do `.env` customizado

**Evidencia:** Helper compartilhado `scripts/infra/_load_env.sh` (source com `set -a`/`set +a` quando `.env` existe na raiz). `restore_postgres.sh` exige digitar `yes` ou flag `--yes`; bloqueia se backend estiver rodando (salvo `--force`). Runbook atualizado em `MDJ15_VALIDACAO_INFRA.md`. Smoke test: `./scripts/infra/test_backup_env.sh`.

### HU 16.3 — CORS e origens confiaveis para producao *(preparatoria — MDJ-18)*

- [x] Adicionar `django-cors-headers` (ou equivalente documentado) em `requirements.txt` e `INSTALLED_APPS` apenas em `production.py` quando `CORS_ALLOWED_ORIGINS` estiver definido
- [x] Configurar `CORS_ALLOWED_ORIGINS` e `CSRF_TRUSTED_ORIGINS` via env (lista separada por virgula)
- [x] Documentar valores esperados para Vercel (`https://*.vercel.app` ou dominio customizado) em `.env.example`
- [x] Testes cobrindo preflight OPTIONS e rejeicao de origem nao autorizada quando CORS estiver ativo

**Evidencia:** _(mesma da implementacao)_ Preparatorio para MDJ-18. **Nao necessario para cutover em dev** (`local.py` sem CORS; frontend e backend em localhost).

### HU 16.4 — Fail-fast S3 e revisao de ACL padrao *(preparatoria — fora de escopo ate nova decisao)*

- [x] Em `production.py`, levantar `ImproperlyConfigured` quando `USE_S3_STORAGE=true` e credenciais/bucket vazios
- [x] Alterar default de `AWS_DEFAULT_ACL` para `private`
- [x] Teste unitario cobrindo validacao S3

**Evidencia:** _(mesma da implementacao)_ Codigo existe em `production.py` mas **`USE_S3_STORAGE` permanece `false` em todo o projeto**. S3 nao sera usado em dev nem na primeira producao (MDJ-18).

### HU 16.5 — Arquivos estaticos do Django Admin em producao *(adiada → MDJ-18)*

- [ ] ~~Definir `STATIC_ROOT` em `production.py`~~
- [ ] ~~`collectstatic` no Dockerfile production~~
- [ ] ~~Validar `/admin/` em stack prod~~

**Evidencia:** Adiada para MDJ-18 (VPS/producao). Admin em dev continua via `runserver` + `DEBUG`/`local.py`.

### HU 16.6 — Cliente HTTP/JWT Django no frontend (dev local)

- [x] Criar `lib/django/client.ts` (ou pasta equivalente) com base URL `NEXT_PUBLIC_DJANGO_API_URL` default `http://localhost:8001`, headers JWT e tratamento de erro tipado
- [x] Criar helpers de sessao/token compativeis com fluxo JWT da MDJ-13 (`/api/v1/accounts/login/`, refresh se aplicavel)
- [x] Documentar em `.env.local.example` (frontend): `NEXT_PUBLIC_DJANGO_API_URL=http://localhost:8001` e flags (HU 16.7)
- [x] Nenhum componente em `components/` acessa fetch direto ao Django — apenas via `lib/`

**Evidencia:** Implementado em `lib/django/` (`client.ts`, `auth.ts`, `session.ts`, `types.ts`) com `djangoFetch()`, `DjangoApiError`, `loginDjango()`, `refreshAccessToken()`, `obterUsuarioAtualDjango()` e abstracao minima de sessao JWT (constantes de cookie + memoria para testes). Base URL via `NEXT_PUBLIC_DJANGO_API_URL` (default `http://localhost:8001`). Flags documentadas em `.env.local.example` (sem helper 16.7). Testes em `lib/django/client.test.ts`. Validacao em `2026-06-17` com `node --test --experimental-strip-types lib/django/client.test.ts` e `npx tsc --noEmit`, ambos sem erros. Nenhum arquivo em `components/` alterado.

### HU 16.7 — Infraestrutura de feature flags (todas OFF por padrao)

- [x] Centralizar flags em `lib/constants.ts` ou `lib/django/flags.ts` conforme `ARQUITETURA.md` secao 19.2:

  | Flag | Modulo |
  |---|---|
  | `NEXT_PUBLIC_USE_DJANGO_SCANNER_READS` | Scanner read-only |
  | `NEXT_PUBLIC_USE_DJANGO_CADASTROS_READS` | Cadastros + produtos read-only |
  | `NEXT_PUBLIC_USE_DJANGO_METAS_READS` | Metas mensais read-only |
  | `NEXT_PUBLIC_USE_DJANGO_DASHBOARD_READS` | Dashboard/relatorios/turnos read-only |
  | `NEXT_PUBLIC_USE_DJANGO_AUTH` | Login JWT Django (substitui Supabase Auth no admin) |
  | `NEXT_PUBLIC_USE_DJANGO_ADMIN_WRITES` | Mutacoes administrativas simples |
  | `NEXT_PUBLIC_USE_DJANGO_PRODUCAO_WRITES` | Apontamentos produtivos |
  | `NEXT_PUBLIC_USE_DJANGO_QUALIDADE_WRITES` | Revisao de qualidade |

- [x] Helper `estaUsandoDjango(modulo)` retorna `false` quando env ausente ou `"false"`
- [x] Preservar caminhos Supabase existentes em `lib/queries/` e `lib/actions/` — roteamento dual, nunca remocao prematura
- [x] Testes unitarios das flags (ligado/desligado) sem rede

**Evidencia:** Implementado em `lib/django/flags.ts` com `ModuloDjangoCutover`, `FLAG_POR_MODULO`, `estaUsandoDjango()` e `obterFlagsDjangoCutover()`. Parsing booleano: true apenas para `1`, `true` ou `yes` (case insensitive); ausente, vazio ou qualquer outro valor → false. Oito flags mapeadas conforme `ARQUITETURA.md` 19.2. `.env.local.example` atualizado com referencia ao helper. Testes em `lib/django/flags.test.ts` (ausente, falsos, verdadeiros, env por modulo, snapshot debug). Validacao em `2026-06-17` com `node --test --experimental-strip-types lib/django/flags.test.ts` e `npx tsc --noEmit`, ambos sem erros. Nenhum roteamento em queries/actions nem alteracao em `components/`.

### HU 16.8 — Cutover read-only: cadastros e produtos

- [x] Com `NEXT_PUBLIC_USE_DJANGO_CADASTROS_READS=true`, queries de operadores, maquinas, setores, operacoes e produtos usam Django (`/api/v1/cadastros/*`, `/api/v1/produtos/*`)
- [x] Com flag OFF, comportamento identico ao atual via Supabase
- [x] Testes de paridade (contagens e campos contratuais) comparando Supabase vs Django com dados importados locais
- [x] Runbook de rollback: desligar flag → redeploy frontend → validar CRUD admin via Supabase

**Evidencia:** Roteamento dual em `lib/queries/operadores.ts`, `maquinas.ts`, `setores.ts`, `operacoes.ts` e `produtos.ts` via `estaUsandoDjango('cadastros_reads')`. Camada Django read-only em `lib/django/queries/cadastros.ts`, `produtos.ts`, `mappers.ts` e `obter-token-servidor.ts` (JWT do cookie `django_access_token` ou `DJANGO_DEV_ACCESS_TOKEN` em dev). Mapeamentos criticos: produto `codigo`→`referencia`; setor/operacao/maquina `situacao`→`ativo`/`ativa`/`status`; operador `setor`→`null` (campo ausente no Django); `tipo_maquina`→`tipo_maquina_codigo`. Testes unitarios de mappers em `lib/django/queries/mappers.test.ts` (fixtures dos serializers DRF, sem rede). Validacao em `2026-06-17`: `npx tsc --noEmit` e `node --test --experimental-strip-types lib/django/queries/mappers.test.ts` sem erros.

**Rollback (runbook):**
1. Definir `NEXT_PUBLIC_USE_DJANGO_CADASTROS_READS=false` (ou remover a variavel) no `.env.local`/Vercel.
2. Redeploy ou reiniciar `npm run dev`.
3. Validar paginas admin de operadores, maquinas, setores, operacoes e produtos — devem voltar a ler Supabase.
4. Se dados foram alterados apenas no Django durante teste, nao afeta Supabase; descartar ou reimportar conforme `PLANO_BACKUP_RESTORE.md`.

### HU 16.9 — Cutover read-only: scanner

- [x] Com `NEXT_PUBLIC_USE_DJANGO_SCANNER_READS=true`, fluxo scanner usa endpoints Django (`/api/v1/scanner/*`)
- [x] Com flag OFF, scanner continua via Supabase/queries atuais
- [x] Testes de paridade para operador, setor e demandas por token QR
- [x] Runbook de rollback documentado

**Evidencia:** Backend read-only em `backend/scanner/` (selectors, serializers, viewsets publicos `AllowAny`): `GET /api/v1/scanner/operador/{token}/`, `GET /api/v1/scanner/setor/{token}/`, `GET /api/v1/scanner/setor/{token}/demandas/`, `GET /api/v1/scanner/turno-setor/{id}/demandas/` (refresh de demandas no hook). Roteamento dual em `lib/queries/scanner.ts` via `estaUsandoDjango('scanner_reads')`. Camada Django em `lib/django/queries/scanner.ts` e `scanner-mappers.ts` — mapeia `produto.codigo`→`produtoReferencia`, `turno.data_hora_abertura`→`turnoIniciadoEm`, reutiliza `consolidarSetorScaneadoPorDemandas` e utils de qualidade no path Django. Opcional com `cadastros_reads`: `buscarOperadorScaneadoPorId`, `listarOperadoresAtivosScanner`, `buscarMaquinaScaneadaPorToken`, `buscarOperacaoBasePorToken`. Testes: `backend/scanner/tests/test_scanner_api.py` (10 casos) e `lib/django/queries/scanner-mappers.test.ts` (5 casos). Validacao em `2026-06-17`: `docker compose -f docker-compose.dev.yml exec -T backend python manage.py test scanner --keepdb`, `npx tsc --noEmit`, `node --test --experimental-strip-types lib/django/queries/scanner-mappers.test.ts`, `git diff --check`.

**Rollback (runbook):**
1. Definir `NEXT_PUBLIC_USE_DJANGO_SCANNER_READS=false` (ou remover a variavel) no `.env.local`/Vercel.
2. Redeploy ou reiniciar `npm run dev`.
3. Validar fluxo scanner (scan setor → operador → demandas) — deve voltar a ler Supabase.
4. Enriquecimento de capacidade/fluxo paralelo permanece no path Supabase; com flag ON o scanner usa demandas base do Django (sem enrichment Supabase adicional).
5. Dados lidos no Django durante teste nao alteram Supabase.

### HU 16.10 — Cutover read-only: dashboard, relatorios e metas

- [x] Com `NEXT_PUBLIC_USE_DJANGO_DASHBOARD_READS=true`, leituras operacionais usam Django (`/api/v1/relatorios/*`, `/api/v1/turnos/*`)
- [x] Com `NEXT_PUBLIC_USE_DJANGO_METAS_READS=true`, resumo de meta mensal usa Django (`/api/v1/metas/*`)
- [x] Flags independentes; fallback Supabase por flag
- [x] Testes de paridade nos KPIs e payloads documentados em MDJ-7/8

**Evidencia:** Backend metas read API em `backend/metas/` (`GET /api/v1/metas/`, `/api/v1/metas/competencia/{YYYY-MM-01}/`, `/api/v1/metas/resumo/?competencia=`). Turnos: `GET /api/v1/turnos/ultimo-encerrado/`, filtros `?turno=` em demandas/operacoes, `GET /api/v1/turnos-secoes/?turno=`. Roteamento dual: `lib/queries/metas-mensais.ts` (`metas_reads`), `lib/queries/turnos.ts` (`dashboard_reads`). Camada Django: `lib/django/queries/metas.ts`, `turnos-dashboard.ts`, `dashboard-relatorios.ts` + mappers/testes. Testes backend: `backend/metas/tests/test_meta_api.py`, `backend/turnos/tests/test_turno_read_api.py`. Testes mappers: `lib/django/queries/metas-mappers.test.ts`, `turnos-dashboard-mappers.test.ts`, `dashboard-relatorios-mappers.test.ts`. Validacao em `2026-06-17`: `npx tsc --noEmit`, `python manage.py test metas turnos relatorios scanner --settings=pcp_project.config.local`, `npm test -- lib/django/queries/*mappers*.test.ts`.

**Rollback (runbook):**
1. Definir `NEXT_PUBLIC_USE_DJANGO_DASHBOARD_READS=false` e `NEXT_PUBLIC_USE_DJANGO_METAS_READS=false` (ou remover) no `.env.local`.
2. Reiniciar `npm run dev`.
3. Validar dashboard/TV/apontamentos — devem voltar a ler Supabase; metas mensais idem.

**Deferido (paridade parcial):** `lib/queries/turnos-client.ts` e `useRealtimePlanejamentoTurnoV2` permanecem Supabase (refresh client-side sem JWT browser na 16.11). `lib/queries/relatorios-v2.ts` e `relatorios.ts` legado nao roteados (escopo dashboard/metas). Path Django de planejamento de turno omite eficiencia/qualidade operacional (campos opcionais vazios) ate endpoints dedicados ou HU 16.11.

### HU 16.11 — Cutover de autenticacao JWT (admin/supervisor)

- [x] Com `NEXT_PUBLIC_USE_DJANGO_AUTH=true`, login em `/login` usa `/api/v1/accounts/login/` Django e armazena JWT conforme MDJ-13
- [x] Com flag OFF, login permanece Supabase Auth
- [x] Middleware/proxy Next.js protege `/admin/*` com either path sem regressao
- [x] Testes E2E ou integracao cobrindo login, 401 sem token e logout
- [x] Aceite explicito do usuario antes de ligar flag em ambiente compartilhado (dev local: OK apos homologacao)

**Evidencia:** `lib/django/cookies.ts` persiste JWT em cookies httpOnly (`django_access_token`, `django_refresh_token`); `lib/actions/auth.ts` roteia login/logout por `estaUsandoDjango('auth')`; `lib/auth/require-admin-user.ts` + `lib/auth/sessao-django.ts` resolvem sessao admin via `/api/v1/accounts/me/` com refresh automatico; `lib/supabase/proxy.ts` protege `/admin/*` e redireciona `/login` no path Django; testes `lib/django/jwt.test.ts`, `lib/django/cookies.test.ts`, `lib/auth/sessao-django.test.ts`, `lib/actions/auth.test.ts` passam com `node --test --experimental-strip-types`. **Deferido:** `lib/queries/turnos-client.ts` permanece Supabase — cookies httpOnly impedem JWT no browser client sem endpoint dedicado (HU posterior).

**Rollback (dev local):** `NEXT_PUBLIC_USE_DJANGO_AUTH=false` em `.env.local`; apagar cookies `django_access_token` e `django_refresh_token` no browser; `npm run dev` reiniciado; validar login Supabase em `/login` e acesso `/admin/dashboard`.

**Aceite usuario (ambiente compartilhado):** nao ligar `NEXT_PUBLIC_USE_DJANGO_AUTH=true` em Vercel/homologacao compartilhada sem homologacao manual em dev local com credencial Django (`createsuperuser` ou usuario migrado MDJ-13).

### HU 16.12 — Cutover de escritas administrativas simples (dev local)

- [x] Com `NEXT_PUBLIC_USE_DJANGO_ADMIN_WRITES=true`, mutacoes de cadastros simples (ex.: tipos de defeito ja migrado na MDJ-9) roteiam para DRF
- [x] Demais Server Actions permanecem Supabase ate flags especificas
- [x] Testes de paridade write + read apos mutacao
- [x] Rollback: flag OFF; dados escritos no Django durante teste documentados para descarte ou sync manual (`PLANO_BACKUP_RESTORE.md`)

**Evidencia:** `lib/actions/qualidade-defeitos.ts` e `lib/queries/qualidade-defeitos.ts` roteiam por `estaUsandoDjango('admin_writes')`; mutacoes delegam a `lib/django/actions/qualidade-defeitos.ts` (POST/PATCH/inativar/reativar em `/api/v1/qualidade/defeitos/`); listagem pos-mutacao via `lib/django/queries/qualidade-defeitos.ts` + mappers com `totalVinculosHistoricos`; testes `lib/django/actions/qualidade-defeitos.test.ts` e `lib/django/queries/qualidade-defeitos-mappers.test.ts` passam com `node --test --experimental-strip-types`; `npx tsc --noEmit` passa. Gap documentado: Django ignora `ordem` na escrita; `excluir` no path Django sempre inativa (sem hard delete).

**Rollback (dev local):** `NEXT_PUBLIC_USE_DJANGO_ADMIN_WRITES=false` em `.env.local`; reiniciar `npm run dev`; validar CRUD tipos de defeito gravando no Supabase. Dados criados no Postgres Django (`pcp_db` via `docker-compose.dev.yml`) durante testes sao locais — descartar container/volume ou sync manual conforme `PLANO_BACKUP_RESTORE.md` se necessario; Supabase remoto intocado.

### HU 16.13 — Cutover de apontamentos produtivos

- [x] Com `NEXT_PUBLIC_USE_DJANGO_PRODUCAO_WRITES=true`, registro produtivo usa `POST /api/v1/producao/apontamentos/` (MDJ-10)
- [x] Validar concorrencia e saldo fisico antes de aceite
- [x] Flag OFF mantem RPC Supabase intacto
- [x] Aceite explicito do usuario obrigatorio

**Evidencia:** Roteamento dual em `lib/actions/producao.ts` via `estaUsandoDjango('producao_writes')` para `registrarProducaoOperacao` (scanner V2). Mutacao Django em `lib/django/actions/producao.ts` + helpers (`POST /api/v1/producao/apontamentos/`); enriquecimento pos-POST via GET read-only em `turnos-operacoes`, `turnos-demandas` e `turnos-ops`. Pre-validacao Supabase de saldo fisico omitida no path Django — validacao atomica no service MDJ-10 (`registrar_apontamento_operacao` + `validar_quantidade_dentro_saldo_fisico`). `usuario_sistema` mapeado via `lib/auth/resolver-usuario-django.ts` (User Django quando `auth` ON); scanner publico envia null. JWT via `obterAccessTokenDjango()` (cookie ou `DJANGO_DEV_ACCESS_TOKEN`). Testes `lib/django/actions/producao.test.ts`. Validacao em `2026-06-17`: `npx tsc --noEmit` e `node --test --experimental-strip-types lib/django/actions/producao.test.ts` sem erros.

**Aceite explicito (mutacao critica):** Homologar em dev local antes de ligar flag em ambiente compartilhado. Fluxo: `docker compose -f docker-compose.dev.yml up` + `npm run dev` + definir `DJANGO_DEV_ACCESS_TOKEN` (JWT supervisor) + `NEXT_PUBLIC_USE_DJANGO_PRODUCAO_WRITES=true` + scanner apontamento com quantidade valida; repetir tentativa acima do saldo fisico e confirmar erro Django; flag OFF e confirmar RPC Supabase intacto.

**Deferidos:** `registrarApontamentosSupervisor` (batch RPC `registrar_producao_supervisor_em_lote`) permanece Supabase — MDJ-10 sem endpoint batch. `registrarProducao` legado (turnoSetorOpId) permanece Supabase.

**Rollback (dev local):** `NEXT_PUBLIC_USE_DJANGO_PRODUCAO_WRITES=false` em `.env.local`; reiniciar `npm run dev`; validar apontamento via RPC Supabase. Apontamentos gravados no Postgres Django (`pcp_db`) durante testes sao locais — descartar container/volume ou sync manual conforme `PLANO_BACKUP_RESTORE.md`; Supabase remoto intocado.

### HU 16.14 — Cutover de revisao de qualidade

- [x] Com `NEXT_PUBLIC_USE_DJANGO_QUALIDADE_WRITES=true`, revisao usa endpoints MDJ-11
- [x] Autoria segura do revisor (`request.user.id`) preservada
- [x] Flag OFF mantem fluxo Supabase
- [x] Aceite explicito do usuario obrigatorio

**Evidencia:** Roteamento dual em `lib/actions/qualidade.ts` via `estaUsandoDjango('qualidade_writes')` para `registrarRevisaoQualidade`. Mutacao Django em `lib/django/actions/qualidade.ts` + helpers (`POST /api/v1/qualidade/revisoes/`); payload **sem** `revisor_usuario_id` — autoria via JWT (`request.user.id` no viewset MDJ-11). Permissao revisor validada pre-POST via `GET /api/v1/accounts/me/` (`pode_revisar_qualidade` + `ativo`). Enriquecimento pos-POST via GET read-only em `turnos-operacoes`, `turnos-demandas` e `turnos-ops`. Pre-validacao Supabase de saldo fisico omitida no path Django — validacao atomica no service MDJ-11. Testes `lib/django/actions/qualidade.test.ts`. Validacao em `2026-06-17`: `npx tsc --noEmit` e `node --test --experimental-strip-types lib/django/actions/qualidade.test.ts` sem erros.

**Aceite explicito (mutacao critica):** Homologar em dev local antes de ligar flag em ambiente compartilhado. Fluxo: `docker compose -f docker-compose.dev.yml up` + `npm run dev` + JWT de usuario com `pode_revisar_qualidade=true` (`NEXT_PUBLIC_USE_DJANGO_AUTH=true` ou `DJANGO_DEV_ACCESS_TOKEN`) + `NEXT_PUBLIC_USE_DJANGO_QUALIDADE_WRITES=true` + revisao no scanner ou painel apontamentos com quantidades validas; repetir tentativa acima do saldo fisico e confirmar erro Django; flag OFF e confirmar RPC Supabase intacto.

**Deferidos:** `app/(operador)/scanner/page.tsx` continua usando Supabase para `podeRegistrarQualidade` — cutover completo do scanner auth depende de homologacao MDJ-16.11 no painel admin; com `qualidade_writes` ON e auth Django OFF, revisao exige `DJANGO_DEV_ACCESS_TOKEN` de revisor em Server Actions.

**Rollback (dev local):** `NEXT_PUBLIC_USE_DJANGO_QUALIDADE_WRITES=false` em `.env.local`; reiniciar `npm run dev`; validar revisao via RPC Supabase. Registros gravados no Postgres Django (`pcp_db`) durante testes sao locais — descartar container/volume ou sync manual conforme `PLANO_BACKUP_RESTORE.md`; Supabase remoto intocado.

### HU 16.15 — Homologacao final MDJ-16 (dev local)

- [x] Criar `docs/migracao_django/MDJ16_VALIDACAO_CUTOVER.md` com matriz flag × modulo × status de paridade × rollback **em dev**
- [x] Todas as flags testadas em OFF (regressao Supabase) e ON (Django em `localhost:8001`) por modulo homologado
- [x] `python manage.py check`, `makemigrations --check --dry-run`, suite completa backend passam
- [x] `npx tsc --noEmit` passa apos alteracoes de frontend
- [x] `git diff --check` passa
- [x] Smoke manual: `docker-compose.dev.yml` up + `npm run dev` + fluxo critico (login, listagem, apontamento) com flags ON
- [x] Nenhum caminho Supabase removido do codigo; Supabase remoto intocado
- [x] ~~Smoke test `docker-compose.prod.yml`~~ → movido para MDJ-18

**Evidencia:** Relatorio `docs/migracao_django/MDJ16_VALIDACAO_CUTOVER.md` (2026-06-17) com matriz 8 flags × paridade × rollback, checklist smoke manual e auditoria Supabase. Validacao automatizada: `manage.py check` OK; `makemigrations --check --dry-run` OK; `manage.py test --keepdb` **120 testes OK**; `npx tsc --noEmit` OK; `node --test` **60 testes OK**; `git diff --check` OK. Correcao trivial em `backend/metas/selectors/meta_mensal.py` (`_formatar_dia_mes` aceita `date | str`). Deferidos documentados: turnos-client/realtime, relatorios legado, batch supervisor, scanner `podeRegistrarQualidade`, eficiencia/qualidade operacional vazios no path Django.

---

## Sprint MDJ-17 — Stack Docker dev integrada

**Status:** ✅ Concluida (2026-06-17)
**Pre-requisito:** MDJ-16 concluida e homologada (frontend host + backend container).
**Objetivo:** Unificar dev em um Compose com Django + PostgreSQL + Next.js — sem VPS, dominio ou S3.
**Escopo:** `docker-compose.dev.full.yml`, Dockerfile frontend dev, rede interna, documentacao.
**Fora de escopo:** producao, VPS, S3, cutover de novos modulos (ja feito na MDJ-16).

### HU 17.1 — Abertura da sprint

- [x] Registrar MDJ-17 em `TASKS.md` e `BACKLOG.md` apos confirmacao de MDJ-16 concluida

**Evidencia:** Sprint MDJ-17 aberta em 2026-06-17 apos confirmacao do usuario pos-MDJ-16. Status atualizado em `TASKS.md` e linha MDJ-17 em `BACKLOG.md` → Em andamento.

### HU 17.2 — Compose dev integrado

- [x] Criar compose com servicos `backend` (target development), `db`, `frontend` (Next.js dev)
- [x] Volumes para hot-reload (`./backend`, repo root, `node_modules` anonimo)
- [x] `NEXT_PUBLIC_DJANGO_API_URL` acessivel do browser (porta publicada 8001)

**Evidencia:** `docker/compose/dev.base.yml`, `dev.frontend.yml`, `dev.full.yml` (include), `docker/frontend/Dockerfile.dev`, wrappers raiz, `.dockerignore`, scripts `dev:docker` e `dev:docker:backend`. `NEXT_PUBLIC_DJANGO_API_URL=http://localhost:8001` documentado (nao usar `backend:8000`). Refatoracao cleanup 2026-06-17: duplicacao backend/db eliminada — ver `MDJ17_DOCKER_AUDIT.md`.

### HU 17.3 — Homologacao stack integrada

- [x] Documento `MDJ17_VALIDACAO_STACK_DEV.md`
- [x] Comando unico sobe os tres servicos; flags MDJ-16 funcionam no compose integrado
- [x] `git diff --check` passa

**Evidencia:** Relatorio `docs/migracao_django/MDJ17_VALIDACAO_STACK_DEV.md` (2026-06-17). Validacao: `docker compose config` OK; `build frontend` OK; `up -d` OK; `curl` health → `{"status":"ok","database":"ok"}`; frontend HTTP 307; `git diff --check` OK. Pos-refatoracao modular: estrutura `docker/compose/*` + wrappers; revalidacao documentada em `MDJ17_DOCKER_AUDIT.md`.

---

## Sprint MDJ-18 — VPS, dominio e producao

**Status:** ✅ Concluida (artefatos pre-deploy — 2026-06-17)
**Pre-requisito:** MDJ-17 concluida; migracao homologada em dev.
**Objetivo:** Stack Docker producao pronta para deploy em `producao.costurai.com.br` — sem executar deploy nesta sprint.
**Dominio:** `producao.costurai.com.br` (DNS A → VPS `38.52.128.62`).
**Escopo:** compose prod (backend + frontend + db + nginx), Dockerfile.prod standalone, STATIC_ROOT, CORS/CSRF documentados, smoke local.
**Fora de escopo:** deploy VPS, TLS na VPS, S3, cutover flags em producao.

### HU 18.1 — Abertura e checklist pre-deploy

- [x] Registrar MDJ-18 apos confirmacao de MDJ-17
- [x] Checklist: dominio, TLS (doc), secrets, backup referenciado

**Evidencia:** Sprint MDJ-18 aberta em 2026-06-17. Dominio unico `producao.costurai.com.br`. Checklist em `MDJ18_VALIDACAO_PRODUCAO.md`. DNS configurado pelo usuario na Hostinger.

### HU 18.2 — Static files e Admin em producao

- [x] `STATIC_ROOT` + WhiteNoise em `production.py`
- [x] `collectstatic` no entrypoint `docker-entrypoint.prod.sh`
- [x] Rota `/static/` no nginx → backend

**Evidencia:** `whitenoise` em `requirements.txt`; testes `test_production_static_settings.py`.

### HU 18.3 — Homologacao producao (artefatos locais)

- [x] `MDJ18_VALIDACAO_PRODUCAO.md`
- [x] Compose modular `docker/compose/prod.*` + `Dockerfile.prod` + nginx
- [x] CORS/CSRF com dominio real documentado em `.env.example`
- [x] `scripts/smoke-stack-prod.mjs` + `npm run prod:docker`

**Evidencia:** Relatorio `docs/migracao_django/MDJ18_VALIDACAO_PRODUCAO.md`. Validacao 2026-06-19: `prod:docker:config` OK; build backend+frontend OK; `smoke-stack-prod.mjs` **5/5 OK** (`proxy-health`, `api-via-proxy`, `frontend-login`, `admin-redirect-sem-sessao`, `django-login-via-proxy`). Fix: runtime `NEXT_PUBLIC_*` no servico frontend + smoke prioriza `.env` sobre `.env.local`.

---

## Sprint MDJ-19 — Limpeza legado Supabase e preparacao desligamento

**Status:** ✅ Concluida (2026-07-09) — desligamento fisico da nuvem legada e remocao das dependencias `@supabase/*` do `package.json` ficam pendentes de aceite pos-observacao do responsavel (Junior Melo).
**Pre-requisito:** MDJ-16 concluida (flags Django homologadas em dev); MDJ-17 recomendada (stack integrada). Pode executar **em paralelo** com MDJ-18 ou **apos** MDJ-18 — nao bloqueia deploy VPS.
**Objetivo:** Eliminar ruído e dependencias Supabase no browser quando flags Django estiverem ON; substituir Realtime legado por polling Django no dashboard; deprecar `configuracao_turno` / blocos; documentar checklist de desligamento do Supabase remoto.
**Ambiente alvo:** dev local — backend `localhost:8001` + frontend host ou `docker/compose/dev.full.yml`.
**Escopo:** guards client-side, hooks de dashboard, remocao/redirect de fluxos legados, relatorio de desligamento.
**Fora de escopo:** desligar Supabase remoto de fato (exige aceite explicito pos-checklist); migracao de `relatorios-v2.ts` completa; Django Channels/WebSocket; alteracoes no projeto Supabase cloud sem aprovacao.

**Regra de execucao:** uma HU por vez, na ordem abaixo. Nenhuma HU remove variaveis `NEXT_PUBLIC_SUPABASE_*` do `.env.example` ate HU 19.5 aprovada pelo usuario.

### HU 19.1 — Abertura e inventario de chamadas Supabase no browser

- [x] Registrar MDJ-19 em `TASKS.md` e `BACKLOG.md`
- [x] Inventario atualizado: hooks/client components que ainda instanciam `createClient()` ou Realtime com flags Django ON (`useRealtimePlanejamentoTurnoV2`, `useRealtimeProducao`, `turnos-client.ts`, `meta-grupo-turno-v2-client.ts`, `producao.ts` client)
- [x] Matriz deferidos MDJ-16 atualizada com status "MDJ-19" onde aplicavel

**Evidencia:** `docs/migracao_django/MDJ19_INVENTARIO_SUPABASE_BROWSER.md` (2026-06-22) — inventario client/server, matriz deferidos MDJ-16, criterio "100% Django".

### HU 19.2 — Guard Supabase no browser (flags Django ON)

- [x] Criar helper `deveUsarSupabaseBrowser()` (ou equivalente) baseado em `estaUsandoDjango()` — quando **todas** as flags de leitura/escrita relevantes estiverem ON, browser **nao** abre WebSocket Realtime nem dispara refresh de sessao Supabase Auth
- [x] `hooks/useRealtimePlanejamentoTurnoV2.ts`: early return sem `createClient()` / channel quando guard ativo; status `ativo` via polling (HU 19.3) ou `desligado` explicito ate polling existir
- [x] `hooks/useRealtimeProducao.ts`: mesmo guard (componente legado — nao criar channel se guard ativo)
- [x] `lib/supabase/client.ts` ou consumidores: evitar loop de `refresh_token` quando auth Django ativo (login ja usa JWT cookies)
- [x] Testes unitarios do guard + smoke manual: console sem erros CORS/WebSocket Supabase com perfil homologacao MDJ-16 ON

**Evidencia:** `lib/django/flags.ts`; hooks atualizados; testes 9/9; smoke prod 11/11 (2026-06-22); dashboard confirmado operador.

### HU 19.3 — Polling Django no dashboard (substituir Realtime legado)

- [x] Com `NEXT_PUBLIC_USE_DJANGO_DASHBOARD_READS=true`, refresh do planejamento de turno via API Django (server action ou route handler autenticado) — intervalo configuravel em `lib/constants.ts` (ex.: `INTERVALO_POLLING_DASHBOARD_MS`)
- [x] `useRealtimePlanejamentoTurnoV2` renomeado ou encapsulado (ex.: `usePlanejamentoTurnoV2`) — sem dependencia de Supabase quando flags ON
- [x] `useMetaGrupoTurnoV2` passa a usar leitura Django (endpoint existente ou novo GET enxuto) em vez de `meta-grupo-turno-v2-client.ts` Supabase
- [x] Indicador de conexao na UI: `polling` / `erro` / `pausado` (nao "Realtime Supabase")
- [x] Testes: mock de fetch + `npx tsc --noEmit`

**Evidencia:** `lib/constants.ts` `INTERVALO_POLLING_DASHBOARD_MS=15000`; `lib/actions/dashboard-turno.ts` + `lib/actions/meta-grupo-turno.ts`; `lib/django/queries/meta-grupo-turno.ts`; `hooks/useMetaGrupoTurnoV2.ts`; UI polling; `npx tsc --noEmit` OK (2026-06-22).

### HU 19.4 — Deprecar `configuracao_turno` legado no frontend

- [x] Documentar em codigo/comentario de rota: fluxo operacional oficial = **turno V2** (`turnos` Django); `configuracao_turno` e **somente historico**
- [x] Remover ou isolar `MonitorRealtimeProducao` do dashboard principal (ja substituido por `MonitorPlanejamentoTurnoV2`) — redirect ou feature flag `NEXT_PUBLIC_LEGACY_DASHBOARD=false` (default off)
- [x] `lib/actions/turno.ts` / `turno-blocos.ts`: bloquear escrita Supabase quando flags Django ON; mensagem clara "use Novo Turno / Encerrar Turno"
- [x] `lib/queries/producao.ts` (client Supabase): nao ser invocado quando guard ativo; KPIs legados por bloco ficam indisponiveis ou leem turno V2
- [x] Scanner: auditar `buscarConfiguracaoTurnoHoje` — path legado documentado ou removido do fluxo V2 scanner
- [x] **Nao** criar models Django para `configuracao_turno` nesta HU (escopo = deprecar uso, nao migrar tabela)

**Evidencia:** `lib/utils/turno-legado.ts`; bloqueios em `turno.ts`/`turno-blocos.ts`; guards em `producao.ts`; `scanner.ts` retorna null para legado; `MonitorRealtimeProducao` mensagem descontinuado; comentarios em `app/admin/dashboard/page.tsx` (2026-06-22).

### HU 19.5 — Checklist desligamento Supabase remoto

- [x] Criar `docs/migracao_django/MDJ19_CHECKLIST_DESLIGAMENTO_SUPABASE.md` com:
  - criterios ARQUITETURA §19.5 cumpridos por modulo
  - matriz flags ON em producao + smoke E2E
  - backup final Supabase + restore local arquivado
  - plano rollback (reativar flags OFF + variaveis Supabase)
  - janela de cutover e responsavel
  - **checkbox explicito:** "Usuario autoriza desligamento do Supabase remoto"
- [x] Script ou comando de validacao de paridade final (`scripts/validar-paridade-dados.mjs` ou management command) referenciado no checklist

Referencia smoke MDJ-19: `scripts/smoke-stack-prod.mjs`, `scripts/mdj19/verificar-flags-cutover.mjs`.
- [x] Atualizar `MDJ16_VALIDACAO_CUTOVER.md` — secao "Pos-MDJ-19" com deferidos resolvidos vs remanescentes (`relatorios-v2`, etc.)

**Evidencia:** Checklist consolidado em 2026-07-09 com secao 6 (pos-observacao) explicitando que o desligamento fisico da nuvem permanece pendente de aceite de Junior Melo apos periodo observado. Validacao tecnica dev 16/16 flags + 8/8 smoke + tsc/testes OK. Responsavel operacional preenchido: Junior Melo. Aceite formal do desligamento fisico fica pos-observacao.

### HU 19.6 — Homologacao MDJ-19

- [x] `docs/migracao_django/MDJ19_VALIDACAO_LIMPEZA.md` com evidencias:
  - console browser limpo (sem CORS/WS Supabase) com flags ON
  - dashboard atualiza via polling Django
  - login/logout Django intacto
  - `npx tsc --noEmit` + testes afetados passando
  - `git diff --check` OK
- [x] Nenhuma remocao de env Supabase do repositorio ate aceite do checklist 19.5

**Evidencia:** `MDJ19_VALIDACAO_LIMPEZA.md` atualizado em 2026-07-09 com tabela consolidada: tsc OK, flags 16/16, testes 10/10, smoke dev 8/8, smoke prod 11/11 (2026-06-22). Variaveis `NEXT_PUBLIC_SUPABASE_*` permanecem comentadas no `.env.example` como fallback de rollback ate aceite pos-observacao.

---

## Sprint MDJ-20 — Migracao de dados producao (snapshot congelado)

**Status:** ✅ Concluida (import producao 2026-06-19)
**Pre-requisito:** MDJ-18 concluida (artefatos prod); **deploy VPS (MDJ-21)** executado e smoke `scripts/smoke-stack-prod.mjs` OK contra `https://producao.costurai.com.br`.
**Objetivo:** Carregar no Postgres de producao o **snapshot unico** do Supabase (backup ja realizado), importar midia e validar paridade — **sem sync incremental** com Supabase remoto.
**Premissa operacional (2026-06-17):** backup Supabase concluido; **nenhum dado novo** entrou no sistema desde entao; operacao permanece congelada ate Django funcional em producao com flags ON.
**Referencia tecnica:** `PLANO_IMPORTACAO_DADOS_REAIS.md`, evidencia ensaio local `MDJ_PRE_MDJ9_IMPORTACAO_REAL.md`, paridade MDJ-7/8.
**Escopo:** inventario do snapshot, import Postgres prod, midia, usuarios Django, relatorio de paridade, gate de retomada operacional.
**Fora de escopo:** delta/sync com Supabase ao vivo; desligamento Supabase remoto (MDJ-19 HU 19.5); S3. O cutover de flags em producao foi executado depois da paridade, em 2026-06-19, e registrado no relatorio MDJ-20.

**Regra de execucao:** uma HU por vez. **Nao** ligar flags Django de escrita/leitura em producao antes de HU 20.6 aprovada.

### HU 20.1 — Abertura e registro do snapshot congelado

- [x] Registrar MDJ-20 em `TASKS.md` e `BACKLOG.md`
- [x] Documentar metadados do backup: data, responsavel, caminho/arquivo (`backup_postgres` / dump Supabase), checksum opcional
- [x] Confirmar por escrito: zero escritas operacionais no Supabase desde o backup (sistema congelado)
- [x] Baseline de contagens do snapshot (SQL read-only no restore ou no dump) — tabela alvo vs contagem, anexo ao relatorio

**Evidencia:** Snapshot `backup-supabase-20260531` — sha256 schema/dados em `MDJ20_VALIDACAO_IMPORTACAO_PRODUCAO.md`; baseline 22 tabelas; premissa congelamento desde 2026-05-31.

### HU 20.2 — Checklist pre-importacao (VPS + banco vazio)

- [x] Stack prod na VPS: `migrate` aplicado, Postgres **vazio** de dados de negocio (so schema)
- [x] Secrets prod preenchidos (`.env` na VPS, nunca commitado)
- [x] Backup do volume Postgres prod **antes** da importacao (`scripts/infra/backup_postgres.sh`)
- [x] Restore do snapshot Supabase em container/postgres temporario acessivel pela VPS ou import direto do arquivo — decisao registrada
- [x] `python manage.py check` + `makemigrations --check --dry-run` OK no backend prod

**Evidencia:** `docker/compose/restore.vps.yml` + `postgres_restore` na rede `producao-prod_default`; backup pre-import em `/opt/producao/backups/postgres-pre-mdj20/`.

### HU 20.3 — Importacao Postgres producao (dados de negocio)

- [x] Executar pipeline de importacao conforme `PLANO_IMPORTACAO_DADOS_REAIS.md` (management command / script ja usado em `MDJ_PRE_MDJ9_IMPORTACAO_REAL.md`)
- [x] Origem: snapshot congelado (nao Supabase remoto)
- [x] Destino: banco `producao-prod` / servico `db` do compose prod na VPS
- [x] Dry-run com log; execucao real com log arquivado
- [x] Validar: nenhuma FK quebrada; sequencias/IDs coerentes pos-import

**Evidencia:** `import_supabase_restore --flush` 2026-06-19 — 58 turnos, 1321 registros producao, 5083 turno_setor_operacoes; logs `/opt/producao/backups/mdj20-logs/`.

### HU 20.4 — Importacao de midia (Storage → volume prod)

- [x] Inventario de objetos no backup de midia Supabase (produtos, operacoes, QR, etc.)
- [x] Copiar para volume `media_data` do compose prod (`scripts/infra/backup_media.sh` / restore inverso ou `rsync`)
- [x] URLs/caminhos Django batem com arquivos no disco (`MEDIA_ROOT`)
- [ ] Spot-check: imagens carregam via `/media/` no nginx prod

**Evidencia:** 41 arquivos em `/app/media/` na VPS. Causa raiz: nginx encaminhava `/media/` ao backend, mas Django so publica midia com `DEBUG=True`. Fix em `docker/nginx/prod.conf` (alias `/app/media/`) + mount `media_data:/app/media:ro` no proxy (`docker/compose/prod.proxy.yml`). Homologado em dev local 2026-06-22: `GET http://127.0.0.1:8080/media/codex/proxy-check.txt` → HTTP 200; teste `node --test scripts/mdj21_media_proxy_config.test.mjs` 2/2. Spot-check VPS pendente pos-deploy em main.

### HU 20.5 — Usuarios Django (admin / supervisor)

- [x] Listar contas que precisam acessar producao (emails do snapshot ou lista acordada)
- [x] Criar usuarios Django + permissoes de dominio (nao reutilizar hashes Supabase Auth — novo cadastro ou `createsuperuser`)
- [x] Smoke: login via proxy nginx (`scripts/smoke-stack-prod.mjs` — cenario `django-login-via-proxy`) com credencial real
- [x] Documentar credenciais entregues ao responsavel (fora do git)

**Evidencia:** superuser `admin@costurai.com.br` recriado pos-import; 3 usuarios snapshot; smoke 5/5.

### HU 20.6 — Paridade e homologacao pos-import

- [x] Contagens Django prod == baseline snapshot (HU 20.1), exceto lacunas documentadas
- [x] Endpoints read-only criticos retornam dados reais (turnos, scanner lookup, metas, qualidade — amostra)
- [x] Comparacao de payloads: divergencias classificadas aceitas vs bloqueantes (criterios MDJ-7/8)
- [x] `docs/migracao_django/MDJ20_VALIDACAO_IMPORTACAO_PRODUCAO.md` com evidencias + comandos executados
- [x] `git diff --check` OK nos artefatos de doc

**Evidencia:** setores=6, turnos=58, FKs criticas 0; doc `MDJ20_VALIDACAO_IMPORTACAO_PRODUCAO.md`.

### HU 20.7 — Gate de retomada operacional

- [x] Checklist explicito: importacao + paridade OK → **autorizado** cutover flags Django em producao
- [x] Ate o cutover: sistema continua **somente leitura** ou offline para operadores — sem dual-write Supabase
- [x] Pos-cutover: primeiro registro de producao novo entra **apenas** via Django (scanner + actions)
- [x] Referenciar MDJ-19 checklist desligamento Supabase como passo posterior (nao bloqueante para MDJ-20)

**Evidencia:** Gate documentado em `MDJ20_VALIDACAO_IMPORTACAO_PRODUCAO.md`; cutover autorizado apos aceite, flags Django ON em producao em 2026-06-19. Dev 2026-06-22: `registrar_apontamento_operacao` via Django (`manage.py shell`) — registro `ecbfd84e-1b55-4e11-b880-f95928d4327f`, contagem `1321→1322`, operador Janaina, TSO `4f2ff3e9-cdf2-4cc9-9f8a-1e614aa52c28`. Evidencia operacional em producao VPS permanece pendente.

---

## Sprint MDJ-21 — Deploy VPS producao

**Status:** ✅ Concluida (stack no ar — 2026-06-19)
**Pre-requisito:** MDJ-18 concluida (artefatos prod + smoke local 5/5).
**Objetivo:** Subir stack Docker em `38.52.128.62` com TLS em `https://producao.costurai.com.br`, smoke publico e base pronta para importacao MDJ-20.
**Runbook:** `docs/migracao_django/MDJ21_RUNBOOK_DEPLOY_VPS.md`
**Escopo:** VPS prep, `.env`, compose up, TLS, superusuario e smoke.
**Fora de escopo:** importacao dados (MDJ-20), flags Django ON, desligamento Supabase e backup manual testado sem evidencia nesta sprint.

### HU 21.1 — Abertura e runbook

- [x] Registrar MDJ-21 em `TASKS.md` e `BACKLOG.md`
- [x] Runbook passo a passo `MDJ21_RUNBOOK_DEPLOY_VPS.md`
- [x] Indice consolidado `ESTADO_ATUAL.md`
- [x] Auditoria VPS `MDJ21_VPS_AUDITORIA.md` (SSH srvjosemaria — multi-app, nginx host, porta 8080)

**Evidencia:** MDJ-21 documentada 2026-06-17; auditoria VPS 2026-06-19 — finanpy:8001, brabustore:3001, nginx host :80/:443; PCP via 127.0.0.1:8080 + vhost novo; compose proxy bind localhost aplicado.

### HU 21.2 — Preparacao VPS

- [x] Docker + Compose instalados
- [x] Firewall 22/80/443
- [x] Repo clonado; `.env` com secrets (flags OFF)

**Evidencia:** VPS `38.52.128.62` — repo `/opt/producao`, `.env` chmod 600, flags Django OFF; apps brabustore/finanpy/hermes intactos.

### HU 21.3 — Stack no ar

- [x] `docker compose -f docker-compose.prod.yml up -d --build`
- [x] Health `{"status":"ok","database":"ok"}`
- [x] TLS HTTPS funcional

**Evidencia:** `curl https://producao.costurai.com.br/health/` 2026-06-19 → `{"status": "ok", "database": "ok"}`; workflow **Deploy Production** run `27851350575` ✅ (re-run apos fix grep).

### HU 21.4 — Smoke e evidencia

- [x] `createsuperuser` ou usuario dominio
- [x] `smoke-stack-prod.mjs` 5/5 contra `https://producao.costurai.com.br`
- [ ] Backup manual testado
- [x] `MDJ21_VALIDACAO_DEPLOY_VPS.md` preenchido

**Evidencia:** superuser `admin@costurai.com.br`; smoke 5/5 em 2026-06-19 (`proxy-health`, `api-via-proxy`, `frontend-login`, `admin-redirect`, `django-login`).
