import assert from 'node:assert/strict'
import test from 'node:test'

const moduloHidratacaoUrl = new URL('./hidratacao-capacidade-setor-turno.ts', import.meta.url)
const moduloCarryOverUrl = new URL('./carry-over-turno.ts', import.meta.url)

const { aplicarCapacidadeOperacionalDemandas }: typeof import('./hidratacao-capacidade-setor-turno') =
  await import(moduloHidratacaoUrl.href)
const { normalizarDemandasCarryOverEntreTurnos }: typeof import('./carry-over-turno') =
  await import(moduloCarryOverUrl.href)

import type {
  TurnoOpV2,
  TurnoSetorDemandaV2,
  TurnoSetorOperacaoApontamentoV2,
  TurnoV2,
} from '@/types'

function criarTurno(turno: Partial<Pick<TurnoV2, 'operadoresDisponiveis' | 'minutosTurno'>> = {}) {
  return {
    operadoresDisponiveis: turno.operadoresDisponiveis ?? 1,
    minutosTurno: turno.minutosTurno ?? 60,
  } satisfies Pick<TurnoV2, 'operadoresDisponiveis' | 'minutosTurno'>
}

function criarOp(params: {
  id: string
  numeroOp: string
  quantidadePlanejada: number
}): TurnoOpV2 {
  return {
    id: params.id,
    turnoId: 'turno-aberto',
    numeroOp: params.numeroOp,
    produtoId: `produto-${params.id}`,
    produtoReferencia: `REF-${params.numeroOp}`,
    produtoNome: `Produto ${params.numeroOp}`,
    tpProdutoMin: 1,
    quantidadePlanejada: params.quantidadePlanejada,
    quantidadeRealizada: 0,
    quantidadeConcluida: 0,
    progressoOperacionalPct: 0,
    cargaPlanejadaTp: 0,
    cargaRealizadaTp: 0,
    quantidadePlanejadaOriginal: params.quantidadePlanejada,
    quantidadePlanejadaRemanescente: params.quantidadePlanejada,
    turnoOpOrigemId: null,
    status: 'planejada',
    iniciadoEm: null,
    encerradoEm: null,
  }
}

function criarDemanda(params: {
  id: string
  turnoOpId: string
  numeroOp: string
  setorId?: string
  setorCodigo?: number
  setorNome?: string
  quantidadePlanejada: number
  quantidadeRealizada: number
  quantidadeBacklogSetor: number
  quantidadeAceitaTurno?: number
  quantidadeDisponivelApontamento?: number
  quantidadeLiberadaSetor?: number
  posicaoFila?: number
  status?: TurnoSetorDemandaV2['status']
  statusFila?: TurnoSetorDemandaV2['statusFila']
}): TurnoSetorDemandaV2 {
  const setorId = params.setorId ?? 'setor-final'
  const setorCodigo = params.setorCodigo ?? 50
  const setorNome = params.setorNome ?? 'Final'
  const quantidadeAceitaTurno = params.quantidadeAceitaTurno ?? params.quantidadeBacklogSetor
  const quantidadeDisponivelApontamento =
    params.quantidadeDisponivelApontamento ?? quantidadeAceitaTurno

  return {
    id: params.id,
    turnoSetorId: `turno-${setorId}`,
    turnoId: 'turno-aberto',
    turnoOpId: params.turnoOpId,
    etapaFluxoChave: setorNome === 'Final' ? 'final' : undefined,
    setorId,
    setorCodigo,
    setorNome,
    produtoId: `produto-${params.turnoOpId}`,
    numeroOp: params.numeroOp,
    produtoReferencia: `REF-${params.numeroOp}`,
    produtoNome: `Produto ${params.numeroOp}`,
    quantidadePlanejada: params.quantidadePlanejada,
    quantidadeRealizada: params.quantidadeRealizada,
    quantidadeConcluida: params.quantidadeRealizada,
    progressoOperacionalPct: 0,
    cargaPlanejadaTp: 0,
    cargaRealizadaTp: 0,
    quantidadeBacklogSetor: params.quantidadeBacklogSetor,
    quantidadeAceitaTurno,
    quantidadeExcedenteTurno: Math.max(params.quantidadeBacklogSetor - quantidadeAceitaTurno, 0),
    quantidadePendenteSetor: params.quantidadeBacklogSetor,
    quantidadeLiberadaSetor: params.quantidadeLiberadaSetor,
    quantidadeEntradaAcumuladaSetor: undefined,
    quantidadeAceitaAcumuladaSetor: undefined,
    quantidadeDisponivelApontamento,
    quantidadeBloqueadaAnterior: 0,
    quantidadeSincronizadaMontagem: 0,
    quantidadeBloqueadaSincronizacao: 0,
    setorAnteriorId: null,
    setorAnteriorCodigo: null,
    setorAnteriorNome: null,
    posicaoFila: params.posicaoFila,
    statusFila: params.statusFila,
    status: params.status ?? 'aberta',
    iniciadoEm: null,
    encerradoEm: null,
    turnoSetorOpLegacyId: `secao-${params.id}`,
  }
}

