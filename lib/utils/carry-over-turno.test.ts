import assert from 'node:assert/strict'
import test from 'node:test'

const moduloCarryOverTurnoUrl = new URL('./carry-over-turno.ts', import.meta.url)
const {
  calcularQuantidadePlanejadaRemanescenteCarryOver,
  consolidarDemandasCarryOverComOperacoes,
  normalizarDemandasCarryOverEntreTurnos,
}: typeof import('./carry-over-turno') = await import(moduloCarryOverTurnoUrl.href)

test('calcula o saldo remanescente da OP a partir do menor realizado entre os setores', () => {
  assert.equal(
    calcularQuantidadePlanejadaRemanescenteCarryOver({
      quantidadePlanejadaOrigem: 100,
      demandasOrigem: [
        { quantidadeRealizada: 100 },
        { quantidadeRealizada: 70 },
        { quantidadeRealizada: 20 },
      ],
    }),
    80
  )

  assert.equal(
    calcularQuantidadePlanejadaRemanescenteCarryOver({
      quantidadePlanejadaOrigem: 50,
      demandasOrigem: [],
      quantidadeRealizadaFallback: 12,
    }),
    38
  )
})

test('consolida demandas de carry-over pela camada atômica quando a demanda setorial está defasada', () => {
  const demandasConsolidadas = consolidarDemandasCarryOverComOperacoes(
    [
      {
        id: 'demanda-preparacao',
        turnoOpId: 'turno-op-atomico',
        setorId: 'setor-preparacao',
        quantidadePlanejada: 1305,
        quantidadeRealizada: 0,
      },
      {
        id: 'demanda-montagem',
        turnoOpId: 'turno-op-atomico',
        setorId: 'setor-montagem',
        quantidadePlanejada: 1305,
        quantidadeRealizada: 0,
      },
    ],
    [
      {
        turnoOpId: 'turno-op-atomico',
        turnoSetorDemandaId: 'demanda-preparacao',
        setorId: 'setor-preparacao',
        quantidadeRealizada: 1305,
      },
      {
        turnoOpId: 'turno-op-atomico',
        turnoSetorDemandaId: 'demanda-preparacao',
        setorId: 'setor-preparacao',
        quantidadeRealizada: 1304,
      },
    ]
  )

  assert.deepEqual(
    demandasConsolidadas.map((demanda) => ({
      id: demanda.id,
      quantidadeRealizada: demanda.quantidadeRealizada,
    })),
    [
      {
        id: 'demanda-preparacao',
        quantidadeRealizada: 1304,
      },
      {
        id: 'demanda-montagem',
        quantidadeRealizada: 0,
      },
    ]
  )
})

test('consolida operações atômicas vinculadas e legadas do mesmo setor no carry-over', () => {
  const [demandaConsolidada] = consolidarDemandasCarryOverComOperacoes(
    [
      {
        id: 'demanda-preparacao',
        turnoOpId: 'turno-op-misto',
        setorId: 'setor-preparacao',
        quantidadePlanejada: 1305,
        quantidadeRealizada: 0,
      },
    ],
    [
      {
        turnoOpId: 'turno-op-misto',
        turnoSetorDemandaId: 'demanda-preparacao',
        setorId: 'setor-preparacao',
        quantidadeRealizada: 1305,
      },
      {
        turnoOpId: 'turno-op-misto',
        turnoSetorDemandaId: null,
        setorId: 'setor-preparacao',
        quantidadeRealizada: 1304,
      },
    ]
  )

  assert.equal(demandaConsolidada?.quantidadeRealizada, 1304)
})

