import { createClient } from '@/lib/supabase/server'
import type { ProdutoListItem, ProdutoRoteiroItem } from '@/types'
import type { Tables } from '@/types/supabase'

type ProdutoRow = Tables<'produtos'>
type ProdutoOperacaoRow = Tables<'produto_operacoes'>
type OperacaoRow = Tables<'operacoes'>
type MaquinaRow = Tables<'maquinas'>
type SetorRow = Tables<'setores'>

function normalizarContratoImagens(produto: ProdutoRow): ProdutoRow {
  const imagemLegada = produto.imagem_url ?? null

  return {
    ...produto,
    imagem_frente_url: produto.imagem_frente_url ?? imagemLegada,
    imagem_costa_url: produto.imagem_costa_url ?? null,
  }
}

function mapearProdutosComRoteiro(
  produtos: ProdutoRow[],
  produtoOperacoes: ProdutoOperacaoRow[],
  operacoes: OperacaoRow[],
  maquinas: MaquinaRow[],
  setores: SetorRow[]
): ProdutoListItem[] {
  const operacoesPorId = new Map(operacoes.map((operacao) => [operacao.id, operacao]))
  const maquinasPorId = new Map(maquinas.map((maquina) => [maquina.id, maquina]))
  const setoresPorId = new Map(setores.map((setor) => [setor.id, setor]))
  const roteiroPorProduto = new Map<string, ProdutoRoteiroItem[]>()

  produtoOperacoes.forEach((item) => {
    if (!item.produto_id || !item.operacao_id) {
      return
    }

    const operacao = operacoesPorId.get(item.operacao_id)
    if (!operacao) {
      return
    }

    const roteiroAtual = roteiroPorProduto.get(item.produto_id) ?? []
    const setor = operacao.setor_id ? setoresPorId.get(operacao.setor_id) : null
    const maquina = operacao.maquina_id ? maquinasPorId.get(operacao.maquina_id) ?? null : null
    roteiroAtual.push({
      produtoOperacaoId: item.id,
      operacaoId: operacao.id,
      sequencia: item.sequencia,
      codigo: operacao.codigo,
      descricao: operacao.descricao,
      tempoPadraoMin: operacao.tempo_padrao_min,
      maquinaId: operacao.maquina_id,
      maquinaCodigo: maquina?.codigo ?? null,
      maquinaModelo: maquina?.modelo ?? null,
      setorId: operacao.setor_id,
      setorCodigo: setor?.codigo ?? null,
      setorNome: setor?.nome ?? null,
    })
    roteiroPorProduto.set(item.produto_id, roteiroAtual)
  })

  return produtos.map((produto) => ({
    ...normalizarContratoImagens(produto),
    roteiro: (roteiroPorProduto.get(produto.id) ?? []).sort(
      (primeiro, segundo) => primeiro.sequencia - segundo.sequencia
    ),
    setoresEnvolvidos: Array.from(
      new Set(
        (roteiroPorProduto.get(produto.id) ?? [])
          .map((item) => item.setorNome)
          .filter((setorNome): setorNome is string => Boolean(setorNome))
      )
    ),
  }))
}

export async function listarProdutos(): Promise<ProdutoListItem[]> {
  const supabase = await createClient()

  const [
    { data: produtos, error: produtosError },
    { data: produtoOperacoes, error: produtoOpsError },
    { data: operacoes, error: operacoesError },
    { data: maquinas, error: maquinasError },
    { data: setores, error: setoresError },
  ] =
    await Promise.all([
      supabase.from('produtos').select('*').order('nome'),
      supabase.from('produto_operacoes').select('*').order('sequencia'),
      supabase.from('operacoes').select('*').order('codigo'),
      supabase.from('maquinas').select('*').order('modelo').order('codigo'),
      supabase.from('setores').select('*').order('codigo'),
    ])

  if (produtosError) {
    throw new Error(`Erro ao listar produtos: ${produtosError.message}`)
  }

  if (produtoOpsError) {
    throw new Error(`Erro ao listar roteiro dos produtos: ${produtoOpsError.message}`)
  }

  if (operacoesError) {
    throw new Error(`Erro ao listar operações: ${operacoesError.message}`)
  }

  if (maquinasError) {
    throw new Error(`Erro ao listar máquinas do roteiro: ${maquinasError.message}`)
  }

  if (setoresError) {
    throw new Error(`Erro ao listar setores do roteiro: ${setoresError.message}`)
  }

  return mapearProdutosComRoteiro(produtos, produtoOperacoes, operacoes, maquinas, setores)
}

export async function buscarProdutoComRoteiro(id: string): Promise<ProdutoListItem | null> {
  const supabase = await createClient()

  const [{ data: produto, error: produtoError }, { data: produtoOperacoes, error: produtoOpsError }] =
    await Promise.all([
      supabase.from('produtos').select('*').eq('id', id).single(),
      supabase.from('produto_operacoes').select('*').eq('produto_id', id).order('sequencia'),
    ])

  if (produtoError || !produto) {
    return null
  }

  if (produtoOpsError) {
    throw new Error(`Erro ao listar roteiro do produto: ${produtoOpsError.message}`)
  }

  const operacaoIds = produtoOperacoes
    .map((item) => item.operacao_id)
    .filter((operacaoId): operacaoId is string => Boolean(operacaoId))

  const [
    { data: operacoes, error: operacoesError },
    { data: maquinas, error: maquinasError },
    { data: setores, error: setoresError },
  ] = await Promise.all([
    operacaoIds.length
      ? supabase.from('operacoes').select('*').in('id', operacaoIds)
      : Promise.resolve({ data: [], error: null }),
    operacaoIds.length
      ? supabase.from('maquinas').select('*').order('modelo').order('codigo')
      : Promise.resolve({ data: [], error: null }),
    supabase.from('setores').select('*').order('codigo'),
  ])

  if (operacoesError) {
    throw new Error(`Erro ao listar operações do roteiro: ${operacoesError.message}`)
  }

  if (maquinasError) {
    throw new Error(`Erro ao listar máquinas do roteiro: ${maquinasError.message}`)
  }

  if (setoresError) {
    throw new Error(`Erro ao listar setores do roteiro: ${setoresError.message}`)
  }

  return mapearProdutosComRoteiro([produto], produtoOperacoes, operacoes, maquinas, setores)[0] ?? null
}
