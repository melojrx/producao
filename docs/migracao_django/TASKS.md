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

**Status:** 🚧 Em andamento
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

- [ ] **HU MDJ-1.3 — Como mantenedor, quero mapear Server Actions e queries Supabase, para planejar a troca gradual do frontend para API Django.**
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

- [ ] **HU MDJ-1.4 — Como produto, quero mapear invariantes de negocio homologadas, para impedir regressao durante a reimplementacao.**
  **Prioridade:** P0
  **Risco:** Alto

  Tarefas:
  - extrair invariantes do PRD principal
  - cruzar invariantes com testes em `lib/utils/*.test.ts`
  - destacar carry-over, saldo fisico, qualidade, roteiro versionado, capacidade, OP fisica e metas
  - transformar invariantes em checklist de paridade para Django

  **Evidencia esperada:** checklist de invariantes de dominio pronto para orientar testes Django.

- [ ] **HU MDJ-1.5 — Como mantenedor, quero mapear dados externos ao banco, para que imagens, usuarios e arquivos nao sejam perdidos.**
  **Prioridade:** P1
  **Risco:** Medio

  Tarefas:
  - mapear buckets Supabase usados por produtos e operacoes
  - mapear relacao entre Supabase Auth e `usuarios_sistema`
  - mapear URLs publicas persistidas no banco
  - identificar estrategia futura para storage em VPS

  **Evidencia esperada:** inventario de storage/auth registra dependencias e plano preliminar de preservacao.

---

## SPRINT MDJ-2 — Plano de backup e restore do Supabase

**Status:** 🧭 Planejada
**Objetivo:** definir e validar a estrategia de preservacao dos dados atuais de homologacao.
**Pre-requisito:** Sprint MDJ-1 concluida.

Decisao de seguranca:

- Nenhuma migracao real de dados deve ocorrer antes desta sprint estar concluida.
- Backup sem restore testado nao e backup confiavel.

- [ ] **HU MDJ-2.1 — Como mantenedor, quero definir o procedimento de backup completo do Supabase, para preservar schema e dados antes da migracao.**
  **Prioridade:** P0
  **Risco:** Alto

  **Evidencia esperada:** procedimento documentado com comandos, credenciais necessarias, escopo e arquivos gerados.

- [ ] **HU MDJ-2.2 — Como mantenedor, quero definir backup de storage, para preservar imagens de produtos e operacoes.**
  **Prioridade:** P0
  **Risco:** Alto

  **Evidencia esperada:** procedimento documenta buckets, caminhos, destino local e verificacao.

- [ ] **HU MDJ-2.3 — Como mantenedor, quero restaurar o backup em PostgreSQL isolado, para provar que os dados podem ser trazidos para fora da nuvem.**
  **Prioridade:** P0
  **Risco:** Alto

  **Evidencia esperada:** restore validado em banco isolado com contagens por tabela e erros conhecidos documentados.

- [ ] **HU MDJ-2.4 — Como produto, quero um plano de rollback, para que qualquer erro de migracao nao comprometa a homologacao atual.**
  **Prioridade:** P0
  **Risco:** Alto

  **Evidencia esperada:** plano de rollback documenta como voltar ao estado Supabase atual e quais acoes sao proibidas sem nova aprovacao.

---

## SPRINT MDJ-3 — Arquitetura Django alvo

**Status:** 🧭 Planejada
**Objetivo:** definir arquitetura backend antes do scaffold.
**Pre-requisito:** Sprint MDJ-2 concluida.

- [ ] **HU MDJ-3.1 — Como arquiteto, quero definir apps Django por dominio, para organizar o backend sem monolito confuso.**
  **Prioridade:** P0
  **Risco:** Medio

  **Evidencia esperada:** documento define apps, responsabilidades e dependencias permitidas.

- [ ] **HU MDJ-3.2 — Como desenvolvedor, quero definir padroes DRF/Ninja, serializers, services e selectors, para manter a API consistente.**
  **Prioridade:** P0
  **Risco:** Medio

  **Evidencia esperada:** documento define padrao de endpoint, schema OpenAPI, validacao, erros e paginacao.

- [ ] **HU MDJ-3.3 — Como mantenedor, quero definir padrao de transacoes e concorrencia, para preservar apontamentos e saldo fisico.**
  **Prioridade:** P0
  **Risco:** Alto

  **Evidencia esperada:** documento define uso de `transaction.atomic()`, locks, idempotencia e testes de concorrencia.

- [ ] **HU MDJ-3.4 — Como produto, quero definir estrategia de integracao gradual com Next.js, para trocar a origem de dados modulo a modulo.**
  **Prioridade:** P0
  **Risco:** Alto

  **Evidencia esperada:** documento define feature flags, endpoints iniciais read-only, fallback e criterios de cutover.

---

## Criterios para abrir implementacao Django

So abrir sprint de scaffold Django quando:

- MDJ-1 estiver concluida com inventario aceito.
- MDJ-2 estiver concluida com backup e restore documentados.
- MDJ-3 estiver concluida com arquitetura aprovada.
- O usuario confirmar explicitamente a abertura da primeira sprint de implementacao.
