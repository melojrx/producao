import assert from 'node:assert/strict'
import test from 'node:test'
import {
  aplicarCapacidadeOperacionalDemandas,
  hidratarSetoresTurnoComCapacidade,
  limitarOperacoesTurnoAoAceiteDemandas,
  limitarSecoesTurnoAoAceiteDemandas,
} from './hidratacao-capacidade-setor-turno.ts'
import type {
  TurnoOpV2,
  TurnoSetorDemandaV2,
  TurnoSetorOperacaoApontamentoV2,
  TurnoSetorOpV2,
  TurnoSetorV2,
  TurnoV2,
} from '@/types'

function criarTurnoBase(): Pick<TurnoV2, 'operadoresDisponiveis' | 'minutosTurno'> {
  return {
    operadoresDisponiveis: 3,
    minutosTurno: 100,
  }
}

function criarOpBase(): TurnoOpV2 {
  return {
    id: 'op-1',
    turnoId: 'turno-1',
    numeroOp: '17821',
    produtoId: 'produto-1',
    produtoReferencia: 'REF-1',
    produtoNome: 'Produto teste',
    tpProdutoMin: 3,
    quantidadePlanejada: 100,
    quantidadeRealizada: 0,
    quantidadeConcluida: 0,
    progressoOperacionalPct: 0,
    cargaPlanejadaTp: 0,
    cargaRealizadaTp: 0,
    quantidadePlanejadaOriginal: 100,
    quantidadePlanejadaRemanescente: 100,
    turnoOpOrigemId: null,
    status: 'planejada',
    iniciadoEm: null,
    encerradoEm: null,
  }
}

function criarSetoresBase(): TurnoSetorV2[] {
  return [
    {
      id: 'setor-turno-1',
      turnoId: 'turno-1',
      setorId: 'setor-1',
      setorCodigo: 1,
      setorNome: 'Preparacao',
      quantidadePlanejada: 100,
      quantidadeRealizada: 40,
      quantidadeConcluida: 40,
      progressoOperacionalPct: 0,
      cargaPlanejadaTp: 0,
      cargaRealizadaTp: 0,
      qrCodeToken: 'qr-1',
      status: 'em_andamento',
      iniciadoEm: null,
      encerradoEm: null,
    },
    {
      id: 'setor-turno-2',
      turnoId: 'turno-1',
      setorId: 'setor-2',
      setorCodigo: 2,
      setorNome: 'Montagem',
      quantidadePlanejada: 100,
      quantidadeRealizada: 10,
      quantidadeConcluida: 10,
      progressoOperacionalPct: 0,
      cargaPlanejadaTp: 0,
      cargaRealizadaTp: 0,
      qrCodeToken: 'qr-2',
      status: 'em_andamento',
      iniciadoEm: null,
      encerradoEm: null,
    },
    {
      id: 'setor-turno-3',
      turnoId: 'turno-1',
      setorId: 'setor-3',
      setorCodigo: 3,
      setorNome: 'Finalizacao',
      quantidadePlanejada: 100,
      quantidadeRealizada: 100,
      quantidadeConcluida: 100,
      progressoOperacionalPct: 0,
      cargaPlanejadaTp: 0,
      cargaRealizadaTp: 0,
      qrCodeToken: 'qr-3',
      status: 'concluida',
      iniciadoEm: null,
      encerradoEm: null,
    },
  ]
}

