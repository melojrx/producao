import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calcularSaldoFisicoRestanteOperacao,
  validarConsumoSaldoFisicoOperacao,
} from './saldo-fisico-op.ts'

test('calcula saldo fisico restante considerando progresso herdado da OP', () => {
  assert.equal(
    calcularSaldoFisicoRestanteOperacao({
      quantidadePlanejadaOp: 792,
      quantidadeProduzidaAcumuladaOperacao: 447,
      quantidadeRealizadaTurnoOperacao: 0,
    }),
    345
  )
})

test('recusa consumo acima do saldo fisico restante da operacao na OP', () => {
  assert.deepEqual(
    validarConsumoSaldoFisicoOperacao({
      numeroOp: '13089',
      quantidadePlanejadaOp: 792,
      quantidadeProduzidaAcumuladaOperacao: 447,
      quantidadeRealizadaTurnoOperacao: 0,
      quantidadeSolicitada: 447,
    }),
    {
      permitido: false,
      saldoFisicoRestante: 345,
      mensagem:
        'A OP 13089 possui apenas 345 peça(s) com saldo físico nesta operação. Ajuste a quantidade ou selecione outra OP.',
    }
  )
})

test('permite consumo dentro do saldo fisico mesmo acima do disponivel visual', () => {
  assert.deepEqual(
    validarConsumoSaldoFisicoOperacao({
      numeroOp: '13089',
      quantidadePlanejadaOp: 792,
      quantidadeProduzidaAcumuladaOperacao: 447,
      quantidadeRealizadaTurnoOperacao: 0,
      quantidadeSolicitada: 345,
    }),
    {
      permitido: true,
      saldoFisicoRestante: 345,
    }
  )
})

test('informa encerramento natural quando nao existe saldo fisico na operacao', () => {
  assert.deepEqual(
    validarConsumoSaldoFisicoOperacao({
      numeroOp: '13089',
      quantidadePlanejadaOp: 792,
      quantidadeProduzidaAcumuladaOperacao: 792,
      quantidadeRealizadaTurnoOperacao: 0,
      quantidadeSolicitada: 1,
    }),
    {
      permitido: false,
      saldoFisicoRestante: 0,
      mensagem:
        'A OP 13089 não possui mais saldo físico nesta operação. Registre a próxima produção em outra OP.',
    }
  )
})
