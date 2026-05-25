import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calcularResultadoRevisaoParcialQualidade,
  montarFilaQualidadeOperacional,
  validarRevisaoParcialQualidade,
} from './qualidade-operacional.ts'
import type {
  TurnoOpV2,
  TurnoSetorDemandaV2,
  TurnoSetorOperacaoApontamentoV2,
} from '@/types'

function criarOp(): TurnoOpV2 {
  return {
    id: 'turno-op-1',
    turnoId: 'turno-1',
    numeroOp: 'OP-100',
    produtoId: 'produto-1',
    produtoReferencia: 'REF-100',
    produtoNome: 'Calca teste',
    tpProdutoMin: 1,
    quantidadePlanejada: 100,
    quantidadeRealizada: 0,
    quantidadeConcluida: 0,
    progressoOperacionalPct: 0,
    cargaPlanejadaTp: 100,
    cargaRealizadaTp: 0,
    quantidadePlanejadaOriginal: 100,
    quantidadePlanejadaRemanescente: 100,
    turnoOpOrigemId: null,
    status: 'planejada',
    iniciadoEm: null,
    encerradoEm: null,
  }
}

function criarDemandaQualidade(): TurnoSetorDemandaV2 {
  return {
    id: 'demanda-qualidade-1',
    turnoSetorId: 'turno-setor-qualidade',
    turnoId: 'turno-1',
    turnoOpId: 'turno-op-1',
    setorId: 'setor-qualidade',
    setorCodigo: 6,
    setorNome: 'Qualidade',
    produtoId: 'produto-1',
    numeroOp: 'OP-100',
    produtoReferencia: 'REF-100',
    produtoNome: 'Calca teste',
    quantidadePlanejada: 100,
    quantidadeRealizada: 0,
    quantidadeConcluida: 0,
    progressoOperacionalPct: 0,
    cargaPlanejadaTp: 100,
    cargaRealizadaTp: 0,
    quantidadeDisponivelApontamento: 100,
    status: 'aberta',
    iniciadoEm: null,
    encerradoEm: null,
    turnoSetorOpLegacyId: 'secao-qualidade-1',
  }
}

function criarOperacao(
  id: string,
  setorId: string,
  descricao: string
): TurnoSetorOperacaoApontamentoV2 {
  return {
    id,
    turnoId: 'turno-1',
    turnoOpId: 'turno-op-1',
    turnoSetorOpId: setorId === 'setor-qualidade' ? 'secao-qualidade-1' : 'secao-final-1',
    turnoSetorId: setorId === 'setor-qualidade' ? 'turno-setor-qualidade' : 'turno-setor-final',
    turnoSetorDemandaId: setorId === 'setor-qualidade' ? 'demanda-qualidade-1' : 'demanda-final-1',
    produtoOperacaoId: `${id}-produto`,
    operacaoId: `${id}-cadastro`,
    setorId,
    sequencia: setorId === 'setor-qualidade' ? 99 : 80,
    tempoPadraoMinSnapshot: 1,
    quantidadePlanejada: 100,
    quantidadeRealizada: 0,
    status: 'aberta',
    iniciadoEm: null,
    encerradoEm: null,
    operacaoCodigo: id.toUpperCase(),
    operacaoDescricao: descricao,
    maquinaCodigo: null,
    maquinaModelo: null,
    saldoFisicoRestante: 100,
  }
}

test('monta fila operacional de Qualidade a partir da etapa Qualidade do turno', () => {
  const fila = montarFilaQualidadeOperacional({
    ops: [criarOp()],
    demandasSetor: [criarDemandaQualidade()],
    operacoesTurno: [
      criarOperacao('finalizacao', 'setor-finalizacao', 'Finalizar peca'),
      criarOperacao('qualidade', 'setor-qualidade', 'Revisar qualidade'),
    ],
  })

  assert.equal(fila.length, 1)
  assert.equal(fila[0]?.numeroOp, 'OP-100')
  assert.equal(fila[0]?.quantidadeDisponivelRevisao, 100)
  assert.equal(fila[0]?.operacaoQualidade.operacaoDescricao, 'Revisar qualidade')
  assert.equal(fila[0]?.operacoesOrigem.length, 1)
  assert.equal(fila[0]?.operacoesOrigem[0]?.operacaoDescricao, 'Finalizar peca')
})

test('permite revisao parcial e consome pendencia somente pelas aprovadas', () => {
  assert.deepEqual(
    validarRevisaoParcialQualidade({
      quantidadePendente: 914,
      quantidadeAprovada: 40,
      quantidadeReprovada: 10,
    }),
    {}
  )

  assert.deepEqual(
    calcularResultadoRevisaoParcialQualidade({
      quantidadePendente: 914,
      quantidadeAprovada: 40,
      quantidadeReprovada: 10,
    }),
    {
      quantidadeRevisada: 50,
      quantidadeConsumidaPendencia: 40,
      quantidadePendenteAposRevisao: 874,
    }
  )
})

test('bloqueia revisao vazia ou maior que a pendencia disponivel', () => {
  assert.equal(
    validarRevisaoParcialQualidade({
      quantidadePendente: 914,
      quantidadeAprovada: 0,
      quantidadeReprovada: 0,
    }).erro,
    'Informe ao menos uma peça aprovada ou reprovada.'
  )

  assert.equal(
    validarRevisaoParcialQualidade({
      quantidadePendente: 914,
      quantidadeAprovada: 914,
      quantidadeReprovada: 1,
    }).erro,
    'A quantidade revisada não pode ultrapassar a pendência disponível.'
  )
})
