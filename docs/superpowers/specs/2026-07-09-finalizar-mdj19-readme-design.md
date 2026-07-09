# Design — Finalização MDJ-19 e reescrita do README

**Data:** 2026-07-09
**Autor:** Junior Melo (jrmeloafrf@gmail.com)
**Responsável operacional futuro:** Junior Melo

## Contexto

O sistema está em produção na VPS (`https://producao.costurai.com.br`) desde 2026-06-19 com backend Django + PostgreSQL, cutover 8 flags Django ON, polling no dashboard (sem Realtime) e JWT cookies SSR para auth. O projeto cloud original permanece intacto, aguardando aceite explícito para desligamento pós-observação.

A documentação de migração e o README ainda não refletem esse estado final: o README describe o fluxo legado (operador → máquina → operação), cita tecnologia que não está mais em stack ativa, e aponta para deploy Vercel já obsoleto. A HU 19.5/19.6 da migração Django estão parciais há ~3 semanas, com gate formal pendente.

## Objetivo

1. **Finalizar MDJ-19 (código/doc)** — sem desligar o projeto cloud (ação externa, exige aceite pós-observação).
2. **Reescrever o README** para refletir stack atual, fluxo V2 e produção VPS, sem citar a tecnologia legada em nenhum momento.

## Escopo

### Dentro

- Atualização da documentação MDJ-19 (TASKS.md, BACKLOG.md, ESTADO_ATUAL.md, CHECKLIST, VALIDACAO_LIMPEZA, MDJ16 seção Pos-MDJ-19).
- Marcar HU 19.5 e 19.6 como concluídas com ressalva explícita: "desligamento projeto cloud fica pós-observação, pendente aceite do responsável".
- Documentar Junior Melo como responsável operacional futuro pelo aceite do desligamento cloud.
- Atualização do `.env.example` para refletir defaults de produção (`NEXT_PUBLIC_USE_DJANGO_*=true` como padrão de produção, variáveis legadas comentadas claramente como rollback).
- Reescrita completa do `README.md`.

### Fora

- Desligamento físico do projeto cloud (ação externa ao código, exige aceite pós-observação — sprint futura).
- Remoção de `@supabase/ssr` e `@supabase/supabase-js` do `package.json` (sprint futura pós-observação; manter como fallback de rollback).
- Limpeza física de imports residuais em `lib/supabase/`, hooks, queries antigas (sprint futura).
- Reabertura da Sprint 23 de consolidação visual do admin (continua pausada em realinhamento documental).
- Qualquer alteração de código de feature — apenas docs e `.env.example` (não afeta build/runtime).

## Abordagem

### A. Finalização MDJ-19 — só documentação

Sem alterar código de runtime. Fluxo:

1. Rodar validações técnicas no ambiente dev (Docker up):
   - `npx tsc --noEmit`
   - `node --test lib/django/flags.test.ts`
   - `node --test lib/utils/turno-legado.test.ts`
   - `node scripts/smoke-stack-dev.mjs`
   - `node scripts/mdj19/verificar-flags-cutover.mjs`
2. Consolidar resultados no `MDJ19_VALIDACAO_LIMPEZA.md`, marcando smoke dev OK.
3. Atualizar `MDJ19_CHECKLIST_DESLIGAMENTO_SUPABASE.md`:
   - Marcar checkboxes verificáveis localmente (pre-requisitos concluídos, runtime frontend zero dependência, matriz flags, smoke E2E manual realizado items verificáveis).
   - Criar seção explícita **"Pós-observação — desligamento projeto cloud"** listando os requisitos remanescentes:
     - N movimentos operacionais sem regressão (você define N — sugestão: 2 semanas ou 30 turnos)
     - Backup manual testado (`scripts/infra/backup_postgres.sh` + `backup_media.sh`)
     - Restore de contingência testado
     - Paridade final de contagens
     - Backup final do projeto cloud exportado e checksum registrado
   - Preencher linha **Responsável operacional:** `Junior Melo`
   - Manter checkbox `Usuario autoriza desligamento` em branco, marcado como `Pendente — Senior Melo assina após período de observação`.
4. Atualizar `ESTADO_ATUAL.md`:
   - Tabela: MDJ-19 ✅; desligamento cloud como `Pós-observação — pendente aceite Junior Melo`.
   - Ajustar `Frente ativa` para "sprint futura de limpeza física de dependências e desligamento cloud".