function criarOperacao(params: {
  id: string
  turnoOpId: string
  turnoSetorDemandaId: string
  turnoSetorOpId: string
  quantidadePlanejada: number
  quantidadeRealizada: number
  tempoPadraoMinSnapshot?: number
  setorId?: string
  operacaoCodigo?: string
}): TurnoSetorOperacaoApontamentoV2 {
  return {
    id: params.id,
    turnoId: 'turno-aberto',
    turnoOpId: params.turnoOpId,
    turnoSetorOpId: params.turnoSetorOpId,
    turnoSetorId: `turno-${params.setorId ?? 'setor-final'}`,
    turnoSetorDemandaId: params.turnoSetorDemandaId,
    produtoOperacaoId: `produto-operacao-${params.id}`,
    operacaoId: `cad-${params.id}`,
    setorId: params.setorId ?? 'setor-final',
    sequencia: 1,
    tempoPadraoMinSnapshot: params.tempoPadraoMinSnapshot ?? 1,
    quantidadePlanejada: params.quantidadePlanejada,
    quantidadeRealizada: params.quantidadeRealizada,
    status: params.quantidadeRealizada > 0 ? 'em_andamento' : 'aberta',
    iniciadoEm: null,
    encerradoEm: null,
    operacaoCodigo: params.operacaoCodigo ?? `OP-${params.id}`,
    operacaoDescricao: `Operacao ${params.id}`,
    maquinaCodigo: null,
    maquinaModelo: null,
  }
}

