import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const caminhoComponente = new URL('./KanbanOperacionalTurno.tsx', import.meta.url)

test('kanban operacional renderiza setores em faixa horizontal sem quebra de linha', () => {
  const codigoFonte = readFileSync(caminhoComponente, 'utf8')

  assert.match(codigoFonte, /grid-flow-col/)
  assert.match(codigoFonte, /auto-cols-\[/)
  assert.doesNotMatch(codigoFonte, /xl:grid-cols-5/)
})
