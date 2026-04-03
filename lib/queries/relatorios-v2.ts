import { createClient } from '@/lib/supabase/server'
import {
  consolidarDemandasPorOperacoes,
  consolidarOpsPorDemandas,
  consolidarSecoesPorOperacoes,
} from '@/lib/utils/consolidacao-turno'
import type {
  ComparativoMetaGrupoItem,
  RelatorioFiltros,
  RelatorioRegistroItem,
  RelatorioResumoItem,
  RelatorioSetorOption,
  RelatorioTurnoOpOption,
  RelatorioTurnoOption,
  TurnoOpStatusV2,
} from '@/types'
import type { Tables } from '@/types/supabase'

interface BuscarPaginaRelatoriosV2Params {
  filtros: RelatorioFiltros
  page: number
  pageSize: number
}

export interface BuscarPaginaRelatoriosV2Resultado {
  comparativo: ComparativoMetaGrupoItem[]
  itens: RelatorioRegistroItem[]
  ops: RelatorioTurnoOpOption[]
  resumo: RelatorioResumoItem
  setores: RelatorioSetorOption[]
  total: number
  turnos: RelatorioTurnoOption[]
}

type TurnoRow = Pick<Tables<'turnos'>, 'id' | 'iniciado_em' | 'status'>
type TurnoOpRow = Pick<
  Tables<'turno_ops'>,
  | 'id'
  | 'turno_id'
  | 'numero_op'
  | 'produto_id'
  | 'quantidade_planejada'
  | 'quantidade_realizada'
  | 'status'
>
type TurnoSetorOpRow = Pick<
  Tables<'turno_setor_ops'>,
  'id' | 'turno_op_id' | 'setor_id' | 'quantidade_planejada' | 'quantidade_realizada' | 'status'
>
type TurnoSetorDemandaRow = Pick<
  Tables<'turno_setor_demandas'>,
  | 'id'
  | 'turno_setor_id'
  | 'turno_op_id'
  | 'setor_id'
  | 'turno_setor_op_legacy_id'
  | 'quantidade_planejada'
  | 'quantidade_realizada'
  | 'status'
>
type TurnoSetorOperacaoRow = Pick<
  Tables<'turno_setor_operacoes'>,
  | 'id'
  | 'turno_op_id'
  | 'turno_setor_op_id'
  | 'turno_setor_demanda_id'
  | 'operacao_id'
  | 'quantidade_planejada'
  | 'quantidade_realizada'
  | 'tempo_padrao_min_snapshot'
  | 'status'
>
type RegistroProducaoRow = Pick<
  Tables<'registros_producao'>,
  | 'id'
  | 'configuracao_turno_bloco_id'
  | 'turno_op_id'
  | 'turno_setor_op_id'
  | 'turno_setor_operacao_id'
  | 'operacao_id'
  | 'operador_id'
  | 'produto_id'
  | 'quantidade'
  | 'hora_registro'
  | 'data_producao'
>
type ProdutoResumoRow = Pick<Tables<'produtos'>, 'id' | 'nome' | 'referencia'>
type SetorResumoRow = Pick<Tables<'setores'>, 'id' | 'nome'>
type OperacaoResumoRow = Pick<Tables<'operacoes'>, 'id' | 'codigo' | 'descricao'>
type OperadorResumoRow = Pick<Tables<'operadores'>, 'id' | 'nome'>
type ConfiguracaoMetaRow = Pick<Tables<'configuracao_turno'>, 'data' | 'meta_grupo'>
type BlocoLegadoResumoRow = Pick<Tables<'configuracao_turno_blocos'>, 'id' | 'descricao_bloco'>

interface BaseRelatorioV2 {
  blocosLegados: BlocoLegadoResumoRow[]
  configuracoesLegadas: ConfiguracaoMetaRow[]
  operacoes: OperacaoResumoRow[]
  operadoresComRegistro: OperadorResumoRow[]
  produtos: ProdutoResumoRow[]
  registros: RegistroProducaoRow[]
  registrosLegados: RegistroProducaoRow[]
  demandas: TurnoSetorDemandaRelatorioRow[]
  secoes: TurnoSetorOpRelatorioRow[]
  setores: SetorResumoRow[]
  turnos: TurnoRow[]
  turnosOps: TurnoOpRelatorioRow[]
  turnosSetorOperacoes: TurnoSetorOperacaoRow[]
}

