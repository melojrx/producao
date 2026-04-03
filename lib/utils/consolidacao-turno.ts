import type {
  TurnoOpStatusV2,
  TurnoOpV2,
  TurnoSetorDemandaScaneada,
  TurnoSetorDemandaStatusV2,
  TurnoSetorDemandaV2,
  TurnoSetorOperacaoApontamentoV2,
  TurnoSetorOperacaoStatusV2,
  TurnoSetorOpStatusV2,
  TurnoSetorOpV2,
  TurnoSetorScaneado,
  TurnoSetorStatusV2,
  TurnoSetorV2,
} from '@/types'
import {
  calcularIndicadoresOperacionaisPorItens,
  montarIndicadoresOperacionais,
  somarCargasOperacionaisTp,
} from '@/lib/utils/progresso-operacional'

type TurnoSetorOperacaoConsolidavel = Pick<
  TurnoSetorOperacaoApontamentoV2,
  | 'turnoOpId'
  | 'turnoSetorOpId'
  | 'turnoSetorId'
  | 'turnoSetorDemandaId'
  | 'quantidadePlanejada'
  | 'quantidadeRealizada'
  | 'tempoPadraoMinSnapshot'
  | 'status'
>

type TurnoOpConsolidavel = Pick<
  TurnoOpV2,
  | 'id'
  | 'quantidadePlanejada'
  | 'quantidadeRealizada'
  | 'quantidadeConcluida'
  | 'progressoOperacionalPct'
  | 'cargaPlanejadaTp'
  | 'cargaRealizadaTp'
  | 'quantidadePlanejadaRemanescente'
  | 'status'
>

type TurnoDemandaConsolidavel = Pick<
  TurnoSetorDemandaV2,
  | 'id'
  | 'turnoOpId'
  | 'turnoSetorId'
  | 'turnoSetorOpLegacyId'
  | 'quantidadePlanejada'
  | 'quantidadeRealizada'
  | 'quantidadeConcluida'
  | 'progressoOperacionalPct'
  | 'cargaPlanejadaTp'
  | 'cargaRealizadaTp'
  | 'status'
>

type TurnoDemandaScaneadaConsolidavel = Pick<
  TurnoSetorDemandaScaneada,
  | 'id'
  | 'turnoOpId'
  | 'turnoSetorId'
  | 'turnoSetorOpLegacyId'
  | 'quantidadePlanejada'
  | 'quantidadeRealizada'
  | 'quantidadeConcluida'
  | 'progressoOperacionalPct'
  | 'cargaPlanejadaTp'
  | 'cargaRealizadaTp'
  | 'status'
>

type TurnoSecaoConsolidavel = Pick<
  TurnoSetorOpV2,
  | 'id'
  | 'turnoOpId'
  | 'quantidadePlanejada'
  | 'quantidadeRealizada'
  | 'quantidadeConcluida'
  | 'progressoOperacionalPct'
  | 'cargaPlanejadaTp'
  | 'cargaRealizadaTp'
  | 'status'
>

type TurnoSetorConsolidavel = Pick<
  TurnoSetorV2,
  | 'id'
  | 'setorId'
  | 'quantidadePlanejada'
  | 'quantidadeRealizada'
  | 'quantidadeConcluida'
  | 'progressoOperacionalPct'
  | 'cargaPlanejadaTp'
  | 'cargaRealizadaTp'
  | 'status'
>

type TurnoSetorScaneadoConsolidavel = Pick<
  TurnoSetorScaneado,
  | 'id'
  | 'setorId'
  | 'quantidadePlanejada'
  | 'quantidadeRealizada'
  | 'quantidadeConcluida'
  | 'progressoOperacionalPct'
  | 'cargaPlanejadaTp'
  | 'cargaRealizadaTp'
  | 'status'
>

function derivarStatusDemandaOuSecao<
  TStatus extends TurnoSetorDemandaStatusV2 | TurnoSetorOpStatusV2
