import assert from 'node:assert/strict'
import test from 'node:test'
import { obterDashboardTabs } from './dashboard-tabs.ts'

test('inclui Qualidade como aba propria da dashboard sem remover as abas existentes', () => {
  const abas = obterDashboardTabs()
  const ids = abas.map((aba) => aba.id)

  assert.deepEqual(ids, ['visao_geral', 'visao_operacional', 'qualidade', 'operadores'])
  assert.equal(abas.find((aba) => aba.id === 'qualidade')?.titulo, 'Qualidade')
})
