import { compararSetoresPorOrdem } from './setor-ordem.ts'
import { mapearEtapaFluxoCosturaPorNomeSetor } from './fluxo-paralelo-turno.ts'
import type {
  EtapaFluxoChaveV2,
  PlanejamentoTurnoDashboardV2,
  PosicaoFluxoAtivaOpV2,
  TurnoOpV2,
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
    | 'capacidadeMinutosConsumida'
    | 'capacidadeMinutosReservada'
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

export interface ResumoFluxoParaleloDemandaKanban {
  etapaAtual: EtapaFluxoChaveV2 | null
  fluxoParaleloAtivo: boolean
  posicoesFluxoAtivas: PosicaoFluxoAtivaOpV2[]
  posicoesSimultaneas: PosicaoFluxoAtivaOpV2[]
  quantidadeSincronizadaMontagem: number
  quantidadeBloqueadaSincronizacao: number
}

function normalizarNumero(valor?: number | null): number {
  return Number.isFinite(valor) ? Number(valor) : 0
}

function normalizarPosicoesFluxoAtivas(
  posicoesFluxoAtivas?: PosicaoFluxoAtivaOpV2[]
): PosicaoFluxoAtivaOpV2[] {
  return Array.isArray(posicoesFluxoAtivas) ? posicoesFluxoAtivas : []
}

function resolverEtapaAtualDemanda(
  demanda?: Pick<TurnoSetorDemandaV2, 'etapaFluxoChave' | 'setorNome'> | null
): EtapaFluxoChaveV2 | null {
  if (!demanda) {
    return null
  }

  return demanda.etapaFluxoChave ?? mapearEtapaFluxoCosturaPorNomeSetor(demanda.setorNome)
}

export function resumirFluxoParaleloDemandaKanban(
  op?: Pick<
    TurnoOpV2,
    'posicoesFluxoAtivas' | 'quantidadeSincronizadaMontagem' | 'quantidadeBloqueadaSincronizacao'
  > | null,
  demanda?: Pick<
    TurnoSetorDemandaV2,
    | 'etapaFluxoChave'
    | 'setorNome'
    | 'quantidadeSincronizadaMontagem'
    | 'quantidadeBloqueadaSincronizacao'
  > | null
): ResumoFluxoParaleloDemandaKanban {
  const posicoesFluxoAtivas = normalizarPosicoesFluxoAtivas(op?.posicoesFluxoAtivas)
  const etapaAtual = resolverEtapaAtualDemanda(demanda)
  const fluxoParaleloAtivo =
    posicoesFluxoAtivas.some((posicao) => posicao.etapa === 'frente') &&
    posicoesFluxoAtivas.some((posicao) => posicao.etapa === 'costa')
  const posicoesSimultaneas =
    etapaAtual === 'frente' || etapaAtual === 'costa'
      ? posicoesFluxoAtivas.filter(
          (posicao) =>
            (posicao.etapa === 'frente' || posicao.etapa === 'costa') &&
            posicao.etapa !== etapaAtual
        )
      : []

  return {
    etapaAtual,
    fluxoParaleloAtivo,
    posicoesFluxoAtivas,
    posicoesSimultaneas,
    quantidadeSincronizadaMontagem: normalizarNumero(
      op?.quantidadeSincronizadaMontagem ?? demanda?.quantidadeSincronizadaMontagem
    ),
    quantidadeBloqueadaSincronizacao: normalizarNumero(
      op?.quantidadeBloqueadaSincronizacao ?? demanda?.quantidadeBloqueadaSincronizacao
    ),
  }
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
    normalizarNumero(demanda.quantidadeDisponivelApontamento) > 0 ||
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
      capacidadeMinutosConsumida: setor.capacidadeMinutosConsumida,
      capacidadeMinutosReservada: setor.capacidadeMinutosReservada,
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
        capacidadeMinutosConsumida: undefined,
        capacidadeMinutosReservada: undefined,
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
