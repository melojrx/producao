import { DjangoApiError, djangoFetch } from '../client.ts'
import type { MaquinaListItem, OperacaoListItem, OperadorListItem, SetorListItem } from '@/types'

import {
  mapearMaquinaDjango,
  mapearOperacaoDjango,
  mapearOperacoesDjango,
  mapearOperadorDjango,
  mapearSetorDjango,
  type DjangoMaquinaJson,
  type DjangoOperacaoJson,
  type DjangoOperadorJson,
  type DjangoSetorJson,
} from './mappers.ts'
import { obterAccessTokenDjango } from './obter-token-servidor.ts'

const PREFIXO_CADASTROS = '/api/v1/cadastros'

async function djangoFetchCadastros<T>(path: string): Promise<T> {
  const accessToken = await obterAccessTokenDjango()
  return djangoFetch<T>(`${PREFIXO_CADASTROS}${path}`, { accessToken })
}

function ordenarMaquinas(maquinas: MaquinaListItem[]): MaquinaListItem[] {
  return [...maquinas].sort((primeira, segunda) => {
    const modeloA = (primeira.modelo ?? '').localeCompare(segunda.modelo ?? '', 'pt-BR', {
      sensitivity: 'base',
    })
    if (modeloA !== 0) {
      return modeloA
    }

    return primeira.codigo.localeCompare(segunda.codigo, 'pt-BR', { sensitivity: 'base' })
  })
}

function ordenarSetores(setores: SetorListItem[]): SetorListItem[] {
  return [...setores].sort((primeiro, segundo) => primeiro.codigo - segundo.codigo)
}

function ordenarOperadores(operadores: OperadorListItem[]): OperadorListItem[] {
  return [...operadores].sort((primeiro, segundo) =>
    primeiro.nome.localeCompare(segundo.nome, 'pt-BR', { sensitivity: 'base' })
  )
}

function ordenarOperacoes(operacoes: OperacaoListItem[]): OperacaoListItem[] {
  return [...operacoes].sort((primeira, segunda) =>
    primeira.codigo.localeCompare(segunda.codigo, 'pt-BR', { sensitivity: 'base' })
  )
}

async function buscarRecursoOuNull<T>(path: string): Promise<T | null> {
  try {
    return await djangoFetchCadastros<T>(path)
  } catch (error) {
    if (error instanceof DjangoApiError && error.status === 404) {
      return null
    }

    throw error
  }
}

export async function listarOperadoresDjango(): Promise<OperadorListItem[]> {
  const resposta = await djangoFetchCadastros<DjangoOperadorJson[]>('/operadores/')
  return ordenarOperadores(resposta.map(mapearOperadorDjango))
}

export async function buscarOperadorPorIdDjango(id: string): Promise<OperadorListItem | null> {
  const resposta = await buscarRecursoOuNull<DjangoOperadorJson>(`/operadores/${id}/`)
  return resposta ? mapearOperadorDjango(resposta) : null
}

export async function buscarOperadorPorTokenDjango(token: string): Promise<OperadorListItem | null> {
  const operadores = await listarOperadoresDjango()
  return operadores.find((operador) => operador.qr_code_token === token) ?? null
}

export async function listarMaquinasDjango(): Promise<MaquinaListItem[]> {
  const resposta = await djangoFetchCadastros<DjangoMaquinaJson[]>('/maquinas/')
  return ordenarMaquinas(resposta.map(mapearMaquinaDjango))
}

export async function buscarMaquinaPorIdDjango(id: string): Promise<MaquinaListItem | null> {
  const resposta = await buscarRecursoOuNull<DjangoMaquinaJson>(`/maquinas/${id}/`)
  return resposta ? mapearMaquinaDjango(resposta) : null
}

export async function buscarMaquinaPorTokenDjango(token: string): Promise<MaquinaListItem | null> {
  const maquinas = await listarMaquinasDjango()
  return maquinas.find((maquina) => maquina.qr_code_token === token) ?? null
}

export async function listarSetoresDjango(): Promise<SetorListItem[]> {
  const resposta = await djangoFetchCadastros<DjangoSetorJson[]>('/setores/')
  return ordenarSetores(resposta.map(mapearSetorDjango))
}

export async function buscarSetorPorIdDjango(id: string): Promise<SetorListItem | null> {
  const resposta = await buscarRecursoOuNull<DjangoSetorJson>(`/setores/${id}/`)
  return resposta ? mapearSetorDjango(resposta) : null
}

async function carregarReferenciasOperacoes(): Promise<{
  maquinas: MaquinaListItem[]
  setores: SetorListItem[]
}> {
  const [maquinas, setores] = await Promise.all([listarMaquinasDjango(), listarSetoresDjango()])
  return { maquinas, setores }
}

export async function listarOperacoesDjango(): Promise<OperacaoListItem[]> {
  const [operacoes, referencias] = await Promise.all([
    djangoFetchCadastros<DjangoOperacaoJson[]>('/operacoes/'),
    carregarReferenciasOperacoes(),
  ])

  return ordenarOperacoes(
    mapearOperacoesDjango(operacoes, referencias.maquinas, referencias.setores)
  )
}

export async function buscarOperacaoPorIdDjango(id: string): Promise<OperacaoListItem | null> {
  const [operacao, referencias] = await Promise.all([
    buscarRecursoOuNull<DjangoOperacaoJson>(`/operacoes/${id}/`),
    carregarReferenciasOperacoes(),
  ])

  if (!operacao) {
    return null
  }

  const maquinasPorId = new Map(referencias.maquinas.map((maquina) => [maquina.id, maquina]))
  const setoresPorId = new Map(referencias.setores.map((setor) => [setor.id, setor]))

  return mapearOperacaoDjango(operacao, maquinasPorId, setoresPorId)
}

export async function buscarOperacaoPorTokenDjango(token: string): Promise<OperacaoListItem | null> {
  const operacoes = await listarOperacoesDjango()
  return operacoes.find((operacao) => operacao.qr_code_token === token) ?? null
}
