import { createClient } from '@/lib/supabase/server'
import type {
  OperacaoListItem,
  OperacaoSortField,
  OperacoesListagemParams,
  OperacoesPaginadas,
  SortDirection,
} from '@/types'
import type { Tables } from '@/types/supabase'

type OperacaoRow = Tables<'operacoes'>
type MaquinaRow = Tables<'maquinas'>
type SetorRow = Tables<'setores'>

function mapearOperacoes(
  operacoes: OperacaoRow[],
  maquinas: MaquinaRow[],
  setores: SetorRow[]
): OperacaoListItem[] {
  const maquinasPorId = new Map(maquinas.map((maquina) => [maquina.id, maquina]))
  const setoresPorId = new Map(setores.map((setor) => [setor.id, setor]))

  return operacoes.map((operacao) => ({
    ...operacao,
    imagem_url: operacao.imagem_url ?? null,
    maquinaCodigo: operacao.maquina_id ? maquinasPorId.get(operacao.maquina_id)?.codigo ?? null : null,
    maquinaModelo: operacao.maquina_id ? maquinasPorId.get(operacao.maquina_id)?.modelo ?? null : null,
    setorCodigo: operacao.setor_id ? setoresPorId.get(operacao.setor_id)?.codigo ?? null : null,
    setorNome: operacao.setor_id ? setoresPorId.get(operacao.setor_id)?.nome ?? null : null,
  }))
}

function mapearOperacaoComReferencias(
  operacao: OperacaoRow,
  maquina: MaquinaRow | null,
  setor: SetorRow | null
): OperacaoListItem {
  return {
    ...operacao,
    imagem_url: operacao.imagem_url ?? null,
    maquinaCodigo: maquina?.codigo ?? null,
    maquinaModelo: maquina?.modelo ?? null,
    setorCodigo: setor?.codigo ?? null,
    setorNome: setor?.nome ?? null,
  }
}

function normalizarTexto(valor: string | null | undefined): string {
  return (valor ?? '').trim().toLocaleLowerCase('pt-BR')
}

function valorOrdenacaoTexto(
  operacao: OperacaoListItem,
  sortBy: OperacaoSortField
): string {
  if (sortBy === 'codigo') {
    return normalizarTexto(operacao.codigo)
  }

  if (sortBy === 'descricao') {
    return normalizarTexto(operacao.descricao)
  }

  if (sortBy === 'maquina') {
    return normalizarTexto(
      operacao.maquinaModelo
        ? `${operacao.maquinaModelo} ${operacao.maquinaCodigo ?? ''}`
        : operacao.maquinaCodigo
    )
  }

  if (sortBy === 'setor') {
    const setorCodigo = operacao.setorCodigo ?? Number.MAX_SAFE_INTEGER
    return `${String(setorCodigo).padStart(6, '0')}-${normalizarTexto(operacao.setorNome)}`
  }

  if (sortBy === 'ativa') {
    return operacao.ativa ?? true ? 'ativa' : 'inativa'
  }

  return ''
}

function valorOrdenacaoNumero(
  operacao: OperacaoListItem,
  sortBy: OperacaoSortField
): number {
  if (sortBy === 'tempo_padrao_min') {
    return operacao.tempo_padrao_min
  }

  if (sortBy === 'meta_hora') {
    return operacao.meta_hora ?? -1
  }

  if (sortBy === 'meta_dia') {
    return operacao.meta_dia ?? -1
  }

  return 0
}

function compararOperacoes(
  primeira: OperacaoListItem,
  segunda: OperacaoListItem,
  sortBy: OperacaoSortField,
  sortDir: SortDirection
): number {
  const fator = sortDir === 'asc' ? 1 : -1

  if (sortBy === 'tempo_padrao_min' || sortBy === 'meta_hora' || sortBy === 'meta_dia') {
    const diferenca =
      valorOrdenacaoNumero(primeira, sortBy) - valorOrdenacaoNumero(segunda, sortBy)

    if (diferenca !== 0) {
      return diferenca * fator
    }
  } else {
    const comparacaoTexto = valorOrdenacaoTexto(primeira, sortBy).localeCompare(
      valorOrdenacaoTexto(segunda, sortBy),
      'pt-BR',
      { sensitivity: 'base' }
    )

    if (comparacaoTexto !== 0) {
      return comparacaoTexto * fator
    }
  }

  return primeira.codigo.localeCompare(segunda.codigo, 'pt-BR', {
    sensitivity: 'base',
  })
}