function criarDemandasBase(): TurnoSetorDemandaV2[] {
  return [
    {
      id: 'demanda-1',
      turnoSetorId: 'setor-turno-1',
      turnoId: 'turno-1',
      turnoOpId: 'op-1',
      setorId: 'setor-1',
      setorCodigo: 1,
      setorNome: 'Preparacao',
      produtoId: 'produto-1',
      numeroOp: '17821',
      produtoReferencia: 'REF-1',
      produtoNome: 'Produto teste',
      quantidadePlanejada: 100,
      quantidadeRealizada: 40,
      quantidadeConcluida: 40,
      progressoOperacionalPct: 0,
      cargaPlanejadaTp: 0,
      cargaRealizadaTp: 0,
      quantidadeBacklogSetor: 60,
      quantidadeAceitaTurno: 60,
      quantidadeExcedenteTurno: 0,
      quantidadePendenteSetor: 60,
      quantidadeDisponivelApontamento: 60,
      status: 'em_andamento',
      iniciadoEm: null,
      encerradoEm: null,
      turnoSetorOpLegacyId: 'secao-1',
    },
    {
      id: 'demanda-2',
      turnoSetorId: 'setor-turno-2',
      turnoId: 'turno-1',
      turnoOpId: 'op-1',
      setorId: 'setor-2',
      setorCodigo: 2,
      setorNome: 'Montagem',
      produtoId: 'produto-1',
      numeroOp: '17821',
      produtoReferencia: 'REF-1',
      produtoNome: 'Produto teste',
      quantidadePlanejada: 100,
      quantidadeRealizada: 10,
      quantidadeConcluida: 10,
      progressoOperacionalPct: 0,
      cargaPlanejadaTp: 0,
      cargaRealizadaTp: 0,
      quantidadeBacklogSetor: 90,
      quantidadeAceitaTurno: 90,
      quantidadeExcedenteTurno: 0,
      quantidadePendenteSetor: 90,
      quantidadeDisponivelApontamento: 90,
      status: 'aberta',
      iniciadoEm: null,
      encerradoEm: null,
      turnoSetorOpLegacyId: 'secao-2',
    },
    {
      id: 'demanda-3',
      turnoSetorId: 'setor-turno-3',
      turnoId: 'turno-1',
      turnoOpId: 'op-1',
      setorId: 'setor-3',
      setorCodigo: 3,
      setorNome: 'Finalizacao',
      produtoId: 'produto-1',
      numeroOp: '17821',
      produtoReferencia: 'REF-1',
      produtoNome: 'Produto teste',
      quantidadePlanejada: 100,
      quantidadeRealizada: 100,
      quantidadeConcluida: 100,
      progressoOperacionalPct: 0,
      cargaPlanejadaTp: 0,
      cargaRealizadaTp: 0,
      quantidadeBacklogSetor: 0,
      quantidadeAceitaTurno: 0,
      quantidadeExcedenteTurno: 0,
      quantidadePendenteSetor: 0,
      quantidadeDisponivelApontamento: 0,
      status: 'concluida',
      iniciadoEm: null,
      encerradoEm: null,
      turnoSetorOpLegacyId: 'secao-3',
    },
  ]
}

function criarOperacoesSecaoBase(): TurnoSetorOperacaoApontamentoV2[] {
  return [
    {
      id: 'operacao-1a',
      turnoId: 'turno-1',
      turnoOpId: 'op-1',
      turnoSetorOpId: 'secao-1',
      turnoSetorId: 'setor-turno-1',
      turnoSetorDemandaId: 'demanda-1',
      produtoOperacaoId: 'produto-operacao-1a',
      operacaoId: 'cad-op-1a',
      setorId: 'setor-1',
      sequencia: 1,
      tempoPadraoMinSnapshot: 1.5,
      quantidadePlanejada: 100,
      quantidadeRealizada: 40,
      status: 'em_andamento',
      iniciadoEm: null,
      encerradoEm: null,
      operacaoCodigo: 'D1',
      operacaoDescricao: 'Preparacao A',
      maquinaCodigo: null,
      maquinaModelo: null,
    },
    {
      id: 'operacao-1b',
      turnoId: 'turno-1',
      turnoOpId: 'op-1',
      turnoSetorOpId: 'secao-1',
      turnoSetorId: 'setor-turno-1',
      turnoSetorDemandaId: 'demanda-1',
      produtoOperacaoId: 'produto-operacao-1b',
      operacaoId: 'cad-op-1b',
      setorId: 'setor-1',
      sequencia: 2,
      tempoPadraoMinSnapshot: 0.5,
      quantidadePlanejada: 100,
      quantidadeRealizada: 40,
      status: 'em_andamento',
      iniciadoEm: null,
      encerradoEm: null,
      operacaoCodigo: 'D2',
      operacaoDescricao: 'Preparacao B',
      maquinaCodigo: null,
      maquinaModelo: null,
    },
    {
      id: 'operacao-2a',
      turnoId: 'turno-1',
      turnoOpId: 'op-1',
      turnoSetorOpId: 'secao-2',
      turnoSetorId: 'setor-turno-2',
      turnoSetorDemandaId: null,
      produtoOperacaoId: 'produto-operacao-2a',
      operacaoId: 'cad-op-2a',
      setorId: 'setor-2',
      sequencia: 3,
      tempoPadraoMinSnapshot: 1,
      quantidadePlanejada: 100,
      quantidadeRealizada: 10,
      status: 'aberta',
      iniciadoEm: null,
      encerradoEm: null,
      operacaoCodigo: 'D3',
      operacaoDescricao: 'Montagem',
      maquinaCodigo: null,
      maquinaModelo: null,
    },
  ]
}

function criarSecoesBase(): TurnoSetorOpV2[] {
  return [
    {
      id: 'secao-1',
      turnoId: 'turno-1',
      turnoOpId: 'op-1',
      setorId: 'setor-1',
      setorCodigo: 1,
      setorNome: 'Preparacao',
      quantidadePlanejada: 100,
      quantidadeRealizada: 40,
      quantidadeConcluida: 40,
      progressoOperacionalPct: 0,
      cargaPlanejadaTp: 0,
      cargaRealizadaTp: 0,
      qrCodeToken: 'qr-secao-1',
      status: 'em_andamento',
      iniciadoEm: null,
      encerradoEm: null,
    },
  ]
}

