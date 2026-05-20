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

interface MontarFilaQualidadeOperacionalInput {
  ops: TurnoOpV2[]
  demandasSetor: TurnoSetorDemandaV2[]
  operacoesTurno: TurnoSetorOperacaoApontamentoV2[]
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
