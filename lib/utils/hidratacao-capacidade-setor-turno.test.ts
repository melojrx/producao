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
      capacidadeMinutosConsumida: preparacao?.capacidadeMinutosConsumida,
      capacidadeMinutosReservada: preparacao?.capacidadeMinutosReservada,
      capacidadeMinutosTotal: preparacao?.capacidadeMinutosTotal,
      capacidadeMinutosRestante: preparacao?.capacidadeMinutosRestante,
      diagnosticoCapacidade: preparacao?.diagnosticoCapacidade,
    },
    {
      operadoresAlocados: 2,
      capacidadeMinutosConsumida: 80,
      capacidadeMinutosReservada: 120,
      capacidadeMinutosTotal: 200,
      capacidadeMinutosRestante: 0,
      diagnosticoCapacidade: 'dentro_capacidade',
    }
  )

  assert.deepEqual(
    {
      operadoresAlocados: montagem?.operadoresAlocados,
      capacidadeMinutosConsumida: montagem?.capacidadeMinutosConsumida,
      capacidadeMinutosReservada: montagem?.capacidadeMinutosReservada,
      capacidadeMinutosTotal: montagem?.capacidadeMinutosTotal,
      capacidadeMinutosRestante: montagem?.capacidadeMinutosRestante,
      diagnosticoCapacidade: montagem?.diagnosticoCapacidade,
    },
    {
      operadoresAlocados: 1,
      capacidadeMinutosConsumida: 10,
      capacidadeMinutosReservada: 90,
      capacidadeMinutosTotal: 100,
      capacidadeMinutosRestante: 0,
      diagnosticoCapacidade: 'dentro_capacidade',
    }
  )

  assert.deepEqual(
    {
      operadoresAlocados: finalizacao?.operadoresAlocados,
      capacidadeMinutosConsumida: finalizacao?.capacidadeMinutosConsumida,
      capacidadeMinutosReservada: finalizacao?.capacidadeMinutosReservada,
      capacidadeMinutosTotal: finalizacao?.capacidadeMinutosTotal,
      capacidadeMinutosRestante: finalizacao?.capacidadeMinutosRestante,
      diagnosticoCapacidade: finalizacao?.diagnosticoCapacidade,
    },
    {
      operadoresAlocados: 0,
      capacidadeMinutosConsumida: 0,
      capacidadeMinutosReservada: 0,
      capacidadeMinutosTotal: 0,
      capacidadeMinutosRestante: 0,
      diagnosticoCapacidade: 'sem_carga',
    }
  )
})

test('mantem o plano fixo do dia separado do saldo remanescente aceito no setor', () => {
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
      quantidadeEntradaAcumuladaSetor: demandaLimitada?.quantidadeEntradaAcumuladaSetor,
      quantidadeAceitaAcumuladaSetor: demandaLimitada?.quantidadeAceitaAcumuladaSetor,
      quantidadeDisponivelApontamento: demandaLimitada?.quantidadeDisponivelApontamento,
    },
    {
      quantidadeAceitaTurno: 0,
      quantidadeExcedenteTurno: 27,
      quantidadeEntradaAcumuladaSetor: 100,
      quantidadeAceitaAcumuladaSetor: 33,
      quantidadeDisponivelApontamento: 0,
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

  assert.equal(operacoesLimitadas[0]?.quantidadePlanejada, 40)
  assert.equal(operacoesLimitadas[1]?.quantidadePlanejada, 40)
  assert.equal(secoesLimitadas[0]?.quantidadePlanejada, 40)
})

