import { criarPosicaoFilaSetor } from './capacidade-setor.ts'
import type {
  SnapshotParcelamentoDemandaTurnoV2,
  TurnoSetorDemandaStatusV2,
  TurnoSetorFilaStatusV2,
} from '@/types'

export interface DemandaFluxoSequencialBase {
  id: string
  turnoOpId: string
  setorId: string
  setorCodigo: number
  setorNome: string
  quantidadePlanejada: number
  quantidadeRealizada: number
  status: TurnoSetorDemandaStatusV2
  iniciadoEm: string | null
  encerradoEm: string | null
}

export interface DiagnosticoFluxoSequencialDemandaV2 {
  posicaoFila: number | null
  statusFila: TurnoSetorFilaStatusV2
  quantidadeBacklogSetor: number
  quantidadeAceitaTurno: number
  quantidadeExcedenteTurno: number
  quantidadePendenteSetor: number
  quantidadeLiberadaSetor: number
  quantidadeDisponivelApontamento: number
  quantidadeBloqueadaAnterior: number
  setorAnteriorId: string | null
  setorAnteriorCodigo: number | null
  setorAnteriorNome: string | null
}

function normalizarInteiroNaoNegativo(valor: number): number {
  if (!Number.isFinite(valor) || valor <= 0) {
    return 0
  }

  return Math.floor(valor)
}

function compararDemandasPorFluxo(
  primeiraDemanda: DemandaFluxoSequencialBase,
  segundaDemanda: DemandaFluxoSequencialBase
): number {
  if (primeiraDemanda.setorCodigo !== segundaDemanda.setorCodigo) {
    return primeiraDemanda.setorCodigo - segundaDemanda.setorCodigo
  }

  return primeiraDemanda.setorId.localeCompare(segundaDemanda.setorId)
}

export function calcularQuantidadeLiberadaSetor(
  quantidadePlanejada: number,
  quantidadeConcluidaSetorAnterior?: number | null
): number {
  const quantidadePlanejadaNormalizada = normalizarInteiroNaoNegativo(quantidadePlanejada)

  if (quantidadeConcluidaSetorAnterior === null || quantidadeConcluidaSetorAnterior === undefined) {
    return quantidadePlanejadaNormalizada
  }

  return Math.min(
    quantidadePlanejadaNormalizada,
    normalizarInteiroNaoNegativo(quantidadeConcluidaSetorAnterior)
  )
}

export function calcularQuantidadeDisponivelApontamento(
  quantidadePlanejada: number,
  quantidadeRealizadaAtual: number,
  quantidadeConcluidaSetorAnterior?: number | null
): number {
  const quantidadeLiberadaSetor = calcularQuantidadeLiberadaSetor(
    quantidadePlanejada,
    quantidadeConcluidaSetorAnterior
  )

  return Math.max(
    quantidadeLiberadaSetor - normalizarInteiroNaoNegativo(quantidadeRealizadaAtual),
    0
  )
}

export function criarSnapshotParcelamentoDemandaTurno(input: {
  quantidadePlanejada: number
  quantidadeRealizadaAtual: number
  quantidadeDisponivelApontamento: number
}): SnapshotParcelamentoDemandaTurnoV2 {
  const quantidadeBacklogSetor = Math.max(
    normalizarInteiroNaoNegativo(input.quantidadePlanejada) -
      normalizarInteiroNaoNegativo(input.quantidadeRealizadaAtual),
    0
  )
  const quantidadeAceitaTurno = Math.min(
    quantidadeBacklogSetor,
    normalizarInteiroNaoNegativo(input.quantidadeDisponivelApontamento)
  )

  return {
    quantidadeBacklogSetor,
    quantidadeAceitaTurno,
    quantidadeExcedenteTurno: Math.max(quantidadeBacklogSetor - quantidadeAceitaTurno, 0),
  }
}