function aplicarBusca(operacoes: OperacaoListItem[], busca: string): OperacaoListItem[] {
  const termo = normalizarTexto(busca)

  if (!termo) {
    return operacoes
  }

  return operacoes.filter((operacao) => {
    return (
      normalizarTexto(operacao.codigo).includes(termo) ||
      normalizarTexto(operacao.descricao).includes(termo) ||
      normalizarTexto(operacao.maquinaModelo).includes(termo) ||
      normalizarTexto(operacao.maquinaCodigo).includes(termo) ||
      normalizarTexto(operacao.setorNome).includes(termo)
    )
  })
}

export async function listarOperacoes(): Promise<OperacaoListItem[]> {
  const supabase = await createClient()

  const [
    { data: operacoes, error: operacoesError },
    { data: maquinas, error: maquinasError },
    { data: setores, error: setoresError },
  ] =
    await Promise.all([
      supabase.from('operacoes').select('*').order('codigo'),
      supabase.from('maquinas').select('*').order('modelo').order('codigo'),
      supabase.from('setores').select('*').order('codigo'),
    ])

  if (operacoesError) {
    throw new Error(`Erro ao listar operações: ${operacoesError.message}`)
  }

  if (maquinasError) {
    throw new Error(`Erro ao listar máquinas das operações: ${maquinasError.message}`)
  }

  if (setoresError) {
    throw new Error(`Erro ao listar setores das operações: ${setoresError.message}`)
  }

  return mapearOperacoes(operacoes, maquinas, setores)
}

export async function listarOperacoesPaginadas(
  params: OperacoesListagemParams
): Promise<OperacoesPaginadas> {
  const operacoes = await listarOperacoes()
  const operacoesFiltradas = aplicarBusca(operacoes, params.busca)
  const operacoesOrdenadas = [...operacoesFiltradas].sort((primeira, segunda) =>
    compararOperacoes(primeira, segunda, params.sortBy, params.sortDir)
  )

  const total = operacoesOrdenadas.length
  const pageSize = params.pageSize > 0 ? params.pageSize : 20
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(1, params.page), totalPages)
  const offset = (page - 1) * pageSize

  return {
    items: operacoesOrdenadas.slice(offset, offset + pageSize),
    total,
    page,
    pageSize,
    totalPages,
    busca: params.busca,
    sortBy: params.sortBy,
    sortDir: params.sortDir,
  }
}

export async function buscarOperacaoPorId(id: string): Promise<OperacaoListItem | null> {
  const supabase = await createClient()

  const { data: operacao, error } = await supabase
    .from('operacoes')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !operacao) {
    return null
  }

  let maquina: MaquinaRow | null = null
  if (operacao.maquina_id) {
    const { data: maquinaData, error: maquinaError } = await supabase
      .from('maquinas')
      .select('*')
      .eq('id', operacao.maquina_id)
      .maybeSingle()

    if (maquinaError) {
      throw new Error(`Erro ao carregar máquina da operação: ${maquinaError.message}`)
    }

    maquina = maquinaData
  }

  let setor: SetorRow | null = null
  if (operacao.setor_id) {
    const { data: setorData, error: setorError } = await supabase
      .from('setores')
      .select('*')
      .eq('id', operacao.setor_id)
      .maybeSingle()

    if (setorError) {
      throw new Error(`Erro ao carregar setor da operação: ${setorError.message}`)
    }

    setor = setorData
  }

  return mapearOperacaoComReferencias(operacao, maquina, setor)
}

export async function buscarOperacaoPorToken(token: string): Promise<OperacaoListItem | null> {
  const supabase = await createClient()

  const { data: operacao, error } = await supabase
    .from('operacoes')
    .select('*')
    .eq('qr_code_token', token)
    .single()

  if (error || !operacao) {
    return null
  }

  let maquina: MaquinaRow | null = null
  if (operacao.maquina_id) {
    const { data: maquinaData, error: maquinaError } = await supabase
      .from('maquinas')
      .select('*')
      .eq('id', operacao.maquina_id)
      .maybeSingle()

    if (maquinaError) {
      throw new Error(`Erro ao carregar máquina da operação: ${maquinaError.message}`)
    }

    maquina = maquinaData
  }

  let setor: SetorRow | null = null
  if (operacao.setor_id) {
    const { data: setorData, error: setorError } = await supabase
      .from('setores')
      .select('*')
      .eq('id', operacao.setor_id)
      .maybeSingle()

    if (setorError) {
      throw new Error(`Erro ao carregar setor da operação: ${setorError.message}`)
    }

    setor = setorData
  }

  return mapearOperacaoComReferencias(operacao, maquina, setor)
}
