import { djangoFetch } from '../client.ts'
import {
  consolidarDemandasPorOperacoes,
  consolidarOpsPorDemandas,
  consolidarSecoesPorOperacoes,
} from '@/lib/utils/consolidacao-turno'
import type { RelatorioFiltros, TurnoOpStatusV2 } from '@/types'
import type { BaseRelatorioV2 } from '@/lib/queries/relatorios-v2'
import {
  type DjangoTurnoJson,
  type DjangoTurnoOpJson,
  type DjangoTurnoSetorDemandaJson,
  type DjangoTurnoSetorOperacaoJson,
  type DjangoTurnoSetorOpJson,
} from './turnos-dashboard-mappers.ts'
import {
  type DjangoOperacaoJson,
  type DjangoOperadorJson,
  type DjangoProdutoJson,
  type DjangoSetorJson,
} from './mappers.ts'
import { obterAccessTokenDjango } from './obter-token-servidor.ts'

const PREFIXO_API = '/api/v1'

interface DjangoRegistroProducaoJson {
  id: string
  operador: string
  operacao: string
  produto: string | null
  quantidade: number
  hora_registro: string
  turno: string | null
  turno_op: string | null
  turno_setor_operacao: string | null
}

async function djangoFetchRelatoriosV2<T>(path: string): Promise<T> {
  const accessToken = await obterAccessTokenDjango()
  return djangoFetch<T>(`${PREFIXO_API}${path}`, { accessToken })
}

function obterDataLocalTurno(iniciadoEm: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
  }).format(new Date(iniciadoEm))
}

function isStringPreenchida(value: string | null): value is string {
  return typeof value === 'string' && value.length > 0
}

function incluirHistoricoLegado(filtros: RelatorioFiltros): boolean {
  return !filtros.turnoId && !filtros.turnoOpId && !filtros.setorId
}

function turnoEstaNoIntervalo(dataHoraAbertura: string, dataInicio: string, dataFim: string): boolean {
  const dataTurno = obterDataLocalTurno(dataHoraAbertura)
  return dataTurno >= dataInicio && dataTurno <= dataFim
}

function registroEstaNoIntervalo(horaRegistro: string, dataInicio: string, dataFim: string): boolean {
  const dataRegistro = obterDataLocalTurno(horaRegistro)
  return dataRegistro >= dataInicio && dataRegistro <= dataFim
}

function consolidarTurnosOpsRelatorio(
  turnosOps: BaseRelatorioV2['turnosOps'],
  demandas: BaseRelatorioV2['demandas']
): BaseRelatorioV2['turnosOps'] {
  const opsConsolidadas = consolidarOpsPorDemandas(
    turnosOps.map((op) => ({
      id: op.id,
      quantidadePlanejada: op.quantidade_planejada,
      quantidadeRealizada: op.quantidade_realizada,
      quantidadeConcluida: op.quantidade_realizada,
      progressoOperacionalPct: 0,
      cargaPlanejadaTp: 0,
      cargaRealizadaTp: 0,
      quantidadePlanejadaRemanescente: Math.max(op.quantidade_planejada - op.quantidade_realizada, 0),
      status: op.status as TurnoOpStatusV2,
    })),
    demandas.map((demanda) => ({
      id: demanda.id,
      turnoOpId: demanda.turno_op_id,
      turnoSetorId: demanda.turno_setor_id,
      turnoSetorOpLegacyId: demanda.turno_setor_op_legacy_id,
      quantidadePlanejada: demanda.quantidade_planejada,
      quantidadeRealizada: demanda.quantidade_realizada,
      quantidadeConcluida: demanda.quantidade_concluida,
      progressoOperacionalPct: demanda.progresso_operacional_pct,
      cargaPlanejadaTp: demanda.carga_planejada_tp,
      cargaRealizadaTp: demanda.carga_realizada_tp,
      status: demanda.status as
        | 'planejada'
        | 'aberta'
        | 'em_andamento'
        | 'concluida'
        | 'encerrada_manualmente',
    }))
  )

  const opOriginalPorId = new Map(turnosOps.map((op) => [op.id, op]))

  return opsConsolidadas.reduce<BaseRelatorioV2['turnosOps']>((acumulado, opConsolidada) => {
    const opOriginal = opOriginalPorId.get(opConsolidada.id)

    if (!opOriginal) {
      return acumulado
    }

    acumulado.push({
      ...opOriginal,
      quantidade_realizada: opConsolidada.quantidadeRealizada,
      quantidade_concluida: opConsolidada.quantidadeConcluida,
      progresso_operacional_pct: opConsolidada.progressoOperacionalPct,
      carga_planejada_tp: opConsolidada.cargaPlanejadaTp,
      carga_realizada_tp: opConsolidada.cargaRealizadaTp,
      status: opConsolidada.status,
    })

    return acumulado
  }, [])
}

