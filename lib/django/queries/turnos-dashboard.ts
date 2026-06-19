import { DjangoApiError, djangoFetch } from '../client.ts'
import {
  consolidarDemandasPorOperacoes,
  consolidarOpsPorDemandas,
  consolidarSecoesPorOperacoes,
  consolidarSetoresPorDemandas,
} from '@/lib/utils/consolidacao-turno'
import {
  aplicarCapacidadeOperacionalDemandas,
  hidratarSetoresTurnoComCapacidade,
  limitarOperacoesTurnoAoAceiteDemandas,
  limitarSecoesTurnoAoAceiteDemandas,
} from '@/lib/utils/hidratacao-capacidade-setor-turno'
import { enriquecerDemandasComFluxoParalelo } from '@/lib/utils/fluxo-paralelo-turno'
import { calcularMetaGrupoTurnoV2 } from '@/lib/utils/meta-grupo-turno'
import { compararSetoresPorOrdem } from '@/lib/utils/setor-ordem'
import type {
  OrigemPlanejamentoTurnoV2,
  PlanejamentoTurnoDashboardV2,
  PlanejamentoTurnoV2,
  TurnoSetorDemandaV2,
  TurnoOpV2,
} from '@/types'
import { resolverResumoFluxoOpParalelo } from '@/lib/utils/fluxo-paralelo-turno'

import {
  mapearTurnoDjango,
  mapearTurnoOperadoresDjango,
  mapearTurnoOpsDjango,
  mapearTurnoSetorDemandasDjango,
  mapearTurnoSetorOperacoesDjango,
  mapearTurnoSetorOpsDjango,
  mapearTurnoSetoresAtivosDjango,
  type DjangoTurnoJson,
  type DjangoTurnoOpJson,
  type DjangoTurnoOperadorJson,
  type DjangoTurnoSetorDemandaJson,
  type DjangoTurnoSetorJson,
  type DjangoTurnoSetorOperacaoJson,
  type DjangoTurnoSetorOpJson,
} from './turnos-dashboard-mappers.ts'
import { obterAccessTokenDjango } from './obter-token-servidor.ts'

const PREFIXO_TURNOS = '/api/v1'

async function djangoFetchTurnosDashboard<T>(path: string): Promise<T> {
  const accessToken = await obterAccessTokenDjango()
  return djangoFetch<T>(`${PREFIXO_TURNOS}${path}`, { accessToken })
}

async function buscarRecursoTurnoOuNull<T>(path: string): Promise<T | null> {
  try {
    return await djangoFetchTurnosDashboard<T>(path)
  } catch (error) {
    if (error instanceof DjangoApiError && error.status === 404) {
      return null
    }

    throw error
  }
}

function enriquecerOpsComPosicaoFluxo(
  ops: TurnoOpV2[],
  demandas: TurnoSetorDemandaV2[]
): TurnoOpV2[] {
  const demandasPorOp = new Map<string, TurnoSetorDemandaV2[]>()

  for (const demanda of demandas) {
    const grupo = demandasPorOp.get(demanda.turnoOpId) ?? []
    grupo.push(demanda)
    demandasPorOp.set(demanda.turnoOpId, grupo)
  }

  return ops.map((op) => {
    const posicaoFluxo = resolverResumoFluxoOpParalelo(demandasPorOp.get(op.id) ?? [])

    return {
      ...op,
      setorFluxoAtualId: posicaoFluxo.setorFluxoAtualId,
      setorFluxoAtualCodigo: posicaoFluxo.setorFluxoAtualCodigo,
      setorFluxoAtualNome: posicaoFluxo.setorFluxoAtualNome,
      ordemFluxoAtual: posicaoFluxo.ordemFluxoAtual,
      statusFilaAtual: posicaoFluxo.statusFilaAtual,
      quantidadePendenteAtual: posicaoFluxo.quantidadePendenteAtual,
      posicoesFluxoAtivas: posicaoFluxo.posicoesFluxoAtivas,
      quantidadeSincronizadaMontagem: posicaoFluxo.quantidadeSincronizadaMontagem,
      quantidadeBloqueadaSincronizacao: posicaoFluxo.quantidadeBloqueadaSincronizacao,
    }
  })
}

async function carregarRecursosTurno(turnoId: string) {
  const [
    turno,
    operadores,
    ops,
    setoresAtivos,
    secoesSetorOp,
    demandas,
    operacoesSecao,
  ] = await Promise.all([
    djangoFetchTurnosDashboard<DjangoTurnoJson>(`/turnos/${turnoId}/`),
    djangoFetchTurnosDashboard<DjangoTurnoOperadorJson[]>(
      `/turnos-operadores/?turno=${encodeURIComponent(turnoId)}`
    ),
    djangoFetchTurnosDashboard<DjangoTurnoOpJson[]>(
      `/turnos-ops/?turno=${encodeURIComponent(turnoId)}`
    ),
    djangoFetchTurnosDashboard<DjangoTurnoSetorJson[]>(
      `/turnos-setores/?turno=${encodeURIComponent(turnoId)}`
    ),
    djangoFetchTurnosDashboard<DjangoTurnoSetorOpJson[]>(
      `/turnos-secoes/?turno=${encodeURIComponent(turnoId)}`
    ),
    djangoFetchTurnosDashboard<DjangoTurnoSetorDemandaJson[]>(
      `/turnos-demandas/?turno=${encodeURIComponent(turnoId)}`
    ),
    djangoFetchTurnosDashboard<DjangoTurnoSetorOperacaoJson[]>(
      `/turnos-operacoes/?turno=${encodeURIComponent(turnoId)}`
    ),
  ])

  return {
    turno,
    operadores,
    ops,
    setoresAtivos,
    secoesSetorOp,
    demandas,
    operacoesSecao,
  }
}

