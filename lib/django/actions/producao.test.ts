import assert from 'node:assert/strict'
import test from 'node:test'

import { DjangoApiError } from '../client.ts'
import {
  APONTAMENTO_SUPERVISOR_LOTE_SEM_EQUIVALENTE_DJANGO,
  construirPayloadApontamentoDjango,
  mapearErroAcaoProducaoDjango,
  mapearResultadoApontamentoDjango,
} from './producao-helpers.ts'

test('construirPayloadApontamentoDjango envia snake_case sem usuario quando ausente', () => {
  const payload = construirPayloadApontamentoDjango(
    {
      operadorId: 'operador-uuid',
      turnoSetorOperacaoId: 'tso-uuid',
      quantidade: 25,
      origemApontamento: 'operador_qr',
      maquinaId: 'maquina-uuid',
      observacao: ' teste ',
    },
    null
  )

  assert.deepEqual(payload, {
    turno_setor_operacao: 'tso-uuid',
    operador: 'operador-uuid',
    quantidade: 25,
    origem_apontamento: 'operador_qr',
    maquina: 'maquina-uuid',
    observacao: 'teste',
  })
  assert.equal('usuario_sistema' in payload, false)
})

test('construirPayloadApontamentoDjango inclui usuario_sistema Django quando informado', () => {
  const payload = construirPayloadApontamentoDjango(
    {
      operadorId: 'operador-uuid',
      turnoSetorOperacaoId: 'tso-uuid',
      quantidade: 10,
      origemApontamento: 'supervisor_manual',
    },
    'django-user-uuid'
  )

  assert.equal(payload.usuario_sistema, 'django-user-uuid')
  assert.equal(payload.origem_apontamento, 'supervisor_manual')
})

test('mapearErroAcaoProducaoDjango traduz saldo fisico e token ausente', () => {
  const saldo = new DjangoApiError(
    400,
    'A OP possui apenas 3 peca(s) com saldo fisico nesta operacao.'
  )
  assert.equal(
    mapearErroAcaoProducaoDjango(saldo),
    'A OP possui apenas 3 peça(s) com saldo físico nesta operacao.'
  )

  const token = Object.assign(new Error('token ausente'), { name: 'DjangoTokenAusenteError' })
  assert.match(mapearErroAcaoProducaoDjango(token), /DJANGO_DEV_ACCESS_TOKEN/)
})

test('mapearResultadoApontamentoDjango enriquece agregados quando disponiveis', () => {
  const resultado = mapearResultadoApontamentoDjango(
    {
      id: 'registro-uuid',
      quantidade: 25,
      turno_setor_operacao: 'tso-uuid',
      turno_setor_demanda: 'demanda-uuid',
      turno_setor: 'setor-uuid',
      turno: 'turno-uuid',
      turno_op: 'top-uuid',
    },
    {
      id: 'tso-uuid',
      quantidade_planejada: 100,
      quantidade_realizada: 75,
      status: 'em_andamento',
    },
    {
      id: 'demanda-uuid',
      quantidade_planejada: 50,
      quantidade_realizada: 30,
      status: 'em_andamento',
    },
    {
      id: 'top-uuid',
      quantidade_planejada: 200,
      quantidade_realizada: 30,
      status: 'em_andamento',
    }
  )

  assert.equal(resultado.sucesso, true)
  assert.equal(resultado.registroId, 'registro-uuid')
  assert.equal(resultado.quantidadeRealizadaOperacao, 75)
  assert.equal(resultado.saldoRestanteOperacao, 25)
  assert.equal(resultado.statusTurnoSetorOperacao, 'em_andamento')
  assert.equal(resultado.quantidadeRealizadaSecao, 30)
  assert.equal(resultado.saldoRestanteSecao, 20)
  assert.equal(resultado.quantidadeRealizadaTurnoOp, 30)
  assert.equal(resultado.statusTurnoOp, 'em_andamento')
})

test('batch supervisor permanece deferido para Supabase', () => {
  assert.equal(APONTAMENTO_SUPERVISOR_LOTE_SEM_EQUIVALENTE_DJANGO, true)
})