interface TurnoOpRelatorioRow extends TurnoOpRow {
  quantidade_concluida: number
  progresso_operacional_pct: number
  carga_planejada_tp: number
  carga_realizada_tp: number
}

interface TurnoSetorDemandaRelatorioRow extends TurnoSetorDemandaRow {
  quantidade_concluida: number
  progresso_operacional_pct: number
  carga_planejada_tp: number
  carga_realizada_tp: number
}

interface TurnoSetorOpRelatorioRow extends TurnoSetorOpRow {
  quantidade_concluida: number
  progresso_operacional_pct: number
  carga_planejada_tp: number
  carga_realizada_tp: number
}

function formatarTurnoLabel(iniciadoEm: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Fortaleza',
  }).format(new Date(iniciadoEm))
}

function obterDataLocalTurno(iniciadoEm: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
  }).format(new Date(iniciadoEm))
}

function construirInicioIntervalo(data: string): string {
  return `${data}T00:00:00-03:00`
}

function construirFimIntervalo(data: string): string {
  return `${data}T23:59:59.999-03:00`
}

function isStringPreenchida(value: string | null): value is string {
  return typeof value === 'string' && value.length > 0
}

function incluirHistoricoLegado(filtros: RelatorioFiltros): boolean {
  return !filtros.turnoId && !filtros.turnoOpId && !filtros.setorId
}

function construirTimestampLegado(
  dataProducao: string | null,
  horaRegistro: string | null
): string {
  if (horaRegistro) {
    return horaRegistro
  }

  if (dataProducao) {
    return `${dataProducao}T12:00:00-03:00`
  }

  return ''
}

function formatarTurnoLabelLegado(dataProducao: string | null, horaRegistro: string | null): string {
  const timestamp = construirTimestampLegado(dataProducao, horaRegistro)

  if (!timestamp) {
    return 'Histórico legado'
  }

  return `Legado · ${formatarTurnoLabel(timestamp)}`
}

function normalizarStatusResumo(statuses: TurnoOpStatusV2[]): RelatorioResumoItem['statusGeral'] {
  if (statuses.length === 0) {
    return 'planejada'
  }

  const statusUnicos = Array.from(new Set(statuses))

  if (statusUnicos.length === 1) {
    return statusUnicos[0]
  }

  if (statusUnicos.includes('em_andamento')) {
    return 'em_andamento'
  }

  return 'misto'
}

