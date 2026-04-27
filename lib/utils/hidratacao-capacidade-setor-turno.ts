import { calcularDimensionamentoPessoasPorSetor } from './dimensionamento-pessoas-setor.ts'
import { calcularMetaGrupoTurnoV2 } from './meta-grupo-turno.ts'
import { calcularSaldoManualPermitido } from './apontamento-supervisor.ts'
import type {
  TurnoOpV2,
  TurnoSetorDemandaV2,
  TurnoSetorOpV2,
  TurnoSetorOperacaoApontamentoV2,
  TurnoSetorV2,
  TurnoV2,
} from '@/types'

const ORDEM_DECIMAL_PT_BR = 1000

function normalizarNumeroPositivo(valor: number): number {
  return Number.isFinite(valor) && valor > 0 ? valor : 0
}

function arredondarNumero(valor: number): number {
  return Math.round(valor * ORDEM_DECIMAL_PT_BR) / ORDEM_DECIMAL_PT_BR
}

function mapearOperacoesPorDemanda(
  demanda: Pick<TurnoSetorDemandaV2, 'id' | 'turnoSetorOpLegacyId'>,
  operacoesSecao: TurnoSetorOperacaoApontamentoV2[]
): TurnoSetorOperacaoApontamentoV2[] {
  return operacoesSecao.filter((operacao) => {
    if (operacao.turnoSetorDemandaId === demanda.id) {
      return true
    }

    return (
      !operacao.turnoSetorDemandaId &&
      demanda.turnoSetorOpLegacyId !== null &&
      operacao.turnoSetorOpId === demanda.turnoSetorOpLegacyId
    )
  })
}

function calcularTpTotalSetorProduto(
  demanda: TurnoSetorDemandaV2,
  operacoesSecao: TurnoSetorOperacaoApontamentoV2[]
): number {
  const tpTotal = mapearOperacoesPorDemanda(demanda, operacoesSecao).reduce(
    (soma, operacao) => soma + normalizarNumeroPositivo(operacao.tempoPadraoMinSnapshot),
    0
  )

  return arredondarNumero(tpTotal)
}

function calcularQuantidadeConcluidaDemanda(demanda: TurnoSetorDemandaV2): number {
  return normalizarNumeroPositivo(demanda.quantidadeConcluida ?? demanda.quantidadeRealizada)
}

function calcularQuantidadeConcluidaDemandaNoTurnoAtual(
  demanda: TurnoSetorDemandaV2,
  operacoesSecao: TurnoSetorOperacaoApontamentoV2[],
  quantidadeRealizadaAtualPorOperacaoId?: ReadonlyMap<string, number>
): number {
  if (!quantidadeRealizadaAtualPorOperacaoId) {
    return calcularQuantidadeConcluidaDemanda(demanda)
  }

  const operacoesDaDemanda = mapearOperacoesPorDemanda(demanda, operacoesSecao)

  if (operacoesDaDemanda.length === 0) {
    return 0
  }

  return Math.min(
    normalizarNumeroPositivo(demanda.quantidadePlanejada),
    ...operacoesDaDemanda.map((operacao) =>
      normalizarNumeroPositivo(quantidadeRealizadaAtualPorOperacaoId.get(operacao.id) ?? 0)
    )
  )
}

function mapearDemandasPorOp(
  demandasSetor: TurnoSetorDemandaV2[],
): Map<string, TurnoSetorDemandaV2[]> {
  const demandasPorOp = new Map<string, TurnoSetorDemandaV2[]>()

  for (const demanda of demandasSetor) {
    const demandasAtual = demandasPorOp.get(demanda.turnoOpId) ?? []
    demandasAtual.push(demanda)
    demandasPorOp.set(demanda.turnoOpId, demandasAtual)
  }

  return demandasPorOp
}

