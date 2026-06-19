import assert from 'node:assert/strict'
import test from 'node:test'

import { DjangoApiError } from '../client.ts'
import {
  construirPayloadDefeitoDjango,
  EXCLUSAO_DJANGO_USA_INATIVACAO,
  mapearErroAcaoQualidadeDefeitoDjango,
} from './qualidade-defeitos-helpers.ts'

test('construirPayloadDefeitoDjango envia nome, classificacao e ativo sem ordem', () => {
  const payload = construirPayloadDefeitoDjango({
    nome: 'Costura aberta',
    classificacao: 'processo',
    ordem: 5,
    ativo: true,
  })

  assert.deepEqual(payload, {
    nome: 'Costura aberta',
    classificacao: 'processo',
    ativo: true,
  })
  assert.equal('ordem' in payload, false)
})

test('mapearErroAcaoQualidadeDefeitoDjango traduz nome duplicado', () => {
  const erro = new DjangoApiError(
    400,
    'Ja existe um tipo de defeito ativo com este nome.'
  )

  assert.equal(
    mapearErroAcaoQualidadeDefeitoDjango(erro),
    'Já existe um tipo de defeito com este nome.'
  )
})

test('exclusao no path Django sempre usa inativacao', () => {
  assert.equal(EXCLUSAO_DJANGO_USA_INATIVACAO, true)
})