test('homologa a capacidade cumulativa do dia sem reabrir teto quando nova alimentacao entra no setor', () => {
  const ops = [
    criarOp({ id: 'op-atual', numeroOp: '3001', quantidadePlanejada: 60 }),
    criarOp({ id: 'op-nova', numeroOp: '3002', quantidadePlanejada: 40 }),
  ]
  const demandas = [
    criarDemanda({
      id: 'demanda-atual',
      turnoOpId: 'op-atual',
      numeroOp: '3001',
      quantidadePlanejada: 60,
      quantidadeRealizada: 30,
      quantidadeBacklogSetor: 30,
      posicaoFila: 1,
      status: 'em_andamento',
      statusFila: 'em_producao',
    }),
    criarDemanda({
      id: 'demanda-nova',
      turnoOpId: 'op-nova',
      numeroOp: '3002',
      quantidadePlanejada: 40,
      quantidadeRealizada: 0,
      quantidadeBacklogSetor: 40,
      posicaoFila: 2,
      status: 'aberta',
      statusFila: 'em_fila',
    }),
  ]
  const operacoes = [
    criarOperacao({
      id: 'operacao-atual',
      turnoOpId: 'op-atual',
      turnoSetorDemandaId: 'demanda-atual',
      turnoSetorOpId: 'secao-demanda-atual',
      quantidadePlanejada: 60,
      quantidadeRealizada: 30,
    }),
    criarOperacao({
      id: 'operacao-nova',
      turnoOpId: 'op-nova',
      turnoSetorDemandaId: 'demanda-nova',
      turnoSetorOpId: 'secao-demanda-nova',
      quantidadePlanejada: 40,
      quantidadeRealizada: 0,
    }),
  ]

  const resultado = aplicarCapacidadeOperacionalDemandas({
    turno: criarTurno({ operadoresDisponiveis: 1, minutosTurno: 60 }),
    demandasSetor: demandas,
    operacoesSecao: operacoes,
    ops,
  })

  assert.deepEqual(
    resultado.map((demanda) => ({
      id: demanda.id,
      quantidadeAceitaTurno: demanda.quantidadeAceitaTurno,
      quantidadeDisponivelApontamento: demanda.quantidadeDisponivelApontamento,
      quantidadeExcedenteTurno: demanda.quantidadeExcedenteTurno,
      quantidadeAceitaAcumuladaSetor: demanda.quantidadeAceitaAcumuladaSetor,
    })),
    [
      {
        id: 'demanda-atual',
        quantidadeAceitaTurno: 30,
        quantidadeDisponivelApontamento: 30,
        quantidadeExcedenteTurno: 0,
        quantidadeAceitaAcumuladaSetor: 60,
      },
      {
        id: 'demanda-nova',
        quantidadeAceitaTurno: 0,
        quantidadeDisponivelApontamento: 0,
        quantidadeExcedenteTurno: 40,
        quantidadeAceitaAcumuladaSetor: 0,
      },
    ]
  )
})

test('homologa em Final a prioridade de conclusao da OP atual antes de abrir a seguinte', () => {
  const ops = [
    criarOp({ id: 'op-final-atual', numeroOp: '4001', quantidadePlanejada: 20 }),
    criarOp({ id: 'op-final-fila', numeroOp: '4002', quantidadePlanejada: 25 }),
  ]
  const demandas = [
    criarDemanda({
      id: 'demanda-final-atual',
      turnoOpId: 'op-final-atual',
      numeroOp: '4001',
      quantidadePlanejada: 20,
      quantidadeRealizada: 5,
      quantidadeBacklogSetor: 15,
      posicaoFila: 1,
      status: 'em_andamento',
      statusFila: 'em_producao',
    }),
    criarDemanda({
      id: 'demanda-final-fila',
      turnoOpId: 'op-final-fila',
      numeroOp: '4002',
      quantidadePlanejada: 25,
      quantidadeRealizada: 0,
      quantidadeBacklogSetor: 25,
      posicaoFila: 2,
      status: 'aberta',
      statusFila: 'em_fila',
    }),
  ]
  const operacoes = [
    criarOperacao({
      id: 'operacao-final-atual',
      turnoOpId: 'op-final-atual',
      turnoSetorDemandaId: 'demanda-final-atual',
      turnoSetorOpId: 'secao-demanda-final-atual',
      quantidadePlanejada: 20,
      quantidadeRealizada: 5,
    }),
    criarOperacao({
      id: 'operacao-final-fila',
      turnoOpId: 'op-final-fila',
      turnoSetorDemandaId: 'demanda-final-fila',
      turnoSetorOpId: 'secao-demanda-final-fila',
      quantidadePlanejada: 25,
      quantidadeRealizada: 0,
    }),
  ]

  const resultado = aplicarCapacidadeOperacionalDemandas({
    turno: criarTurno({ operadoresDisponiveis: 1, minutosTurno: 45 }),
    demandasSetor: demandas,
    operacoesSecao: operacoes,
    ops,
  })

  assert.deepEqual(
    resultado.map((demanda) => ({
      id: demanda.id,
      quantidadeAceitaTurno: demanda.quantidadeAceitaTurno,
      quantidadeDisponivelApontamento: demanda.quantidadeDisponivelApontamento,
      quantidadeExcedenteTurno: demanda.quantidadeExcedenteTurno,
    })),
    [
      {
        id: 'demanda-final-atual',
        quantidadeAceitaTurno: 15,
        quantidadeDisponivelApontamento: 15,
        quantidadeExcedenteTurno: 0,
      },
      {
        id: 'demanda-final-fila',
        quantidadeAceitaTurno: 25,
        quantidadeDisponivelApontamento: 0,
        quantidadeExcedenteTurno: 0,
      },
    ]
  )
})