function mapearOpsParaDimensionamento(
  ops: TurnoOpV2[],
  demandasSetor: TurnoSetorDemandaV2[],
  operacoesSecao: TurnoSetorOperacaoApontamentoV2[],
  quantidadeConsiderada: (demanda: TurnoSetorDemandaV2) => number
) {
  const demandasPorOp = mapearDemandasPorOp(demandasSetor)

  return ops.map((op) => ({
    numeroOp: op.numeroOp,
    produtoId: op.produtoId,
    produtoNome: op.produtoNome,
    produtoReferencia: op.produtoReferencia,
    quantidadePlanejada: op.quantidadePlanejada,
    roteiro: [],
    cargasSetoriais: (demandasPorOp.get(op.id) ?? [])
      .map((demanda) => ({
        setorId: demanda.setorId,
        setorCodigo: demanda.setorCodigo,
        setorNome: demanda.setorNome,
        quantidadePendente: quantidadeConsiderada(demanda),
        tpTotalSetorProduto: calcularTpTotalSetorProduto(demanda, operacoesSecao),
      }))
      .filter(
        (cargaSetorial) =>
          cargaSetorial.quantidadePendente > 0 && cargaSetorial.tpTotalSetorProduto > 0
      ),
  }))
}

function mapearDemandasAtivasPorSetor(
  demandasSetor: TurnoSetorDemandaV2[]
): Map<string, TurnoSetorDemandaV2[]> {
  const demandasPorSetor = new Map<string, TurnoSetorDemandaV2[]>()

  for (const demanda of demandasSetor) {
    const demandasAtual = demandasPorSetor.get(demanda.setorId) ?? []
    demandasAtual.push(demanda)
    demandasPorSetor.set(demanda.setorId, demandasAtual)
  }

  for (const demandas of demandasPorSetor.values()) {
    demandas.sort((primeira, segunda) => {
      const primeiraPosicao = primeira.posicaoFila ?? Number.MAX_SAFE_INTEGER
      const segundaPosicao = segunda.posicaoFila ?? Number.MAX_SAFE_INTEGER

      if (primeiraPosicao !== segundaPosicao) {
        return primeiraPosicao - segundaPosicao
      }

      if (primeira.turnoOpId !== segunda.turnoOpId) {
        return primeira.turnoOpId.localeCompare(segunda.turnoOpId)
      }

      return primeira.id.localeCompare(segunda.id)
    })
  }

  return demandasPorSetor
}

function demandaTemTrabalhoEmCurso(demanda: TurnoSetorDemandaV2): boolean {
  return demanda.statusFila === 'em_producao' || demanda.statusFila === 'parcial'
}

function calcularBacklogDemanda(demanda: TurnoSetorDemandaV2): number {
  return (
    demanda.quantidadeBacklogSetor ??
    demanda.quantidadePendenteSetor ??
    Math.max(demanda.quantidadePlanejada - demanda.quantidadeConcluida, 0)
  )
}

function calcularElegivelFluxoDemanda(demanda: TurnoSetorDemandaV2): number {
  if (typeof demanda.quantidadeDisponivelApontamento === 'number') {
    return demanda.quantidadeDisponivelApontamento
  }

  if (typeof demanda.quantidadeAceitaTurno === 'number') {
    return demanda.quantidadeAceitaTurno
  }

  return calcularBacklogDemanda(demanda)
}

function calcularDisponibilidadeExecucaoDemanda(demanda: TurnoSetorDemandaV2): number {
  if (typeof demanda.quantidadeDisponivelApontamento === 'number') {
    return demanda.quantidadeDisponivelApontamento
  }

  if (typeof demanda.quantidadeLiberadaSetor === 'number') {
    return demanda.quantidadeLiberadaSetor
  }

  if (typeof demanda.quantidadeAceitaTurno === 'number') {
    return demanda.quantidadeAceitaTurno
  }

  return calcularBacklogDemanda(demanda)
}

function limitarDisponibilidadeAoAceiteTurno(
  quantidadeDisponivelApontamento: number,
  quantidadeAceitaTurno: number
): number {
  return Math.min(
    normalizarNumeroPositivo(quantidadeDisponivelApontamento),
    normalizarNumeroPositivo(quantidadeAceitaTurno)
  )
}

function calcularSaldoAceitoDisponivelHoje(
  quantidadeAceitaAcumuladaSetor: number,
  quantidadeConcluidaDemandaNoTurnoAtual: number
): number {
  return Math.max(
    normalizarNumeroPositivo(quantidadeAceitaAcumuladaSetor) -
      normalizarNumeroPositivo(quantidadeConcluidaDemandaNoTurnoAtual),
    0
  )
}