>(
  statusAtual: TStatus,
  quantidadePlanejada: number,
  quantidadeRealizada: number,
  totalOperacoes: number,
  totalConcluidas: number,
  totalEncerradas: number,
  possuiRealizado: boolean
): TStatus {
  if (totalOperacoes === 0) {
    return statusAtual
  }

  if (quantidadePlanejada > 0 && quantidadeRealizada >= quantidadePlanejada) {
    return 'concluida' as TStatus
  }

  if (totalConcluidas === totalOperacoes) {
    return 'concluida' as TStatus
  }

  if (totalConcluidas + totalEncerradas === totalOperacoes && totalEncerradas > 0) {
    return 'encerrada_manualmente' as TStatus
  }

  if (possuiRealizado) {
    return 'em_andamento' as TStatus
  }

  if (statusAtual === 'encerrada_manualmente') {
    return statusAtual
  }

  return (statusAtual === 'planejada' ? 'planejada' : 'aberta') as TStatus
}

function derivarStatusSetor(
  statusAtual: TurnoSetorStatusV2,
  demandas: Array<Pick<TurnoSetorDemandaV2, 'status' | 'quantidadeRealizada'>>
): TurnoSetorStatusV2 {
  if (demandas.length === 0) {
    return statusAtual
  }

  if (demandas.every((demanda) => demanda.status === 'concluida')) {
    return 'concluida'
  }

  if (demandas.every((demanda) => demanda.status === 'encerrada_manualmente')) {
    return 'encerrada_manualmente'
  }

  if (
    demandas.some(
      (demanda) =>
        demanda.status === 'em_andamento' ||
        demanda.status === 'concluida' ||
        demanda.quantidadeRealizada > 0
    )
  ) {
    return 'em_andamento'
  }

  if (demandas.some((demanda) => demanda.status === 'aberta')) {
    return 'aberta'
  }

  return statusAtual === 'planejada' ? 'planejada' : 'aberta'
}

function mapearOperacoesPorDemanda<
  TDemanda extends TurnoDemandaConsolidavel | TurnoDemandaScaneadaConsolidavel,
  TOperacao extends TurnoSetorOperacaoConsolidavel
