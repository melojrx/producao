import assert from 'node:assert/strict'
import test from 'node:test'
import { calcularIndicadoresQualidadeTurno } from './qualidade-indicadores.ts'

test('mantem lote pendente como fila sem contar como reprovacao', () => {
  const indicadores = calcularIndicadoresQualidadeTurno({
    lotes: [
      {
        id: 'lote-pendente',
        turnoOpId: 'op-1',
        numeroOp: 'OP-001',
        produtoReferencia: 'REF-1',
        produtoNome: 'Produto 1',
        status: 'pendente',
        quantidadeLote: 40,
        criadoEm: '2026-05-14T10:00:00.000Z',
        operadorId: 'operador-1',
        operadorNome: 'Ana',
      },
    ],
    registros: [],
    detalhes: [],
  })

  assert.equal(indicadores.lotesPendentes, 1)
  assert.equal(indicadores.pecasPendentes, 40)
  assert.equal(indicadores.quantidadeReprovadaTotal, 0)
  assert.equal(indicadores.taxaReprovacao, null)
  assert.equal(indicadores.ops[0]?.lotesPendentes, 1)
})

test('calcula aprovacao retrabalho e rankings de defeitos e operadores', () => {
  const indicadores = calcularIndicadoresQualidadeTurno({
    lotes: [
      {
        id: 'lote-revisado',
        turnoOpId: 'op-1',
        numeroOp: 'OP-001',
        produtoReferencia: 'REF-1',
        produtoNome: 'Produto 1',
        status: 'revisado',
        quantidadeLote: 100,
        criadoEm: '2026-05-14T10:00:00.000Z',
        operadorId: 'operador-1',
        operadorNome: 'Ana',
      },
    ],
    registros: [
      {
        id: 'registro-qualidade-1',
        qualidadeLoteId: 'lote-revisado',
        turnoOpId: 'op-1',
        numeroOp: 'OP-001',
        produtoReferencia: 'REF-1',
        produtoNome: 'Produto 1',
        quantidadeAprovada: 95,
        quantidadeReprovada: 5,
        quantidadeRevisada: 100,
      },
    ],
    detalhes: [
      {
        qualidadeRegistroId: 'registro-qualidade-1',
        qualidadeDefeitoId: 'defeito-1',
        defeitoNome: 'Ponto falho',
        quantidadeDefeito: 3,
      },
      {
        qualidadeRegistroId: 'registro-qualidade-1',
        qualidadeDefeitoId: 'defeito-2',
        defeitoNome: 'Costura torta',
        quantidadeDefeito: 2,
      },
    ],
  })

  assert.equal(indicadores.lotesRevisados, 1)
  assert.equal(indicadores.quantidadeAprovadaTotal, 95)
  assert.equal(indicadores.quantidadeReprovadaTotal, 5)
  assert.equal(indicadores.quantidadeRetrabalhoTotal, 5)
  assert.equal(indicadores.taxaAprovacao, 95)
  assert.equal(indicadores.taxaReprovacao, 5)
  assert.equal(indicadores.totalDefeitos, 5)
  assert.equal(indicadores.rankingDefeitos[0]?.defeitoNome, 'Ponto falho')
  assert.equal(indicadores.rankingDefeitos[0]?.percentualDefeitos, 60)
  assert.equal(indicadores.rankingOperadores[0]?.operadorNome, 'Ana')
  assert.equal(indicadores.rankingOperadores[0]?.quantidadeReprovada, 5)
  assert.equal(indicadores.rankingOperadores[0]?.quantidadeDefeitos, 5)
})