function calcularCapacidadeGlobalTurnoPecas(input: {
  turno: Pick<TurnoV2, 'operadoresDisponiveis' | 'minutosTurno' | 'capacidadeGlobalTurnoPecas'>
  ops: TurnoOpV2[]
}): number {
  if (typeof input.turno.capacidadeGlobalTurnoPecas === 'number') {
    return Math.max(Math.floor(input.turno.capacidadeGlobalTurnoPecas), 0)
  }

  return calcularMetaGrupoTurnoV2(input.turno, input.ops).capacidadeGlobalTurnoPecas
}

function criarMapaTpTotalPorDemanda(
  demandasSetor: TurnoSetorDemandaV2[],
  operacoesSecao: TurnoSetorOperacaoApontamentoV2[]
): Map<string, number> {
  return new Map(
    demandasSetor.map((demanda) => [demanda.id, calcularTpTotalSetorProduto(demanda, operacoesSecao)] as const)
  )
}

function calcularQuantidadeEntradaAcumuladaSetor(input: {
  demanda: TurnoSetorDemandaV2
  quantidadeConcluidaDemandaNoTurnoAtual: number
}): number {
  if (typeof input.demanda.quantidadeEntradaAcumuladaSetor === 'number') {
    return normalizarNumeroPositivo(input.demanda.quantidadeEntradaAcumuladaSetor)
  }

  if (typeof input.demanda.quantidadeLiberadaSetor === 'number') {
    return normalizarNumeroPositivo(input.demanda.quantidadeLiberadaSetor)
  }

  return (
    calcularDisponibilidadeExecucaoDemanda(input.demanda) +
    normalizarNumeroPositivo(input.quantidadeConcluidaDemandaNoTurnoAtual)
  )
}

