import test from 'node:test'
import assert from 'node:assert/strict'

const moduloFluxoSequencialUrl = new URL('./fluxo-sequencial-turno.ts', import.meta.url)
const {
  calcularQuantidadeDisponivelApontamento,
  criarSnapshotParcelamentoDemandaTurno,
  enriquecerDemandasComFluxoSequencial,
}: typeof import('./fluxo-sequencial-turno') = await import(moduloFluxoSequencialUrl.href)

test('calcula a quantidade disponível com base no setor anterior concluído', () => {
  assert.equal(calcularQuantidadeDisponivelApontamento(100, 15, 40), 25)
  assert.equal(calcularQuantidadeDisponivelApontamento(100, 15, 10), 0)
  assert.equal(calcularQuantidadeDisponivelApontamento(100, 15, null), 85)
})

test('cria snapshot explícito de backlog, aceite e excedente da demanda no turno', () => {
  assert.deepEqual(
    criarSnapshotParcelamentoDemandaTurno({
      quantidadePlanejada: 100,
      quantidadeRealizadaAtual: 10,
      quantidadeDisponivelApontamento: 30,
    }),
    {
      quantidadeBacklogSetor: 90,
      quantidadeAceitaTurno: 30,
      quantidadeExcedenteTurno: 60,
    }
  )
})

test('enriquece demandas com liberação sequencial, bloqueio e fila por setor', () => {
  const demandas = enriquecerDemandasComFluxoSequencial([
    {
      id: 'prep-op-a',
      turnoOpId: 'turno-op-a',
      setorId: 'setor-preparacao',
      setorCodigo: 10,
      setorNome: 'Preparação',
      quantidadePlanejada: 100,
      quantidadeRealizada: 40,
      status: 'em_andamento',
      iniciadoEm: '2026-04-16T08:00:00.000Z',
      encerradoEm: null,
    },
    {
      id: 'frente-op-a',
      turnoOpId: 'turno-op-a',
      setorId: 'setor-frente',
      setorCodigo: 20,
      setorNome: 'Frente',
      quantidadePlanejada: 100,
      quantidadeRealizada: 10,
      status: 'em_andamento',
      iniciadoEm: '2026-04-16T09:00:00.000Z',
      encerradoEm: null,
    },
    {
      id: 'costa-op-a',
      turnoOpId: 'turno-op-a',
      setorId: 'setor-costa',
      setorCodigo: 30,
      setorNome: 'Costa',
      quantidadePlanejada: 100,
      quantidadeRealizada: 0,
      status: 'planejada',
      iniciadoEm: null,
      encerradoEm: null,
    },
    {
      id: 'prep-op-b',
      turnoOpId: 'turno-op-b',
      setorId: 'setor-preparacao',
      setorCodigo: 10,
      setorNome: 'Preparação',
      quantidadePlanejada: 100,
      quantidadeRealizada: 0,
      status: 'planejada',
      iniciadoEm: null,
      encerradoEm: null,
    },
    {
      id: 'frente-op-b',
      turnoOpId: 'turno-op-b',
      setorId: 'setor-frente',
      setorCodigo: 20,
      setorNome: 'Frente',
      quantidadePlanejada: 100,
      quantidadeRealizada: 0,
      status: 'planejada',
      iniciadoEm: null,
      encerradoEm: null,
    },
  ])

  const frenteOpA = demandas.find((demanda) => demanda.id === 'frente-op-a')
  const frenteOpB = demandas.find((demanda) => demanda.id === 'frente-op-b')
  const costaOpA = demandas.find((demanda) => demanda.id === 'costa-op-a')

  assert.deepEqual(frenteOpA, {
    id: 'frente-op-a',
    turnoOpId: 'turno-op-a',
    setorId: 'setor-frente',
    setorCodigo: 20,
    setorNome: 'Frente',
    quantidadePlanejada: 100,
    quantidadeRealizada: 10,
    status: 'em_andamento',
    iniciadoEm: '2026-04-16T09:00:00.000Z',
    encerradoEm: null,
    posicaoFila: 1,
    statusFila: 'parcial',
    quantidadeBacklogSetor: 90,
    quantidadeAceitaTurno: 30,
    quantidadeExcedenteTurno: 60,
    quantidadePendenteSetor: 90,
    quantidadeLiberadaSetor: 40,
    quantidadeDisponivelApontamento: 30,
    quantidadeBloqueadaAnterior: 60,
    setorAnteriorId: 'setor-preparacao',
    setorAnteriorCodigo: 10,
    setorAnteriorNome: 'Preparação',
  })

  assert.deepEqual(frenteOpB, {
    id: 'frente-op-b',
    turnoOpId: 'turno-op-b',
    setorId: 'setor-frente',
    setorCodigo: 20,
    setorNome: 'Frente',
    quantidadePlanejada: 100,
    quantidadeRealizada: 0,
    status: 'planejada',
    iniciadoEm: null,
    encerradoEm: null,
    posicaoFila: 2,
    statusFila: 'em_fila',
    quantidadeBacklogSetor: 100,
    quantidadeAceitaTurno: 0,
    quantidadeExcedenteTurno: 100,
    quantidadePendenteSetor: 100,
    quantidadeLiberadaSetor: 0,
    quantidadeDisponivelApontamento: 0,
    quantidadeBloqueadaAnterior: 100,
    setorAnteriorId: 'setor-preparacao',
    setorAnteriorCodigo: 10,
    setorAnteriorNome: 'Preparação',
  })

  assert.deepEqual(costaOpA, {
    id: 'costa-op-a',
    turnoOpId: 'turno-op-a',
    setorId: 'setor-costa',
    setorCodigo: 30,
    setorNome: 'Costa',
    quantidadePlanejada: 100,
    quantidadeRealizada: 0,
    status: 'planejada',
    iniciadoEm: null,
    encerradoEm: null,
    posicaoFila: 1,
    statusFila: 'liberada',
    quantidadeBacklogSetor: 100,
    quantidadeAceitaTurno: 10,
    quantidadeExcedenteTurno: 90,
    quantidadePendenteSetor: 100,
    quantidadeLiberadaSetor: 10,
    quantidadeDisponivelApontamento: 10,
    quantidadeBloqueadaAnterior: 90,
    setorAnteriorId: 'setor-frente',
    setorAnteriorCodigo: 20,
    setorAnteriorNome: 'Frente',
  })
})
