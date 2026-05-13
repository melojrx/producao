import assert from 'node:assert/strict'
import test from 'node:test'
import { validarNovaOpFisica } from './op-fisica.ts'

test('recusa nova raiz fisica para numero de OP com saldo pendente no historico', () => {
  assert.deepEqual(
    validarNovaOpFisica({
      numeroOp: '207675',
      opsExistentes: [
        {
          id: 'op-original',
          numeroOp: '207675',
          status: 'encerrada_manualmente',
          turnoOpOrigemId: null,
          quantidadePlanejadaRemanescente: 1305,
        },
      ],
    }),
    {
      permitido: false,
      mensagem:
        'A OP 207675 já existe no histórico operacional com saldo físico pendente. Reabra essa OP por carry-over; não crie um novo container físico com o mesmo número.',
    }
  )
})

test('permite continuar a mesma OP por carry-over informado', () => {
  assert.deepEqual(
    validarNovaOpFisica({
      numeroOp: '207675',
      turnoOpOrigemId: 'op-original',
      opsExistentes: [
        {
          id: 'op-original',
          numeroOp: '207675',
          status: 'encerrada_manualmente',
          turnoOpOrigemId: null,
          quantidadePlanejadaRemanescente: 1305,
        },
      ],
    }),
    { permitido: true }
  )
})

test('recusa nova producao para numero de OP ja concluido', () => {
  assert.deepEqual(
    validarNovaOpFisica({
      numeroOp: '207675',
      opsExistentes: [
        {
          id: 'op-concluida',
          numeroOp: '207675',
          status: 'concluida',
          turnoOpOrigemId: null,
          quantidadePlanejadaRemanescente: 0,
        },
      ],
    }),
    {
      permitido: false,
      mensagem: 'A OP 207675 já foi concluída no histórico operacional. A próxima produção deve usar outra OP.',
    }
  )
})
