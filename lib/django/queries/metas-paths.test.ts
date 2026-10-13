import assert from 'node:assert/strict'
import test from 'node:test'
import { construirCaminhoResumoMetas } from './metas-paths.ts'

test('resumo mensal usa rota Django canonica com barra antes da query', () => {
  const url = new URL(`/api/v1/metas${construirCaminhoResumoMetas('2026-10-01')}`, 'http://producao-api:8000')
  assert.equal(url.pathname, '/api/v1/metas/resumo/')
  assert.equal(url.searchParams.get('competencia'), '2026-10-01')
})
