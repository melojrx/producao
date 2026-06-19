import assert from 'node:assert/strict'
import test from 'node:test'

import {
  mapearTurnoDjango,
  mapearTurnoOpsDjango,
  type DjangoTurnoJson,
  type DjangoTurnoOpJson,
} from './turnos-dashboard-mappers.ts'

const FIXTURE_TURNO: DjangoTurnoJson = {
  id: '11111111-1111-1111-1111-111111111111',
  status: 'aberto',
  data_hora_abertura: '2026-06-17T08:00:00-03:00',
  data_hora_encerramento: null,
  operadores_disponiveis: 12,
  minutos_turno: 480,
  meta_grupo: 120,
  observacao: '',
  created_at: '2026-06-17T08:00:00-03:00',
  updated_at: '2026-06-17T08:00:00-03:00',
}

const FIXTURE_OP: DjangoTurnoOpJson = {
  id: '22222222-2222-2222-2222-222222222222',
  turno: FIXTURE_TURNO.id,
  numero_op: 'OP-100',
  produto: '33333333-3333-3333-3333-333333333333',
  produto_nome: 'Camisa Polo',
  produto_codigo: 'REF-100',
  quantidade_planejada: 100,
  quantidade_planejada_remanescente: 40,
  quantidade_realizada: 60,
  status: 'em_andamento',
  turno_op_origem: null,
  tp_produto_min_snapshot: '12.5000',
  created_at: '2026-06-17T08:00:00-03:00',
  updated_at: '2026-06-17T10:00:00-03:00',
}

test('mapearTurnoDjango alinha campos de abertura/encerramento', () => {
  const turno = mapearTurnoDjango(FIXTURE_TURNO)

  assert.equal(turno.iniciadoEm, FIXTURE_TURNO.data_hora_abertura)
  assert.equal(turno.encerradoEm, null)
  assert.equal(turno.operadoresDisponiveis, 12)
})

test('mapearTurnoOpsDjango usa produto_codigo como referencia e tp snapshot', () => {
  const [op] = mapearTurnoOpsDjango([FIXTURE_OP])

  assert.equal(op?.produtoReferencia, 'REF-100')
  assert.equal(op?.quantidadePlanejadaRemanescente, 40)
  assert.equal(op?.tpProdutoMin, 12.5)
  assert.equal(op?.quantidadeRealizada, 60)
})
