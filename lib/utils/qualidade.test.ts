import assert from 'node:assert/strict'
import test from 'node:test'
import { setorParticipaFluxoProdutivoAtivo, setorUsaRevisaoQualidade } from './qualidade.ts'

test('identifica Qualidade como setor de revisao operacional', () => {
  assert.equal(setorUsaRevisaoQualidade('Qualidade'), true)
  assert.equal(setorUsaRevisaoQualidade(' qualidade '), true)
  assert.equal(setorUsaRevisaoQualidade('Inspecao', 'revisao_qualidade'), true)
})

test('mantem setores produtivos no fluxo ativo', () => {
  assert.equal(setorParticipaFluxoProdutivoAtivo('Costura', 'producao_padrao'), true)
  assert.equal(setorParticipaFluxoProdutivoAtivo('Acabamento', null), true)
})

test('mantem Qualidade no fluxo operacional ativo para revisao final', () => {
  assert.equal(setorParticipaFluxoProdutivoAtivo('Qualidade', 'producao_padrao'), true)
  assert.equal(setorParticipaFluxoProdutivoAtivo('Revisao', 'revisao_qualidade'), true)
})
