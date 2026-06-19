import assert from 'node:assert/strict'
import test from 'node:test'

import {
  mapearDemandasScaneadasDjango,
  mapearOperadorScaneadoDjango,
  mapearTurnoSetorDemandaScaneadaDjango,
  mapearTurnoSetorScaneadoBaseDjango,
  type DjangoOperadorScannerJson,
  type DjangoTurnoSetorDemandaScannerJson,
  type DjangoTurnoSetorScannerJson,
} from './scanner-mappers.ts'

const FIXTURE_OPERADOR: DjangoOperadorScannerJson = {
  id: '11111111-1111-1111-1111-111111111111',
  nome: 'Maria Silva',
  matricula: 'OP-001',
  foto_url: 'https://example.com/maria.jpg',
}

const FIXTURE_SETOR: DjangoTurnoSetorScannerJson = {
  id: '22222222-2222-2222-2222-222222222222',
  turno_id: '33333333-3333-3333-3333-333333333333',
  turno_iniciado_em: '2026-06-17T08:00:00Z',
  setor_id: '44444444-4444-4444-4444-444444444444',
  setor_nome: 'Costura Frente',
  setor_modo_apontamento: 'producao_padrao',
  quantidade_planejada: 200,
  quantidade_realizada: 80,
  qr_code_token: 'setor-token-1',
  status: 'aberto',
}

const FIXTURE_DEMANDA: DjangoTurnoSetorDemandaScannerJson = {
  id: '55555555-5555-5555-5555-555555555555',
  turno_setor_id: FIXTURE_SETOR.id,
  turno_id: FIXTURE_SETOR.turno_id,
  turno_op_id: '66666666-6666-6666-6666-666666666666',
  produto_id: '77777777-7777-7777-7777-777777777777',
  setor_id: FIXTURE_SETOR.setor_id,
  turno_setor_op_legacy_id: null,
  quantidade_planejada: 200,
  quantidade_herdada_setor: 20,
  quantidade_realizada: 80,
  quantidade_liberada_setor: 50,
  status: 'em_andamento',
  numero_op: 'OP-900',
  produto_nome: 'Camisa Polo',
  produto_referencia: 'REF-900',
}

test('mapearOperadorScaneadoDjango converte foto_url para fotoUrl', () => {
  const operador = mapearOperadorScaneadoDjango(FIXTURE_OPERADOR)

  assert.equal(operador.id, FIXTURE_OPERADOR.id)
  assert.equal(operador.nome, 'Maria Silva')
  assert.equal(operador.matricula, 'OP-001')
  assert.equal(operador.fotoUrl, 'https://example.com/maria.jpg')
})

test('mapearOperadorScaneadoDjango normaliza foto vazia para null', () => {
  const operador = mapearOperadorScaneadoDjango({
    ...FIXTURE_OPERADOR,
    foto_url: '   ',
  })

  assert.equal(operador.fotoUrl, null)
})

test('mapearTurnoSetorScaneadoBaseDjango calcula saldo restante', () => {
  const setor = mapearTurnoSetorScaneadoBaseDjango(FIXTURE_SETOR, 'producao_padrao')

  assert.equal(setor.turnoId, FIXTURE_SETOR.turno_id)
  assert.equal(setor.setorNome, 'Costura Frente')
  assert.equal(setor.quantidadePlanejada, 200)
  assert.equal(setor.quantidadeRealizada, 80)
  assert.equal(setor.saldoRestante, 120)
  assert.equal(setor.qrCodeToken, 'setor-token-1')
})

test('mapearTurnoSetorDemandaScaneadaDjango usa produto.codigo como referencia', () => {
  const demanda = mapearTurnoSetorDemandaScaneadaDjango(FIXTURE_DEMANDA)

  assert.equal(demanda.numeroOp, 'OP-900')
  assert.equal(demanda.produtoNome, 'Camisa Polo')
  assert.equal(demanda.produtoReferencia, 'REF-900')
  assert.equal(demanda.quantidadeHerdadaSetor, 20)
  assert.equal(demanda.quantidadeLiberadaSetor, 50)
  assert.equal(demanda.saldoRestante, 100)
  assert.equal(demanda.status, 'em_andamento')
})

test('mapearDemandasScaneadasDjango preserva ordem da API', () => {
  const demandas = mapearDemandasScaneadasDjango([
    FIXTURE_DEMANDA,
    {
      ...FIXTURE_DEMANDA,
      id: '88888888-8888-8888-8888-888888888888',
      numero_op: 'OP-901',
    },
  ])

  assert.equal(demandas.length, 2)
  assert.equal(demandas[0]?.numeroOp, 'OP-900')
  assert.equal(demandas[1]?.numeroOp, 'OP-901')
})
