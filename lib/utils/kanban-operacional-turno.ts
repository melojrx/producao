import { compararSetoresPorOrdem } from './setor-ordem.ts'
import type {
  PlanejamentoTurnoDashboardV2,
  TurnoSetorDemandaV2,
  TurnoSetorV2,
} from '@/types'

export interface KanbanOperacionalSetorResumo
  extends Pick<
    TurnoSetorV2,
    | 'setorId'
    | 'setorCodigo'
    | 'setorNome'
    | 'operadoresAlocados'
    | 'capacidadeMinutosTotal'
    | 'capacidadeMinutosRestante'
    | 'diagnosticoCapacidade'
  > {}

export interface KanbanOperacionalColuna {
  setor: KanbanOperacionalSetorResumo
  demandasAtivas: TurnoSetorDemandaV2[]
  demandasEmQuadro: TurnoSetorDemandaV2[]
  aguardandoLiberacao: number
  capacidadeComprometida: number
}

function normalizarNumero(valor?: number | null): number {
  return Number.isFinite(valor) ? Number(valor) : 0
}

export function demandaKanbanEstaConcluida(demanda: TurnoSetorDemandaV2): boolean {
  if (demanda.status === 'concluida' || demanda.status === 'encerrada_manualmente') {
    return true
  }

  const quantidadePendenteSetor =
    demanda.quantidadeBacklogSetor ??
    demanda.quantidadePendenteSetor ??
    Math.max(demanda.quantidadePlanejada - demanda.quantidadeConcluida, 0)

  return quantidadePendenteSetor <= 0
}

export function demandaKanbanTemPresencaRealNoSetor(demanda: TurnoSetorDemandaV2): boolean {
  if (demandaKanbanEstaConcluida(demanda)) {
    return false
  }

  return (
    normalizarNumero(demanda.quantidadeRealizada) > 0 ||
    normalizarNumero(demanda.quantidadeAceitaTurno) > 0 ||
    normalizarNumero(demanda.quantidadeLiberadaSetor) > 0 ||
    normalizarNumero(demanda.quantidadeDisponivelApontamento) > 0 ||
    demanda.status === 'em_andamento' ||
    demanda.statusFila === 'em_producao' ||
    demanda.statusFila === 'parcial'
  )
}

function ordenarDemandasKanban(
  primeiraDemanda: TurnoSetorDemandaV2,
  segundaDemanda: TurnoSetorDemandaV2
): number {
  const primeiraPosicao = primeiraDemanda.posicaoFila ?? Number.MAX_SAFE_INTEGER
  const segundaPosicao = segundaDemanda.posicaoFila ?? Number.MAX_SAFE_INTEGER

  if (primeiraPosicao !== segundaPosicao) {
    return primeiraPosicao - segundaPosicao
  }

  const comparacaoOp = primeiraDemanda.numeroOp.localeCompare(segundaDemanda.numeroOp)
  if (comparacaoOp !== 0) {
    return comparacaoOp
  }

  return primeiraDemanda.produtoNome.localeCompare(segundaDemanda.produtoNome)
}

export function construirColunasKanbanOperacional(
  planejamento: PlanejamentoTurnoDashboardV2
): KanbanOperacionalColuna[] {
  const setoresMapeados = new Map<string, KanbanOperacionalSetorResumo>()

  for (const setor of planejamento.setoresAtivos ?? []) {
    setoresMapeados.set(setor.setorId, {
      setorId: setor.setorId,
      setorCodigo: setor.setorCodigo,
      setorNome: setor.setorNome,
      operadoresAlocados: setor.operadoresAlocados,
      capacidadeMinutosTotal: setor.capacidadeMinutosTotal,
      capacidadeMinutosRestante: setor.capacidadeMinutosRestante,
      diagnosticoCapacidade: setor.diagnosticoCapacidade,
    })
  }

  for (const demanda of planejamento.demandasSetor ?? []) {
    if (!setoresMapeados.has(demanda.setorId)) {
      setoresMapeados.set(demanda.setorId, {
        setorId: demanda.setorId,
        setorCodigo: demanda.setorCodigo,
        setorNome: demanda.setorNome,
        operadoresAlocados: undefined,
        capacidadeMinutosTotal: undefined,
        capacidadeMinutosRestante: undefined,
        diagnosticoCapacidade: undefined,
      })
    }
  }

  return [...setoresMapeados.values()]
    .sort(compararSetoresPorOrdem)
    .map((setor) => {
      const demandasAtivas = (planejamento.demandasSetor ?? [])
        .filter((demanda) => demanda.setorId === setor.setorId)
        .filter((demanda) => !demandaKanbanEstaConcluida(demanda))
        .sort(ordenarDemandasKanban)

      const demandasEmQuadro = demandasAtivas.filter(demandaKanbanTemPresencaRealNoSetor)
      const aguardandoLiberacao = Math.max(demandasAtivas.length - demandasEmQuadro.length, 0)
      const capacidadeTotal = normalizarNumero(setor.capacidadeMinutosTotal)
      const capacidadeRestante = normalizarNumero(setor.capacidadeMinutosRestante)

      return {
        setor,
        demandasAtivas,
        demandasEmQuadro,
        aguardandoLiberacao,
        capacidadeComprometida: Math.max(capacidadeTotal - capacidadeRestante, 0),
      }
    })
}
