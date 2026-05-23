# BACKLOG.md — Migracao Django + PostgreSQL

> Plano macro da frente paralela de migracao backend.
> O detalhamento operacional por HU fica em `TASKS.md`.

---

## Status geral

| Sprint | Nome | Status | Objetivo |
|---|---|---|---|
| MDJ-0 | Fundacao documental da migracao | ✅ Concluida | Criar PRD, BACKLOG e TASKS proprios da frente |
| MDJ-1 | Inventario do sistema atual | 🚧 Em andamento | Mapear tabelas, RPCs, triggers, Server Actions, queries, storage, auth e invariantes |
| MDJ-2 | Plano de backup e restore do Supabase | 🧭 Planejada | Definir exportacao, validacao, restore e rollback dos dados de homologacao |
| MDJ-3 | Arquitetura Django alvo | 🧭 Planejada | Definir apps, camadas, API, padroes DRF/Ninja, permissoes e testes |
| MDJ-4 | Ambiente local Django + PostgreSQL | 🧭 Planejada | Criar backend paralelo local sem integrar ao frontend atual |
| MDJ-5 | Modelagem inicial e migrations Django | 🧭 Planejada | Recriar schema essencial em Django/PostgreSQL com constraints e indices |
| MDJ-6 | Importacao inicial read-only | 🧭 Planejada | Importar dados do Supabase para banco destino e validar contagens/integridade |
| MDJ-7 | API read-only de cadastros e produtos | 🧭 Planejada | Expor endpoints de leitura e comparar com Supabase atual |
| MDJ-8 | API read-only de turnos, dashboard e qualidade | 🧭 Planejada | Expor leituras operacionais complexas com paridade funcional |
| MDJ-9 | Primeira mutacao nao critica | 🧭 Planejada | Migrar uma escrita segura antes dos fluxos de apontamento |
| MDJ-10 | Mutacoes criticas de producao | 🧭 Planejada | Migrar apontamento produtivo com transacao, saldo fisico e concorrencia |
| MDJ-11 | Mutacoes de qualidade | 🧭 Planejada | Migrar revisao de qualidade, defeitos e indicadores |
| MDJ-12 | Turno, fechamento e carry-over | 🧭 Planejada | Migrar abertura, edicao, fechamento e continuidade entre turnos |
| MDJ-13 | Auth, permissoes e Django Admin | 🧭 Planejada | Substituir dependencia de Supabase Auth de forma controlada |
| MDJ-14 | Storage e arquivos | 🧭 Planejada | Migrar imagens de produtos/operacoes para storage proprio ou volume gerenciado |
| MDJ-15 | Infra VPS, EasyPanel e observabilidade | 🧭 Planejada | Deploy, backups, logs, healthcheck e rotina de restore |
| MDJ-16 | Cutover controlado por modulo | 🧭 Planejada | Trocar origem de dados do frontend por modulo com rollback |

---

## Direcao aprovada

Arquitetura alvo:

- Next.js continua como frontend.
- Django assume o dominio de negocio.
- PostgreSQL em VPS vira banco principal.
- Django Admin apoia suporte operacional e homologacao.
- API REST documentada por OpenAPI sera o contrato entre frontend e backend.
- Realtime sera tratado depois da paridade funcional, com polling/SSE antes de WebSocket.
- Docker/EasyPanel em Ubuntu sera a base de deploy.

---

## Marco MDJ-0 — Fundacao documental

**Status:** ✅ Concluida

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

**Status:** 🚧 Em andamento

Objetivo:

Mapear o sistema atual antes de qualquer scaffold Django.

Entregaveis:

- mapa de tabelas, views e relacionamentos ✅ iniciado em `INVENTARIO_SCHEMA_ATUAL.md`
- mapa de RPCs e triggers ✅ iniciado em `INVENTARIO_RPC_TRIGGERS.md`
- mapa de Server Actions e queries Supabase
- mapa de buckets/storage
- mapa de Auth e usuarios
- lista de invariantes por dominio
- lista de testes existentes que devem ser reaproveitados como oraculo de paridade

---

## Marco MDJ-2 — Backup e restore

**Status:** 🧭 Planejada

Objetivo:

Definir a estrategia de preservacao dos dados atuais de homologacao.

Entregaveis:

- comando/processo de exportacao do schema
- comando/processo de exportacao dos dados
- inventario de storage
- banco PostgreSQL de restore
- validacao por contagem/checksum
- plano de rollback
- criterio de aceite para considerar backup confiavel

---

## Marco MDJ-3 — Arquitetura Django alvo

**Status:** 🧭 Planejada

Objetivo:

Definir como o dominio sera organizado no backend dedicado antes de criar codigo.

Entregaveis:

- apps Django
- camadas internas: models, selectors, services, serializers, views, permissions
- padrao de transacoes
- padrao de erros de dominio
- padrao de testes
- padrao de OpenAPI
- padrao de integracao gradual com Next.js

---

## Marco MDJ-4 em diante

Sprints MDJ-4 a MDJ-16 somente devem ser abertas depois que MDJ-1, MDJ-2 e MDJ-3 estiverem concluidas e homologadas.

O criterio de seguranca e simples: primeiro entender e proteger, depois construir.

---

## Dependencias macro

```text
MDJ-0 -> MDJ-1 -> MDJ-2 -> MDJ-3 -> MDJ-4 -> MDJ-5 -> MDJ-6
                                               -> MDJ-7 -> MDJ-8
MDJ-8 -> MDJ-9 -> MDJ-10 -> MDJ-11 -> MDJ-12 -> MDJ-13 -> MDJ-14 -> MDJ-15 -> MDJ-16
```

Sprints de implementacao Django nao devem iniciar antes da conclusao do inventario, backup/restore e arquitetura alvo.
