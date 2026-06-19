import { DjangoApiError, djangoFetch } from '../client.ts'
import type { ProdutoListItem } from '@/types'

import { listarMaquinasDjango, listarSetoresDjango } from './cadastros.ts'
import {
  mapearProdutoComRoteiroDetailDjango,
  mapearProdutosComRoteiroDjango,
  type DjangoOperacaoJson,
  type DjangoProdutoDetailJson,
  type DjangoProdutoJson,
  type DjangoProdutoOperacaoJson,
} from './mappers.ts'
import { obterAccessTokenDjango } from './obter-token-servidor.ts'

const PREFIXO_PRODUTOS = '/api/v1/produtos'

async function djangoFetchProdutos<T>(path: string): Promise<T> {
  const accessToken = await obterAccessTokenDjango()
  return djangoFetch<T>(`${PREFIXO_PRODUTOS}${path}`, { accessToken })
}

function ordenarProdutos(produtos: ProdutoListItem[]): ProdutoListItem[] {
  return [...produtos].sort((primeiro, segundo) =>
    primeiro.nome.localeCompare(segundo.nome, 'pt-BR', { sensitivity: 'base' })
  )
}

async function buscarRecursoOuNull<T>(path: string): Promise<T | null> {
  try {
    return await djangoFetchProdutos<T>(path)
  } catch (error) {
    if (error instanceof DjangoApiError && error.status === 404) {
      return null
    }

    throw error
  }
}

async function carregarDadosRoteiro(): Promise<{
  produtoOperacoes: DjangoProdutoOperacaoJson[]
  operacoes: DjangoOperacaoJson[]
  maquinas: Awaited<ReturnType<typeof listarMaquinasDjango>>
  setores: Awaited<ReturnType<typeof listarSetoresDjango>>
}> {
  const accessToken = await obterAccessTokenDjango()

  const [produtoOperacoes, operacoes, maquinas, setores] = await Promise.all([
    djangoFetch<DjangoProdutoOperacaoJson[]>(`${PREFIXO_PRODUTOS}/operacoes/?vigente=true`, {
      accessToken,
    }),
    djangoFetchCadastrosOperacoes(),
    listarMaquinasDjango(),
    listarSetoresDjango(),
  ])

  return { produtoOperacoes, operacoes, maquinas, setores }
}

async function djangoFetchCadastrosOperacoes(): Promise<DjangoOperacaoJson[]> {
  const accessToken = await obterAccessTokenDjango()
  return djangoFetch<DjangoOperacaoJson[]>('/api/v1/cadastros/operacoes/', { accessToken })
}

export async function listarProdutosDjango(): Promise<ProdutoListItem[]> {
  const [produtos, dadosRoteiro] = await Promise.all([
    djangoFetchProdutos<DjangoProdutoJson[]>('/'),
    carregarDadosRoteiro(),
  ])

  return ordenarProdutos(
    mapearProdutosComRoteiroDjango(
      produtos,
      dadosRoteiro.produtoOperacoes,
      dadosRoteiro.operacoes,
      dadosRoteiro.maquinas,
      dadosRoteiro.setores
    )
  )
}

export async function buscarProdutoComRoteiroDjango(id: string): Promise<ProdutoListItem | null> {
  const [produto, dadosRoteiro] = await Promise.all([
    buscarRecursoOuNull<DjangoProdutoDetailJson>(`/${id}/`),
    carregarDadosRoteiro(),
  ])

  if (!produto) {
    return null
  }

  return mapearProdutoComRoteiroDetailDjango(
    produto,
    dadosRoteiro.operacoes,
    dadosRoteiro.maquinas,
    dadosRoteiro.setores
  )
}
