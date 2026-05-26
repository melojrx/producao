import assert from 'node:assert/strict'
import test from 'node:test'
import { criarHrefAbaApontamentos } from './apontamentos-tabs.ts'

test('cria href preservando parametros existentes e persistindo aba de qualidade', () => {
  assert.equal(
    criarHrefAbaApontamentos({
      pathname: '/admin/apontamentos',
      search: '?competencia=2026-05&turnoOpId=abc',
      aba: 'qualidade_turno',
    }),
    '/admin/apontamentos?competencia=2026-05&turnoOpId=abc&aba=qualidade_turno'
  )
})

test('remove aba da URL quando volta para a aba padrao', () => {
  assert.equal(
    criarHrefAbaApontamentos({
      pathname: '/admin/apontamentos',
      search: '?aba=qualidade_turno&competencia=2026-05',
      aba: 'gestao_mensal',
    }),
    '/admin/apontamentos?competencia=2026-05'
  )
})
