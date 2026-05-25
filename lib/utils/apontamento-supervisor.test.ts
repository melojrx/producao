import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calcularQuantidadeManualPermitidaOperacao,
  calcularSaldoManualPermitido,
  filtrarSecoesAcionaveisOperacaoTurno,
  normalizarQuantidadeSupervisorInput,
  resolverQuantidadeSupervisorAoAlterarOperacao,
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
    true
  )
  assert.equal(
    supervisorPodeAcionarContexto({
      status: 'encerrada_manualmente',
      quantidadeDisponivelApontamento: 18,
      saldoManualPermitido: 18,
    }),
    false
  )
})

test('valida apenas a existencia do contexto do supervisor sem bloquear por saldo informativo', () => {
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
    {}
  )
})

test('preserva quantidade digitada pelo supervisor sem sobrescrever por sugestao automatica', () => {
  assert.equal(normalizarQuantidadeSupervisorInput(''), '')
  assert.equal(normalizarQuantidadeSupervisorInput('27'), '27')
  assert.equal(normalizarQuantidadeSupervisorInput('0'), '0')
  assert.equal(normalizarQuantidadeSupervisorInput('1e3'), '')

  assert.equal(
    resolverQuantidadeSupervisorAoAlterarOperacao({
      quantidadeAtual: '18',
      quantidadeSugerida: '72',
    }),
    '18'
  )
  assert.equal(
    resolverQuantidadeSupervisorAoAlterarOperacao({
      quantidadeAtual: '',
      quantidadeSugerida: '72',
    }),
    '72'
  )
})

test('remove secoes de qualidade do apontamento produtivo comum do supervisor', () => {
  const secoes = [
    {
      id: 'preparacao',
      setorNome: 'Preparacao',
      modoApontamento: 'producao_padrao',
      status: 'aberta',
    },
    {
      id: 'qualidade-modo',
      setorNome: 'Inspecao',
      modoApontamento: 'revisao_qualidade',
      status: 'aberta',
    },
    {
      id: 'qualidade-nome',
      setorNome: 'Qualidade',
      modoApontamento: 'producao_padrao',
      status: 'aberta',
    },
    {
      id: 'encerrada',
      setorNome: 'Finalizacao',
      modoApontamento: 'producao_padrao',
      status: 'encerrada_manualmente',
    },
  ] as const

  assert.deepEqual(
    filtrarSecoesAcionaveisOperacaoTurno(secoes).map((secao) => secao.id),
    ['preparacao']
  )
})
