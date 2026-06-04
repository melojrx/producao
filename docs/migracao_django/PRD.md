# PRD.md — Migracao Django + PostgreSQL

> Documento estavel da frente paralela de migracao backend.
> Define o que deve ser preservado, por que migrar e quais limites devem guiar as decisoes.

---

## 1. Contexto

O Sistema de Controle de Producao para Confeccao esta em estagio maduro de homologacao. A aplicacao atual usa Next.js com Server Actions, Supabase, PostgreSQL gerenciado, RPCs SQL, triggers, storage e Supabase Auth para sustentar um dominio operacional complexo de PCP.

A frente de migracao nasce para estudar e executar, com seguranca, a saida gradual da dependencia de nuvem/BaaS para um backend dedicado em VPS Ubuntu, com banco PostgreSQL proprio, deploy via Docker/EasyPanel e dominio de negocio centralizado em uma API backend.

Esta frente e paralela a aplicacao atual. Ela nao substitui, nao interrompe e nao reescreve o sistema homologado sem evidencias, backup, plano de rollback e validacao funcional.

---

## 2. Decisao tecnica alvo

Stack alvo recomendada:

- **Frontend:** Next.js 16 permanece como interface web, admin, scanner e painel TV. Diretório `app/` (convenção App Router).
- **Backend:** Django 5+ como backend dedicado de domínio. Diretório `backend/`.
- **API:** Django REST Framework, com OpenAPI documentado via drf-spectacular.
- **Banco:** PostgreSQL 16 em container Docker, com migrations versionadas pelo backend.
- **Admin operacional:** Django Admin para suporte, auditoria e manutencao assistida.
- **Infraestrutura:**
  - Docker Compose para desenvolvimento (`docker-compose.dev.yml`)
  - Docker Compose para produção (`docker-compose.prod.yml`)
  - Multi-stage Dockerfiles (development → production)
  - Backend: `runserver` em dev, Gunicorn em prod
  - Frontend: Next.js dev server em dev, standalone output em prod
  - PostgreSQL com healthcheck e volumes persistentes
  - Deploy final: VPS Ubuntu + Docker + EasyPanel
- **Realtime:** fase posterior. Comecar com polling controlado ou SSE; WebSocket/Django Channels apenas quando a necessidade operacional estiver provada.

Decisao principal:

- Django + DRF e a escolha definitiva. Sistema possui domínio relacional maduro, transações críticas, necessidade de admin operacional, permissões, migrations fortes, auditoria e manutenção previsível.
- Docker Compose com multi-stage builds para separar ambientes dev/prod.

---

## 3. Objetivos

1. Preservar integralmente dados de homologacao hoje existentes no Supabase.
2. Mapear o contrato real atual antes de implementar qualquer backend paralelo.
3. Recriar o dominio em Django de forma incremental, testavel e comparavel com o comportamento atual.
4. Centralizar regras transacionais no backend dedicado, reduzindo dependencia de RPCs/triggers espalhados.
5. Manter o frontend Next.js funcionando durante a transicao.
6. Permitir cutover controlado por modulo, sem big bang.
7. Garantir backup, restore e rollback antes de migrar qualquer escrita critica.

---

## 4. Nao objetivos da primeira etapa

Na primeira etapa documental e de inventario, nao sera feito:

- scaffold do projeto Django
- alteracao do schema Supabase
- migracao real de dados
- troca de auth
- remocao de Server Actions existentes
- alteracao do frontend
- deploy em VPS
- substituicao de Realtime

Essas acoes so entram em sprints futuras, depois que o inventario de contratos, dados e invariantes estiver documentado.

---

## 5. Principios de migracao

### 5.1 Sem big bang

A migracao deve acontecer em fases pequenas. O sistema atual continua sendo a fonte operacional ate que cada modulo do backend Django prove paridade funcional.

### 5.2 Banco antes de codigo critico

Antes de migrar mutacoes, a equipe deve ter:

- backup validado do Supabase
- snapshot de schema
- inventario de tabelas, views, RPCs, triggers, policies, buckets e Auth
- banco PostgreSQL destino criado em ambiente controlado
- restore testado com dados de homologacao