test('desconta do disponível agora o que já foi produzido no turno atual dentro da parcela aceita', () => {
  const turnoComTetoGlobal: Pick<
    TurnoV2,
    'operadoresDisponiveis' | 'minutosTurno' | 'capacidadeGlobalTurnoPecas'
  > = {
    operadoresDisponiveis: 20,
    minutosTurno: 510,
    capacidadeGlobalTurnoPecas: 601,
  }
  const demandaMontagem: TurnoSetorDemandaV2 = {
    ...criarDemandasBase()[1],
    quantidadePlanejada: 1000,
    quantidadeRealizada: 300,
    quantidadeConcluida: 300,
    quantidadeBacklogSetor: 700,
    quantidadeAceitaTurno: 700,
    quantidadeExcedenteTurno: 0,
    quantidadePendenteSetor: 700,
    quantidadeDisponivelApontamento: 700,
    statusFila: 'em_producao',
  }
  const operacoesMontagem = criarOperacoesSecaoBase()
    .filter((operacao) => operacao.setorId === 'setor-2')
    .map((operacao) => ({
      ...operacao,
      turnoSetorDemandaId: 'demanda-2',
      quantidadePlanejada: 1000,
      quantidadeRealizada: 300,
      status: 'em_andamento' as const,
    }))
  const quantidadeRealizadaAtualPorOperacaoId = new Map<string, number>([['operacao-2a', 300]])

  const demandasLimitadas = aplicarCapacidadeOperacionalDemandas({
    turno: turnoComTetoGlobal,
    demandasSetor: [demandaMontagem],
    operacoesSecao: operacoesMontagem,
    ops: [criarOpBase()],
    quantidadeRealizadaAtualPorOperacaoId,
  })

  assert.equal(demandasLimitadas[0]?.quantidadeAceitaTurno, 301)
  assert.equal(demandasLimitadas[0]?.quantidadeAceitaAcumuladaSetor, 601)
  assert.equal(demandasLimitadas[0]?.quantidadeExcedenteTurno, 99)
  assert.equal(demandasLimitadas[0]?.quantidadeDisponivelApontamento, 301)
})

test('redistribui o plano residual do dia para a próxima demanda do setor quando houver fila ativa', () => {
  const turnoLimitado: Pick<TurnoV2, 'operadoresDisponiveis' | 'minutosTurno'> = {
    operadoresDisponiveis: 1,
    minutosTurno: 100,
  }
  const demandaJaProduzida: TurnoSetorDemandaV2 = {
    ...criarDemandasBase()[0],
    quantidadePlanejada: 100,
    quantidadeRealizada: 50,
    quantidadeConcluida: 50,
    quantidadeBacklogSetor: 50,
    quantidadePendenteSetor: 50,
    quantidadeDisponivelApontamento: 50,
  }
  const demandaNovaFila: TurnoSetorDemandaV2 = {
    ...criarDemandasBase()[0],
    id: 'demanda-1b',
    turnoSetorOpLegacyId: 'secao-1b',
    numeroOp: '17822',
    quantidadePlanejada: 50,
    quantidadeRealizada: 0,
    quantidadeConcluida: 0,
    quantidadeBacklogSetor: 50,
    quantidadePendenteSetor: 50,
    quantidadeDisponivelApontamento: 50,
    posicaoFila: 2,
  }

  const operacoesPreparacaoBase = criarOperacoesSecaoBase().filter(
    (operacao) => operacao.setorId === 'setor-1'
  )
  const operacoesPreparacao = [
    ...operacoesPreparacaoBase,
    ...operacoesPreparacaoBase.map((operacao) => ({
      ...operacao,
      id: `${operacao.id}-nova`,
      turnoSetorOpId: 'secao-1b',
      turnoSetorDemandaId: 'demanda-1b',
      produtoOperacaoId: `${operacao.produtoOperacaoId}-nova`,
    })),
  ]
  const demandasLimitadas = aplicarCapacidadeOperacionalDemandas({
    turno: turnoLimitado,
    demandasSetor: [demandaJaProduzida, demandaNovaFila],
    operacoesSecao: operacoesPreparacao,
    ops: [criarOpBase()],
  })

  assert.deepEqual(
    demandasLimitadas.map((demanda) => ({
      id: demanda.id,
      quantidadeAceitaTurno: demanda.quantidadeAceitaTurno,
      quantidadeExcedenteTurno: demanda.quantidadeExcedenteTurno,
      quantidadeAceitaAcumuladaSetor: demanda.quantidadeAceitaAcumuladaSetor,
    })),
    [
      {
        id: 'demanda-1',
        quantidadeAceitaTurno: 0,
        quantidadeExcedenteTurno: 50,
        quantidadeAceitaAcumuladaSetor: 50,
      },
      {
        id: 'demanda-1b',
        quantidadeAceitaTurno: 33,
        quantidadeExcedenteTurno: 17,
        quantidadeAceitaAcumuladaSetor: 33,
      },
    ]
  )
})