test('normaliza o progresso setorial do carry-over sem reabrir setores já concluídos no saldo remanescente', () => {
  const snapshots = normalizarDemandasCarryOverEntreTurnos({
    quantidadePlanejadaDestino: 80,
    demandasOrigem: [
      {
        id: 'prep',
        turnoOpId: 'turno-op-1',
        setorId: 'setor-preparacao',
        setorCodigo: 10,
        setorNome: 'Preparação',
        quantidadePlanejada: 100,
        quantidadeRealizada: 100,
        status: 'concluida',
        iniciadoEm: '2026-04-16T08:00:00.000Z',
        encerradoEm: '2026-04-16T09:00:00.000Z',
      },
      {
        id: 'frente',
        turnoOpId: 'turno-op-1',
        setorId: 'setor-frente',
        setorCodigo: 20,
        setorNome: 'Frente',
        quantidadePlanejada: 100,
        quantidadeRealizada: 70,
        status: 'em_andamento',
        iniciadoEm: '2026-04-16T09:00:00.000Z',
        encerradoEm: null,
      },
      {
        id: 'costa',
        turnoOpId: 'turno-op-1',
        setorId: 'setor-costa',
        setorCodigo: 30,
        setorNome: 'Costa',
        quantidadePlanejada: 100,
        quantidadeRealizada: 20,
        status: 'em_andamento',
        iniciadoEm: '2026-04-16T10:00:00.000Z',
        encerradoEm: null,
      },
    ],
  })

  assert.deepEqual(
    snapshots.map((snapshot) => ({
      setorId: snapshot.setorId,
      quantidadePlanejadaDestino: snapshot.quantidadePlanejadaDestino,
      quantidadeRealizadaDestino: snapshot.quantidadeRealizadaDestino,
      quantidadePendenteDestino: snapshot.quantidadePendenteDestino,
    })),
    [
      {
        setorId: 'setor-preparacao',
        quantidadePlanejadaDestino: 80,
        quantidadeRealizadaDestino: 80,
        quantidadePendenteDestino: 0,
      },
      {
        setorId: 'setor-frente',
        quantidadePlanejadaDestino: 80,
        quantidadeRealizadaDestino: 70,
        quantidadePendenteDestino: 10,
      },
      {
        setorId: 'setor-costa',
        quantidadePlanejadaDestino: 80,
        quantidadeRealizadaDestino: 20,
        quantidadePendenteDestino: 60,
      },
    ]
  )
})

test('mantém o parcelamento setorial íntegro quando o carry-over se repete em turnos consecutivos', () => {
  const snapshotsTurnoSeguinte = normalizarDemandasCarryOverEntreTurnos({
    quantidadePlanejadaDestino: 65,
    demandasOrigem: [
      {
        id: 'prep-turno-2',
        turnoOpId: 'turno-op-2',
        setorId: 'setor-preparacao',
        setorCodigo: 10,
        setorNome: 'Preparação',
        quantidadePlanejada: 80,
        quantidadeRealizada: 80,
        status: 'concluida',
        iniciadoEm: '2026-04-17T08:00:00.000Z',
        encerradoEm: '2026-04-17T09:30:00.000Z',
      },
      {
        id: 'frente-turno-2',
        turnoOpId: 'turno-op-2',
        setorId: 'setor-frente',
        setorCodigo: 20,
        setorNome: 'Frente',
        quantidadePlanejada: 80,
        quantidadeRealizada: 50,
        status: 'em_andamento',
        iniciadoEm: '2026-04-17T09:30:00.000Z',
        encerradoEm: null,
      },
      {
        id: 'costa-turno-2',
        turnoOpId: 'turno-op-2',
        setorId: 'setor-costa',
        setorCodigo: 30,
        setorNome: 'Costa',
        quantidadePlanejada: 80,
        quantidadeRealizada: 30,
        status: 'em_andamento',
        iniciadoEm: '2026-04-17T10:30:00.000Z',
        encerradoEm: null,
      },
      {
        id: 'final-turno-2',
        turnoOpId: 'turno-op-2',
        setorId: 'setor-final',
        setorCodigo: 40,
        setorNome: 'Final',
        quantidadePlanejada: 80,
        quantidadeRealizada: 15,
        status: 'em_andamento',
        iniciadoEm: '2026-04-17T11:00:00.000Z',
        encerradoEm: null,
      },
    ],
  })

  assert.deepEqual(
    snapshotsTurnoSeguinte.map((snapshot) => ({
      setorId: snapshot.setorId,
      quantidadeRealizadaDestino: snapshot.quantidadeRealizadaDestino,
      quantidadePendenteDestino: snapshot.quantidadePendenteDestino,
    })),
    [
      {
        setorId: 'setor-preparacao',
        quantidadeRealizadaDestino: 65,
        quantidadePendenteDestino: 0,
      },
      {
        setorId: 'setor-frente',
        quantidadeRealizadaDestino: 50,
        quantidadePendenteDestino: 15,
      },
      {
        setorId: 'setor-costa',
        quantidadeRealizadaDestino: 30,
        quantidadePendenteDestino: 35,
      },
      {
        setorId: 'setor-final',
        quantidadeRealizadaDestino: 15,
        quantidadePendenteDestino: 50,
      },
    ]
  )
})

