import { createClient } from '@/lib/supabase/server'
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
type TurnoSetorOperacaoRow = Pick<
  Tables<'turno_setor_operacoes'>,
  'id' | 'turno_op_id' | 'turno_setor_op_id' | 'operacao_id' | 'quantidade_realizada' | 'status'
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
  secoes: TurnoSetorOpRow[]
  setores: SetorResumoRow[]
  turnos: TurnoRow[]
  turnosOps: TurnoOpRow[]
  turnosSetorOperacoes: TurnoSetorOperacaoRow[]
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
  const { data: secoes, error: secoesError } =
    turnoOpIds.length === 0
      ? { data: [] as TurnoSetorOpRow[], error: null }
      : await (() => {
          let secoesQuery = supabase
            .from('turno_setor_ops')
            .select('id, turno_op_id, setor_id, quantidade_planejada, quantidade_realizada, status')
            .in('turno_op_id', turnoOpIds)
            .order('created_at', { ascending: true })

          if (filtros.setorId) {
            secoesQuery = secoesQuery.eq('setor_id', filtros.setorId)
          }

          return secoesQuery.returns<TurnoSetorOpRow[]>()
        })()

  if (secoesError) {
    throw new Error(`Erro ao buscar seções do relatório V2: ${secoesError.message}`)
  }

  const secaoIds = (secoes ?? []).map((secao) => secao.id)
  const [
    { data: turnosSetorOperacoes, error: operacoesTurnoError },
    { data: setores, error: setoresError },
  ] = await Promise.all([
    secaoIds.length === 0
      ? Promise.resolve<{ data: TurnoSetorOperacaoRow[]; error: null }>({ data: [], error: null })
      : supabase
          .from('turno_setor_operacoes')
          .select('id, turno_op_id, turno_setor_op_id, operacao_id, quantidade_realizada, status')
          .in('turno_setor_op_id', secaoIds)
          .order('created_at', { ascending: true })
          .returns<TurnoSetorOperacaoRow[]>(),
    secaoIds.length === 0
      ? Promise.resolve<{ data: SetorResumoRow[]; error: null }>({ data: [], error: null })
      : supabase
          .from('setores')
          .select('id, nome')
          .in('id', Array.from(new Set((secoes ?? []).map((secao) => secao.setor_id).filter(Boolean))))
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

  const turnoSetorOperacaoIds = (turnosSetorOperacoes ?? []).map((operacao) => operacao.id)

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
    secoes: secoes ?? [],
    setores: setores ?? [],
    turnos: turnos ?? [],
    turnosOps: turnosOps ?? [],
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
  const secoesConcluidas = base.secoes.filter(
    (secao) => secao.status === 'concluida' || secao.status === 'encerrada_manualmente'
  ).length
  const secoesPendentes = Math.max(base.secoes.length - secoesConcluidas, 0)
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
    saldo: Math.max(totalPlanejado - totalRealizado, 0),
    progressoPct: totalPlanejado > 0 ? Math.min((totalRealizado / totalPlanejado) * 100, 100) : 0,
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

    for (const secao of base.secoes) {
      const op = opPorId.get(secao.turno_op_id)
      if (!op) {
        continue
      }

      const turno = turnosPorId.get(op.turno_id)
      if (!turno) {
        continue
      }

      const data = obterDataLocalTurno(turno.iniciado_em)
      const acumulado = comparativoPorData.get(data) ?? { data, planejado: 0, realizado: 0 }
      acumulado.planejado += secao.quantidade_planejada
      acumulado.realizado += secao.quantidade_realizada
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
    const secao = secoesPorId.get(registro.turno_setor_op_id ?? '')
    const operacaoTurno = operacoesTurnoPorId.get(registro.turno_setor_operacao_id ?? '')
    const operador = operadoresPorId.get(registro.operador_id ?? '')

    if (!op || !secao || !operacaoTurno || !operador) {
      continue
    }

    const turno = turnosPorId.get(op.turno_id)
    const produto = produtosPorId.get(op.produto_id)
    const setor = setoresPorId.get(secao.setor_id)
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
      turnoSetorOpId: secao.id,
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
      quantidadeRealizadaSecao: secao.quantidade_realizada,
      quantidadeRealizadaOp: op.quantidade_realizada,
      statusOperacao: operacaoTurno.status as RelatorioRegistroItem['statusOperacao'],
      statusSecao: secao.status as RelatorioRegistroItem['statusSecao'],
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