test('mantem apenas a demanda prioritaria do setor liberada para execucao imediata', () => {
  const turnoCapaz: Pick<TurnoV2, 'operadoresDisponiveis' | 'minutosTurno'> = {
    operadoresDisponiveis: 2,
    minutosTurno: 100,
  }
  const demandaPrioritaria: TurnoSetorDemandaV2 = {
    ...criarDemandasBase()[0],
    quantidadeRealizada: 0,
    quantidadeConcluida: 0,
    quantidadeBacklogSetor: 40,
    quantidadePendenteSetor: 40,
    quantidadeDisponivelApontamento: 40,
    quantidadeAceitaTurno: 40,
    posicaoFila: 1,
    statusFila: 'liberada',
  }
  const demandaSeguinte: TurnoSetorDemandaV2 = {
    ...criarDemandasBase()[0],
    id: 'demanda-2',
    turnoSetorOpLegacyId: 'secao-2',
    numeroOp: '17822',
    quantidadeRealizada: 0,
    quantidadeConcluida: 0,
    quantidadeBacklogSetor: 30,
    quantidadePendenteSetor: 30,
    quantidadeDisponivelApontamento: 30,
    quantidadeAceitaTurno: 30,
    posicaoFila: 2,
    statusFila: 'em_fila',
  }

  const operacoesPreparacaoBase = criarOperacoesSecaoBase().filter(
    (operacao) => operacao.setorId === 'setor-1'
  )
  const operacoesPreparacao = [
    ...operacoesPreparacaoBase,
    ...operacoesPreparacaoBase.map((operacao) => ({
      ...operacao,
      id: `${operacao.id}-fila`,
      turnoSetorOpId: 'secao-2',
      turnoSetorDemandaId: 'demanda-2',
      produtoOperacaoId: `${operacao.produtoOperacaoId}-fila`,
      quantidadePlanejada: 30,
      quantidadeRealizada: 0,
      status: 'aberta' as const,
    })),
  ]

  const resultado = aplicarCapacidadeOperacionalDemandas({
    turno: turnoCapaz,
    demandasSetor: [demandaPrioritaria, demandaSeguinte],
    operacoesSecao: operacoesPreparacao,
    ops: [criarOpBase()],
  })

  assert.deepEqual(
    resultado.map((demanda) => ({
      id: demanda.id,
      quantidadeAceitaTurno: demanda.quantidadeAceitaTurno,
      quantidadeDisponivelApontamento: demanda.quantidadeDisponivelApontamento,
      saldoManualPermitido: demanda.saldoManualPermitido,
    })),
    [
      {
        id: 'demanda-1',
        quantidadeAceitaTurno: 40,
        quantidadeDisponivelApontamento: 40,
        saldoManualPermitido: 40,
      },
      {
        id: 'demanda-2',
        quantidadeAceitaTurno: 26,
        quantidadeDisponivelApontamento: 0,
        saldoManualPermitido: 26,
      },
    ]
  )
})