test('preserva liberação herdada quando o turno intermediário não teve apontamento novo no setor', () => {
  const snapshotsTurnoSeguinte = normalizarDemandasCarryOverEntreTurnos({
    quantidadePlanejadaDestino: 792,
    demandasOrigem: [
      {
        id: 'prep-turno-intermediario',
        turnoOpId: 'turno-op-intermediario',
        setorId: 'setor-preparacao',
        setorCodigo: 10,
        setorNome: 'Preparação',
        quantidadePlanejada: 792,
        quantidadeRealizada: 0,
        quantidadeLiberadaSetor: 291,
        status: 'encerrada_manualmente',
        iniciadoEm: null,
        encerradoEm: '2026-05-11T13:22:30.588Z',
      },
      {
        id: 'frente-turno-intermediario',
        turnoOpId: 'turno-op-intermediario',
        setorId: 'setor-frente',
        setorCodigo: 20,
        setorNome: 'Frente',
        quantidadePlanejada: 792,
        quantidadeRealizada: 0,
        quantidadeLiberadaSetor: 0,
        status: 'encerrada_manualmente',
        iniciadoEm: null,
        encerradoEm: '2026-05-11T13:22:30.588Z',
      },
      {
        id: 'costa-turno-intermediario',
        turnoOpId: 'turno-op-intermediario',
        setorId: 'setor-costa',
        setorCodigo: 30,
        setorNome: 'Costa',
        quantidadePlanejada: 792,
        quantidadeRealizada: 0,
        quantidadeLiberadaSetor: 187,
        status: 'encerrada_manualmente',
        iniciadoEm: null,
        encerradoEm: '2026-05-11T13:22:30.588Z',
      },
      {
        id: 'montagem-turno-intermediario',
        turnoOpId: 'turno-op-intermediario',
        setorId: 'setor-montagem',
        setorCodigo: 40,
        setorNome: 'Montagem',
        quantidadePlanejada: 792,
        quantidadeRealizada: 0,
        quantidadeLiberadaSetor: 0,
        status: 'encerrada_manualmente',
        iniciadoEm: null,
        encerradoEm: '2026-05-11T13:22:30.588Z',
      },
    ],
  })

  assert.deepEqual(
    snapshotsTurnoSeguinte.map((snapshot) => ({
      setorId: snapshot.setorId,
      quantidadeLiberadaDestino: snapshot.quantidadeLiberadaDestino,
    })),
    [
      {
        setorId: 'setor-preparacao',
        quantidadeLiberadaDestino: 291,
      },
      {
        setorId: 'setor-frente',
        quantidadeLiberadaDestino: 0,
      },
      {
        setorId: 'setor-costa',
        quantidadeLiberadaDestino: 187,
      },
      {
        setorId: 'setor-montagem',
        quantidadeLiberadaDestino: 0,
      },
    ]
  )
})

test('libera Montagem no carry-over quando Frente e Costa foram concluídas por operações atômicas', () => {
  const snapshots = normalizarDemandasCarryOverEntreTurnos({
    quantidadePlanejadaDestino: 1305,
    demandasOrigem: [
      {
        id: 'prep',
        turnoOpId: 'turno-op-atomico',
        setorId: 'setor-preparacao',
        setorCodigo: 10,
        setorNome: 'Preparação',
        quantidadePlanejada: 1305,
        quantidadeRealizada: 1304,
        quantidadeLiberadaSetor: 0,
        status: 'encerrada_manualmente',
        iniciadoEm: '2026-05-07T22:01:43.215Z',
        encerradoEm: '2026-05-11T13:22:30.588Z',
      },
      {
        id: 'frente',
        turnoOpId: 'turno-op-atomico',
        setorId: 'setor-frente',
        setorCodigo: 20,
        setorNome: 'Frente',
        quantidadePlanejada: 1305,
        quantidadeRealizada: 1305,
        quantidadeLiberadaSetor: 0,
        status: 'encerrada_manualmente',
        iniciadoEm: '2026-05-07T22:04:24.190Z',
        encerradoEm: '2026-05-11T13:22:30.588Z',
      },
      {
        id: 'costa',
        turnoOpId: 'turno-op-atomico',
        setorId: 'setor-costa',
        setorCodigo: 30,
        setorNome: 'Costa',
        quantidadePlanejada: 1305,
        quantidadeRealizada: 1305,
        quantidadeLiberadaSetor: 0,
        status: 'encerrada_manualmente',
        iniciadoEm: '2026-05-07T22:05:13.797Z',
        encerradoEm: '2026-05-11T13:22:30.588Z',
      },
      {
        id: 'montagem',
        turnoOpId: 'turno-op-atomico',
        setorId: 'setor-montagem',
        setorCodigo: 40,
        setorNome: 'Montagem',
        quantidadePlanejada: 1305,
        quantidadeRealizada: 0,
        quantidadeLiberadaSetor: 0,
        status: 'encerrada_manualmente',
        iniciadoEm: null,
        encerradoEm: '2026-05-11T13:22:30.588Z',
      },
    ],
  })

  const montagem = snapshots.find((snapshot) => snapshot.setorId === 'setor-montagem')

  assert.equal(montagem?.quantidadeLiberadaDestino, 1305)
  assert.equal(montagem?.quantidadeRealizadaDestino, 0)
})

