import { createClient } from '@/lib/supabase/server'
import type {
  ComparativoMetaGrupoItem,
  RelatorioFiltros,
  RelatorioRegistroItem,
} from '@/types'

interface BuscarRegistrosRelatorioParams extends RelatorioFiltros {
  page: number
  pageSize: number
}

interface BuscarRegistrosRelatorioResultado {
  itens: RelatorioRegistroItem[]
  total: number
}

interface RegistroRelatorioRow {
  id: string
  quantidade: number | null
  data_producao: string | null
  hora_registro: string | null
  operadores:
    | {
        id: string
        nome: string | null
      }
    | Array<{
        id: string
        nome: string | null
      }>
    | null
  operacoes:
    | {
        id: string
        codigo: string | null
        descricao: string | null
      }
    | Array<{
        id: string
        codigo: string | null
        descricao: string | null
      }>
    | null
  maquinas:
    | {
        codigo: string | null
      }
    | Array<{
        codigo: string | null
      }>
    | null
}

type RegistroQuantidadeDiaRow = Pick<
  RelatorioRegistroItem,
  never
> & {
  data_producao: string | null
  quantidade: number | null
}

interface ConfiguracaoMetaRow {
  data: string
  meta_grupo: number | null
}

function normalizarRelacao<T>(relacao: T | T[] | null): T | null {
  if (Array.isArray(relacao)) {
    return relacao[0] ?? null
  }

  return relacao
}

function mapearRegistroRelatorio(row: RegistroRelatorioRow): RelatorioRegistroItem {
  const operador = normalizarRelacao(row.operadores)
  const operacao = normalizarRelacao(row.operacoes)

  return {
    id: row.id,
    origem: 'legado',
    turnoId: '',
    turnoLabel: 'Histórico legado',
    turnoStatus: 'encerrado',
    turnoOpId: '',
    numeroOp: 'Histórico legado',
    produtoReferencia: '—',
    produtoNome: 'Produto não informado',
    turnoSetorOpId: '',
    setorId: '',
    setorNome: 'Bloco legado',
    turnoSetorOperacaoId: '',
    operadorId: operador?.id ?? '',
    operadorNome: operador?.nome ?? 'Operador não informado',
    operacaoId: operacao?.id ?? '',
    operacaoCodigo: operacao?.codigo ?? '—',
    operacaoDescricao: operacao?.descricao ?? 'Operação não informada',
    quantidadeApontada: row.quantidade ?? 0,
    quantidadeRealizadaOperacao: 0,
    quantidadeRealizadaSecao: 0,
    quantidadeRealizadaOp: 0,
    statusOperacao: 'planejada',
    statusSecao: 'planejada',
    statusOp: 'planejada',
    ultimaLeituraEm: row.hora_registro ?? row.data_producao ?? '',
  }
}

function aplicarFiltrosRelatorio<T extends {
  gte: (column: string, value: string) => T
  lte: (column: string, value: string) => T
  eq: (column: string, value: string) => T
}>(query: T, filtros: RelatorioFiltros): T {
  let queryFiltrada = query.gte('data_producao', filtros.dataInicio).lte(
    'data_producao',
    filtros.dataFim
  )

  if (filtros.operadorId) {
    queryFiltrada = queryFiltrada.eq('operador_id', filtros.operadorId)
  }
  return queryFiltrada
}

export async function buscarRegistrosRelatorio(
  params: BuscarRegistrosRelatorioParams
): Promise<BuscarRegistrosRelatorioResultado> {
  const supabase = await createClient()
  const from = (params.page - 1) * params.pageSize
  const to = from + params.pageSize - 1

  let query = supabase
    .from('registros_producao')
    .select(
      `
        id,
        quantidade,
        data_producao,
        hora_registro,
        operadores ( id, nome ),
        operacoes ( id, codigo, descricao ),
        maquinas ( codigo )
      `,
      { count: 'exact' }
    )
    .order('hora_registro', { ascending: false })
    .range(from, to)

  query = aplicarFiltrosRelatorio(query, params)

  const { data, error, count } = await query.returns<RegistroRelatorioRow[]>()

  if (error) {
    throw new Error(`Erro ao buscar registros do relatório: ${error.message}`)
  }

  return {
    itens: (data ?? []).map(mapearRegistroRelatorio),
    total: count ?? 0,
  }
}

export async function buscarComparativoMetaGrupo(
  filtros: Pick<RelatorioFiltros, 'dataInicio' | 'dataFim'>
): Promise<ComparativoMetaGrupoItem[]> {
  const supabase = await createClient()

  const [
    { data: registros, error: registrosError },
    { data: configuracoes, error: configuracoesError },
  ] = await Promise.all([
    supabase
      .from('registros_producao')
      .select('data_producao, quantidade')
      .gte('data_producao', filtros.dataInicio)
      .lte('data_producao', filtros.dataFim)
      .returns<RegistroQuantidadeDiaRow[]>(),
    supabase
      .from('configuracao_turno')
      .select('data, meta_grupo')
      .gte('data', filtros.dataInicio)
      .lte('data', filtros.dataFim)
      .order('data', { ascending: true })
      .returns<ConfiguracaoMetaRow[]>(),
  ])

  if (registrosError) {
    throw new Error(`Erro ao buscar realizado por dia: ${registrosError.message}`)
  }

  if (configuracoesError) {
    throw new Error(`Erro ao buscar meta grupo por dia: ${configuracoesError.message}`)
  }

  const realizadoPorData = new Map<string, number>()
  const datas = new Set<string>()

  for (const registro of registros ?? []) {
    if (!registro.data_producao) {
      continue
    }

    datas.add(registro.data_producao)
    realizadoPorData.set(
      registro.data_producao,
      (realizadoPorData.get(registro.data_producao) ?? 0) + (registro.quantidade ?? 0)
    )
  }

  const metaGrupoPorData = new Map<string, number>()

  for (const configuracao of configuracoes ?? []) {
    datas.add(configuracao.data)
    metaGrupoPorData.set(configuracao.data, configuracao.meta_grupo ?? 0)
  }

  return Array.from(datas)
    .sort((primeira, segunda) => primeira.localeCompare(segunda))
    .map((data) => ({
      data,
      planejado: metaGrupoPorData.get(data) ?? 0,
      realizado: realizadoPorData.get(data) ?? 0,
    }))
}
