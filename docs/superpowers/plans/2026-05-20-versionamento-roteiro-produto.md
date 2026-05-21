# Versionamento de Roteiro de Produto Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir editar o roteiro vigente de produtos com histórico ou turno aberto, aplicando a mudança apenas a novos turnos.

**Architecture:** `produto_operacoes` passa a manter versões de roteiro: linhas antigas ficam preservadas para FKs históricas, e apenas linhas `vigente = true` alimentam CRUD, ficha, duplicação e abertura de novos turnos. A edição de produto deixa de apagar o roteiro antigo e passa a criar uma nova versão vigente quando o roteiro muda.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Supabase SSR/Admin Client, SQL remoto via Supabase Management API, testes Node `--experimental-strip-types`.

---

### Task 1: Funções Puras de Versionamento

**Files:**
- Create: `lib/utils/produto-roteiro-versionamento.ts`
- Test: `lib/utils/produto-roteiro-versionamento.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  normalizarRoteiroVigente,
  obterProximaVersaoRoteiro,
  roteiroVigenteFoiAlterado,
} from './produto-roteiro-versionamento'

test('normaliza roteiro vigente ordenando sequencia e removendo versoes antigas', () => {
  const roteiro = normalizarRoteiroVigente([
    { operacaoId: 'op-antiga', sequencia: 1, versaoRoteiro: 1, vigente: false },
    { operacaoId: 'op-b', sequencia: 2, versaoRoteiro: 2, vigente: true },
    { operacaoId: 'op-a', sequencia: 1, versaoRoteiro: 2, vigente: true },
  ])

  assert.deepEqual(roteiro, [
    { operacaoId: 'op-a', sequencia: 1 },
    { operacaoId: 'op-b', sequencia: 2 },
  ])
})

test('detecta alteracao comparando somente o roteiro vigente normalizado', () => {
  const atual = [
    { operacaoId: 'op-a', sequencia: 1, versaoRoteiro: 1, vigente: true },
    { operacaoId: 'op-b', sequencia: 2, versaoRoteiro: 1, vigente: true },
  ]

  assert.equal(
    roteiroVigenteFoiAlterado(atual, [
      { operacaoId: 'op-a', sequencia: 1 },
      { operacaoId: 'op-b', sequencia: 2 },
    ]),
    false
  )

  assert.equal(
    roteiroVigenteFoiAlterado(atual, [
      { operacaoId: 'op-a', sequencia: 1 },
      { operacaoId: 'op-c', sequencia: 2 },
    ]),
    true
  )
})

test('calcula proxima versao preservando historico existente', () => {
  assert.equal(obterProximaVersaoRoteiro([]), 1)
  assert.equal(
    obterProximaVersaoRoteiro([
      { operacaoId: 'op-a', sequencia: 1, versaoRoteiro: 1, vigente: false },
      { operacaoId: 'op-b', sequencia: 1, versaoRoteiro: 4, vigente: true },
    ]),
    5
  )
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test --experimental-strip-types lib/utils/produto-roteiro-versionamento.test.ts`

Expected: FAIL because `lib/utils/produto-roteiro-versionamento.ts` does not exist.

- [ ] **Step 3: Implement the utility**

Create exported interfaces and functions:

```typescript
export interface RoteiroVersionadoItem {
  operacaoId: string
  sequencia: number
  versaoRoteiro: number | null
  vigente: boolean | null
}

export interface RoteiroVigenteItem {
  operacaoId: string
  sequencia: number
}

export function normalizarRoteiroVigente(items: RoteiroVersionadoItem[]): RoteiroVigenteItem[] {
  return items
    .filter((item) => item.vigente === true)
    .slice()
    .sort((a, b) => a.sequencia - b.sequencia)
    .map((item, index) => ({ operacaoId: item.operacaoId, sequencia: index + 1 }))
}

export function roteiroVigenteFoiAlterado(
  atual: RoteiroVersionadoItem[],
  proximo: RoteiroVigenteItem[]
): boolean {
  const normalizado = normalizarRoteiroVigente(atual)
  if (normalizado.length !== proximo.length) return true
  return normalizado.some((item, index) => {
    const proximoItem = proximo[index]
    return !proximoItem || item.operacaoId !== proximoItem.operacaoId || item.sequencia !== proximoItem.sequencia
  })
}

export function obterProximaVersaoRoteiro(items: RoteiroVersionadoItem[]): number {
  const maiorVersao = items.reduce((maior, item) => Math.max(maior, item.versaoRoteiro ?? 1), 0)
  return maiorVersao + 1
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test --experimental-strip-types lib/utils/produto-roteiro-versionamento.test.ts`

