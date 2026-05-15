# Fluxo Continuo de Qualidade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Sprint 51 so Qualidade receives continuous review lots from partial production without blocking production or contaminating operational KPIs.

**Architecture:** Add `qualidade_lotes` as the review queue and `qualidade_defeitos` as the defect catalog. Keep `registros_producao` as the physical production source of truth and keep `qualidade_registros`/`qualidade_detalhes` as review history.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Supabase, Server Actions, Node test runner.

---

### Task 1: Domain Documentation And Pure Contract

**Files:**
- Modify: `docs/PRD.md`
- Modify: `docs/TASKS.md`
- Modify: `docs/BACKLOG.md`
- Create: `lib/utils/qualidade-lotes.ts`
- Create: `lib/utils/qualidade-lotes.test.ts`
- Modify: `types/index.ts`

- [x] **Step 1: Document the Sprint 51 domain contract**

Add the PRD sections for continuous quality lots, open Sprint 51 in TASKS/BACKLOG, and mark HU 51.1 complete with evidence.

- [x] **Step 2: Add pure lot validation**

Create `validarRevisaoCompletaLoteQualidade()` to enforce:
- lote quantity is positive integer
- approved/rejected are non-negative integers
- reviewed/canceled lots cannot be reviewed again
- approved + rejected must equal lot quantity
- successful review moves status to `revisado`

- [x] **Step 3: Add focused tests**

Run:

```bash
node --test --experimental-strip-types lib/utils/qualidade-lotes.test.ts
```

Expected: all tests pass.

### Task 2: Additive Schema

**Files:**
- Create: `scripts/sprint51_fluxo_continuo_qualidade.sql`

- [x] **Step 1: Create additive SQL script**

Create:
- `qualidade_defeitos`
- `qualidade_lotes`
- optional `qualidade_registros.qualidade_lote_id`
- optional `qualidade_detalhes.qualidade_defeito_id`
- optional `qualidade_detalhes.observacao`
- RLS select policies for authenticated users
- seed rows from `docs/qualidade.md`

- [x] **Step 2: Apply remotely after explicit approval**

Run through Supabase Management API only after user approval. Do not apply the SQL in the implementation planning step.

### Task 3: Generate Lots After Production

**Files:**
- Modify: `scripts/sprint51_fluxo_continuo_qualidade.sql`
- Modify: `lib/actions/producao.ts`
- Create or modify: `lib/actions/qualidade-lotes.ts`
- Create or modify: `lib/queries/qualidade-lotes.ts`

- [x] **Step 1: Add idempotent lot creation**

Create one `qualidade_lotes` row per successful productive `registro_producao`, keyed by `registro_producao_id`.

- [x] **Step 2: Preserve operational invariants**

Verify lot creation does not update `turno_setor_demandas`, `turno_setor_operacoes`, `turno_ops`, capacity fields, availability fields or physical balance fields.

- [x] **Step 3: Test**

Add tests or SQL validation proving retry does not duplicate lots.

### Task 4: Review Queue UI And Actions

**Files:**
- Modify: `components/apontamentos/PainelQualidadeSupervisor.tsx`
- Modify: `components/scanner/ConfirmacaoQualidade.tsx`
- Modify: `hooks/useScanner.ts`
- Modify: `lib/actions/qualidade.ts`
- Modify: `lib/queries/qualidade.ts`

- [ ] **Step 1: Load pending lots**

Expose pending/em-revisao lots with OP, product, sector origin, operation origin, quantity and creation time.

- [ ] **Step 2: Review a lot**

Submit approved/rejected quantities, defect catalog choice, origin operation, quantity and optional note.

- [ ] **Step 3: Mark the lot reviewed**

On successful review, create `qualidade_registros`, create `qualidade_detalhes`, and update `qualidade_lotes.status` to `revisado`.

### Task 5: Quality Indicators

**Files:**
- Modify: `lib/queries/qualidade.ts`
- Modify relevant dashboard/report components after reviewing current UI entry points.

- [ ] **Step 1: Separate quality indicators**

Expose approved, rejected, pending lots, approval rate, defect ranking and operator ranking without changing production KPIs.

- [ ] **Step 2: Validate no production KPI contamination**

Run existing dashboard/kanban/saldo tests and TypeScript checks.
