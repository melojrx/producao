import assert from 'node:assert/strict'
import test from 'node:test'
import {
  setorEhQualidadeLegado,
  setorParticipaFluxoProdutivoAtivo,
} from './qualidade.ts'

test('identifica Qualidade legado por nome ou modo de apontamento', () => {
  assert.equal(setorEhQualidadeLegado('Qualidade'), true)
  assert.equal(setorEhQualidadeLegado(' qualidade '), true)
  assert.equal(setorEhQualidadeLegado('Inspecao', 'revisao_qualidade'), true)
})

test('mantem setores produtivos no fluxo ativo', () => {
  assert.equal(setorParticipaFluxoProdutivoAtivo('Costura', 'producao_padrao'), true)
  assert.equal(setorParticipaFluxoProdutivoAtivo('Acabamento', null), true)
})

test('remove Qualidade legado do fluxo produtivo ativo', () => {
  assert.equal(setorParticipaFluxoProdutivoAtivo('Qualidade', 'producao_padrao'), false)
  assert.equal(setorParticipaFluxoProdutivoAtivo('Revisao', 'revisao_qualidade'), false)
})