test('nao desconta da capacidade do novo turno a producao herdada do carry-over sem apontamento atual', () => {
  const turnoLimitado: Pick<TurnoV2, 'operadoresDisponiveis' | 'minutosTurno'> = {
    operadoresDisponiveis: 1,
    minutosTurno: 100,
  }
  const demandaHerdada: TurnoSetorDemandaV2 = {
    ...criarDemandasBase()[0],
    quantidadePlanejada: 100,
    quantidadeRealizada: 50,
    quantidadeConcluida: 50,
    quantidadeBacklogSetor: 50,
    quantidadeAceitaTurno: 50,
    quantidadeExcedenteTurno: 0,
    quantidadePendenteSetor: 50,
    quantidadeDisponivelApontamento: 50,
  }
  const operacoesHerdadas = criarOperacoesSecaoBase()
    .filter((operacao) => operacao.setorId === 'setor-1')
    .map((operacao) => ({
      ...operacao,
      quantidadeRealizada: 50,
    }))
  const quantidadeRealizadaAtualPorOperacaoId = new Map<string, number>()

  const demandasLimitadas = aplicarCapacidadeOperacionalDemandas({
    turno: turnoLimitado,
    demandasSetor: [demandaHerdada],
    operacoesSecao: operacoesHerdadas,
    ops: [criarOpBase()],
    quantidadeRealizadaAtualPorOperacaoId,
  })

  assert.equal(demandasLimitadas[0]?.quantidadeAceitaTurno, 33)
  assert.equal(demandasLimitadas[0]?.quantidadeAceitaAcumuladaSetor, 33)

  const setoresHidratados = hidratarSetoresTurnoComCapacidade({
    turno: turnoLimitado,
    setoresAtivos: [criarSetoresBase()[0]],
    demandasSetor: demandasLimitadas,
    operacoesSecao: operacoesHerdadas,
    ops: [criarOpBase()],
    quantidadeRealizadaAtualPorOperacaoId,
  })

  assert.equal(setoresHidratados[0]?.operadoresAlocados, 1)
  assert.equal(setoresHidratados[0]?.capacidadeMinutosConsumida, 0)
  assert.equal(setoresHidratados[0]?.capacidadeMinutosReservada, 66)
  assert.equal(setoresHidratados[0]?.capacidadeMinutosRestante, 34)
})

test('limita o plano setorial ao teto global do turno e preserva o saldo remanescente da parcela aceita', () => {
  const turnoComTetoGlobal: Pick<
    TurnoV2,
    'operadoresDisponiveis' | 'minutosTurno' | 'capacidadeGlobalTurnoPecas'
  > = {
    operadoresDisponiveis: 20,
    minutosTurno: 510,
    capacidadeGlobalTurnoPecas: 30,
  }
  const demandaPreparacao: TurnoSetorDemandaV2 = {
    ...criarDemandasBase()[0],
    quantidadePlanejada: 100,
    quantidadeRealizada: 0,
    quantidadeConcluida: 0,
    quantidadeBacklogSetor: 100,
    quantidadeAceitaTurno: 100,
    quantidadeExcedenteTurno: 0,
    quantidadePendenteSetor: 100,
    quantidadeDisponivelApontamento: 100,
  }
  const operacoesPreparacao = criarOperacoesSecaoBase()
    .filter((operacao) => operacao.setorId === 'setor-1')
    .map((operacao) => ({
      ...operacao,
      quantidadePlanejada: 100,
      quantidadeRealizada: 0,
      status: 'aberta' as const,
    }))

  const demandasLimitadas = aplicarCapacidadeOperacionalDemandas({
    turno: turnoComTetoGlobal,
    demandasSetor: [demandaPreparacao],
    operacoesSecao: operacoesPreparacao,
    ops: [criarOpBase()],
  })

  assert.equal(demandasLimitadas[0]?.quantidadeAceitaTurno, 30)
  assert.equal(demandasLimitadas[0]?.quantidadeAceitaAcumuladaSetor, 30)
  assert.equal(demandasLimitadas[0]?.quantidadeExcedenteTurno, 70)
  assert.equal(demandasLimitadas[0]?.quantidadeDisponivelApontamento, 30)

  const setoresHidratados = hidratarSetoresTurnoComCapacidade({
    turno: turnoComTetoGlobal,
    setoresAtivos: [criarSetoresBase()[0]],
    demandasSetor: demandasLimitadas,
    operacoesSecao: operacoesPreparacao,
    ops: [criarOpBase()],
  })

  assert.equal(setoresHidratados[0]?.capacidadeMinutosConsumida, 0)
  assert.equal(setoresHidratados[0]?.capacidadeMinutosReservada, 60)
})
