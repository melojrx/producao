import assert from 'node:assert/strict'
import test from 'node:test'
import { mapearOpsTurnoParaDashboard, mapearSetoresTurnoParaDashboard } from './turno-setores.ts'
import type { PlanejamentoTurnoV2 } from '@/types'

test('mantem o plano do dia como capacidade aceita acumulada e nao como saldo restante', () => {
  const planejamento = {
    turno: {
      id: 'turno-1',
      capacidadeGlobalTurnoPecas: 601,
    },
    ops: [
      {
        id: 'op-1',
        turnoId: 'turno-1',
        numeroOp: '200900',
        produtoId: 'produto-1',
        produtoReferencia: 'REF-1',
        produtoNome: 'Produto teste',
        tpProdutoMin: 1,
        quantidadePlanejada: 1300,
        quantidadeRealizada: 400,
        quantidadeConcluida: 400,
        progressoOperacionalPct: 0,
        cargaPlanejadaTp: 0,
        cargaRealizadaTp: 0,
        quantidadePlanejadaOriginal: 1300,
        quantidadePlanejadaRemanescente: 900,
        turnoOpOrigemId: null,
        status: 'em_andamento',
        iniciadoEm: null,
        encerradoEm: null,
      },
    ],
    setoresAtivos: [
      {
        id: 'setor-turno-1',
        turnoId: 'turno-1',
        setorId: 'setor-1',
        setorCodigo: 2,
        setorNome: 'Frente',
        quantidadePlanejada: 1300,
        quantidadeRealizada: 400,
        quantidadeConcluida: 400,
        progressoOperacionalPct: 0,
        cargaPlanejadaTp: 0,
        cargaRealizadaTp: 0,
        qrCodeToken: 'qr-1',
        status: 'em_andamento',
        iniciadoEm: null,
        encerradoEm: null,
      },
    ],
    demandasSetor: [
      {
        id: 'demanda-1',
        turnoSetorId: 'setor-turno-1',
        turnoId: 'turno-1',
        turnoOpId: 'op-1',
        setorId: 'setor-1',
        setorCodigo: 2,
        setorNome: 'Frente',
        produtoId: 'produto-1',
        numeroOp: '200900',
        produtoReferencia: 'REF-1',
        produtoNome: 'Produto teste',
        quantidadePlanejada: 1300,
        quantidadeRealizada: 400,
        quantidadeConcluida: 400,
        progressoOperacionalPct: 0,
        cargaPlanejadaTp: 0,
        cargaRealizadaTp: 0,
        quantidadeBacklogSetor: 900,
        quantidadeAceitaTurno: 201,
        quantidadeAceitaAcumuladaSetor: 601,
        quantidadeExcedenteTurno: 699,
        quantidadePendenteSetor: 900,
        quantidadeDisponivelApontamento: 201,
        status: 'em_andamento',
        iniciadoEm: null,
        encerradoEm: null,
        turnoSetorOpLegacyId: 'secao-1',
      },
    ],
    secoesSetorOp: [
      {
        id: 'secao-1',
        turnoId: 'turno-1',
        turnoOpId: 'op-1',
        setorId: 'setor-1',
        setorCodigo: 2,
        setorNome: 'Frente',
        quantidadePlanejada: 1300,
        quantidadeRealizada: 400,
        quantidadeConcluida: 400,
        progressoOperacionalPct: 0,
        cargaPlanejadaTp: 0,
        cargaRealizadaTp: 0,
        qrCodeToken: 'qr-secao-1',
        status: 'em_andamento',
        iniciadoEm: null,
        encerradoEm: null,
      },
    ],
  } as Pick<
    PlanejamentoTurnoV2,
    'turno' | 'ops' | 'setoresAtivos' | 'demandasSetor' | 'secoesSetorOp'
  >

  const setores = mapearSetoresTurnoParaDashboard(planejamento)
  const ops = mapearOpsTurnoParaDashboard(planejamento)

  assert.equal(setores[0]?.quantidadeAceitaTurno, 601)
  assert.equal(setores[0]?.demandas[0]?.quantidadeAceitaTurno, 601)
  assert.equal(setores[0]?.demandas[0]?.quantidadeDisponivelApontamento, 201)
  assert.equal(ops[0]?.quantidadeAceitaTurno, 601)
})