export function aplicarCapacidadeOperacionalDemandas(input: {
  turno: Pick<TurnoV2, 'operadoresDisponiveis' | 'minutosTurno' | 'capacidadeGlobalTurnoPecas'>
  demandasSetor: TurnoSetorDemandaV2[]
  operacoesSecao: TurnoSetorOperacaoApontamentoV2[]
  ops: TurnoOpV2[]
  quantidadeRealizadaAtualPorOperacaoId?: ReadonlyMap<string, number>
}): TurnoSetorDemandaV2[] {
  if (input.demandasSetor.length === 0) {
    return []
  }

  const capacidadeGlobalTurnoPecas = calcularCapacidadeGlobalTurnoPecas({
    turno: input.turno,
    ops: input.ops,
  })
  const tpTotalPorDemanda = criarMapaTpTotalPorDemanda(input.demandasSetor, input.operacoesSecao)
  const demandasPorSetor = mapearDemandasAtivasPorSetor(input.demandasSetor)
  const snapshotsPorDemandaId = new Map<
    string,
    {
      quantidadeAceitaTurno: number
      quantidadeExcedenteTurno: number
      quantidadeDisponivelApontamento: number
      quantidadeEntradaAcumuladaSetor: number
      quantidadeAceitaAcumuladaSetor: number
      quantidadeConcluidaDemandaNoTurnoAtual: number
      saldoManualPermitido: number
    }
  >()

  for (const [setorId, demandasSetor] of demandasPorSetor.entries()) {
    let planoRestanteSetorPecas = capacidadeGlobalTurnoPecas

    for (const demanda of demandasSetor) {
      const tpTotalSetorProduto = tpTotalPorDemanda.get(demanda.id) ?? 0
      const backlog = calcularBacklogDemanda(demanda)
      const elegivelFluxo = calcularElegivelFluxoDemanda(demanda)
      const quantidadeConcluidaDemanda = calcularQuantidadeConcluidaDemandaNoTurnoAtual(
        demanda,
        input.operacoesSecao,
        input.quantidadeRealizadaAtualPorOperacaoId
      )
      const quantidadeEntradaAcumuladaSetor = calcularQuantidadeEntradaAcumuladaSetor({
        demanda,
        quantidadeConcluidaDemandaNoTurnoAtual: quantidadeConcluidaDemanda,
      })

      if (
        tpTotalSetorProduto <= 0 ||
        quantidadeEntradaAcumuladaSetor <= 0 ||
        planoRestanteSetorPecas <= 0
      ) {
        snapshotsPorDemandaId.set(demanda.id, {
          quantidadeAceitaTurno: 0,
          quantidadeExcedenteTurno: backlog,
          quantidadeDisponivelApontamento: 0,
          quantidadeEntradaAcumuladaSetor,
          quantidadeAceitaAcumuladaSetor: quantidadeConcluidaDemanda,
          quantidadeConcluidaDemandaNoTurnoAtual: quantidadeConcluidaDemanda,
          saldoManualPermitido: 0,
        })
        continue
      }

      const quantidadeAceitaAcumuladaSetor = Math.min(
        quantidadeEntradaAcumuladaSetor,
        planoRestanteSetorPecas
      )
      const quantidadeAceitaTurno = calcularSaldoAceitoDisponivelHoje(
        quantidadeAceitaAcumuladaSetor,
        quantidadeConcluidaDemanda
      )

      planoRestanteSetorPecas = Math.max(
        planoRestanteSetorPecas - quantidadeAceitaAcumuladaSetor,
        0
      )

      snapshotsPorDemandaId.set(demanda.id, {
        quantidadeAceitaTurno,
        quantidadeExcedenteTurno: Math.max(backlog - quantidadeAceitaAcumuladaSetor, 0),
        quantidadeDisponivelApontamento: 0,
        quantidadeEntradaAcumuladaSetor,
        quantidadeAceitaAcumuladaSetor,
        quantidadeConcluidaDemandaNoTurnoAtual: quantidadeConcluidaDemanda,
        saldoManualPermitido: 0,
      })
    }

    const demandaComTrabalhoEmCurso =
      demandasSetor.find((demanda) => {
        const snapshot = snapshotsPorDemandaId.get(demanda.id)
        return (
          Boolean(snapshot) &&
          normalizarNumeroPositivo(snapshot?.quantidadeAceitaTurno ?? 0) > 0 &&
          demandaTemTrabalhoEmCurso(demanda)
        )
      }) ?? null
    const demandaPrioritaria =
      demandaComTrabalhoEmCurso ??
      demandasSetor.find((demanda) => {
        const snapshot = snapshotsPorDemandaId.get(demanda.id)
        return normalizarNumeroPositivo(snapshot?.quantidadeAceitaTurno ?? 0) > 0
      }) ??
      null

    if (demandaPrioritaria) {
      const snapshotPrioritario = snapshotsPorDemandaId.get(demandaPrioritaria.id)

      if (snapshotPrioritario) {
        snapshotsPorDemandaId.set(demandaPrioritaria.id, {
          ...snapshotPrioritario,
          quantidadeDisponivelApontamento: limitarDisponibilidadeAoAceiteTurno(
            calcularDisponibilidadeExecucaoDemanda(demandaPrioritaria),
            calcularSaldoAceitoDisponivelHoje(
              snapshotPrioritario.quantidadeAceitaAcumuladaSetor,
              snapshotPrioritario.quantidadeConcluidaDemandaNoTurnoAtual
            )
          ),
        })
      }
    }

    const planoDoDiaSetor = demandasSetor.reduce((soma, demanda) => {
      const snapshot = snapshotsPorDemandaId.get(demanda.id)
      return soma + normalizarNumeroPositivo(snapshot?.quantidadeAceitaAcumuladaSetor ?? 0)
    }, 0)
    const quantidadeConcluidaTotalSetor = demandasSetor.reduce((soma, demanda) => {
      const snapshot = snapshotsPorDemandaId.get(demanda.id)
      return soma + normalizarNumeroPositivo(snapshot?.quantidadeConcluidaDemandaNoTurnoAtual ?? 0)
    }, 0)

    for (const demanda of demandasSetor) {
      const snapshot = snapshotsPorDemandaId.get(demanda.id)

      if (!snapshot) {
        continue
      }

      snapshotsPorDemandaId.set(demanda.id, {
        ...snapshot,
        saldoManualPermitido: calcularSaldoManualPermitido({
          quantidadeAceitaAcumuladaSetor: snapshot.quantidadeAceitaAcumuladaSetor,
          quantidadeConcluidaNoSetor: snapshot.quantidadeConcluidaDemandaNoTurnoAtual,
          planoDoDiaSetor,
          quantidadeConcluidaTotalSetor,
        }),
      })
    }
  }

  return input.demandasSetor.map((demanda) => {
    const snapshot = snapshotsPorDemandaId.get(demanda.id)

    if (!snapshot) {
      return {
        ...demanda,
        quantidadeAceitaTurno: 0,
        quantidadeExcedenteTurno: calcularBacklogDemanda(demanda),
        quantidadeEntradaAcumuladaSetor:
          demanda.quantidadeEntradaAcumuladaSetor ??
          demanda.quantidadeLiberadaSetor ??
          calcularElegivelFluxoDemanda(demanda) + calcularQuantidadeConcluidaDemanda(demanda),
        quantidadeAceitaAcumuladaSetor: calcularQuantidadeConcluidaDemanda(demanda),
        quantidadeDisponivelApontamento: 0,
        saldoManualPermitido: 0,
      }
    }

    return {
      ...demanda,
      quantidadeAceitaTurno: snapshot.quantidadeAceitaTurno,
      quantidadeExcedenteTurno: snapshot.quantidadeExcedenteTurno,
      quantidadeEntradaAcumuladaSetor: snapshot.quantidadeEntradaAcumuladaSetor,
      quantidadeAceitaAcumuladaSetor: snapshot.quantidadeAceitaAcumuladaSetor,
      quantidadeDisponivelApontamento: snapshot.quantidadeDisponivelApontamento,
      saldoManualPermitido: snapshot.saldoManualPermitido,
    }
  })
}

