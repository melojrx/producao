import { setorUsaRevisaoQualidade } from './qualidade.ts'
import type {
  TurnoOpV2,
  TurnoSetorDemandaV2,
  TurnoSetorOperacaoApontamentoV2,
} from '@/types'

export interface QualidadeOperacionalFilaItem {
  id: string
  turnoOpId: string
  numeroOp: string
  produtoNome: string
  produtoReferencia: string
  quantidadeDisponivelRevisao: number
  demandaQualidade: TurnoSetorDemandaV2
  operacaoQualidade: TurnoSetorOperacaoApontamentoV2
  operacoesOrigem: TurnoSetorOperacaoApontamentoV2[]
}

export interface RevisaoParcialQualidadeInput {
  quantidadePendente: number
  quantidadeAprovada: number
  quantidadeReprovada: number
}

export interface RevisaoParcialQualidadeResultado {
  quantidadeRevisada: number
  quantidadeConsumidaPendencia: number
  quantidadePendenteAposRevisao: number
}

interface MontarFilaQualidadeOperacionalInput {
  ops: TurnoOpV2[]
  demandasSetor: TurnoSetorDemandaV2[]
  operacoesTurno: TurnoSetorOperacaoApontamentoV2[]
}

function normalizarInteiroNaoNegativo(valor: number): number {
  if (!Number.isFinite(valor) || valor <= 0) {
    return 0
  }

  return Math.floor(valor)
}

export function calcularResultadoRevisaoParcialQualidade(
  input: RevisaoParcialQualidadeInput
): RevisaoParcialQualidadeResultado {
  const quantidadePendente = normalizarInteiroNaoNegativo(input.quantidadePendente)
  const quantidadeAprovada = normalizarInteiroNaoNegativo(input.quantidadeAprovada)
  const quantidadeReprovada = normalizarInteiroNaoNegativo(input.quantidadeReprovada)
  const quantidadeRevisada = quantidadeAprovada + quantidadeReprovada

  return {
    quantidadeRevisada,
    quantidadeConsumidaPendencia: quantidadeAprovada,
    quantidadePendenteAposRevisao: Math.max(quantidadePendente - quantidadeAprovada, 0),
  }
}

export function validarRevisaoParcialQualidade(
  input: RevisaoParcialQualidadeInput
): { erro?: string } {
  const quantidadePendente = normalizarInteiroNaoNegativo(input.quantidadePendente)
  const { quantidadeRevisada } = calcularResultadoRevisaoParcialQualidade(input)

  if (quantidadeRevisada <= 0) {
    return { erro: 'Informe ao menos uma peça aprovada ou reprovada.' }
  }

  if (quantidadeRevisada > quantidadePendente) {
    return { erro: 'A quantidade revisada não pode ultrapassar a pendência disponível.' }
  }

  return {}
}

function calcularDisponivelRevisao(
  demanda: TurnoSetorDemandaV2,
  operacaoQualidade: TurnoSetorOperacaoApontamentoV2
): number {
  if (typeof operacaoQualidade.saldoFisicoRestante === 'number') {
    return operacaoQualidade.saldoFisicoRestante
  }

  if (typeof demanda.quantidadeDisponivelApontamento === 'number') {
    return demanda.quantidadeDisponivelApontamento
  }

  return Math.max(operacaoQualidade.quantidadePlanejada - operacaoQualidade.quantidadeRealizada, 0)
}

export function montarFilaQualidadeOperacional({
  ops,
  demandasSetor,
  operacoesTurno,
}: MontarFilaQualidadeOperacionalInput): QualidadeOperacionalFilaItem[] {
  const opsPorId = new Map(ops.map((op) => [op.id, op]))

  return demandasSetor
    .filter((demanda) => setorUsaRevisaoQualidade(demanda.setorNome))
    .map((demanda) => {
      const op = opsPorId.get(demanda.turnoOpId) ?? null
      const operacaoQualidade =
        operacoesTurno.find(
          (operacao) =>
            operacao.turnoOpId === demanda.turnoOpId && operacao.setorId === demanda.setorId
        ) ?? null

      if (!op || !operacaoQualidade) {
        return null
      }

      const operacoesOrigem = operacoesTurno
        .filter(
          (operacao) =>
            operacao.turnoOpId === demanda.turnoOpId && operacao.id !== operacaoQualidade.id
        )
        .sort((operacaoA, operacaoB) => operacaoA.sequencia - operacaoB.sequencia)

      if (operacoesOrigem.length === 0) {
        return null
      }

      return {
        id: demanda.id,
        turnoOpId: demanda.turnoOpId,
        numeroOp: op.numeroOp,
        produtoNome: op.produtoNome,
        produtoReferencia: op.produtoReferencia,
        quantidadeDisponivelRevisao: calcularDisponivelRevisao(demanda, operacaoQualidade),
        demandaQualidade: demanda,
        operacaoQualidade,
        operacoesOrigem,
      }
    })
    .filter((item): item is QualidadeOperacionalFilaItem => Boolean(item))
}