export function enriquecerDemandasComFluxoSequencial<T extends DemandaFluxoSequencialBase>(
  demandas: T[]
): Array<T & DiagnosticoFluxoSequencialDemandaV2> {
  const demandasPorTurnoOp = new Map<string, T[]>()

  for (const demanda of demandas) {
    const demandasTurnoOp = demandasPorTurnoOp.get(demanda.turnoOpId) ?? []
    demandasTurnoOp.push(demanda)
    demandasPorTurnoOp.set(demanda.turnoOpId, demandasTurnoOp)
  }

  const diagnosticosPorDemandaId = new Map<string, Omit<DiagnosticoFluxoSequencialDemandaV2, 'posicaoFila' | 'statusFila'>>()

  for (const demandasTurnoOp of demandasPorTurnoOp.values()) {
    const demandasOrdenadas = [...demandasTurnoOp].sort(compararDemandasPorFluxo)

    demandasOrdenadas.forEach((demandaAtual, indiceAtual) => {
      const demandaAnterior = indiceAtual > 0 ? demandasOrdenadas[indiceAtual - 1] : null
      const quantidadePendenteSetor = Math.max(
        normalizarInteiroNaoNegativo(demandaAtual.quantidadePlanejada) -
          normalizarInteiroNaoNegativo(demandaAtual.quantidadeRealizada),
        0
      )
      const quantidadeLiberadaSetor = calcularQuantidadeLiberadaSetor(
        demandaAtual.quantidadePlanejada,
        demandaAnterior?.quantidadeRealizada ?? null
      )
      const quantidadeDisponivelApontamento = calcularQuantidadeDisponivelApontamento(
        demandaAtual.quantidadePlanejada,
        demandaAtual.quantidadeRealizada,
        demandaAnterior?.quantidadeRealizada ?? null
      )

      const snapshotParcelamento = criarSnapshotParcelamentoDemandaTurno({
        quantidadePlanejada: demandaAtual.quantidadePlanejada,
        quantidadeRealizadaAtual: demandaAtual.quantidadeRealizada,
        quantidadeDisponivelApontamento,
      })

      diagnosticosPorDemandaId.set(demandaAtual.id, {
        quantidadeBacklogSetor: snapshotParcelamento.quantidadeBacklogSetor,
        quantidadeAceitaTurno: snapshotParcelamento.quantidadeAceitaTurno,
        quantidadeExcedenteTurno: snapshotParcelamento.quantidadeExcedenteTurno,
        quantidadePendenteSetor,
        quantidadeLiberadaSetor,
        quantidadeDisponivelApontamento,
        quantidadeBloqueadaAnterior: Math.max(
          quantidadePendenteSetor - quantidadeDisponivelApontamento,
          0
        ),
        setorAnteriorId: demandaAnterior?.setorId ?? null,
        setorAnteriorCodigo: demandaAnterior?.setorCodigo ?? null,
        setorAnteriorNome: demandaAnterior?.setorNome ?? null,
      })
    })
  }

  const posicoesPorDemandaId = new Map<string, number | null>()
  const demandasPorSetor = new Map<string, T[]>()

  for (const demanda of demandas) {
    const demandasSetor = demandasPorSetor.get(demanda.setorId) ?? []
    demandasSetor.push(demanda)
    demandasPorSetor.set(demanda.setorId, demandasSetor)
  }

  for (const demandasSetor of demandasPorSetor.values()) {
    const filaAtiva = demandasSetor.filter(
      (demanda) => demanda.status !== 'concluida' && demanda.status !== 'encerrada_manualmente'
    )

    filaAtiva.forEach((demanda, indice) => {
      posicoesPorDemandaId.set(demanda.id, indice + 1)
    })
  }

  return demandas.map((demanda) => {
    const diagnostico = diagnosticosPorDemandaId.get(demanda.id)
    const quantidadePendenteSetor = diagnostico?.quantidadePendenteSetor ?? 0
    const quantidadeDisponivelApontamento = diagnostico?.quantidadeDisponivelApontamento ?? 0
    const snapshotParcelamento = criarSnapshotParcelamentoDemandaTurno({
      quantidadePlanejada: demanda.quantidadePlanejada,
      quantidadeRealizadaAtual: demanda.quantidadeRealizada,
      quantidadeDisponivelApontamento,
    })
    const posicaoFila = demanda.encerradoEm ? null : (posicoesPorDemandaId.get(demanda.id) ?? null)
    const fila = criarPosicaoFilaSetor({
      quantidadePlanejada: demanda.quantidadePlanejada,
      quantidadeConcluida: demanda.quantidadeRealizada,
      quantidadeDisponivelApontamento,
      posicaoFila,
      iniciadoEm: demanda.iniciadoEm,
      encerradoEm: demanda.encerradoEm,
    })

    return {
      ...demanda,
      posicaoFila: fila.posicaoFila,
      statusFila: fila.statusFila,
      quantidadeBacklogSetor: snapshotParcelamento.quantidadeBacklogSetor,
      quantidadeAceitaTurno: snapshotParcelamento.quantidadeAceitaTurno,
      quantidadeExcedenteTurno: snapshotParcelamento.quantidadeExcedenteTurno,
      quantidadePendenteSetor,
      quantidadeLiberadaSetor: diagnostico?.quantidadeLiberadaSetor ?? 0,
      quantidadeDisponivelApontamento,
      quantidadeBloqueadaAnterior: diagnostico?.quantidadeBloqueadaAnterior ?? 0,
      setorAnteriorId: diagnostico?.setorAnteriorId ?? null,
      setorAnteriorCodigo: diagnostico?.setorAnteriorCodigo ?? null,
      setorAnteriorNome: diagnostico?.setorAnteriorNome ?? null,
    }
  })
}