>(demanda: TDemanda, operacoes: TOperacao[]): TOperacao[] {
  return operacoes.filter((operacao) => {
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

function derivarStatusOpConsolidado(
  demandas: TurnoDemandaConsolidavel[],
  quantidadePlanejada: number,
  quantidadeRealizada: number,
  statusAtual: TurnoOpStatusV2
): TurnoOpStatusV2 {
  if (demandas.length === 0) {
    return statusAtual
  }

  if (quantidadePlanejada > 0 && quantidadeRealizada >= quantidadePlanejada) {
    return 'concluida'
  }

  if (demandas.every((demanda) => demanda.status === 'encerrada_manualmente')) {
    return 'encerrada_manualmente'
  }

  if (
    demandas.some(
      (demanda) =>
        demanda.status === 'em_andamento' ||
        demanda.status === 'concluida' ||
        demanda.quantidadeRealizada > 0
    )
  ) {
    return 'em_andamento'
  }

  return 'planejada'
}

export function consolidarOpsPorDemandas<T extends TurnoOpConsolidavel>(
  ops: T[],
  demandas: TurnoDemandaConsolidavel[]
): T[] {
  const demandasPorOp = new Map<string, TurnoDemandaConsolidavel[]>()

  for (const demanda of demandas) {
    const demandasAtuais = demandasPorOp.get(demanda.turnoOpId) ?? []
    demandasAtuais.push(demanda)
    demandasPorOp.set(demanda.turnoOpId, demandasAtuais)
  }

  return ops.map((op) => {
    const demandasDaOp = demandasPorOp.get(op.id) ?? []

    if (demandasDaOp.length === 0) {
      return op
    }

    const quantidadeRealizadaConsolidada = Math.min(
      ...demandasDaOp.map((demanda) => demanda.quantidadeRealizada)
    )
    const indicadoresOperacionais = montarIndicadoresOperacionais(
      quantidadeRealizadaConsolidada,
      somarCargasOperacionaisTp(
        demandasDaOp.map((demanda) => ({
          cargaPlanejadaTp: demanda.cargaPlanejadaTp,
          cargaRealizadaTp: demanda.cargaRealizadaTp,
        }))
      )
    )
    const quantidadePlanejadaRemanescente = Math.max(
      op.quantidadePlanejada - quantidadeRealizadaConsolidada,
      0
    )

    return {
      ...op,
      quantidadeRealizada: quantidadeRealizadaConsolidada,
      quantidadeConcluida: indicadoresOperacionais.quantidadeConcluida,
      progressoOperacionalPct: indicadoresOperacionais.progressoOperacionalPct,
      cargaPlanejadaTp: indicadoresOperacionais.cargaPlanejadaTp,
      cargaRealizadaTp: indicadoresOperacionais.cargaRealizadaTp,
      quantidadePlanejadaRemanescente,
      status: derivarStatusOpConsolidado(
        demandasDaOp,
        op.quantidadePlanejada,
        quantidadeRealizadaConsolidada,
        op.status
      ),
    }
  })
}

export function consolidarDemandasPorOperacoes<
  TDemanda extends TurnoDemandaConsolidavel | TurnoDemandaScaneadaConsolidavel,
  TOperacao extends TurnoSetorOperacaoConsolidavel
>(demandas: TDemanda[], operacoes: TOperacao[]): TDemanda[] {
  return demandas.map((demanda) => {
    const operacoesDaDemanda = mapearOperacoesPorDemanda(demanda, operacoes)

    if (operacoesDaDemanda.length === 0) {
      return demanda
    }

    const quantidadeRealizada = Math.min(
      demanda.quantidadePlanejada,
      ...operacoesDaDemanda.map((operacao) => operacao.quantidadeRealizada)
    )
    const indicadoresOperacionais = calcularIndicadoresOperacionaisPorItens(
      quantidadeRealizada,
      operacoesDaDemanda.map((operacao) => ({
        quantidadePlanejada: operacao.quantidadePlanejada,
        quantidadeRealizada: operacao.quantidadeRealizada,
        tempoPadraoMin: operacao.tempoPadraoMinSnapshot,
      }))
    )
    const totalConcluidas = operacoesDaDemanda.filter(
      (operacao) => operacao.status === 'concluida'
    ).length
    const totalEncerradas = operacoesDaDemanda.filter(
      (operacao) => operacao.status === 'encerrada_manualmente'
    ).length
    const possuiRealizado = operacoesDaDemanda.some((operacao) => operacao.quantidadeRealizada > 0)

    return {
      ...demanda,
      quantidadeRealizada,
      quantidadeConcluida: indicadoresOperacionais.quantidadeConcluida,
      progressoOperacionalPct: indicadoresOperacionais.progressoOperacionalPct,
      cargaPlanejadaTp: indicadoresOperacionais.cargaPlanejadaTp,
      cargaRealizadaTp: indicadoresOperacionais.cargaRealizadaTp,
      status: derivarStatusDemandaOuSecao(
        demanda.status,
        demanda.quantidadePlanejada,
        quantidadeRealizada,
        operacoesDaDemanda.length,
        totalConcluidas,
        totalEncerradas,
        possuiRealizado
      ),
    }
  })
}

export function consolidarSecoesPorOperacoes<
  TSecao extends TurnoSecaoConsolidavel,
  TOperacao extends TurnoSetorOperacaoConsolidavel
>(secoes: TSecao[], operacoes: TOperacao[]): TSecao[] {
  const operacoesPorSecao = new Map<string, TOperacao[]>()

  for (const operacao of operacoes) {
    const operacoesAtuais = operacoesPorSecao.get(operacao.turnoSetorOpId) ?? []
    operacoesAtuais.push(operacao)
    operacoesPorSecao.set(operacao.turnoSetorOpId, operacoesAtuais)
  }

  return secoes.map((secao) => {
    const operacoesDaSecao = operacoesPorSecao.get(secao.id) ?? []

    if (operacoesDaSecao.length === 0) {
      return secao
    }

    const quantidadeRealizada = Math.min(
      secao.quantidadePlanejada,
      ...operacoesDaSecao.map((operacao) => operacao.quantidadeRealizada)
    )
    const indicadoresOperacionais = calcularIndicadoresOperacionaisPorItens(
      quantidadeRealizada,
      operacoesDaSecao.map((operacao) => ({
        quantidadePlanejada: operacao.quantidadePlanejada,
        quantidadeRealizada: operacao.quantidadeRealizada,
        tempoPadraoMin: operacao.tempoPadraoMinSnapshot,
      }))
    )
    const totalConcluidas = operacoesDaSecao.filter(
      (operacao) => operacao.status === 'concluida'
    ).length
    const totalEncerradas = operacoesDaSecao.filter(
      (operacao) => operacao.status === 'encerrada_manualmente'
    ).length
    const possuiRealizado = operacoesDaSecao.some((operacao) => operacao.quantidadeRealizada > 0)

    return {
      ...secao,
      quantidadeRealizada,
      quantidadeConcluida: indicadoresOperacionais.quantidadeConcluida,
      progressoOperacionalPct: indicadoresOperacionais.progressoOperacionalPct,
      cargaPlanejadaTp: indicadoresOperacionais.cargaPlanejadaTp,
      cargaRealizadaTp: indicadoresOperacionais.cargaRealizadaTp,
      status: derivarStatusDemandaOuSecao(
        secao.status,
        secao.quantidadePlanejada,
        quantidadeRealizada,
        operacoesDaSecao.length,
        totalConcluidas,
        totalEncerradas,
        possuiRealizado
      ),
    }
  })
}

export function consolidarSetoresPorDemandas<TSetor extends TurnoSetorConsolidavel>(
  setores: TSetor[],
  demandas: TurnoDemandaConsolidavel[]
): TSetor[] {
  const demandasPorSetor = new Map<string, TurnoDemandaConsolidavel[]>()

  for (const demanda of demandas) {
    const demandasAtuais = demandasPorSetor.get(demanda.turnoSetorId) ?? []
    demandasAtuais.push(demanda)
    demandasPorSetor.set(demanda.turnoSetorId, demandasAtuais)
  }

  return setores.map((setor) => {
    const demandasDoSetor = demandasPorSetor.get(setor.id) ?? []

    if (demandasDoSetor.length === 0) {
      return setor
    }

    const quantidadePlanejada = demandasDoSetor.reduce(
      (soma, demanda) => soma + demanda.quantidadePlanejada,
      0
    )
    const quantidadeRealizada = demandasDoSetor.reduce(
      (soma, demanda) => soma + demanda.quantidadeRealizada,
      0
    )
    const indicadoresOperacionais = montarIndicadoresOperacionais(
      quantidadeRealizada,
      somarCargasOperacionaisTp(
        demandasDoSetor.map((demanda) => ({
          cargaPlanejadaTp: demanda.cargaPlanejadaTp,
          cargaRealizadaTp: demanda.cargaRealizadaTp,
        }))
      )
    )

    return {
      ...setor,
      quantidadePlanejada,
      quantidadeRealizada,
      quantidadeConcluida: indicadoresOperacionais.quantidadeConcluida,
      progressoOperacionalPct: indicadoresOperacionais.progressoOperacionalPct,
      cargaPlanejadaTp: indicadoresOperacionais.cargaPlanejadaTp,
      cargaRealizadaTp: indicadoresOperacionais.cargaRealizadaTp,
      status: derivarStatusSetor(setor.status, demandasDoSetor),
    }
  })
}

export function consolidarSetorScaneadoPorDemandas<
  TSetor extends TurnoSetorScaneadoConsolidavel,
  TDemanda extends TurnoDemandaScaneadaConsolidavel
>(setor: TSetor, demandas: TDemanda[]): TSetor {
  if (demandas.length === 0) {
    return setor
  }

  const quantidadePlanejada = demandas.reduce((soma, demanda) => soma + demanda.quantidadePlanejada, 0)
  const quantidadeRealizada = demandas.reduce((soma, demanda) => soma + demanda.quantidadeRealizada, 0)
  const indicadoresOperacionais = montarIndicadoresOperacionais(
    quantidadeRealizada,
    somarCargasOperacionaisTp(
      demandas.map((demanda) => ({
        cargaPlanejadaTp: demanda.cargaPlanejadaTp,
        cargaRealizadaTp: demanda.cargaRealizadaTp,
      }))
    )
  )

  return {
    ...setor,
    quantidadePlanejada,
    quantidadeRealizada,
    quantidadeConcluida: indicadoresOperacionais.quantidadeConcluida,
    progressoOperacionalPct: indicadoresOperacionais.progressoOperacionalPct,
    cargaPlanejadaTp: indicadoresOperacionais.cargaPlanejadaTp,
    cargaRealizadaTp: indicadoresOperacionais.cargaRealizadaTp,
    status: derivarStatusSetor(setor.status, demandas),
  }
}
