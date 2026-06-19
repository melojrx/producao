import assert from 'node:assert/strict'
import test from 'node:test'

import { DjangoApiError } from '../client.ts'
import type { DjangoUsuarioAutenticado } from '../types.ts'
import {
  construirPayloadRevisaoQualidadeDjango,
  mapearErroAcaoQualidadeDjango,
  mapearResultadoRevisaoQualidadeDjango,
  validarPermissaoRevisorQualidadeDjango,
} from './qualidade-helpers.ts'

test('construirPayloadRevisaoQualidadeDjango envia snake_case sem revisor_usuario_id', () => {
  const payload = construirPayloadRevisaoQualidadeDjango({
    turnoSetorOperacaoIdQualidade: 'tso-qualidade-uuid',
    quantidadeAprovada: 8,
    quantidadeReprovada: 2,
    origemLancamento: 'scanner_qualidade',
    defeitos: [
      {
        turnoSetorOperacaoIdOrigem: 'tso-origem-uuid',
        qualidadeDefeitoId: 'defeito-uuid',
        quantidadeDefeito: 2,
        observacao: ' costura aberta ',
      },
    ],
  })

  assert.deepEqual(payload, {
    turno_setor_operacao_id_qualidade: 'tso-qualidade-uuid',
    quantidade_aprovada: 8,
    quantidade_reprovada: 2,
    origem_lancamento: 'scanner_qualidade',
    defeitos: [
      {
        turno_setor_operacao_id_origem: 'tso-origem-uuid',
        qualidade_defeito_id: 'defeito-uuid',
        quantidade_defeito: 2,
        observacao: 'costura aberta',
      },
    ],
  })
  assert.equal('revisor_usuario_id' in payload, false)
})

test('mapearErroAcaoQualidadeDjango traduz saldo fisico e token ausente', () => {
  const saldo = new DjangoApiError(
    400,
    'A OP possui apenas 3 peca(s) com saldo fisico nesta operacao.'
  )
  assert.equal(
    mapearErroAcaoQualidadeDjango(saldo),
    'A OP possui apenas 3 peça(s) com saldo físico nesta operacao.'
  )

  const token = Object.assign(new Error('token ausente'), { name: 'DjangoTokenAusenteError' })
  assert.match(mapearErroAcaoQualidadeDjango(token), /DJANGO_DEV_ACCESS_TOKEN/)
})

test('mapearResultadoRevisaoQualidadeDjango calcula quantidadeRevisada e totalDefeitos', () => {
  const resultado = mapearResultadoRevisaoQualidadeDjango(
    {
      id: 'registro-uuid',
      quantidade_aprovada: 8,
      quantidade_reprovada: 2,
      turno_setor_operacao: 'tso-uuid',
      turno: 'turno-uuid',
      turno_op: 'top-uuid',
      detalhes: [
        { id: 'det-1', quantidade_defeito: 1 },
        { id: 'det-2', quantidade_defeito: 3 },
      ],
    },
    {
      id: 'tso-uuid',
      quantidade_planejada: 100,
      quantidade_realizada: 80,
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
  assert.equal(resultado.qualidadeRegistroId, 'registro-uuid')
  assert.equal(resultado.quantidadeRevisada, 10)
  assert.equal(resultado.totalDefeitos, 4)
  assert.equal(resultado.quantidadeRealizadaOperacao, 80)
  assert.equal(resultado.saldoRestanteOperacao, 20)
  assert.equal(resultado.quantidadeRealizadaSecao, 30)
  assert.equal(resultado.quantidadeRealizadaTurnoOp, 30)
})

test('validarPermissaoRevisorQualidadeDjango recusa usuario sem pode_revisar_qualidade', () => {
  const usuarioSemPermissao: DjangoUsuarioAutenticado = {
    id: 'user-uuid',
    email: 'supervisor@test.com',
    nome: 'Supervisor',
    papel: 'supervisor',
    pode_revisar_qualidade: false,
    ativo: true,
  }

  assert.equal(
    validarPermissaoRevisorQualidadeDjango(usuarioSemPermissao),
    'Seu usuário não possui permissão para registrar revisões de qualidade.'
  )
})

test('validarPermissaoRevisorQualidadeDjango aceita revisor ativo', () => {
  const revisor: DjangoUsuarioAutenticado = {
    id: 'revisor-uuid',
    email: 'revisor@test.com',
    nome: 'Revisor',
    papel: 'supervisor',
    pode_revisar_qualidade: true,
    ativo: true,
  }

  assert.equal(validarPermissaoRevisorQualidadeDjango(revisor), null)
})