function calcularQuantidadePlanejadaExibicao(
  quantidadePlanejadaOriginal: number,
  quantidadeRealizada: number,
  quantidadeAceitaTurno?: number
): number {
  return Math.min(
    quantidadePlanejadaOriginal,
    quantidadeRealizada + Math.max(quantidadeAceitaTurno ?? 0, 0)
  )
}

export function limitarOperacoesTurnoAoAceiteDemandas(input: {
  operacoesSecao: TurnoSetorOperacaoApontamentoV2[]
  demandasSetor: Array<
    Pick<TurnoSetorDemandaV2, 'id' | 'turnoSetorOpLegacyId' | 'quantidadeAceitaTurno'>
  >
}): TurnoSetorOperacaoApontamentoV2[] {
  const demandasPorId = new Map(input.demandasSetor.map((demanda) => [demanda.id, demanda]))
  const demandasPorSecaoLegacy = new Map(
    input.demandasSetor
      .filter((demanda) => demanda.turnoSetorOpLegacyId)
      .map((demanda) => [demanda.turnoSetorOpLegacyId as string, demanda] as const)
  )

  return input.operacoesSecao.map((operacao) => {
    const demanda =
      (operacao.turnoSetorDemandaId
        ? demandasPorId.get(operacao.turnoSetorDemandaId) ?? null
        : demandasPorSecaoLegacy.get(operacao.turnoSetorOpId) ?? null) ?? null

    if (!demanda) {
      return operacao
    }

    return {
      ...operacao,
      quantidadePlanejada: calcularQuantidadePlanejadaExibicao(
        operacao.quantidadePlanejada,
        operacao.quantidadeRealizada,
        demanda.quantidadeAceitaTurno
      ),
    }
  })
}

export function limitarSecoesTurnoAoAceiteDemandas(input: {
  secoesSetorOp: TurnoSetorOpV2[]
  demandasSetor: Array<Pick<TurnoSetorDemandaV2, 'turnoSetorOpLegacyId' | 'quantidadeAceitaTurno'>>
}): TurnoSetorOpV2[] {
  const demandasPorSecaoLegacy = new Map(
    input.demandasSetor
      .filter((demanda) => demanda.turnoSetorOpLegacyId)
      .map((demanda) => [demanda.turnoSetorOpLegacyId as string, demanda] as const)
  )

  return input.secoesSetorOp.map((secao) => {
    const demanda = demandasPorSecaoLegacy.get(secao.id)

    if (!demanda) {
      return secao
    }

    return {
      ...secao,
      quantidadePlanejada: calcularQuantidadePlanejadaExibicao(
        secao.quantidadePlanejada,
        secao.quantidadeRealizada,
        demanda.quantidadeAceitaTurno
      ),
    }
  })
}

