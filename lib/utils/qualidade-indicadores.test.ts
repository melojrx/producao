import assert from 'node:assert/strict'
import test from 'node:test'
import { calcularIndicadoresQualidadeTurno } from './qualidade-indicadores.ts'

test('retorna zeros quando nao ha registros', () => {
  const indicadores = calcularIndicadoresQualidadeTurno({
    registros: [],
    detalhes: [],
  })

  assert.equal(indicadores.pendenciasRevisao, 0)
  assert.equal(indicadores.pecasPendentesRevisao, 0)
  assert.equal(indicadores.revisoesRealizadas, 0)
  assert.equal(indicadores.quantidadeAprovadaTotal, 0)
  assert.equal(indicadores.quantidadeReprovadaTotal, 0)
  assert.equal(indicadores.taxaAprovacao, null)
  assert.equal(indicadores.taxaReprovacao, null)
})

test('calcula aprovacao retrabalho e rankings de defeitos e revisores', () => {
  const indicadores = calcularIndicadoresQualidadeTurno({
    registros: [
      {
        id: 'registro-qualidade-1',
        turnoOpId: 'op-1',
        numeroOp: 'OP-001',
        produtoReferencia: 'REF-1',
        produtoNome: 'Produto 1',
        quantidadeAprovada: 95,
        quantidadeReprovada: 5,
        quantidadeRevisada: 100,
        revisorId: 'revisor-1',
        revisorNome: 'Ana Revisora',
      },
      {
        id: 'registro-qualidade-2',
        turnoOpId: 'op-1',
        numeroOp: 'OP-001',
        produtoReferencia: 'REF-1',
        produtoNome: 'Produto 1',
        quantidadeAprovada: 45,
        quantidadeReprovada: 5,
        quantidadeRevisada: 50,
        revisorId: 'revisor-1',
        revisorNome: 'Ana Revisora',
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
      {
        qualidadeRegistroId: 'registro-qualidade-2',
        qualidadeDefeitoId: 'defeito-1',
        defeitoNome: 'Ponto falho',
        quantidadeDefeito: 4,
      },
    ],
  })

  assert.equal(indicadores.revisoesRealizadas, 2)
  assert.equal(indicadores.quantidadeAprovadaTotal, 140)
  assert.equal(indicadores.quantidadeReprovadaTotal, 10)
  assert.equal(indicadores.quantidadeRetrabalhoTotal, 10)
  assert.equal(indicadores.taxaAprovacao, 140 / 150 * 100)
  assert.equal(indicadores.taxaReprovacao, 10 / 150 * 100)
  assert.equal(indicadores.totalDefeitos, 9)
  assert.equal(indicadores.rankingDefeitos[0]?.defeitoNome, 'Ponto falho')
  assert.equal(indicadores.rankingDefeitos[0]?.percentualDefeitos, 7 / 9 * 100)
  assert.equal(indicadores.rankingRevisores[0]?.revisorNome, 'Ana Revisora')
  assert.equal(indicadores.rankingRevisores[0]?.revisoesRealizadas, 2)
  assert.equal(indicadores.rankingRevisores[0]?.quantidadeAprovada, 140)
  assert.equal(indicadores.rankingRevisores[0]?.quantidadeReprovada, 10)
  assert.equal(indicadores.rankingRevisores[0]?.quantidadeDefeitos, 9)
})
