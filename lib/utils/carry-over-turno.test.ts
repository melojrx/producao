import assert from 'node:assert/strict'
import test from 'node:test'

const moduloCarryOverTurnoUrl = new URL('./carry-over-turno.ts', import.meta.url)
const {
  calcularQuantidadePlanejadaRemanescenteCarryOver,
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
