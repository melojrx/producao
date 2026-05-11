import {
  enriquecerDemandasComFluxoParalelo,
} from './fluxo-paralelo-turno.ts'
import {
  calcularProgressoOperacionalSetor,
} from './fluxo-sequencial-turno.ts'
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
> & {
  quantidadeLiberadaSetor?: number
  quantidadeHerdadaSetor?: number
}

export interface SnapshotCarryOverSetorialV2 {
  setorId: string
  setorCodigo: number
  setorNome: string
  quantidadePlanejadaOrigem: number
  quantidadePlanejadaDestino: number
  quantidadeRealizadaOrigem: number
  quantidadeRealizadaDestino: number
  quantidadeHerdadaOrigem: number
  quantidadeHerdadaDestino: number
  quantidadeLiberadaDestino: number
  quantidadePendenteDestino: number
  quantidadeLiberadaOrigem: number
  demandaConcluidaDestino: boolean
}

interface DemandaCarryOverConsolidavel {
  id: string
  turnoOpId: string
  setorId: string
  quantidadePlanejada: number
  quantidadeRealizada: number
  quantidadeHerdadaSetor?: number
}

interface OperacaoCarryOverConsolidavel {
  turnoOpId: string
  turnoSetorDemandaId: string | null
  setorId: string
  quantidadeRealizada: number
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

function criarChaveDemandaSetor(turnoOpId: string, setorId: string): string {
  return `${turnoOpId}:${setorId}`
}

function mapearOperacoesPorDemanda(
  operacoes: OperacaoCarryOverConsolidavel[]
): Map<string, OperacaoCarryOverConsolidavel[]> {
  const operacoesPorDemanda = new Map<string, OperacaoCarryOverConsolidavel[]>()

  for (const operacao of operacoes) {
    const chaves = [
      operacao.turnoSetorDemandaId,
      criarChaveDemandaSetor(operacao.turnoOpId, operacao.setorId),
    ].filter((chave): chave is string => Boolean(chave))

    for (const chave of chaves) {
      const operacoesAtuais = operacoesPorDemanda.get(chave) ?? []
      operacoesAtuais.push(operacao)
      operacoesPorDemanda.set(chave, operacoesAtuais)
    }
  }

  return operacoesPorDemanda
}

function obterOperacoesDaDemanda(
  operacoesPorDemanda: Map<string, OperacaoCarryOverConsolidavel[]>,
  demanda: DemandaCarryOverConsolidavel
): OperacaoCarryOverConsolidavel[] {
  const operacoesVinculadas = operacoesPorDemanda.get(demanda.id) ?? []
  const operacoesDoSetor =
    operacoesPorDemanda.get(criarChaveDemandaSetor(demanda.turnoOpId, demanda.setorId)) ?? []

  return [...new Set([...operacoesVinculadas, ...operacoesDoSetor])]
}

function calcularQuantidadeLiberadaDestino(input: {
  quantidadePlanejadaDestino: number
  quantidadeProgressoOperacionalOrigem: number
  quantidadeLiberadaPersistidaOrigem: number
  quantidadeDisponivelFluxoOrigem: number
  usarLiberacaoFluxo: boolean
}): number {
  const quantidadePlanejadaDestino = normalizarInteiroNaoNegativo(input.quantidadePlanejadaDestino)
  const quantidadeProgressoOperacionalOrigem = normalizarInteiroNaoNegativo(
    input.quantidadeProgressoOperacionalOrigem
  )
  const quantidadeLiberadaPersistidaOrigem = normalizarInteiroNaoNegativo(
    input.quantidadeLiberadaPersistidaOrigem
  )
  const quantidadeDisponivelFluxoOrigem = normalizarInteiroNaoNegativo(
    input.quantidadeDisponivelFluxoOrigem
  )
  const saldoLiberadoPersistidoOrigem = Math.max(
    quantidadeLiberadaPersistidaOrigem,
    0
  )
  const quantidadeLiberadaOperacional = input.usarLiberacaoFluxo
    ? Math.max(quantidadeDisponivelFluxoOrigem, saldoLiberadoPersistidoOrigem)
    : saldoLiberadoPersistidoOrigem

  return Math.min(
    Math.max(quantidadePlanejadaDestino - quantidadeProgressoOperacionalOrigem, 0),
    quantidadeLiberadaOperacional
  )
}

export function consolidarDemandasCarryOverComOperacoes<
  TDemanda extends DemandaCarryOverConsolidavel
>(
  demandas: TDemanda[],
  operacoes: OperacaoCarryOverConsolidavel[]
): TDemanda[] {
  if (operacoes.length === 0) {
    return demandas
  }

  const operacoesPorDemanda = mapearOperacoesPorDemanda(operacoes)

  return demandas.map((demanda) => {
    const operacoesDaDemanda = obterOperacoesDaDemanda(operacoesPorDemanda, demanda)

    if (operacoesDaDemanda.length === 0) {
      return demanda
    }

    const quantidadeRealizadaOperacoes = Math.min(
      normalizarInteiroNaoNegativo(demanda.quantidadePlanejada),
      ...operacoesDaDemanda.map((operacao) =>
        normalizarInteiroNaoNegativo(operacao.quantidadeRealizada)
      )
    )

    return {
      ...demanda,
      quantidadeHerdadaSetor: normalizarInteiroNaoNegativo(demanda.quantidadeHerdadaSetor ?? 0),
      quantidadeRealizada: Math.max(
        normalizarInteiroNaoNegativo(demanda.quantidadeRealizada),
        quantidadeRealizadaOperacoes
      ),
    }
  })
}

export function calcularQuantidadePlanejadaRemanescenteCarryOver(input: {
  quantidadePlanejadaOrigem: number
  demandasOrigem: Array<Pick<DemandaCarryOverOrigem, 'quantidadeRealizada' | 'quantidadeHerdadaSetor'>>
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
      normalizarInteiroNaoNegativo(demanda.quantidadeRealizada) +
      normalizarInteiroNaoNegativo(demanda.quantidadeHerdadaSetor ?? 0)
    )
  )