5. Atualizar `TASKS.md` (migração): marcar HU 19.5 e 19.6 com `[x]` e uma linha de evidência explicitando a ressalva.
6. Atualizar `BACKLOG.md` (migração): marcar MDJ-19 como ✅ Concluída (2026-07-09) com nota de ressalva.
7. Atualizar `MDJ16_VALIDACAO_CUTOVER.md` seção "Pos-MDJ-19": marcar deferidos MDJ-19 como resolvidos, e deferidos remanescentes como `relatorios-v2 purga física e desligamento cloud → sprint futura`.

### B. Reescrita do README

Estrutura proposta (em seções, sem citar números de sprint em nenhum momento, sem citar a tecnologia legada):

1. **Header com badges**: Next.js 16, Django, PostgreSQL, TypeScript 5, Tailwind 4, Docker, Lucide.
2. **Sobre o projeto**: problema + solução atual (3 objetos físicos: Crachá do Operador, QR Operacional do Setor, Etiqueta da Máquina patrimonial).
3. **Funcionalidades**:
   - Scanner híbrido (`setor → operador → OP/produto → operação → quantidade`), com troca de operador/OP/operação sem reiniciar a seção.
   - Dashboard V2 (KPIs: Meta Grupo ponderada por média de T.P., progresso operacional ponderado, peças completas, eficiência por hora e por dia).
   - Kanban operacional por setor com FIFO e capacidade real.
   - Painel TV dedicado `/tv` 16:9 sem rolagem.
   - Carry-over setorial parcelado entre turnos.
   - Qualidade como setor de revisão (catálogo de defeitos, indicadores de qualidade).
   - Relatório operacional de QR Codes em `/admin/qrcodes` (presets 1, 2, 4, 6, 8, 12 por página).
   - Apontamentos administrativos em `/admin/apontamentos`.
   - Versionamento de roteiro por turno (alterações em produto não retroalem turnos já abertos).
   - CRUDs admin (operadores, máquinas, operações, produtos, setores, usuários) com paginação e ordenação profissional.
   - Ficha do produto para impressão/PDF.
   - Duplicação assistida de produtos e operações.
   - Gestão de imagens de produto e operação.
4. **Arquitetura**:
   - Diagrama Next.js → Django REST (`/api/v1/`) → PostgreSQL.
   - Auth: JWT cookies SSR (sem refresh mutando cookies em RSC).
   - Dashboard: polling via Server Actions (não WebSocket/Realtime).
   - Sem RLS — auth e autorização no Django.
5. **Camadas do projeto**: tabela Apresentação/Componentes/Negócio (Server Actions via Django)/Leitura/Utilitários/Estado/Contratos. Incluir `backend/` e `lib/django/`.
6. **Tech Stack**: tabela Next.js 16 / React 19 / Django / PostgreSQL / Tailwind 4 / TypeScript 5 strict / Docker / Framer Motion / Recharts / Lucide React / react-qr-code / html5-qrcode.
7. **Banco de dados**: tabelas principais (setores, operadores, máquinas patrimonial, operações, produtos, produto_operacoes, turnos, turno_operadores, turno_ops, turno_setores, turno_setor_demandas, turno_setor_operacoes, registros_producao, qualidade_registros, qualidade_detalhes, qualidade_defeitos, usuarios_sistema, metas_mensais, etc.). Views analíticas. Convenção de QR Code (`tipo:token` — crachá, setor do turno, etiqueta patrimonial).
8. **Fórmulas de negócio**: manter as do PRD (Meta Grupo com média de T.P., progresso operacional ponderado, peças completas, eficiência por hora/dia, capacidade setorial, carry-over).
9. **Como executar localmente**:
   - Pré-requisitos: Node.js ≥20, Docker, npm.
   - Dev stack integrada: `npm run dev:docker` (frontend + backend + PostgreSQL via Docker).
   - Dev só frontend host: `.env.local` apontando para backend no Docker.
   - Migrations: `docker compose exec backend python manage.py migrate`.
   - Health check: `curl -sf http://localhost:8001/health/`.
   - Seed administrativo: `node scripts/ensure-admin-user.mjs`.
