import assert from 'node:assert/strict'
import test from 'node:test'

import {
  normalizarRoteiroVigente,
  obterProximaVersaoRoteiro,
  roteiroVigenteFoiAlterado,
} from './produto-roteiro-versionamento.ts'

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
    { operacaoId: 'op-antiga', sequencia: 1, versaoRoteiro: 1, vigente: false },
    { operacaoId: 'op-a', sequencia: 1, versaoRoteiro: 2, vigente: true },
    { operacaoId: 'op-b', sequencia: 2, versaoRoteiro: 2, vigente: true },
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