test('hidrata capacidade setorial usando demandas pendentes e fallback legacy de operacoes', () => {
  const resultado = hidratarSetoresTurnoComCapacidade({
    turno: criarTurnoBase(),
    setoresAtivos: criarSetoresBase(),
    demandasSetor: criarDemandasBase(),
    operacoesSecao: criarOperacoesSecaoBase(),
    ops: [criarOpBase()],
  })

  const preparacao = resultado.find((setor) => setor.setorId === 'setor-1')
  const montagem = resultado.find((setor) => setor.setorId === 'setor-2')
  const finalizacao = resultado.find((setor) => setor.setorId === 'setor-3')

  assert.deepEqual(
    {
      operadoresAlocados: preparacao?.operadoresAlocados,
      capacidadeMinutosTotal: preparacao?.capacidadeMinutosTotal,
      capacidadeMinutosRestante: preparacao?.capacidadeMinutosRestante,
      diagnosticoCapacidade: preparacao?.diagnosticoCapacidade,
    },
    {
      operadoresAlocados: 2,
      capacidadeMinutosTotal: 200,
      capacidadeMinutosRestante: 80,
      diagnosticoCapacidade: 'dentro_capacidade',
    }
  )

  assert.deepEqual(
    {
      operadoresAlocados: montagem?.operadoresAlocados,
      capacidadeMinutosTotal: montagem?.capacidadeMinutosTotal,
      capacidadeMinutosRestante: montagem?.capacidadeMinutosRestante,
      diagnosticoCapacidade: montagem?.diagnosticoCapacidade,
    },
    {
      operadoresAlocados: 1,
      capacidadeMinutosTotal: 100,
      capacidadeMinutosRestante: 10,
      diagnosticoCapacidade: 'dentro_capacidade',
    }
  )

  assert.deepEqual(
    {
      operadoresAlocados: finalizacao?.operadoresAlocados,
      capacidadeMinutosTotal: finalizacao?.capacidadeMinutosTotal,
      capacidadeMinutosRestante: finalizacao?.capacidadeMinutosRestante,
      diagnosticoCapacidade: finalizacao?.diagnosticoCapacidade,
    },
    {
      operadoresAlocados: 0,
      capacidadeMinutosTotal: 0,
      capacidadeMinutosRestante: 0,
      diagnosticoCapacidade: 'sem_carga',
    }
  )
})

test('limita aceite do turno pela capacidade do setor e reduz a quantidade exposta em secao e operacoes', () => {
  const turnoLimitado: Pick<TurnoV2, 'operadoresDisponiveis' | 'minutosTurno'> = {
    operadoresDisponiveis: 1,
    minutosTurno: 100,
  }
  const demandaPreparacao: TurnoSetorDemandaV2 = {
    ...criarDemandasBase()[0],
    quantidadeBacklogSetor: 60,
    quantidadePendenteSetor: 60,
    quantidadeDisponivelApontamento: 60,
  }

  const demandasLimitadas = aplicarCapacidadeOperacionalDemandas({
    turno: turnoLimitado,
    demandasSetor: [demandaPreparacao],
    operacoesSecao: criarOperacoesSecaoBase().filter((operacao) => operacao.setorId === 'setor-1'),
    ops: [criarOpBase()],
  })
  const demandaLimitada = demandasLimitadas[0]

  assert.deepEqual(
    {
      quantidadeAceitaTurno: demandaLimitada?.quantidadeAceitaTurno,
      quantidadeExcedenteTurno: demandaLimitada?.quantidadeExcedenteTurno,
      quantidadeDisponivelApontamento: demandaLimitada?.quantidadeDisponivelApontamento,
    },
    {
      quantidadeAceitaTurno: 50,
      quantidadeExcedenteTurno: 10,
      quantidadeDisponivelApontamento: 50,
    }
  )

  const operacoesLimitadas = limitarOperacoesTurnoAoAceiteDemandas({
    operacoesSecao: criarOperacoesSecaoBase().filter((operacao) => operacao.setorId === 'setor-1'),
    demandasSetor: demandasLimitadas,
  })
  const secoesLimitadas = limitarSecoesTurnoAoAceiteDemandas({
    secoesSetorOp: criarSecoesBase(),
    demandasSetor: demandasLimitadas,
  })

  assert.equal(operacoesLimitadas[0]?.quantidadePlanejada, 90)
  assert.equal(operacoesLimitadas[1]?.quantidadePlanejada, 90)
  assert.equal(secoesLimitadas[0]?.quantidadePlanejada, 90)
})
