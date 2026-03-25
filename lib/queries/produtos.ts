import { createClient } from '@/lib/supabase/server'
import type { ProdutoListItem, ProdutoRoteiroItem } from '@/types'
import type { Tables } from '@/types/supabase'

type ProdutoRow = Tables<'produtos'>
type ProdutoOperacaoRow = Tables<'produto_operacoes'>
type OperacaoRow = Tables<'operacoes'>

function mapearProdutosComRoteiro(
  produtos: ProdutoRow[],
  produtoOperacoes: ProdutoOperacaoRow[],
  operacoes: OperacaoRow[]
): ProdutoListItem[] {
  const operacoesPorId = new Map(operacoes.map((operacao) => [operacao.id, operacao]))
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
    roteiroAtual.push({
      produtoOperacaoId: item.id,
      operacaoId: operacao.id,
      sequencia: item.sequencia,
      codigo: operacao.codigo,
      descricao: operacao.descricao,
      tempoPadraoMin: operacao.tempo_padrao_min,
      tipoMaquinaCodigo: operacao.tipo_maquina_codigo,
    })
    roteiroPorProduto.set(item.produto_id, roteiroAtual)
  })

  return produtos.map((produto) => ({
    ...produto,
    roteiro: (roteiroPorProduto.get(produto.id) ?? []).sort(
      (primeiro, segundo) => primeiro.sequencia - segundo.sequencia
    ),
  }))
}

export async function listarProdutos(): Promise<ProdutoListItem[]> {
  const supabase = await createClient()

  const [{ data: produtos, error: produtosError }, { data: produtoOperacoes, error: produtoOpsError }, { data: operacoes, error: operacoesError }] =
    await Promise.all([
      supabase.from('produtos').select('*').order('nome'),
      supabase.from('produto_operacoes').select('*').order('sequencia'),
      supabase.from('operacoes').select('*').order('codigo'),
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

  return mapearProdutosComRoteiro(produtos, produtoOperacoes, operacoes)
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

  const { data: operacoes, error: operacoesError } = operacaoIds.length
    ? await supabase.from('operacoes').select('*').in('id', operacaoIds)
    : { data: [], error: null }

  if (operacoesError) {
    throw new Error(`Erro ao listar operações do roteiro: ${operacoesError.message}`)
  }

  return mapearProdutosComRoteiro([produto], produtoOperacoes, operacoes)[0] ?? null
}