export async function buscarPlanejamentoTurnoPorIdDjango(
  turnoId: string
): Promise<PlanejamentoTurnoV2 | null> {
  let recursos

  try {
    recursos = await carregarRecursosTurno(turnoId)
  } catch (error) {
    if (error instanceof DjangoApiError && error.status === 404) {
      return null
    }

    throw error
  }

  const turnoMapeadoBase = mapearTurnoDjango(recursos.turno)
  const operadores = mapearTurnoOperadoresDjango(recursos.operadores)
  const ops = mapearTurnoOpsDjango(recursos.ops)
  const setoresAtivosBrutos = mapearTurnoSetoresAtivosDjango(recursos.setoresAtivos)
  const secoesSetorOp = mapearTurnoSetorOpsDjango(recursos.secoesSetorOp).sort(compararSetoresPorOrdem)
  const operacoesSecao = mapearTurnoSetorOperacoesDjango(recursos.operacoesSecao)
  const demandasSetorBrutas = mapearTurnoSetorDemandasDjango(recursos.demandas, ops)

  const resumoCapacidadeGlobal = calcularMetaGrupoTurnoV2(turnoMapeadoBase, ops)
  const turnoMapeado = {
    ...turnoMapeadoBase,
    mediaTpProdutoCapacidade: resumoCapacidadeGlobal.mediaTpProduto,
    capacidadeGlobalTurnoPecas: resumoCapacidadeGlobal.capacidadeGlobalTurnoPecas,
  }

  const quantidadeRealizadaAtualPorOperacaoId = new Map<string, number>()
  for (const operacao of operacoesSecao) {
    quantidadeRealizadaAtualPorOperacaoId.set(operacao.id, operacao.quantidadeRealizada)
  }

  const demandasSetorFluxo = enriquecerDemandasComFluxoParalelo(
    consolidarDemandasPorOperacoes(demandasSetorBrutas, operacoesSecao)
  )
  const demandasSetor = aplicarCapacidadeOperacionalDemandas({
    turno: turnoMapeado,
    demandasSetor: demandasSetorFluxo,
    operacoesSecao,
    ops,
    quantidadeRealizadaAtualPorOperacaoId,
  })
  const operacoesSecaoLimitadas = limitarOperacoesTurnoAoAceiteDemandas({
    operacoesSecao,
    demandasSetor,
  })
  const secoesSetorOpConsolidadas = limitarSecoesTurnoAoAceiteDemandas({
    secoesSetorOp: consolidarSecoesPorOperacoes(secoesSetorOp, operacoesSecaoLimitadas),
    demandasSetor,
  })
  const setoresAtivosConsolidados = hidratarSetoresTurnoComCapacidade({
    turno: turnoMapeado,
    setoresAtivos: consolidarSetoresPorDemandas(setoresAtivosBrutos, demandasSetor),
    demandasSetor,
    operacoesSecao: operacoesSecaoLimitadas,
    ops,
    quantidadeRealizadaAtualPorOperacaoId,
  })
  const opsConsolidadas = enriquecerOpsComPosicaoFluxo(
    consolidarOpsPorDemandas(ops, demandasSetor),
    demandasSetor
  )

  return {
    turno: turnoMapeado,
    operadores,
    operadoresAtividadeSetor: [],
    ops: opsConsolidadas,
    setoresAtivos: setoresAtivosConsolidados,
    demandasSetor,
    secoesSetorOp: secoesSetorOpConsolidadas,
    operacoesSecao: operacoesSecaoLimitadas,
    eficienciaOperacional: undefined,
    qualidadeResumoOps: [],
    resumoQualidadeTurno: null,
    indicadoresQualidadeTurno: null,
  }
}

export async function buscarTurnoAbertoDjango(): Promise<PlanejamentoTurnoV2 | null> {
  const turno = await buscarRecursoTurnoOuNull<DjangoTurnoJson>('/turnos/aberto/')

  if (!turno) {
    return null
  }

  return buscarPlanejamentoTurnoPorIdDjango(turno.id)
}

export async function buscarUltimoTurnoEncerradoDjango(): Promise<PlanejamentoTurnoV2 | null> {
  const turno = await buscarRecursoTurnoOuNull<DjangoTurnoJson>('/turnos/ultimo-encerrado/')

  if (!turno) {
    return null
  }

  return buscarPlanejamentoTurnoPorIdDjango(turno.id)
}

export async function buscarTurnoAbertoOuUltimoEncerradoDjango(): Promise<PlanejamentoTurnoDashboardV2 | null> {
  const turnoAberto = await buscarTurnoAbertoDjango()

  if (turnoAberto) {
    return {
      ...turnoAberto,
      origem: 'aberto' satisfies OrigemPlanejamentoTurnoV2,
    }
  }

  const ultimoTurnoEncerrado = await buscarUltimoTurnoEncerradoDjango()

  if (!ultimoTurnoEncerrado) {
    return null
  }

  return {
    ...ultimoTurnoEncerrado,
    origem: 'ultimo_encerrado' satisfies OrigemPlanejamentoTurnoV2,
  }
}