test('limita o carry-over de Montagem à interseção real entre Frente e Costa', () => {
  const snapshots = normalizarDemandasCarryOverEntreTurnos({
    quantidadePlanejadaDestino: 100,
    demandasOrigem: [
      {
        id: 'prep-paralelo',
        turnoOpId: 'turno-op-paralelo',
        setorId: 'setor-preparacao',
        setorCodigo: 10,
        setorNome: 'Preparação',
        quantidadePlanejada: 100,
        quantidadeRealizada: 100,
        status: 'concluida',
        iniciadoEm: '2026-04-17T08:00:00.000Z',
        encerradoEm: '2026-04-17T09:00:00.000Z',
      },
      {
        id: 'frente-paralela',
        turnoOpId: 'turno-op-paralelo',
        setorId: 'setor-frente',
        setorCodigo: 20,
        setorNome: 'Frente',
        quantidadePlanejada: 100,
        quantidadeRealizada: 20,
        status: 'em_andamento',
        iniciadoEm: '2026-04-17T09:00:00.000Z',
        encerradoEm: null,
      },
      {
        id: 'costa-paralela',
        turnoOpId: 'turno-op-paralelo',
        setorId: 'setor-costa',
        setorCodigo: 30,
        setorNome: 'Costa',
        quantidadePlanejada: 100,
        quantidadeRealizada: 70,
        status: 'em_andamento',
        iniciadoEm: '2026-04-17T09:00:00.000Z',
        encerradoEm: null,
      },
      {
        id: 'montagem-paralela',
        turnoOpId: 'turno-op-paralelo',
        setorId: 'setor-montagem',
        setorCodigo: 40,
        setorNome: 'Montagem',
        quantidadePlanejada: 100,
        quantidadeRealizada: 30,
        status: 'em_andamento',
        iniciadoEm: '2026-04-17T10:00:00.000Z',
        encerradoEm: null,
      },
      {
        id: 'final-paralelo',
        turnoOpId: 'turno-op-paralelo',
        setorId: 'setor-final',
        setorCodigo: 50,
        setorNome: 'Final',
        quantidadePlanejada: 100,
        quantidadeRealizada: 0,
        status: 'planejada',
        iniciadoEm: null,
        encerradoEm: null,
      },
    ],
  })

  assert.deepEqual(
    snapshots.map((snapshot) => ({
      setorId: snapshot.setorId,
      quantidadeRealizadaDestino: snapshot.quantidadeRealizadaDestino,
      quantidadeLiberadaOrigem: snapshot.quantidadeLiberadaOrigem,
    })),
    [
      {
        setorId: 'setor-preparacao',
        quantidadeRealizadaDestino: 100,
        quantidadeLiberadaOrigem: 100,
      },
      {
        setorId: 'setor-frente',
        quantidadeRealizadaDestino: 20,
        quantidadeLiberadaOrigem: 100,
      },
      {
        setorId: 'setor-costa',
        quantidadeRealizadaDestino: 70,
        quantidadeLiberadaOrigem: 100,
      },
      {
        setorId: 'setor-montagem',
        quantidadeRealizadaDestino: 20,
        quantidadeLiberadaOrigem: 20,
      },
      {
        setorId: 'setor-final',
        quantidadeRealizadaDestino: 0,
        quantidadeLiberadaOrigem: 30,
      },
    ]
  )
})
