import assert from 'node:assert/strict'
import test from 'node:test'
import {
  normalizarClassificacaoTipoDefeito,
  validarTipoDefeitoInput,
} from './qualidade-defeitos.ts'

test('normaliza classificacao valida de tipo de defeito', () => {
  assert.equal(normalizarClassificacaoTipoDefeito('maquina'), 'maquina')
  assert.equal(normalizarClassificacaoTipoDefeito('operador'), 'operador')
  assert.equal(normalizarClassificacaoTipoDefeito('processo'), 'processo')
  assert.equal(normalizarClassificacaoTipoDefeito('materia_prima'), 'materia_prima')
})

test('recusa classificacao invalida de tipo de defeito', () => {
  assert.equal(normalizarClassificacaoTipoDefeito('qualidade'), null)
})

test('valida campos obrigatorios do cadastro de tipo de defeito', () => {
  assert.deepEqual(
    validarTipoDefeitoInput({
      nome: '  Ponto falho  ',
      classificacao: 'processo',
      ordem: 10,
      ativo: true,
    }),
    {
      valido: true,
      dados: {
        nome: 'Ponto falho',
        classificacao: 'processo',
        ordem: 10,
        ativo: true,
      },
    }
  )
})

test('recusa nome vazio e ordem negativa no cadastro de tipo de defeito', () => {
  assert.deepEqual(
    validarTipoDefeitoInput({
      nome: '   ',
      classificacao: 'processo',
      ordem: 0,
      ativo: true,
    }),
    {
      valido: false,
      erro: 'Nome do tipo de defeito é obrigatório.',
    }
  )

  assert.deepEqual(
    validarTipoDefeitoInput({
      nome: 'Ponto falho',
      classificacao: 'processo',
      ordem: -1,
      ativo: true,
    }),
    {
      valido: false,
      erro: 'A ordem do tipo de defeito deve ser um número inteiro maior ou igual a zero.',
    }
  )
})