async function carregarRecursosTurnoRelatorio(turnoId: string) {
  const [ops, secoes, demandas, operacoes, registros] = await Promise.all([
    djangoFetchRelatoriosV2<DjangoTurnoOpJson[]>(`/turnos-ops/?turno=${encodeURIComponent(turnoId)}`),
    djangoFetchRelatoriosV2<DjangoTurnoSetorOpJson[]>(`/turnos-secoes/?turno=${encodeURIComponent(turnoId)}`),
    djangoFetchRelatoriosV2<DjangoTurnoSetorDemandaJson[]>(
      `/turnos-demandas/?turno=${encodeURIComponent(turnoId)}`
    ),
    djangoFetchRelatoriosV2<DjangoTurnoSetorOperacaoJson[]>(
      `/turnos-operacoes/?turno=${encodeURIComponent(turnoId)}`
    ),
    djangoFetchRelatoriosV2<DjangoRegistroProducaoJson[]>(
      `/producao/registros/?turno=${encodeURIComponent(turnoId)}`
    ),
  ])

  return { ops, secoes, demandas, operacoes, registros }
}

export async function carregarBaseRelatorioV2Django(filtros: RelatorioFiltros): Promise<BaseRelatorioV2> {
  const deveIncluirLegado = incluirHistoricoLegado(filtros)

  let turnosDjango: DjangoTurnoJson[]
  try {
    turnosDjango = await djangoFetchRelatoriosV2<DjangoTurnoJson[]>('/turnos/')
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : String(error)
    throw new Error(`Erro ao buscar turnos do relatório V2: ${mensagem}`)
  }

  let turnosFiltrados = turnosDjango.filter((turno) =>
    turnoEstaNoIntervalo(turno.data_hora_abertura, filtros.dataInicio, filtros.dataFim)
  )

  if (filtros.turnoId) {
    turnosFiltrados = turnosFiltrados.filter((turno) => turno.id === filtros.turnoId)
  }

  const turnos: BaseRelatorioV2['turnos'] = turnosFiltrados.map((turno) => ({
    id: turno.id,
    iniciado_em: turno.data_hora_abertura,
    status: turno.status,
  }))

  const recursosPorTurno = await Promise.all(
    turnosFiltrados.map((turno) => carregarRecursosTurnoRelatorio(turno.id))
  )

  let turnosOps: BaseRelatorioV2['turnosOps'] = recursosPorTurno.flatMap(({ ops }) =>
    ops.map((op) => ({
      id: op.id,
      turno_id: op.turno,
      numero_op: op.numero_op,
      produto_id: op.produto,
      quantidade_planejada: op.quantidade_planejada,
      quantidade_realizada: op.quantidade_realizada,
      status: op.status,
      quantidade_concluida: op.quantidade_realizada,
      progresso_operacional_pct: 0,
      carga_planejada_tp: 0,
      carga_realizada_tp: 0,
    }))
  )

  if (filtros.turnoOpId) {
    turnosOps = turnosOps.filter((op) => op.id === filtros.turnoOpId)
  }

  const turnoOpIds = new Set(turnosOps.map((op) => op.id))

  let secoes: BaseRelatorioV2['secoes'] = recursosPorTurno.flatMap(({ secoes: secoesTurno }) =>
    secoesTurno
      .filter((secao) => turnoOpIds.has(secao.turno_op))
      .map((secao) => ({
        id: secao.id,
        turno_op_id: secao.turno_op,
        setor_id: secao.setor,
        quantidade_planejada: secao.quantidade_planejada,
        quantidade_realizada: secao.quantidade_realizada,
        status: secao.status,
        quantidade_concluida: secao.quantidade_realizada,
        progresso_operacional_pct: 0,
        carga_planejada_tp: 0,
        carga_realizada_tp: 0,
      }))
  )

  let demandasBrutas = recursosPorTurno.flatMap(({ demandas: demandasTurno }) =>
    demandasTurno.filter((demanda) => turnoOpIds.has(demanda.turno_op))
  )

  if (filtros.setorId) {
    secoes = secoes.filter((secao) => secao.setor_id === filtros.setorId)
    demandasBrutas = demandasBrutas.filter((demanda) => demanda.setor === filtros.setorId)
  }

  let turnosSetorOperacoes: BaseRelatorioV2['turnosSetorOperacoes'] = recursosPorTurno.flatMap(
    ({ operacoes }) =>
      operacoes
        .filter((operacao) => turnoOpIds.has(operacao.turno_op))
        .map((operacao) => ({
          id: operacao.id,
          turno_op_id: operacao.turno_op,
          turno_setor_op_id: operacao.turno_setor_op ?? '',
          turno_setor_demanda_id: operacao.turno_setor_demanda,
          operacao_id: operacao.operacao,
          quantidade_planejada: operacao.quantidade_planejada,
          quantidade_realizada: operacao.quantidade_realizada,
          tempo_padrao_min_snapshot: Number.parseFloat(operacao.tempo_padrao_min_snapshot) || 0,
          status: operacao.status,
        }))
  )

  if (filtros.setorId) {
    turnosSetorOperacoes = turnosSetorOperacoes.filter(
      (operacao) =>
        demandasBrutas.some(
          (demanda) =>
            demanda.id === operacao.turno_setor_demanda_id && demanda.setor === filtros.setorId
        )
    )
  }

  const demandasConsolidadas = consolidarDemandasPorOperacoes(
    demandasBrutas.map((demanda) => ({
      id: demanda.id,
      turnoSetorId: demanda.turno_setor,
      turnoOpId: demanda.turno_op,
      setorId: demanda.setor,
      turnoSetorOpLegacyId: demanda.turno_setor_op_legacy_id,
      quantidadePlanejada: demanda.quantidade_planejada,
      quantidadeRealizada: demanda.quantidade_realizada,
      quantidadeConcluida: demanda.quantidade_realizada,
      progressoOperacionalPct: 0,
      cargaPlanejadaTp: 0,
      cargaRealizadaTp: 0,
      status: demanda.status as
        | 'planejada'
        | 'aberta'
        | 'em_andamento'
        | 'concluida'
        | 'encerrada_manualmente',
    })),
    turnosSetorOperacoes.map((operacao) => ({
      turnoOpId: operacao.turno_op_id,
      turnoSetorOpId: operacao.turno_setor_op_id,
      turnoSetorId: null,
      turnoSetorDemandaId: operacao.turno_setor_demanda_id,
      quantidadePlanejada: operacao.quantidade_planejada,
      quantidadeRealizada: operacao.quantidade_realizada,
      tempoPadraoMinSnapshot: operacao.tempo_padrao_min_snapshot,
      status: operacao.status as
        | 'planejada'
        | 'aberta'
        | 'em_andamento'
        | 'concluida'
        | 'encerrada_manualmente',
    }))
  ).map((demanda) => ({
    id: demanda.id,
    turno_setor_id: demanda.turnoSetorId,
    turno_op_id: demanda.turnoOpId,
    setor_id: demanda.setorId,
    turno_setor_op_legacy_id: demanda.turnoSetorOpLegacyId,
    quantidade_planejada: demanda.quantidadePlanejada,
    quantidade_realizada: demanda.quantidadeRealizada,
    quantidade_concluida: demanda.quantidadeConcluida,
    progresso_operacional_pct: demanda.progressoOperacionalPct,
    carga_planejada_tp: demanda.cargaPlanejadaTp,
    carga_realizada_tp: demanda.cargaRealizadaTp,
    status: demanda.status,
  }))

  const secoesConsolidadas = consolidarSecoesPorOperacoes(
    secoes.map((secao) => ({
      id: secao.id,
      turnoOpId: secao.turno_op_id,
      setorId: secao.setor_id,
      quantidadePlanejada: secao.quantidade_planejada,
      quantidadeRealizada: secao.quantidade_realizada,
      quantidadeConcluida: secao.quantidade_realizada,
      progressoOperacionalPct: 0,
      cargaPlanejadaTp: 0,
      cargaRealizadaTp: 0,
      status: secao.status as
        | 'planejada'
        | 'aberta'
        | 'em_andamento'
        | 'concluida'
        | 'encerrada_manualmente',
    })),
    turnosSetorOperacoes.map((operacao) => ({
      turnoOpId: operacao.turno_op_id,
      turnoSetorOpId: operacao.turno_setor_op_id,
      turnoSetorId: null,
      turnoSetorDemandaId: operacao.turno_setor_demanda_id,
      quantidadePlanejada: operacao.quantidade_planejada,
      quantidadeRealizada: operacao.quantidade_realizada,
      tempoPadraoMinSnapshot: operacao.tempo_padrao_min_snapshot,
      status: operacao.status as
        | 'planejada'
        | 'aberta'
        | 'em_andamento'
        | 'concluida'
        | 'encerrada_manualmente',
    }))
  ).map((secao) => ({
    id: secao.id,
    turno_op_id: secao.turnoOpId,
    setor_id: secao.setorId,
    quantidade_planejada: secao.quantidadePlanejada,
    quantidade_realizada: secao.quantidadeRealizada,
    quantidade_concluida: secao.quantidadeConcluida,
    progresso_operacional_pct: secao.progressoOperacionalPct,
    carga_planejada_tp: secao.cargaPlanejadaTp,
    carga_realizada_tp: secao.cargaRealizadaTp,
    status: secao.status,
  }))

  const turnoSetorOperacaoIds = new Set(turnosSetorOperacoes.map((operacao) => operacao.id))
  const operacaoPorId = new Map(turnosSetorOperacoes.map((operacao) => [operacao.id, operacao]))

  const registrosBrutos = recursosPorTurno.flatMap(({ registros }) => registros)
  const registrosFiltrados = registrosBrutos.filter((registro) => {
    if (!registro.turno_setor_operacao || !turnoSetorOperacaoIds.has(registro.turno_setor_operacao)) {
      return false
    }

    if (!registroEstaNoIntervalo(registro.hora_registro, filtros.dataInicio, filtros.dataFim)) {
      return false
    }

    if (filtros.operadorId && registro.operador !== filtros.operadorId) {
      return false
    }

    return true
  })

  const registros: BaseRelatorioV2['registros'] = registrosFiltrados.map((registro) => {
    const operacaoTurno = operacaoPorId.get(registro.turno_setor_operacao ?? '')

    return {
      id: registro.id,
      configuracao_turno_bloco_id: null,
      turno_op_id: registro.turno_op,
      turno_setor_op_id: operacaoTurno?.turno_setor_op_id ?? null,
      turno_setor_operacao_id: registro.turno_setor_operacao,
      operacao_id: registro.operacao,
      operador_id: registro.operador,
      produto_id: registro.produto,
      quantidade: registro.quantidade,
      hora_registro: registro.hora_registro,
      data_producao: obterDataLocalTurno(registro.hora_registro),
    }
  })

  const turnosOpsConsolidadas = consolidarTurnosOpsRelatorio(turnosOps, demandasConsolidadas)

  const setorIds = Array.from(
    new Set(
      [...secoesConsolidadas, ...demandasConsolidadas]
        .map((item) => item.setor_id)
        .filter(isStringPreenchida)
    )
  )

  const produtoIds = Array.from(
    new Set(turnosOps.map((op) => op.produto_id).filter(isStringPreenchida))
  )
  const operacaoIds = Array.from(
    new Set(turnosSetorOperacoes.map((operacao) => operacao.operacao_id).filter(isStringPreenchida))
  )
  const operadorIds = Array.from(
    new Set(registros.map((registro) => registro.operador_id).filter(isStringPreenchida))
  )

  const [setoresResposta, produtosResposta, operacoesResposta, operadoresResposta] = await Promise.all([
    setorIds.length === 0
      ? Promise.resolve([] as DjangoSetorJson[])
      : djangoFetchRelatoriosV2<DjangoSetorJson[]>('/cadastros/setores/').then((setores) =>
          setores.filter((setor) => setorIds.includes(setor.id))
        ),
    produtoIds.length === 0
      ? Promise.resolve([] as DjangoProdutoJson[])
      : djangoFetchRelatoriosV2<DjangoProdutoJson[]>('/produtos/').then((produtos) =>
          produtos.filter((produto) => produtoIds.includes(produto.id))
        ),
    operacaoIds.length === 0
      ? Promise.resolve([] as DjangoOperacaoJson[])
      : djangoFetchRelatoriosV2<DjangoOperacaoJson[]>('/cadastros/operacoes/').then((operacoes) =>
          operacoes.filter((operacao) => operacaoIds.includes(operacao.id))
        ),
    operadorIds.length === 0
      ? Promise.resolve([] as DjangoOperadorJson[])
      : djangoFetchRelatoriosV2<DjangoOperadorJson[]>('/cadastros/operadores/').then((operadores) =>
          operadores.filter((operador) => operadorIds.includes(operador.id))
        ),
  ])

  const configuracoesLegadas: BaseRelatorioV2['configuracoesLegadas'] = deveIncluirLegado
    ? turnosFiltrados
        .filter((turno) => turno.meta_grupo != null)
        .map((turno) => ({
          data: obterDataLocalTurno(turno.data_hora_abertura),
          meta_grupo: turno.meta_grupo,
        }))
    : []

  return {
    blocosLegados: [],
    configuracoesLegadas,
    operacoes: operacoesResposta.map((operacao) => ({
      id: operacao.id,
      codigo: operacao.codigo,
      descricao: operacao.descricao,
    })),
    operadoresComRegistro: operadoresResposta.map((operador) => ({
      id: operador.id,
      nome: operador.nome,
    })),
    produtos: produtosResposta.map((produto) => ({
      id: produto.id,
      nome: produto.nome,
      referencia: produto.codigo,
    })),
    registros,
    registrosLegados: [],
    demandas: demandasConsolidadas,
    secoes: secoesConsolidadas,
    setores: setoresResposta.map((setor) => ({
      id: setor.id,
      nome: setor.nome,
    })),
    turnos,
    turnosOps: turnosOpsConsolidadas,
    turnosSetorOperacoes,
  }
}
