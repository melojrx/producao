import { calcularDimensionamentoPessoasPorSetor } from './dimensionamento-pessoas-setor.ts'
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

function calcularBacklogDemanda(demanda: TurnoSetorDemandaV2): number {
  return (
    demanda.quantidadeBacklogSetor ??
    demanda.quantidadePendenteSetor ??
    Math.max(demanda.quantidadePlanejada - demanda.quantidadeConcluida, 0)
  )
}

function calcularElegivelFluxoDemanda(demanda: TurnoSetorDemandaV2): number {
  if (typeof demanda.quantidadeAceitaTurno === 'number') {
    return demanda.quantidadeAceitaTurno
  }

  if (typeof demanda.quantidadeDisponivelApontamento === 'number') {
    return demanda.quantidadeDisponivelApontamento
  }

  return calcularBacklogDemanda(demanda)
}

function criarMapaTpTotalPorDemanda(
  demandasSetor: TurnoSetorDemandaV2[],
  operacoesSecao: TurnoSetorOperacaoApontamentoV2[]
): Map<string, number> {
  return new Map(
    demandasSetor.map((demanda) => [demanda.id, calcularTpTotalSetorProduto(demanda, operacoesSecao)] as const)
  )
}

export function aplicarCapacidadeOperacionalDemandas(input: {
  turno: Pick<TurnoV2, 'operadoresDisponiveis' | 'minutosTurno'>
  demandasSetor: TurnoSetorDemandaV2[]
  operacoesSecao: TurnoSetorOperacaoApontamentoV2[]
  ops: TurnoOpV2[]
}): TurnoSetorDemandaV2[] {
  if (input.demandasSetor.length === 0) {
    return []
  }

  const dimensionamento = calcularDimensionamentoPessoasPorSetor({
    operadoresDisponiveis: input.turno.operadoresDisponiveis,
    minutosTurno: input.turno.minutosTurno,
    ops: mapearOpsParaDimensionamento(
      input.ops,
      input.demandasSetor,
      input.operacoesSecao,
      calcularElegivelFluxoDemanda
    ),
  })
  const capacidadeRestantePorSetor = new Map(
    dimensionamento.setores.map((setor) => [setor.setorId, setor.capacidadeMinutos] as const)
  )
  const tpTotalPorDemanda = criarMapaTpTotalPorDemanda(input.demandasSetor, input.operacoesSecao)
  const demandasPorSetor = mapearDemandasAtivasPorSetor(input.demandasSetor)
  const snapshotsPorDemandaId = new Map<
    string,
    {
      quantidadeAceitaTurno: number
      quantidadeExcedenteTurno: number
      quantidadeDisponivelApontamento: number
    }
  >()

  for (const [setorId, demandasSetor] of demandasPorSetor.entries()) {
    let capacidadeRestanteMin = capacidadeRestantePorSetor.get(setorId) ?? 0

    for (const demanda of demandasSetor) {
      const tpTotalSetorProduto = tpTotalPorDemanda.get(demanda.id) ?? 0
      const backlog = calcularBacklogDemanda(demanda)
      const elegivelFluxo = calcularElegivelFluxoDemanda(demanda)

      if (tpTotalSetorProduto <= 0 || elegivelFluxo <= 0 || capacidadeRestanteMin <= 0) {
        snapshotsPorDemandaId.set(demanda.id, {
          quantidadeAceitaTurno: 0,
          quantidadeExcedenteTurno: backlog,
          quantidadeDisponivelApontamento: 0,
        })
        continue
      }

      const quantidadeAceitaTurno = Math.min(
        elegivelFluxo,
        Math.floor(capacidadeRestanteMin / tpTotalSetorProduto)
      )

      capacidadeRestanteMin = arredondarNumero(
        Math.max(capacidadeRestanteMin - quantidadeAceitaTurno * tpTotalSetorProduto, 0)
      )

      snapshotsPorDemandaId.set(demanda.id, {
        quantidadeAceitaTurno,
        quantidadeExcedenteTurno: Math.max(backlog - quantidadeAceitaTurno, 0),
        quantidadeDisponivelApontamento: quantidadeAceitaTurno,
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
        quantidadeDisponivelApontamento: 0,
      }
    }

    return {
      ...demanda,
      quantidadeAceitaTurno: snapshot.quantidadeAceitaTurno,
      quantidadeExcedenteTurno: snapshot.quantidadeExcedenteTurno,
      quantidadeDisponivelApontamento: snapshot.quantidadeDisponivelApontamento,
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
  demandasSetor: TurnoSetorDemandaV2[]
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
  demandasSetor: TurnoSetorDemandaV2[]
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
  turno: Pick<TurnoV2, 'operadoresDisponiveis' | 'minutosTurno'>
  setoresAtivos: TurnoSetorV2[]
  demandasSetor: TurnoSetorDemandaV2[]
  operacoesSecao: TurnoSetorOperacaoApontamentoV2[]
  ops: TurnoOpV2[]
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

  return input.setoresAtivos.map((setor) => {
    const setorDimensionado = setoresDimensionadosPorId.get(setor.setorId)

    if (!setorDimensionado) {
      return {
        ...setor,
        operadoresAlocados: 0,
        capacidadeMinutosTotal: 0,
        capacidadeMinutosRestante: 0,
        eficienciaRequeridaPct: null,
        diagnosticoCapacidade: 'sem_carga',
      }
    }

    return {
      ...setor,
      operadoresAlocados: setorDimensionado.operadoresSugeridos,
      capacidadeMinutosTotal: setorDimensionado.capacidadeMinutos,
      capacidadeMinutosRestante: setorDimensionado.capacidadeMinutosRestante,
      eficienciaRequeridaPct: setorDimensionado.eficienciaRequeridaPct,
      diagnosticoCapacidade: setorDimensionado.diagnosticoCapacidade,
    }
  })
}