### 5.3 Read-only antes de write

O backend Django deve nascer primeiro lendo dados, expondo endpoints de consulta e permitindo comparacao com o sistema atual. Escritas criticas entram depois.

### 5.4 Transacoes explicitas

Fluxos como abrir turno, apontar producao, revisar qualidade, fechar turno e gerar carry-over devem ser transacoes de dominio no Django, com `transaction.atomic()` e testes de concorrencia.

### 5.5 Paridade por invariantes

A migracao nao sera considerada correta apenas porque endpoints respondem. Ela deve preservar invariantes de negocio ja homologadas.

---

## 6. Invariantes de dominio que nao podem regredir

### 6.1 PCP, capacidade e continuidade

- O sistema representa uma fabrica com capacidade finita.
- Capacidade, disponibilidade, producao, saldo e carga herdada sao conceitos distintos.
- A abertura do turno e a fotografia operacional real da fabrica naquele momento.
- O turno novo carrega apenas pendencias, carga herdada, saldo parcial e OPs em andamento.
- A producao nunca reinicia do zero.
- Carry-over preserva continuidade entre turnos ate a conclusao total da OP.

### 6.2 OP como container fisico

- `numero_op` identifica um container fisico finito.
- A OP nao pode ser recriada como nova raiz com quantidade divergente quando ja existe historico.
- O sistema nao pode registrar producao fisica acima do saldo real da OP.

### 6.3 Turno, setor e demanda

- A estrutura fisica reaproveitavel e o setor.
- Um turno possui setores ativos e demandas internas por OP/produto.
- Nova OP em turno aberto reaproveita setores ja existentes.
- QR operacional temporario identifica `turno + setor`, nao duplica setor por OP.
- No scanner, o operador entra no setor e escolhe OP/produto e operacao dentro do contexto.

### 6.4 Roteiro versionado

- Alteracao de roteiro de produto vale apenas para novos turnos.
- Turno ativo, turnos encerrados, QRs, apontamentos, qualidade, dashboard e relatorios ja derivados permanecem congelados.
- `produto_operacoes` preserva versoes antigas por rastreabilidade.
- Apenas o roteiro vigente deve alimentar novos planejamentos.

### 6.5 Qualidade

- Qualidade permanece como etapa final operacional quando fizer parte do roteiro.
- A revisao acontece sobre pecas recebidas da etapa final produtiva, normalmente Finalizacao.
- Qualidade registra aprovadas, reprovadas e defeitos sem duplicar producao fisica.
- Defeitos usam catalogo estruturado.
- Uma peca reprovada pode concentrar multiplos defeitos.
- A soma das ocorrencias de defeito nao precisa igualar a quantidade reprovada.
- Indicadores de qualidade ficam separados dos KPIs produtivos.

### 6.6 Metas e formulas

As formulas homologadas devem ser preservadas:

```text
metaHora = floor(60 / tpOperacao)
metaIndividual = floor(minutosTurno / tpOperacao)
metaGrupo = floor((funcionariosAtivos * minutosTurno) / tpProduto)
tpProduto = soma dos T.P das operacoes vigentes do roteiro
eficiencia = (quantidadeProduzida * tpOperacao / minutosTrabalhados) * 100
```

Em producao, os valores reais devem vir do turno/configuracao persistida, nunca de fallback de desenvolvimento.

---

## 7. Escopo funcional da migracao

O backend Django devera absorver gradualmente:

- autenticacao e usuarios do sistema
- operadores
- maquinas patrimoniais
- setores
- operacoes
- produtos, imagens e roteiro versionado
- abertura e edicao de turno
- planejamento por OP
- derivacao setorial e operacional
- scanner e apontamentos produtivos
- apontamento administrativo
- revisao de qualidade
- tipos de defeito
- metas mensais
- dashboard operacional
- relatorios
- painel TV
- QRs operacionais e patrimoniais
- backups, auditoria e suporte operacional

---

## 8. Dados e backup

Os dados atuais de homologacao no Supabase sao importantes e devem ser tratados como patrimonio operacional.