Expected: PASS.

### Task 2: Schema e Types do Roteiro Versionado

**Files:**
- Create: `scripts/sprint52_versionamento_roteiro_produto.sql`
- Modify: `types/supabase.ts`

- [ ] **Step 1: Add SQL migration**

Create an idempotent SQL migration that:
- adds `versao_roteiro integer not null default 1`
- adds `vigente boolean not null default true`
- adds `substituido_em timestamptz null`
- drops old unique constraint/index for `(produto_id, sequencia)` if present
- creates unique index `produto_operacoes_produto_versao_sequencia_uidx` on `(produto_id, versao_roteiro, sequencia)`
- creates partial unique index `produto_operacoes_produto_vigente_sequencia_uidx` on `(produto_id, sequencia) where vigente`

- [ ] **Step 2: Update Supabase generated type manually**

Add the same fields to `produto_operacoes.Row`, `.Insert` and `.Update` in `types/supabase.ts`.

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`

Expected: PASS.

### Task 3: Queries e Edição de Produto

**Files:**
- Modify: `lib/actions/produtos.ts`
- Modify: `lib/queries/produtos.ts`
- Test: `lib/utils/produto-roteiro-versionamento.test.ts`

- [ ] **Step 1: Write/extend failing tests for version comparison**

Add a test proving old non-vigente rows do not make an unchanged vigente route look changed.

- [ ] **Step 2: Wire `lib/actions/produtos.ts`**

Use `normalizarRoteiroVigente`, `roteiroVigenteFoiAlterado` and `obterProximaVersaoRoteiro`.

Editing behavior:
- load all product route rows
- compare only vigente rows
- when changed, update old vigente rows to `vigente = false, substituido_em = now()`
- insert new rows with `versao_roteiro = next`, `vigente = true`
- do not call delete on `produto_operacoes` for an existing product

- [ ] **Step 3: Wire `lib/queries/produtos.ts`**

List only `vigente = true` rows for product CRUD/detail/ficha/duplication.

- [ ] **Step 4: Run tests and typecheck**

Run:
- `node --test --experimental-strip-types lib/utils/produto-roteiro-versionamento.test.ts`
- `npx tsc --noEmit`

Expected: PASS.

### Task 4: Planejamento de Turno com Roteiro Vigente

**Files:**
- Modify: `lib/actions/turnos.ts`
- Modify: `lib/actions/turno.ts`
- Modify: `lib/actions/turno-blocos.ts`
- Create/update SQL in `scripts/sprint52_versionamento_roteiro_produto.sql`

- [ ] **Step 1: Filter app-side route reads**

Every Supabase read from `produto_operacoes` that derives future planning must include `.eq('vigente', true)`.

- [ ] **Step 2: Update SQL functions**

In SQL functions that derive `turno_setor_ops` and `turno_setor_operacoes`, add `produto_operacao.vigente = true`.

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`

Expected: PASS.

### Task 5: Modal Message and Homologation Checks

**Files:**
- Modify: `components/ui/ModalProduto.tsx`
- Modify: `docs/TASKS.md`
- Modify: `docs/BACKLOG.md`

- [ ] **Step 1: Replace blocking copy**

Change modal copy from “roteiro não pode mais ser alterado” to “alterações valerão apenas para novos turnos”.

- [ ] **Step 2: Run full local checks**

Run:
- `node --test --experimental-strip-types lib/utils/produto-roteiro-versionamento.test.ts`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- `git diff --check`

Expected: all PASS.

- [ ] **Step 3: Update TASKS evidence**

Mark completed HUs only after validation evidence exists.
