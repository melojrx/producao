import test from 'node:test'
import assert from 'node:assert/strict'

import type { TurnoSetorOperacaoApontamentoV2 } from '../../types/index.ts'
import type {
  OperadorEficienciaOperacionalConsolidavel,
  RegistroEficienciaOperacionalConsolidavel,
  TurnoEficienciaOperacionalConsolidavel,
} from './eficiencia-operacional-turno-base'

const moduloEficienciaUrl = new URL('./eficiencia-operacional-turno-base.ts', import.meta.url)
const {
  consolidarResumoEficienciaOperacionalTurno,
}: typeof import('./eficiencia-operacional-turno-base') = await import(moduloEficienciaUrl.href)

test('consolida a hora do operador sem perder o detalhamento por operacao na mesma hora', () => {
  const turno: TurnoEficienciaOperacionalConsolidavel = {
    id: 'turno-1',
    iniciadoEm: '2026-04-03T08:00:00-03:00',
    minutosTurno: 120,
  }

  const operacoesTurno: TurnoSetorOperacaoApontamentoV2[] = [
    {
      id: 'tso-1',
      turnoId: 'turno-1',
      turnoOpId: 'top-1',
      turnoSetorOpId: 'secao-1',
      turnoSetorId: 'setor-1',
      turnoSetorDemandaId: 'demanda-1',
      produtoOperacaoId: 'po-1',
      operacaoId: 'op-a',
      setorId: 'setor-a',
      sequencia: 1,
      tempoPadraoMinSnapshot: 0.5,
      quantidadePlanejada: 100,
      quantidadeRealizada: 80,
      status: 'em_andamento',
      iniciadoEm: null,
      encerradoEm: null,
      operacaoCodigo: 'OP-A',
      operacaoDescricao: 'Costura A',
      maquinaCodigo: 'MAQ-001',
      maquinaModelo: 'Reta 1 agulha',
    },
    {
      id: 'tso-2',
      turnoId: 'turno-1',
      turnoOpId: 'top-1',
      turnoSetorOpId: 'secao-1',
      turnoSetorId: 'setor-1',
      turnoSetorDemandaId: 'demanda-1',
      produtoOperacaoId: 'po-2',
      operacaoId: 'op-b',
      setorId: 'setor-a',
      sequencia: 2,
      tempoPadraoMinSnapshot: 1,
      quantidadePlanejada: 100,
      quantidadeRealizada: 20,
      status: 'em_andamento',
      iniciadoEm: null,
      encerradoEm: null,
      operacaoCodigo: 'OP-B',
      operacaoDescricao: 'Costura B',
      maquinaCodigo: 'MAQ-001',
      maquinaModelo: 'Reta 1 agulha',
    },
  ]

  const registros: RegistroEficienciaOperacionalConsolidavel[] = [
    {
      horaRegistro: '2026-04-03T08:10:00-03:00',
      quantidade: 50,
      operadorId: 'operador-1',
      turnoSetorOperacaoId: 'tso-1',
    },
    {
      horaRegistro: '2026-04-03T08:20:00-03:00',
      quantidade: 30,
      operadorId: 'operador-1',
      turnoSetorOperacaoId: 'tso-1',
    },
    {
      horaRegistro: '2026-04-03T08:35:00-03:00',
      quantidade: 20,
      operadorId: 'operador-1',
      turnoSetorOperacaoId: 'tso-2',
    },
  ]

  const operadores: OperadorEficienciaOperacionalConsolidavel[] = [
    {
      id: 'operador-1',
      nome: 'Maria',
      matricula: '001',
    },
  ]

  const resumo = consolidarResumoEficienciaOperacionalTurno(
    turno,
    operacoesTurno,
    registros,
    operadores
  )

  assert.equal(resumo.porHora.length, 1)
  assert.deepEqual(
    resumo.porHora.map((registro) => ({
      hora: registro.hora,
      operadorId: registro.operadorId,
      totalOperacoes: registro.totalOperacoes,
      quantidadeRealizada: registro.quantidadeRealizada,
      minutosPadraoRealizados: registro.minutosPadraoRealizados,
      eficienciaPct: registro.eficienciaPct,
    })),
    [
      {
        hora: '2026-04-03T08:00:00',
        operadorId: 'operador-1',
        totalOperacoes: 2,
        quantidadeRealizada: 100,
        minutosPadraoRealizados: 60,
        eficienciaPct: 100,
      },
    ]
  )

  assert.equal(resumo.porOperacao.length, 2)
  assert.deepEqual(
    resumo.porOperacao.map((registro) => ({
      hora: registro.hora,
      operacaoId: registro.operacaoId,
      quantidadeRealizada: registro.quantidadeRealizada,
      minutosPadraoRealizados: registro.minutosPadraoRealizados,
      eficienciaPct: registro.eficienciaPct,
    })),
    [
      {
        hora: '2026-04-03T08:00:00',
        operacaoId: 'op-a',
        quantidadeRealizada: 80,
        minutosPadraoRealizados: 40,
        eficienciaPct: 66.67,
      },
      {
        hora: '2026-04-03T08:00:00',
        operacaoId: 'op-b',
        quantidadeRealizada: 20,
        minutosPadraoRealizados: 20,
        eficienciaPct: 33.33,
      },
    ]
  )

  assert.equal(resumo.porDia.length, 1)
  assert.deepEqual(resumo.porDia[0], {
    turnoId: 'turno-1',
    data: '2026-04-03',
    operadorId: 'operador-1',
    operadorNome: 'Maria',
    operadorMatricula: '001',
    minutosTurno: 120,
    quantidadeRealizada: 100,
    minutosPadraoRealizados: 60,
    eficienciaPct: 50,
  })
})