export function hidratarSetoresTurnoComCapacidade(input: {
  turno: Pick<
    TurnoV2,
    'operadoresDisponiveis' | 'minutosTurno' | 'capacidadeGlobalTurnoPecas'
  >
  setoresAtivos: TurnoSetorV2[]
  demandasSetor: TurnoSetorDemandaV2[]
  operacoesSecao: TurnoSetorOperacaoApontamentoV2[]
  ops: TurnoOpV2[]
  quantidadeRealizadaAtualPorOperacaoId?: ReadonlyMap<string, number>
}): TurnoSetorV2[] {
  if (input.setoresAtivos.length === 0) {
    return []
  }

  const dimensionamento = calcularDimensionamentoPessoasPorSetor({
    operadoresDisponiveis: input.turno.operadoresDisponiveis,
    minutosTurno: input.turno.minutosTurno,
    ops: mapearOpsParaDimensionamento(
      input.ops,
      input.demandasSetor,
      input.operacoesSecao,
      (demanda) => demanda.quantidadeAceitaTurno ?? 0
    ),
  })

  const setoresDimensionadosPorId = new Map(
    dimensionamento.setores.map((setor) => [setor.setorId, setor] as const)
  )
  const tpTotalPorDemanda = criarMapaTpTotalPorDemanda(input.demandasSetor, input.operacoesSecao)
  const cargasPorSetor = new Map<
    string,
    {
      cargaConsumidaMinutos: number
      cargaReservadaMinutos: number
    }
  >()

  for (const demanda of input.demandasSetor) {
    const tpTotalSetorProduto = tpTotalPorDemanda.get(demanda.id) ?? 0
    const quantidadeConcluidaNoTurnoAtual = calcularQuantidadeConcluidaDemandaNoTurnoAtual(
      demanda,
      input.operacoesSecao,
      input.quantidadeRealizadaAtualPorOperacaoId
    )
    const cargaConsumidaMinutos = arredondarNumero(
      quantidadeConcluidaNoTurnoAtual * tpTotalSetorProduto
    )
    const cargaReservadaMinutos = arredondarNumero(
      normalizarNumeroPositivo(demanda.quantidadeAceitaTurno ?? 0) * tpTotalSetorProduto
    )
    const cargaAtual = cargasPorSetor.get(demanda.setorId) ?? {
      cargaConsumidaMinutos: 0,
      cargaReservadaMinutos: 0,
    }

    cargasPorSetor.set(demanda.setorId, {
      cargaConsumidaMinutos: arredondarNumero(
        cargaAtual.cargaConsumidaMinutos + cargaConsumidaMinutos
      ),
      cargaReservadaMinutos: arredondarNumero(
        cargaAtual.cargaReservadaMinutos + cargaReservadaMinutos
      ),
    })
  }

  return input.setoresAtivos.map((setor) => {
    const setorDimensionado = setoresDimensionadosPorId.get(setor.setorId)

    if (!setorDimensionado) {
      return {
        ...setor,
        operadoresAlocados: 0,
        capacidadeMinutosTotal: 0,
        capacidadeMinutosConsumida: 0,
        capacidadeMinutosReservada: 0,
        capacidadeMinutosRestante: 0,
        eficienciaRequeridaPct: null,
        diagnosticoCapacidade: 'sem_carga',
      }
    }

    const cargaSetor = cargasPorSetor.get(setor.setorId) ?? {
      cargaConsumidaMinutos: 0,
      cargaReservadaMinutos: 0,
    }
    const capacidadeMinutosRestante = arredondarNumero(
      Math.max(
        setorDimensionado.capacidadeMinutos -
          (cargaSetor.cargaConsumidaMinutos + cargaSetor.cargaReservadaMinutos),
        0
      )
    )

    return {
      ...setor,
      operadoresAlocados: setorDimensionado.operadoresSugeridos,
      capacidadeMinutosTotal: setorDimensionado.capacidadeMinutos,
      capacidadeMinutosConsumida: cargaSetor.cargaConsumidaMinutos,
      capacidadeMinutosReservada: cargaSetor.cargaReservadaMinutos,
      capacidadeMinutosRestante,
      eficienciaRequeridaPct: setorDimensionado.eficienciaRequeridaPct,
      diagnosticoCapacidade: setorDimensionado.diagnosticoCapacidade,
    }
  })
}
