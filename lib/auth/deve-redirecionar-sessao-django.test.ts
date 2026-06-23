import assert from 'node:assert/strict'
import test from 'node:test'

import { DjangoApiError } from '../django/client.ts'
import { DjangoTokenAusenteError } from '../django/errors.ts'
import { deveRedirecionarSessaoDjangoExpirada } from './deve-redirecionar-sessao-django.ts'

test('deveRedirecionarSessaoDjangoExpirada retorna false para erro genérico', () => {
  assert.equal(deveRedirecionarSessaoDjangoExpirada(new Error('falha')), false)
})

test('deveRedirecionarSessaoDjangoExpirada retorna true para token ausente', () => {
  assert.equal(deveRedirecionarSessaoDjangoExpirada(new DjangoTokenAusenteError()), true)
})

test('deveRedirecionarSessaoDjangoExpirada retorna true para DjangoApiError 401 e 403', () => {
  assert.equal(deveRedirecionarSessaoDjangoExpirada(new DjangoApiError(401, 'Token inválido.')), true)
  assert.equal(deveRedirecionarSessaoDjangoExpirada(new DjangoApiError(403, 'Sem permissão.')), true)
  assert.equal(deveRedirecionarSessaoDjangoExpirada(new DjangoApiError(400, 'Bad request.')), false)
})