function consolidarTurnosOpsRelatorio(
  turnosOps: TurnoOpRow[],
  demandas: TurnoSetorDemandaRelatorioRow[]
): TurnoOpRelatorioRow[] {
  const opsConsolidadas = consolidarOpsPorDemandas(
    turnosOps.map((op) => ({
      id: op.id,
      quantidadePlanejada: op.quantidade_planejada,
      quantidadeRealizada: op.quantidade_realizada,
      quantidadeConcluida: op.quantidade_realizada,
      progressoOperacionalPct: 0,
      cargaPlanejadaTp: 0,
      cargaRealizadaTp: 0,
      quantidadePlanejadaRemanescente: Math.max(
        op.quantidade_planejada - op.quantidade_realizada,
        0
      ),
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
      status: demanda.status as 'planejada' | 'aberta' | 'em_andamento' | 'concluida' | 'encerrada_manualmente',
    }))
  )

  const opOriginalPorId = new Map(turnosOps.map((op) => [op.id, op]))

  return opsConsolidadas.reduce<TurnoOpRelatorioRow[]>((acumulado, opConsolidada) => {
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

async function carregarBaseRelatorioV2(filtros: RelatorioFiltros): Promise<BaseRelatorioV2> {
  const supabase = await createClient()
  const inicioIntervalo = construirInicioIntervalo(filtros.dataInicio)
  const fimIntervalo = construirFimIntervalo(filtros.dataFim)
  const deveIncluirLegado = incluirHistoricoLegado(filtros)

  let turnosQuery = supabase
    .from('turnos')
    .select('id, iniciado_em, status')
    .gte('iniciado_em', inicioIntervalo)
    .lte('iniciado_em', fimIntervalo)
    .order('iniciado_em', { ascending: false })

  if (filtros.turnoId) {
    turnosQuery = turnosQuery.eq('id', filtros.turnoId)
  }

  const { data: turnos, error: turnosError } = await turnosQuery.returns<TurnoRow[]>()

  if (turnosError) {
    throw new Error(`Erro ao buscar turnos do relatório V2: ${turnosError.message}`)
  }

  const [legadoResult, configuracoesLegadasResult] = await Promise.all([
    !deveIncluirLegado
      ? Promise.resolve<{ data: RegistroProducaoRow[]; error: null }>({ data: [], error: null })
      : (() => {
          let legadoQuery = supabase
            .from('registros_producao')
            .select(
              'id, configuracao_turno_bloco_id, turno_op_id, turno_setor_op_id, turno_setor_operacao_id, operacao_id, operador_id, produto_id, quantidade, hora_registro, data_producao'
            )
            .is('turno_op_id', null)
            .is('turno_setor_op_id', null)
            .is('turno_setor_operacao_id', null)
            .gte('data_producao', filtros.dataInicio)
            .lte('data_producao', filtros.dataFim)
            .order('hora_registro', { ascending: false })

          if (filtros.operadorId) {
            legadoQuery = legadoQuery.eq('operador_id', filtros.operadorId)
          }

          return legadoQuery.returns<RegistroProducaoRow[]>()
        })(),
    !deveIncluirLegado
      ? Promise.resolve<{ data: ConfiguracaoMetaRow[]; error: null }>({ data: [], error: null })
      : supabase
          .from('configuracao_turno')
          .select('data, meta_grupo')
          .gte('data', filtros.dataInicio)
          .lte('data', filtros.dataFim)
          .order('data', { ascending: true })
          .returns<ConfiguracaoMetaRow[]>(),
  ])

  if (legadoResult.error) {
    throw new Error(
      `Erro ao buscar registros legados para compatibilidade do relatório: ${legadoResult.error.message}`
    )
  }

  if (configuracoesLegadasResult.error) {
    throw new Error(
      `Erro ao buscar metas legadas para compatibilidade do relatório: ${configuracoesLegadasResult.error.message}`
    )
  }

  const registrosLegados = legadoResult.data ?? []
  const turnoIds = (turnos ?? []).map((turno) => turno.id)
  const { data: turnosOps, error: turnosOpsError } =
    turnoIds.length === 0
      ? { data: [] as TurnoOpRow[], error: null }
      : await (() => {
          let turnosOpsQuery = supabase
            .from('turno_ops')
            .select(
              'id, turno_id, numero_op, produto_id, quantidade_planejada, quantidade_realizada, status'
            )
            .in('turno_id', turnoIds)
            .order('created_at', { ascending: true })

          if (filtros.turnoOpId) {
            turnosOpsQuery = turnosOpsQuery.eq('id', filtros.turnoOpId)
          }

          return turnosOpsQuery.returns<TurnoOpRow[]>()
        })()

  if (turnosOpsError) {
    throw new Error(`Erro ao buscar OPs do relatório V2: ${turnosOpsError.message}`)
  }

  const turnoOpIds = (turnosOps ?? []).map((op) => op.id)
  const [{ data: secoes, error: secoesError }, { data: demandas, error: demandasError }] =
    turnoOpIds.length === 0
      ? [
          { data: [] as TurnoSetorOpRow[], error: null },
          { data: [] as TurnoSetorDemandaRow[], error: null },
        ]
      : await Promise.all([
          (() => {
            let secoesQuery = supabase
              .from('turno_setor_ops')
              .select('id, turno_op_id, setor_id, quantidade_planejada, quantidade_realizada, status')
              .in('turno_op_id', turnoOpIds)
              .order('created_at', { ascending: true })

            if (filtros.setorId) {
              secoesQuery = secoesQuery.eq('setor_id', filtros.setorId)
            }

            return secoesQuery.returns<TurnoSetorOpRow[]>()
          })(),
          (() => {
            let demandasQuery = supabase
              .from('turno_setor_demandas')
              .select(
                'id, turno_setor_id, turno_op_id, setor_id, turno_setor_op_legacy_id, quantidade_planejada, quantidade_realizada, status'
              )
              .in('turno_op_id', turnoOpIds)
              .order('created_at', { ascending: true })

            if (filtros.setorId) {
              demandasQuery = demandasQuery.eq('setor_id', filtros.setorId)
            }

            return demandasQuery.returns<TurnoSetorDemandaRow[]>()
          })(),
        ])

  if (secoesError) {
    throw new Error(`Erro ao buscar seções do relatório V2: ${secoesError.message}`)
  }

  if (demandasError) {
    throw new Error(`Erro ao buscar demandas setoriais do relatório V2: ${demandasError.message}`)
  }

  const secaoIds = (secoes ?? []).map((secao) => secao.id)
  const setorIds = Array.from(
    new Set(
      [...(secoes ?? []).map((secao) => secao.setor_id), ...(demandas ?? []).map((demanda) => demanda.setor_id)].filter(
        isStringPreenchida
      )
    )
  )
  const [
    { data: turnosSetorOperacoes, error: operacoesTurnoError },
    { data: setores, error: setoresError },
  ] = await Promise.all([
    secaoIds.length === 0
      ? Promise.resolve<{ data: TurnoSetorOperacaoRow[]; error: null }>({ data: [], error: null })
      : supabase
          .from('turno_setor_operacoes')
          .select(
            'id, turno_op_id, turno_setor_op_id, turno_setor_demanda_id, operacao_id, quantidade_planejada, quantidade_realizada, tempo_padrao_min_snapshot, status'
          )
          .in('turno_op_id', turnoOpIds)
          .order('created_at', { ascending: true })
          .returns<TurnoSetorOperacaoRow[]>(),
    setorIds.length === 0
      ? Promise.resolve<{ data: SetorResumoRow[]; error: null }>({ data: [], error: null })
      : supabase
          .from('setores')
          .select('id, nome')
          .in('id', setorIds)
          .returns<SetorResumoRow[]>(),
  ])

  if (operacoesTurnoError) {
    throw new Error(
      `Erro ao buscar operações derivadas das seções para relatório: ${operacoesTurnoError.message}`
    )
  }

  if (setoresError) {
    throw new Error(`Erro ao buscar setores do relatório V2: ${setoresError.message}`)
  }

  const demandasConsolidadas = consolidarDemandasPorOperacoes(
    (demandas ?? []).map((demanda) => ({
      ...demanda,
      turnoSetorId: demanda.turno_setor_id,
      turnoOpId: demanda.turno_op_id,
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
    (turnosSetorOperacoes ?? []).map((operacao) => ({
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
    ...demanda,
    turno_setor_id: demanda.turnoSetorId,
    turno_op_id: demanda.turnoOpId,
    turno_setor_op_legacy_id: demanda.turnoSetorOpLegacyId,
    quantidade_planejada: demanda.quantidadePlanejada,
    quantidade_realizada: demanda.quantidadeRealizada,
    quantidade_concluida: demanda.quantidadeConcluida,
    progresso_operacional_pct: demanda.progressoOperacionalPct,
    carga_planejada_tp: demanda.cargaPlanejadaTp,
    carga_realizada_tp: demanda.cargaRealizadaTp,
    status: demanda.status,
  })) as TurnoSetorDemandaRelatorioRow[]

  const secoesConsolidadas = consolidarSecoesPorOperacoes(
    (secoes ?? []).map((secao) => ({
      ...secao,
      turnoOpId: secao.turno_op_id,
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
    (turnosSetorOperacoes ?? []).map((operacao) => ({
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
    ...secao,
    turno_op_id: secao.turnoOpId,
    quantidade_planejada: secao.quantidadePlanejada,
    quantidade_realizada: secao.quantidadeRealizada,
    quantidade_concluida: secao.quantidadeConcluida,
    progresso_operacional_pct: secao.progressoOperacionalPct,
    carga_planejada_tp: secao.cargaPlanejadaTp,
    carga_realizada_tp: secao.cargaRealizadaTp,
    status: secao.status,
  })) as TurnoSetorOpRelatorioRow[]

  const turnoSetorOperacaoIds = (turnosSetorOperacoes ?? []).map((operacao) => operacao.id)
  const turnosOpsConsolidadas = consolidarTurnosOpsRelatorio(turnosOps ?? [], demandasConsolidadas)

  const registrosResult = await (
    turnoSetorOperacaoIds.length === 0
      ? Promise.resolve<{ data: RegistroProducaoRow[]; error: null }>({ data: [], error: null })
      : supabase
          .from('registros_producao')
          .select(
            'id, configuracao_turno_bloco_id, turno_op_id, turno_setor_op_id, turno_setor_operacao_id, operacao_id, operador_id, produto_id, quantidade, hora_registro, data_producao'
          )
          .in('turno_setor_operacao_id', turnoSetorOperacaoIds)
          .gte('data_producao', filtros.dataInicio)
          .lte('data_producao', filtros.dataFim)
          .order('hora_registro', { ascending: false })
          .returns<RegistroProducaoRow[]>()
  )

  if (registrosResult.error) {
    throw new Error(`Erro ao buscar registros atômicos do relatório: ${registrosResult.error.message}`)
  }

  const registrosFiltradosPorOperador = filtros.operadorId
    ? (registrosResult.data ?? []).filter((registro) => registro.operador_id === filtros.operadorId)
    : (registrosResult.data ?? [])

  const produtoIds = Array.from(
    new Set(
      [
        ...(turnosOps ?? []).map((op) => op.produto_id),
        ...registrosLegados.map((registro) => registro.produto_id),
      ].filter(isStringPreenchida)
    )
  )
  const operacaoIds = Array.from(
    new Set(
      [
        ...(turnosSetorOperacoes ?? []).map((operacao) => operacao.operacao_id),
        ...registrosLegados.map((registro) => registro.operacao_id),
      ].filter(isStringPreenchida)
    )
  )
  const operadorIds = Array.from(
    new Set(
      [...registrosFiltradosPorOperador, ...registrosLegados]
        .map((registro) => registro.operador_id)
        .filter(Boolean)
    )
  )
  const blocoLegadoIds = Array.from(
    new Set(
      registrosLegados
        .map((registro) => registro.configuracao_turno_bloco_id)
        .filter(isStringPreenchida)
    )
  )

  const [produtosResult, operacoesResult, operadoresResult, blocosLegadosResult] = await Promise.all([
    produtoIds.length === 0
      ? Promise.resolve<{ data: ProdutoResumoRow[]; error: null }>({ data: [], error: null })
      : supabase.from('produtos').select('id, nome, referencia').in('id', produtoIds).returns<ProdutoResumoRow[]>(),
    operacaoIds.length === 0
      ? Promise.resolve<{ data: OperacaoResumoRow[]; error: null }>({ data: [], error: null })
      : supabase
          .from('operacoes')
          .select('id, codigo, descricao')
          .in('id', operacaoIds)
          .returns<OperacaoResumoRow[]>(),
    operadorIds.length === 0
      ? Promise.resolve<{ data: OperadorResumoRow[]; error: null }>({ data: [], error: null })
      : supabase.from('operadores').select('id, nome').in('id', operadorIds).returns<OperadorResumoRow[]>(),
    blocoLegadoIds.length === 0
      ? Promise.resolve<{ data: BlocoLegadoResumoRow[]; error: null }>({ data: [], error: null })
      : supabase
          .from('configuracao_turno_blocos')
          .select('id, descricao_bloco')
          .in('id', blocoLegadoIds)
          .returns<BlocoLegadoResumoRow[]>(),
  ])

  if (produtosResult.error) {
    throw new Error(`Erro ao buscar produtos do relatório V2: ${produtosResult.error.message}`)
  }

  if (operacoesResult.error) {
    throw new Error(`Erro ao buscar operações do relatório V2: ${operacoesResult.error.message}`)
  }

  if (operadoresResult.error) {
    throw new Error(`Erro ao buscar operadores do relatório V2: ${operadoresResult.error.message}`)
  }

  if (blocosLegadosResult.error) {
    throw new Error(
      `Erro ao buscar blocos legados para compatibilidade do relatório: ${blocosLegadosResult.error.message}`
    )
  }

  return {
    blocosLegados: blocosLegadosResult.data ?? [],
    configuracoesLegadas: configuracoesLegadasResult.data ?? [],
    operacoes: operacoesResult.data ?? [],
    operadoresComRegistro: operadoresResult.data ?? [],
    produtos: produtosResult.data ?? [],
    registros: registrosFiltradosPorOperador,
    registrosLegados,
    demandas: demandasConsolidadas,
    secoes: secoesConsolidadas,
    setores: setores ?? [],
    turnos: turnos ?? [],
    turnosOps: turnosOpsConsolidadas,
    turnosSetorOperacoes: turnosSetorOperacoes ?? [],
  }
}

function construirResumoRelatorio(
  base: BaseRelatorioV2,
  filtros: RelatorioFiltros
): RelatorioResumoItem {
  const comparativo = construirComparativoRelatorio(base, filtros)
  const totalPlanejado = comparativo.reduce((soma, item) => soma + item.planejado, 0)
  const totalRealizado = comparativo.reduce((soma, item) => soma + item.realizado, 0)
  const totalCargaPlanejadaTp = base.turnosOps.reduce(
    (soma, op) => soma + op.carga_planejada_tp,
    0
  )
  const totalCargaRealizadaTp = base.turnosOps.reduce(
    (soma, op) => soma + op.carga_realizada_tp,
    0
  )
  const secoesConcluidas = base.demandas.filter(
    (demanda) => demanda.status === 'concluida' || demanda.status === 'encerrada_manualmente'
  ).length
  const secoesPendentes = Math.max(base.demandas.length - secoesConcluidas, 0)
  const quantidadeApontadaFiltro = [...base.registros, ...base.registrosLegados].reduce(
    (soma, registro) => soma + (registro.quantidade ?? 0),
    0
  )
  const statusGeral =
    base.turnosOps.length > 0
      ? normalizarStatusResumo(base.turnosOps.map((op) => op.status as TurnoOpStatusV2))
      : base.registrosLegados.length > 0
        ? 'misto'
        : 'planejada'

  return {
    turnosNoEscopo: base.turnos.length,
    opsNoEscopo: base.turnosOps.length,
    totalPlanejado,
    totalRealizado,
    totalCargaPlanejadaTp,
    totalCargaRealizadaTp,
    saldo: Math.max(totalPlanejado - totalRealizado, 0),
    saldoCargaTp: Math.max(totalCargaPlanejadaTp - totalCargaRealizadaTp, 0),
    progressoPct:
      totalCargaPlanejadaTp > 0
        ? Math.min((totalCargaRealizadaTp / totalCargaPlanejadaTp) * 100, 100)
        : 0,
    secoesConcluidas,
    secoesPendentes,
    quantidadeApontadaFiltro,
    registrosLegados: base.registrosLegados.length,
    statusGeral,
  }
}

function construirComparativoRelatorio(
  base: BaseRelatorioV2,
  filtros: RelatorioFiltros
): ComparativoMetaGrupoItem[] {
  const turnosPorId = new Map(base.turnos.map((turno) => [turno.id, turno]))
  const comparativoPorData = new Map<string, ComparativoMetaGrupoItem>()
  const metaLegadaPorData = new Map(
    base.configuracoesLegadas.map((configuracao) => [configuracao.data, configuracao.meta_grupo ?? 0])
  )

  if (filtros.setorId) {
    const opPorId = new Map(base.turnosOps.map((op) => [op.id, op]))

    for (const demanda of base.demandas) {
      const op = opPorId.get(demanda.turno_op_id)
      if (!op) {
        continue
      }

      const turno = turnosPorId.get(op.turno_id)
      if (!turno) {
        continue
      }

      const data = obterDataLocalTurno(turno.iniciado_em)
      const acumulado = comparativoPorData.get(data) ?? { data, planejado: 0, realizado: 0 }
      acumulado.planejado += demanda.quantidade_planejada
      acumulado.realizado += demanda.quantidade_realizada
      comparativoPorData.set(data, acumulado)
    }
  } else {
    for (const op of base.turnosOps) {
      const turno = turnosPorId.get(op.turno_id)
      if (!turno) {
        continue
      }

      const data = obterDataLocalTurno(turno.iniciado_em)
      const acumulado = comparativoPorData.get(data) ?? { data, planejado: 0, realizado: 0 }
      acumulado.planejado += op.quantidade_planejada
      acumulado.realizado += op.quantidade_realizada
      comparativoPorData.set(data, acumulado)
    }
  }

  for (const registro of base.registrosLegados) {
    if (!registro.data_producao) {
      continue
    }

    const acumulado = comparativoPorData.get(registro.data_producao) ?? {
      data: registro.data_producao,
      planejado: metaLegadaPorData.get(registro.data_producao) ?? 0,
      realizado: 0,
    }

    if (acumulado.planejado === 0) {
      acumulado.planejado = metaLegadaPorData.get(registro.data_producao) ?? 0
    }

    acumulado.realizado += registro.quantidade ?? 0
    comparativoPorData.set(registro.data_producao, acumulado)
  }

  for (const [data, planejado] of metaLegadaPorData.entries()) {
    const acumulado = comparativoPorData.get(data) ?? { data, planejado: 0, realizado: 0 }

    if (acumulado.planejado === 0) {
      acumulado.planejado = planejado
    }

    comparativoPorData.set(data, acumulado)
  }

  return Array.from(comparativoPorData.values()).sort((primeiraData, segundaData) =>
    primeiraData.data.localeCompare(segundaData.data)
  )
}

function construirItensRelatorio(base: BaseRelatorioV2): RelatorioRegistroItem[] {
  const turnosPorId = new Map(base.turnos.map((turno) => [turno.id, turno]))
  const produtosPorId = new Map(base.produtos.map((produto) => [produto.id, produto]))
  const opsPorId = new Map(base.turnosOps.map((op) => [op.id, op]))
  const secoesPorId = new Map(base.secoes.map((secao) => [secao.id, secao]))
  const demandasPorId = new Map(base.demandas.map((demanda) => [demanda.id, demanda]))
  const demandasPorSecaoLegadaId = new Map(
    base.demandas
      .filter((demanda) => isStringPreenchida(demanda.turno_setor_op_legacy_id))
      .map((demanda) => [demanda.turno_setor_op_legacy_id, demanda])
  )
  const setoresPorId = new Map(base.setores.map((setor) => [setor.id, setor]))
  const blocosLegadosPorId = new Map(
    base.blocosLegados.map((bloco) => [bloco.id, bloco])
  )
  const operacoesTurnoPorId = new Map(
    base.turnosSetorOperacoes.map((operacao) => [operacao.id, operacao])
  )
  const operacoesPorId = new Map(base.operacoes.map((operacao) => [operacao.id, operacao]))
  const operadoresPorId = new Map(
    base.operadoresComRegistro.map((operador) => [operador.id, operador])
  )
  const acumuladoPorChave = new Map<string, RelatorioRegistroItem>()

  for (const registro of base.registros) {
    const op = opsPorId.get(registro.turno_op_id ?? '')
    const operacaoTurno = operacoesTurnoPorId.get(registro.turno_setor_operacao_id ?? '')
    const operador = operadoresPorId.get(registro.operador_id ?? '')
    const demanda =
      demandasPorId.get(operacaoTurno?.turno_setor_demanda_id ?? '') ??
      demandasPorSecaoLegadaId.get(registro.turno_setor_op_id ?? '') ??
      demandasPorSecaoLegadaId.get(operacaoTurno?.turno_setor_op_id ?? '')

    if (!op || !demanda || !operacaoTurno || !operador) {
      continue
    }

    const turno = turnosPorId.get(op.turno_id)
    const produto = produtosPorId.get(op.produto_id)
    const setor = setoresPorId.get(demanda.setor_id)
    const operacao = operacoesPorId.get(operacaoTurno.operacao_id)

    if (!turno || !produto || !setor || !operacao) {
      continue
    }

    const chave = `${operacaoTurno.id}:${operador.id}`
    const itemAtual = acumuladoPorChave.get(chave)
    const ultimaLeituraEm = registro.hora_registro ?? ''

    if (itemAtual) {
      itemAtual.quantidadeApontada += registro.quantidade ?? 0

      if (ultimaLeituraEm > itemAtual.ultimaLeituraEm) {
        itemAtual.ultimaLeituraEm = ultimaLeituraEm
      }

      continue
    }

    acumuladoPorChave.set(chave, {
      id: chave,
      origem: 'v2',
      turnoId: turno.id,
      turnoLabel: formatarTurnoLabel(turno.iniciado_em),
      turnoStatus: turno.status as RelatorioRegistroItem['turnoStatus'],
      turnoOpId: op.id,
      numeroOp: op.numero_op,
      produtoReferencia: produto.referencia,
      produtoNome: produto.nome,
      turnoSetorOpId: demanda.turno_setor_op_legacy_id ?? operacaoTurno.turno_setor_op_id,
      setorId: setor.id,
      setorNome: setor.nome,
      turnoSetorOperacaoId: operacaoTurno.id,
      operacaoId: operacao.id,
      operacaoCodigo: operacao.codigo,
      operacaoDescricao: operacao.descricao,
      operadorId: operador.id,
      operadorNome: operador.nome,
      quantidadeApontada: registro.quantidade ?? 0,
      quantidadeRealizadaOperacao: operacaoTurno.quantidade_realizada,
      quantidadeRealizadaSecao: demanda.quantidade_realizada,
      quantidadeRealizadaOp: op.quantidade_realizada,
      statusOperacao: operacaoTurno.status as RelatorioRegistroItem['statusOperacao'],
      statusSecao: demanda.status as RelatorioRegistroItem['statusSecao'],
      statusOp: op.status as RelatorioRegistroItem['statusOp'],
      ultimaLeituraEm,
    })
  }

  const itensV2 = Array.from(acumuladoPorChave.values())
  const itensLegados = base.registrosLegados.map((registro) => {
    const operador = operadoresPorId.get(registro.operador_id ?? '')
    const operacao = operacoesPorId.get(registro.operacao_id ?? '')
    const produto = produtosPorId.get(registro.produto_id ?? '')
    const bloco = blocosLegadosPorId.get(registro.configuracao_turno_bloco_id ?? '')
    const ultimaLeituraEm = construirTimestampLegado(registro.data_producao, registro.hora_registro)

    return {
      id: `legado:${registro.id}`,
      origem: 'legado' as const,
      turnoId: '',
      turnoLabel: formatarTurnoLabelLegado(registro.data_producao, registro.hora_registro),
      turnoStatus: 'encerrado' as const,
      turnoOpId: '',
      numeroOp: 'Histórico legado',
      produtoReferencia: produto?.referencia ?? '—',
      produtoNome: produto?.nome ?? 'Produto não informado',
      turnoSetorOpId: '',
      setorId: '',
      setorNome: bloco?.descricao_bloco ?? 'Bloco legado',
      turnoSetorOperacaoId: '',
      operacaoId: operacao?.id ?? '',
      operacaoCodigo: operacao?.codigo ?? '—',
      operacaoDescricao: operacao?.descricao ?? 'Operação não informada',
      operadorId: operador?.id ?? registro.operador_id ?? '',
      operadorNome: operador?.nome ?? 'Operador não informado',
      quantidadeApontada: registro.quantidade ?? 0,
      quantidadeRealizadaOperacao: 0,
      quantidadeRealizadaSecao: 0,
      quantidadeRealizadaOp: 0,
      statusOperacao: 'planejada' as const,
      statusSecao: 'planejada' as const,
      statusOp: 'planejada' as const,
      ultimaLeituraEm,
    }
  })

  return [...itensV2, ...itensLegados].sort((primeiroItem, segundoItem) =>
    segundoItem.ultimaLeituraEm.localeCompare(primeiroItem.ultimaLeituraEm)
  )
}

function construirOpcoesTurno(base: BaseRelatorioV2): RelatorioTurnoOption[] {
  return base.turnos.map((turno) => ({
    id: turno.id,
    label: formatarTurnoLabel(turno.iniciado_em),
    status: turno.status as RelatorioTurnoOption['status'],
    iniciadoEm: turno.iniciado_em,
  }))
}

function construirOpcoesOp(base: BaseRelatorioV2): RelatorioTurnoOpOption[] {
  const produtosPorId = new Map(base.produtos.map((produto) => [produto.id, produto]))

  return base.turnosOps
    .map((op) => {
      const produto = produtosPorId.get(op.produto_id)

      if (!produto) {
        return null
      }

      return {
        id: op.id,
        turnoId: op.turno_id,
        label: `${op.numero_op} · ${produto.referencia} · ${produto.nome}`,
        numeroOp: op.numero_op,
        produtoReferencia: produto.referencia,
        produtoNome: produto.nome,
      }
    })
    .filter((op): op is RelatorioTurnoOpOption => Boolean(op))
}

function construirOpcoesSetor(base: BaseRelatorioV2): RelatorioSetorOption[] {
  return [...base.setores]
    .sort((primeiroSetor, segundoSetor) => primeiroSetor.nome.localeCompare(segundoSetor.nome))
    .map((setor) => ({
      id: setor.id,
      nome: setor.nome,
    }))
}

export async function buscarPaginaRelatoriosV2(
  params: BuscarPaginaRelatoriosV2Params
): Promise<BuscarPaginaRelatoriosV2Resultado> {
  const base = await carregarBaseRelatorioV2(params.filtros)
  const itens = construirItensRelatorio(base)
  const from = (params.page - 1) * params.pageSize
  const to = from + params.pageSize

  return {
    comparativo: construirComparativoRelatorio(base, params.filtros),
    itens: itens.slice(from, to),
    ops: construirOpcoesOp(base),
    resumo: construirResumoRelatorio(base, params.filtros),
    setores: construirOpcoesSetor(base),
    total: itens.length,
    turnos: construirOpcoesTurno(base),
  }
}