Antes de qualquer migracao real:

- exportar schema completo
- exportar dados completos
- exportar objetos de storage usados por produtos e operacoes
- documentar usuarios e relacao com `usuarios_sistema`
- documentar RPCs, triggers e policies
- validar restore em banco PostgreSQL isolado
- gerar checksums ou contagens por tabela
- documentar plano de rollback

Nenhum dado de homologacao deve ser descartado, sobrescrito ou corrigido sem script idempotente, aprovacao e evidencia.

---

## 9. Arquitetura alvo em alto nivel

```text
/projeto
├── app/                    # Next.js (App Router — NÃO renomear)
├── backend/                # Django DRF
│   ├── pcp_project/config/ # Settings modular (base, local, production)
│   ├── accounts/
│   ├── cadastros/
│   ├── produtos/
│   ├── turnos/
│   ├── producao/
│   ├── qualidade/
│   ├── metas/
│   ├── relatorios/
│   ├── scanner/
│   ├── infra/
│   ├── shared/
│   ├── Dockerfile          # Multi-stage (development → production)
│   └── requirements.txt
├── docker-compose.dev.yml   # Docker Compose desenvolvimento
├── docker-compose.prod.yml  # Docker Compose produção
└── .env.example
```

Fluxo de comunicação:

```text
Next.js (app/)
  app/admin, scanner, tv
  |
  | HTTPS / JSON / OpenAPI 3.1
  | Authorization: Bearer <JWT>
  v
Django API (backend/)
  apps de dominio
  services transacionais
  selectors/read models
  Django Admin
  |
  | ORM + transaction.atomic()
  v
PostgreSQL 16 (container Docker)
  migrations versionadas
  constraints de dominio
  auditoria
  backups
```

Organizacao de apps Django:

- `accounts`: usuarios, papeis e permissoes
- `cadastros`: operadores, maquinas, setores, operacoes
- `produtos`: produtos, imagens, roteiros e versoes
- `turnos`: turnos, OPs, setores do turno, demandas e carry-over
- `producao`: apontamentos produtivos e saldo fisico
- `qualidade`: revisoes, defeitos e indicadores
- `metas`: metas mensais e indicadores gerenciais
- `relatorios`: agregacoes, dashboards e exports
- `scanner`: leitura por QR token
- `infra`: auditoria, healthcheck, configuracoes e suporte operacional
- `shared/`: pacote Python (NÃO app) com exceptions, permissions, constants, formulas

---

## 10. Criterios de sucesso

A frente de migracao sera considerada bem conduzida quando:

- existir inventario completo do sistema atual
- backups e restores forem testados antes do primeiro cutover
- o backend Django paralelo passar em testes de paridade read-only
- as mutacoes criticas forem migradas uma por vez
- cada mutacao tiver teste de concorrencia e rollback
- o frontend puder alternar modulo a modulo entre Supabase atual e Django
- o sistema em VPS tiver logs, backup automatico, restore documentado e monitoramento minimo
- a homologacao confirmar que os fluxos reais de chao de fabrica nao regrediram

---

## 11. Riscos principais

| Risco | Impacto | Mitigacao |
|---|---:|---|
| Perder semantica de dominio ja homologada | Alto | Inventario por invariantes e testes de paridade |
| Migrar dados incompletos do Supabase | Alto | Backup completo, restore testado e contagens por tabela |
| Reimplementar RPCs sem transacao equivalente | Alto | Services Django com `transaction.atomic()` e locks |
| Cortar o frontend cedo demais | Alto | Backend paralelo read-only primeiro |
| Subestimar Auth, storage e Realtime | Medio | Migrar como fases proprias |
| VPS sem rotina de backup/restore | Alto | Sprint dedicada de infra antes do cutover |

---

## 12. Decisao operacional

A migracao Django deve ser tratada como uma frente de produto propria, documentada em `docs/migracao_django`, com PRD, BACKLOG e TASKS independentes.

Ela nao substitui o ritual principal do projeto. Toda implementacao futura nesta frente deve seguir sprints, HUs, evidencias e validacoes antes de avancar.