10. **Variáveis de ambiente**: tabela resumida (Django, PostgreSQL, media, CORS/CSRF, NEXT_PUBLIC_DJANGO_API_URL, NEXT_PUBLIC_USE_DJANGO_* flags). Referência a `.env.example`.
11. **Produção VPS**: link para `https://producao.costurai.com.br` (VPS Hostinger `38.52.128.62`). Deploy via workflow GitHub `Deploy Production` na `main`. Referência a `docs/migracao_django/MDJ21_RUNBOOK_DEPLOY_VPS.md`. Homologação local via `npm run prod:docker` + `scripts/smoke-stack-prod.mjs`.
12. **Estrutura de pastas**: incluir `backend/`, `docker/`, `lib/django/`, `scripts/infra/`, `docs/migracao_django/`.
13. **Usuários e acesso**: Operador (scanner, público), Supervisor (TV/dashboard), Administrador (admin/*).
14. **Scripts disponíveis**: `npm run dev`, `dev:docker`, `prod:docker`, `prod:docker:config`, `lint`, `tsc --noEmit`, `smoke-stack-dev.mjs`, `smoke-stack-prod.mjs`, `ensure-admin-user.mjs`.
15. **Glossário**: atualizado para V2 (T.P, Setor, Turno, OP, Demanda setorial, Quantidade concluída, Progresso operacional, Meta Grupo, Eficiência por hora, Carry-over, Backlog setorial, Roteiro, Versionamento de roteiro).
16. **Documentação adicional**: referências a `docs/PRD.md`, `docs/TASKS.md`, `docs/migracao_django/ESTADO_ATUAL.md`, `docker/README.md`, `docs/DESIGN_PROPOSAL.md` (se existir).
17. **Licença**.
18. **Desenvolvedor**: bloco com avatar GitHub `https://github.com/melojrx.png`, nome Júnior Melo, email `jrmeloafrf@gmail.com`, perfil GitHub `https://github.com/melojrx`, portfólio `https://melojrx.github.io/`.

### Regras estritas do README

- **Sem citar números de sprint** em nenhum momento (substituir por contexto).
- **Sem citar a tecnologia legada** em nenhum momento (nem em "histórico", nem em "migração", nem em rodapé). Se precisar referenciar a doc de migração, chame apenas de `docs/migracao_django/ESTADO_ATUAL.md`.
- Dev ao final com `https://github.com/melojrx.png` (avatar), Júnior Melo, jrmeloafrf@gmail.com.

## Arquivos modificados

### Documentos MDJ-19
- `docs/migracao_django/MDJ19_CHECKLIST_DESLIGAMENTO_SUPABASE.md`
- `docs/migracao_django/MDJ19_VALIDACAO_LIMPEZA.md`
- `docs/migracao_django/ESTADO_ATUAL.md`
- `docs/migracao_django/TASKS.md` (HU 19.5, 19.6)
- `docs/migracao_django/BACKLOG.md` (MDJ-19)
- `docs/migracao_django/MDJ16_VALIDACAO_CUTOVER.md`

### Sistema
- `README.md` (reescrita completa)
- `.env.example` (defaults de produção; variáveis legadas comentadas com nota de rollback)

## Validação

1. `npx tsc --noEmit` — confirma que `README.md` e `.env.example` não quebram tipos (são docs; sem código TS).
2. `node --test lib/django/flags.test.ts` — 9/9 (preexistente; confirma cutover consistente).
3. `node --test lib/utils/turno-legado.test.ts` — 2/2.
4. `node scripts/smoke-stack-dev.mjs` — confirma stack dev OK no Docker (você confirmou que está up).
5. `node scripts/mdj19/verificar-flags-cutover.mjs` — 8/8 flags.
6. `npm run build` — confirma que o frontend builda sem regressão textual.

## Riscos

- **Baixo**: `.env.example` é referência — sem impacto em runtime (a VPS tem seu próprio `.env`).
- **Baixo**: README e docs são literais — sem alteração de código de feature.
- **Médio-baixo**: marcar MDJ-19 como "✅ com ressalva" pode soar ambíguo — mitigado pela seção explícita "Pós-observação" no checklist.

## Pendências explicitamente fuera de escopo

- Desligamento físico do projeto cloud — sprint futura após aceite de Junior Melo.
- Remoção física de `@supabase/*` do `package.json` e lint de imports residuais — sprint futura.
- Reabertura da consolidação visual do admin (Sprint 23) — continua pausada.

## Próximo passo

Após aprovação deste design, executar via plano de implementação detalhado (writing-plans).