  return Math.max(quantidadePlanejadaOrigem - quantidadeFinalizada, 0)
}

export function normalizarDemandasCarryOverEntreTurnos(input: {
  quantidadePlanejadaDestino: number
  demandasOrigem: DemandaCarryOverOrigem[]
}): SnapshotCarryOverSetorialV2[] {
  const quantidadePlanejadaDestino = normalizarInteiroNaoNegativo(input.quantidadePlanejadaDestino)
  const demandasOrigemPorId = new Map(input.demandasOrigem.map((demanda) => [demanda.id, demanda]))

  return enriquecerDemandasComFluxoParalelo(input.demandasOrigem)
    .sort(compararDemandasCarryOver)
    .map((demanda) => {
      const demandaOrigem = demandasOrigemPorId.get(demanda.id)
      const quantidadeRealizadaOrigem = normalizarInteiroNaoNegativo(demanda.quantidadeRealizada)
      const quantidadeHerdadaOrigem = normalizarInteiroNaoNegativo(
        demandaOrigem?.quantidadeHerdadaSetor ?? 0
      )
      const quantidadeProgressoOperacionalOrigem = calcularProgressoOperacionalSetor(demanda)
      const quantidadeLiberadaPersistidaOrigem = normalizarInteiroNaoNegativo(
        demandaOrigem?.quantidadeLiberadaSetor ?? 0
      )
      const quantidadeRealizadaDestino = 0
      const quantidadeHerdadaDestino = Math.min(
        quantidadePlanejadaDestino,
        quantidadeProgressoOperacionalOrigem
      )
      const quantidadeLiberadaDestino = calcularQuantidadeLiberadaDestino({
        quantidadePlanejadaDestino,
        quantidadeProgressoOperacionalOrigem,
        quantidadeLiberadaPersistidaOrigem,
        quantidadeDisponivelFluxoOrigem: demanda.quantidadeDisponivelApontamento,
        usarLiberacaoFluxo:
          quantidadeProgressoOperacionalOrigem > 0 ||
          demanda.setorAnteriorId !== null ||
          demanda.etapaFluxoChave === 'montagem' ||
          demanda.etapaFluxoChave === 'final',
      })

      return {
        setorId: demanda.setorId,
        setorCodigo: demanda.setorCodigo,
        setorNome: demanda.setorNome,
        quantidadePlanejadaOrigem: normalizarInteiroNaoNegativo(demanda.quantidadePlanejada),
        quantidadePlanejadaDestino,
        quantidadeRealizadaOrigem,
        quantidadeRealizadaDestino,
        quantidadeHerdadaOrigem,
        quantidadeHerdadaDestino,
        quantidadeLiberadaDestino,
        quantidadePendenteDestino: Math.max(
          quantidadePlanejadaDestino - quantidadeHerdadaDestino,
          0
        ),
        quantidadeLiberadaOrigem: normalizarInteiroNaoNegativo(demanda.quantidadeLiberadaSetor),
        demandaConcluidaDestino:
          quantidadePlanejadaDestino > 0 && quantidadeHerdadaDestino >= quantidadePlanejadaDestino,
      }
    })
}
