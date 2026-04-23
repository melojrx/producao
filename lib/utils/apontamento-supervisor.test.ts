import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calcularQuantidadeManualPermitidaOperacao,
  calcularSaldoManualPermitido,
  supervisorDependeDeExcecaoManual,
  supervisorPodeAcionarContexto,
  validarLancamentosSupervisorContraContextos,
} from './apontamento-supervisor.ts'

test('calcula o saldo manual permitido sem romper o teto diario do setor', () => {
  assert.equal(
    calcularSaldoManualPermitido({
      quantidadeAceitaAcumuladaSetor: 26,
      quantidadeConcluidaNoSetor: 0,
      planoDoDiaSetor: 66,
      quantidadeConcluidaTotalSetor: 40,
    }),
    26
  )

  assert.equal(
    calcularSaldoManualPermitido({
      quantidadeAceitaAcumuladaSetor: 30,
      quantidadeConcluidaNoSetor: 10,
      planoDoDiaSetor: 50,
      quantidadeConcluidaTotalSetor: 45,
    }),
    5
  )
})

test('mantem o contexto do supervisor acionavel mesmo fora da prioridade automatica', () => {
  assert.equal(
    supervisorPodeAcionarContexto({
      status: 'aberta',
      quantidadeDisponivelApontamento: 0,
      saldoManualPermitido: 18,
    }),
    true
  )
  assert.equal(
    supervisorDependeDeExcecaoManual({
      quantidadeDisponivelApontamento: 0,
      saldoManualPermitido: 18,
    }),
    true
  )
  assert.equal(
    supervisorPodeAcionarContexto({
      status: 'concluida',
      quantidadeDisponivelApontamento: 0,
      saldoManualPermitido: 18,
    }),
    false
  )
})

test('valida o lote do supervisor pelo saldo manual permitido da operacao', () => {
  const contexto = {
    turnoSetorOperacaoId: 'operacao-posterior',
    numeroOp: '17822',
    setorNome: 'Preparacao',
    setorAnteriorNome: 'Corte',
    quantidadeDisponivelOperacao: 0,
    quantidadeManualPermitidaOperacao: calcularQuantidadeManualPermitidaOperacao({
      quantidadePlanejadaOperacao: 26,
      quantidadeRealizadaOperacao: 0,
      quantidadeRealizadaDemanda: 0,
      saldoManualPermitido: 26,
    }),
    saldoManualPermitido: 26,
  }

  assert.deepEqual(
    validarLancamentosSupervisorContraContextos(
      [
        {
          operadorId: 'operador-1',
          turnoSetorOperacaoId: 'operacao-posterior',
          quantidade: 12,
        },
      ],
      [contexto]
    ),
    {}
  )

  assert.deepEqual(
    validarLancamentosSupervisorContraContextos(
      [
        {
          operadorId: 'operador-1',
          turnoSetorOperacaoId: 'operacao-posterior',
          quantidade: 27,
        },
      ],
      [contexto]
    ),
    {
      erro:
        'A operação 17822 em Preparacao permite no máximo 26 peça(s) dentro do saldo aceito do dia.',
    }
  )
})