test('homologa o carry-over do excedente setorial para o turno seguinte sem romper Frente, Costa, Montagem e Final', () => {
  const snapshots = normalizarDemandasCarryOverEntreTurnos({
    quantidadePlanejadaDestino: 80,
    demandasOrigem: [
      {
        id: 'prep',
        turnoOpId: 'turno-op-1',
        setorId: 'setor-preparacao',
        setorCodigo: 10,
        setorNome: 'Preparacao',
        quantidadePlanejada: 90,
        quantidadeRealizada: 90,
        status: 'concluida',
        iniciadoEm: '2026-04-20T08:00:00.000Z',
        encerradoEm: '2026-04-20T09:00:00.000Z',
      },
      {
        id: 'frente',
        turnoOpId: 'turno-op-1',
        setorId: 'setor-frente',
        setorCodigo: 20,
        setorNome: 'Frente',
        quantidadePlanejada: 90,
        quantidadeRealizada: 70,
        status: 'em_andamento',
        iniciadoEm: '2026-04-20T09:00:00.000Z',
        encerradoEm: null,
      },
      {
        id: 'costa',
        turnoOpId: 'turno-op-1',
        setorId: 'setor-costa',
        setorCodigo: 30,
        setorNome: 'Costa',
        quantidadePlanejada: 90,
        quantidadeRealizada: 50,
        status: 'em_andamento',
        iniciadoEm: '2026-04-20T09:05:00.000Z',
        encerradoEm: null,
      },
      {
        id: 'montagem',
        turnoOpId: 'turno-op-1',
        setorId: 'setor-montagem',
        setorCodigo: 40,
        setorNome: 'Montagem',
        quantidadePlanejada: 90,
        quantidadeRealizada: 35,
        status: 'em_andamento',
        iniciadoEm: '2026-04-20T10:00:00.000Z',
        encerradoEm: null,
      },
      {
        id: 'final',
        turnoOpId: 'turno-op-1',
        setorId: 'setor-final',
        setorCodigo: 50,
        setorNome: 'Final',
        quantidadePlanejada: 90,
        quantidadeRealizada: 10,
        status: 'em_andamento',
        iniciadoEm: '2026-04-20T11:00:00.000Z',
        encerradoEm: null,
      },
    ],
  })

  assert.deepEqual(
    snapshots.map((snapshot) => ({
      setorNome: snapshot.setorNome,
      quantidadeRealizadaDestino: snapshot.quantidadeRealizadaDestino,
      quantidadePendenteDestino: snapshot.quantidadePendenteDestino,
      quantidadeLiberadaOrigem: snapshot.quantidadeLiberadaOrigem,
    })),
    [
      {
        setorNome: 'Preparacao',
        quantidadeRealizadaDestino: 80,
        quantidadePendenteDestino: 0,
        quantidadeLiberadaOrigem: 90,
      },
      {
        setorNome: 'Frente',
        quantidadeRealizadaDestino: 70,
        quantidadePendenteDestino: 10,
        quantidadeLiberadaOrigem: 90,
      },
      {
        setorNome: 'Costa',
        quantidadeRealizadaDestino: 50,
        quantidadePendenteDestino: 30,
        quantidadeLiberadaOrigem: 90,
      },
      {
        setorNome: 'Montagem',
        quantidadeRealizadaDestino: 35,
        quantidadePendenteDestino: 45,
        quantidadeLiberadaOrigem: 50,
      },
      {
        setorNome: 'Final',
        quantidadeRealizadaDestino: 10,
        quantidadePendenteDestino: 70,
        quantidadeLiberadaOrigem: 35,
      },
    ]
  )
})
