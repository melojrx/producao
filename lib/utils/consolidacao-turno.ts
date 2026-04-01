import type { TurnoOpStatusV2, TurnoOpV2, TurnoSetorDemandaV2 } from '@/types'

type TurnoOpConsolidavel = Pick<
  TurnoOpV2,
  | 'id'
  | 'quantidadePlanejada'
  | 'quantidadeRealizada'
  | 'quantidadePlanejadaRemanescente'
  | 'status'
>

type TurnoDemandaConsolidavel = Pick<
  TurnoSetorDemandaV2,
  'turnoOpId' | 'quantidadeRealizada' | 'status'
>

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
    const quantidadePlanejadaRemanescente = Math.max(
      op.quantidadePlanejada - quantidadeRealizadaConsolidada,
      0
    )

    return {
      ...op,
      quantidadeRealizada: quantidadeRealizadaConsolidada,
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
