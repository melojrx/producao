import {
  enriquecerDemandasComFluxoParalelo,
} from './fluxo-paralelo-turno.ts'
import type { DemandaFluxoSequencialBase } from './fluxo-sequencial-turno.ts'

type DemandaCarryOverOrigem = Pick<
  DemandaFluxoSequencialBase,
  | 'id'
  | 'turnoOpId'
  | 'setorId'
  | 'setorCodigo'
  | 'setorNome'
  | 'quantidadePlanejada'
  | 'quantidadeRealizada'
  | 'status'
  | 'iniciadoEm'
  | 'encerradoEm'
>

export interface SnapshotCarryOverSetorialV2 {
  setorId: string
  setorCodigo: number
  setorNome: string
  quantidadePlanejadaOrigem: number
  quantidadePlanejadaDestino: number
  quantidadeRealizadaOrigem: number
  quantidadeRealizadaDestino: number
  quantidadePendenteDestino: number
  quantidadeLiberadaOrigem: number
}

function normalizarInteiroNaoNegativo(valor: number): number {
  if (!Number.isFinite(valor) || valor <= 0) {
    return 0
  }

  return Math.floor(valor)
}

function compararDemandasCarryOver(
  primeiraDemanda: DemandaCarryOverOrigem,
  segundaDemanda: DemandaCarryOverOrigem
): number {
  if (primeiraDemanda.setorCodigo !== segundaDemanda.setorCodigo) {
    return primeiraDemanda.setorCodigo - segundaDemanda.setorCodigo
  }

  return primeiraDemanda.setorId.localeCompare(segundaDemanda.setorId)
}

export function calcularQuantidadePlanejadaRemanescenteCarryOver(input: {
  quantidadePlanejadaOrigem: number
  demandasOrigem: Array<Pick<DemandaCarryOverOrigem, 'quantidadeRealizada'>>
  quantidadeRealizadaFallback?: number
}): number {
  const quantidadePlanejadaOrigem = normalizarInteiroNaoNegativo(input.quantidadePlanejadaOrigem)

  if (input.demandasOrigem.length === 0) {
    return Math.max(
      quantidadePlanejadaOrigem -
        normalizarInteiroNaoNegativo(input.quantidadeRealizadaFallback ?? 0),
      0
    )
  }

  const quantidadeFinalizada = Math.min(
    ...input.demandasOrigem.map((demanda) =>
      normalizarInteiroNaoNegativo(demanda.quantidadeRealizada)
    )
  )

  return Math.max(quantidadePlanejadaOrigem - quantidadeFinalizada, 0)
}

export function normalizarDemandasCarryOverEntreTurnos(input: {
  quantidadePlanejadaDestino: number
  demandasOrigem: DemandaCarryOverOrigem[]
}): SnapshotCarryOverSetorialV2[] {
  const quantidadePlanejadaDestino = normalizarInteiroNaoNegativo(input.quantidadePlanejadaDestino)

  return enriquecerDemandasComFluxoParalelo(input.demandasOrigem)
    .sort(compararDemandasCarryOver)
    .map((demanda) => {
      const quantidadeRealizadaOrigem = normalizarInteiroNaoNegativo(demanda.quantidadeRealizada)
      const quantidadeRealizadaDestino = Math.min(
        quantidadePlanejadaDestino,
        quantidadeRealizadaOrigem,
        normalizarInteiroNaoNegativo(demanda.quantidadeLiberadaSetor)
      )

      return {
        setorId: demanda.setorId,
        setorCodigo: demanda.setorCodigo,
        setorNome: demanda.setorNome,
        quantidadePlanejadaOrigem: normalizarInteiroNaoNegativo(demanda.quantidadePlanejada),
        quantidadePlanejadaDestino,
        quantidadeRealizadaOrigem,
        quantidadeRealizadaDestino,
        quantidadePendenteDestino: Math.max(
          quantidadePlanejadaDestino - quantidadeRealizadaDestino,
          0
        ),
        quantidadeLiberadaOrigem: normalizarInteiroNaoNegativo(demanda.quantidadeLiberadaSetor),
      }
    })
}
