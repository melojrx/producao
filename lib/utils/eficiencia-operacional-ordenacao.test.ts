import assert from 'node:assert/strict'
import test from 'node:test'
import type {
  EficienciaOperacionalDiaRegistroV2,
  EficienciaOperacionalHoraRegistroV2,
  EficienciaOperacionalOperacaoRegistroV2,
} from '@/types'

const moduloOrdenacaoUrl = new URL('./eficiencia-operacional-ordenacao.ts', import.meta.url)
const {
  ordenarEficienciaOperacionalPorDia,
  ordenarEficienciaOperacionalPorHora,
  ordenarEficienciaOperacionalPorOperacao,
}: typeof import('./eficiencia-operacional-ordenacao') = await import(moduloOrdenacaoUrl.href)

test('ordena eficiencia por hora pela coluna escolhida sem alterar a lista original', () => {
  const registros: EficienciaOperacionalHoraRegistroV2[] = [
    {
      turnoId: 'turno-1',
      hora: '2026-05-07T10:00:00',
      operadorId: 'operador-1',
      operadorNome: 'Bruna',
      operadorMatricula: '002',
      totalOperacoes: 2,
      quantidadeRealizada: 20,
      minutosPadraoRealizados: 30,
      eficienciaPct: 50,
    },
    {
      turnoId: 'turno-1',
      hora: '2026-05-07T09:00:00',
      operadorId: 'operador-2',
      operadorNome: 'Ana',
      operadorMatricula: '001',
      totalOperacoes: 1,
      quantidadeRealizada: 35,
      minutosPadraoRealizados: 42,
      eficienciaPct: 70,
    },
  ]

  const ordenado = ordenarEficienciaOperacionalPorHora(registros, {
    field: 'operadorNome',
    direction: 'asc',
  })

  assert.deepEqual(
    ordenado.map((registro) => registro.operadorNome),
    ['Ana', 'Bruna']
  )
  assert.deepEqual(
    registros.map((registro) => registro.operadorNome),
    ['Bruna', 'Ana']
  )
})

test('ordena eficiencia do dia por operador por eficiencia descendente', () => {
  const registros: EficienciaOperacionalDiaRegistroV2[] = [
    {
      turnoId: 'turno-1',
      data: '2026-05-07',
      operadorId: 'operador-1',
      operadorNome: 'Ana',
      operadorMatricula: '001',
      minutosTurno: 540,
      quantidadeRealizada: 40,
      minutosPadraoRealizados: 120,
      eficienciaPct: 22.22,
    },
    {
      turnoId: 'turno-1',
      data: '2026-05-07',
      operadorId: 'operador-2',
      operadorNome: 'Bruna',
      operadorMatricula: '002',
      minutosTurno: 540,
      quantidadeRealizada: 30,
      minutosPadraoRealizados: 240,
      eficienciaPct: 44.44,
    },
  ]

  const ordenado = ordenarEficienciaOperacionalPorDia(registros, {
    field: 'eficienciaPct',
    direction: 'desc',
  })

  assert.deepEqual(
    ordenado.map((registro) => registro.operadorNome),
    ['Bruna', 'Ana']
  )
})

test('ordena eficiencia por operacao por codigo da operacao e quantidade realizada', () => {
  const registros: EficienciaOperacionalOperacaoRegistroV2[] = [
    {
      turnoId: 'turno-1',
      hora: '2026-05-07T09:00:00',
      operadorId: 'operador-1',
      operadorNome: 'Ana',
      operadorMatricula: '001',
      operacaoId: 'operacao-2',
      operacaoCodigo: 'P200',
      operacaoDescricao: 'Pregar bolso',
      tempoPadraoMinSnapshot: 0.5,
      metaHora: 120,
      quantidadeRealizada: 25,
      minutosPadraoRealizados: 12.5,
      eficienciaPct: 20.83,
    },
    {
      turnoId: 'turno-1',
      hora: '2026-05-07T10:00:00',
      operadorId: 'operador-2',
      operadorNome: 'Bruna',
      operadorMatricula: '002',
      operacaoId: 'operacao-1',
      operacaoCodigo: 'P100',
      operacaoDescricao: 'Fechar lateral',
      tempoPadraoMinSnapshot: 0.75,
      metaHora: 80,
      quantidadeRealizada: 45,
      minutosPadraoRealizados: 33.75,
      eficienciaPct: 56.25,
    },
  ]

  assert.deepEqual(
    ordenarEficienciaOperacionalPorOperacao(registros, {
      field: 'operacaoCodigo',
      direction: 'asc',
    }).map((registro) => registro.operacaoCodigo),
    ['P100', 'P200']
  )

  assert.deepEqual(
    ordenarEficienciaOperacionalPorOperacao(registros, {
      field: 'quantidadeRealizada',
      direction: 'desc',
    }).map((registro) => registro.quantidadeRealizada),
    [45, 25]
  )
})
