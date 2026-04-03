'use server'

import { revalidatePath } from 'next/cache'
import {
  getAuthorizationErrorMessage,
  requireAdminUser,
} from '@/lib/auth/require-admin-user'
import { createAdminClient } from '@/lib/supabase/admin'
import { calcularTpProduto } from '@/lib/utils/producao'
import type { FormActionState } from '@/types'
import type { Tables } from '@/types/supabase'

type OperacaoRow = Tables<'operacoes'>

interface RoteiroPayloadItem {
  operacaoId: string
  sequencia: number
}

interface DependenciasProduto {
  emTurnoAberto: boolean
  totalTurnos: number
  totalConfiguracoes: number
  totalRegistros: number
}

function obterMensagemProdutoEmUso(): string {
  return 'Este produto está em uso em um turno aberto e não pode ser arquivado ou excluído no momento.'
}

function obterMensagemHistoricoProduto(): string {
  return 'Este produto já possui histórico operacional ou de planejamento e não pode ser excluído permanentemente. Use arquivar/desativar para preservar o histórico.'
}

function produtoTemHistorico(dependencias: DependenciasProduto): boolean {
  return (
    dependencias.totalTurnos > 0 ||
    dependencias.totalConfiguracoes > 0 ||
    dependencias.totalRegistros > 0
  )
}

async function carregarDependenciasProduto(id: string): Promise<DependenciasProduto> {
  const supabase = createAdminClient()

  const [
    { count: totalTurnosAbertos, error: turnosAbertosError },
    { count: totalTurnos, error: turnosError },
    { count: totalConfiguracoes, error: configuracaoError },
    { count: totalRegistros, error: registrosError },
  ] = await Promise.all([
    supabase
      .from('turno_ops')
      .select('id, turnos!inner(status)', { count: 'exact', head: true })
      .eq('produto_id', id)
      .eq('turnos.status', 'aberto'),
    supabase
      .from('turno_ops')
      .select('*', { count: 'exact', head: true })
      .eq('produto_id', id),
    supabase
      .from('configuracao_turno')
      .select('*', { count: 'exact', head: true })
      .eq('produto_id', id),
    supabase
      .from('registros_producao')
      .select('*', { count: 'exact', head: true })
      .eq('produto_id', id),
  ])

  if (turnosAbertosError) {
    throw new Error(`Erro ao validar uso do produto em turno aberto: ${turnosAbertosError.message}`)
  }

  if (turnosError) {
    throw new Error(`Erro ao validar histórico do produto em turnos: ${turnosError.message}`)
  }

  if (configuracaoError) {
    throw new Error(`Erro ao validar configurações do produto: ${configuracaoError.message}`)
  }

  if (registrosError) {
    throw new Error(`Erro ao validar histórico do produto: ${registrosError.message}`)
  }

  return {
    emTurnoAberto: (totalTurnosAbertos ?? 0) > 0,
    totalTurnos: totalTurnos ?? 0,
    totalConfiguracoes: totalConfiguracoes ?? 0,
    totalRegistros: totalRegistros ?? 0,
  }
}

function obterTexto(formData: FormData, campo: string): string {
  const valor = formData.get(campo)
  return typeof valor === 'string' ? valor.trim() : ''
}

function obterTextoOpcional(formData: FormData, campo: string): string | null {
  const valor = obterTexto(formData, campo)
  return valor ? valor : null
}

function isRoteiroPayloadItem(value: unknown): value is RoteiroPayloadItem {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const item = value as Record<string, unknown>

  return (
    typeof item.operacaoId === 'string' &&
    item.operacaoId.length > 0 &&
    typeof item.sequencia === 'number' &&
    Number.isInteger(item.sequencia) &&
    item.sequencia > 0
  )
}

function lerRoteiroDoForm(formData: FormData): RoteiroPayloadItem[] | null {
  const valor = formData.get('roteiro')

  if (typeof valor !== 'string' || !valor) {
    return null
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(valor)
  } catch {
    return null
  }

  if (!Array.isArray(parsed) || !parsed.every(isRoteiroPayloadItem)) {
    return null
  }

  const roteiroNormalizado = parsed
    .slice()
    .sort((primeiro, segundo) => primeiro.sequencia - segundo.sequencia)
    .map((item, index) => ({
      operacaoId: item.operacaoId,
      sequencia: index + 1,
    }))

  const operacoesUnicas = new Set(roteiroNormalizado.map((item) => item.operacaoId))

  if (operacoesUnicas.size !== roteiroNormalizado.length) {
    return null
  }

  return roteiroNormalizado
}

async function carregarOperacoesDoRoteiro(roteiro: RoteiroPayloadItem[]): Promise<OperacaoRow[] | null> {
  const supabase = createAdminClient()

  const operacaoIds = roteiro.map((item) => item.operacaoId)

  const { data, error } = await supabase
    .from('operacoes')
    .select('*')
    .in('id', operacaoIds)

  if (error) {
    throw new Error(`Erro ao carregar operações do roteiro: ${error.message}`)
  }

  if (data.length !== operacaoIds.length) {
    return null
  }

  const operacoesPorId = new Map(data.map((operacao) => [operacao.id, operacao]))

  return operacaoIds
    .map((operacaoId) => operacoesPorId.get(operacaoId))
    .filter((operacao): operacao is OperacaoRow => Boolean(operacao))
}

function operacoesSemSetor(operacoes: OperacaoRow[]): boolean {
  return operacoes.some((operacao) => !operacao.setor_id)
}

async function substituirRoteiro(
  produtoId: string,
  roteiro: RoteiroPayloadItem[]
): Promise<FormActionState> {
  const supabase = createAdminClient()

  const { error: deleteError } = await supabase
    .from('produto_operacoes')
    .delete()
    .eq('produto_id', produtoId)

  if (deleteError) {
    return { erro: `Erro ao atualizar roteiro: ${deleteError.message}` }
  }

  const { error: insertError } = await supabase.from('produto_operacoes').insert(
    roteiro.map((item) => ({
      produto_id: produtoId,
      operacao_id: item.operacaoId,
      sequencia: item.sequencia,
    }))
  )

  if (insertError) {
    return { erro: `Erro ao salvar roteiro: ${insertError.message}` }
  }

  return { sucesso: true }
}

export async function salvarRoteiro(
  produtoId: string,
  roteiro: RoteiroPayloadItem[]
): Promise<FormActionState> {
  try {
    await requireAdminUser({ redirectOnFail: false })
  } catch (error) {
    return { erro: getAuthorizationErrorMessage(error) ?? 'Não foi possível validar sua sessão.' }
  }

  if (!produtoId || roteiro.length === 0) {
    return { erro: 'Produto e roteiro são obrigatórios' }
  }

  const resultado = await substituirRoteiro(produtoId, roteiro)

  if (resultado.erro) {
    return resultado
  }

  revalidatePath('/admin/produtos')
  revalidatePath(`/admin/produtos/${produtoId}`)
  return { sucesso: true }
}

export async function criarProduto(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  try {
    await requireAdminUser({ redirectOnFail: false })
  } catch (error) {
    return { erro: getAuthorizationErrorMessage(error) ?? 'Não foi possível validar sua sessão.' }
  }

  const supabase = createAdminClient()

  const referencia = obterTexto(formData, 'referencia')
  const nome = obterTexto(formData, 'nome')
  const imagemUrl = obterTextoOpcional(formData, 'imagem_url')
  const roteiro = lerRoteiroDoForm(formData)

  if (!referencia || !nome || !roteiro || roteiro.length === 0) {
    return { erro: 'Referência, nome e pelo menos uma operação no roteiro são obrigatórios' }
  }

  const operacoes = await carregarOperacoesDoRoteiro(roteiro)

  if (!operacoes) {
    return { erro: 'Roteiro inválido. Selecione operações válidas.' }
  }

  if (operacoesSemSetor(operacoes)) {
    return { erro: 'Todas as operações do roteiro precisam ter setor definido para a V2.' }
  }

  const tpProdutoMin = calcularTpProduto(
    operacoes.map((operacao) => ({ tempoPadraoMin: operacao.tempo_padrao_min }))
  )

  const { data: produto, error } = await supabase
    .from('produtos')
    .insert({
      referencia,
      nome,
      imagem_url: imagemUrl,
      tp_produto_min: tpProdutoMin,
    })
    .select('id')
    .single()

  if (error || !produto) {
    if (error?.code === '23505') {
      return { erro: 'Referência do produto já cadastrada' }
    }

    return { erro: `Erro ao criar produto: ${error?.message ?? 'erro desconhecido'}` }
  }

  const resultadoRoteiro = await substituirRoteiro(produto.id, roteiro)

  if (resultadoRoteiro.erro) {
    await supabase.from('produtos').delete().eq('id', produto.id)
    return resultadoRoteiro
  }

  revalidatePath('/admin/produtos')
  return { sucesso: true }
}

export async function editarProduto(
  id: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  try {
    await requireAdminUser({ redirectOnFail: false })
  } catch (error) {
    return { erro: getAuthorizationErrorMessage(error) ?? 'Não foi possível validar sua sessão.' }
  }

  const supabase = createAdminClient()

  const referencia = obterTexto(formData, 'referencia')
  const nome = obterTexto(formData, 'nome')
  const imagemUrl = obterTextoOpcional(formData, 'imagem_url')
  const ativo = formData.get('ativo') === 'true'
  const roteiro = lerRoteiroDoForm(formData)

  if (!referencia || !nome || !roteiro || roteiro.length === 0) {
    return { erro: 'Referência, nome e pelo menos uma operação no roteiro são obrigatórios' }
  }

  const operacoes = await carregarOperacoesDoRoteiro(roteiro)

  if (!operacoes) {
    return { erro: 'Roteiro inválido. Selecione operações válidas.' }
  }

  if (operacoesSemSetor(operacoes)) {
    return { erro: 'Todas as operações do roteiro precisam ter setor definido para a V2.' }
  }

  const tpProdutoMin = calcularTpProduto(
    operacoes.map((operacao) => ({ tempoPadraoMin: operacao.tempo_padrao_min }))
  )

  const { error } = await supabase
    .from('produtos')
    .update({
      referencia,
      nome,
      imagem_url: imagemUrl,
      ativo,
      tp_produto_min: tpProdutoMin,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    if (error.code === '23505') {
      return { erro: 'Referência do produto já cadastrada' }
    }

    return { erro: `Erro ao editar produto: ${error.message}` }
  }

  const resultadoRoteiro = await substituirRoteiro(id, roteiro)

  if (resultadoRoteiro.erro) {
    return resultadoRoteiro
  }

  revalidatePath('/admin/produtos')
  revalidatePath(`/admin/produtos/${id}`)
  return { sucesso: true }
}

export async function desativarProduto(id: string): Promise<FormActionState> {
  try {
    await requireAdminUser({ redirectOnFail: false })
  } catch (error) {
    return { erro: getAuthorizationErrorMessage(error) ?? 'Não foi possível validar sua sessão.' }
  }

  let dependencias: DependenciasProduto

  try {
    dependencias = await carregarDependenciasProduto(id)
  } catch (error) {
    return {
      erro:
        error instanceof Error
          ? error.message
          : 'Não foi possível validar o uso atual do produto.',
    }
  }

  if (dependencias.emTurnoAberto) {
    return { erro: obterMensagemProdutoEmUso() }
  }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('produtos')
    .update({
      ativo: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return { erro: `Erro ao desativar produto: ${error.message}` }
  }

  revalidatePath('/admin/produtos')
  revalidatePath(`/admin/produtos/${id}`)
  return { sucesso: true }
}

export async function excluirProduto(id: string): Promise<FormActionState> {
  try {
    await requireAdminUser({ redirectOnFail: false })
  } catch (error) {
    return { erro: getAuthorizationErrorMessage(error) ?? 'Não foi possível validar sua sessão.' }
  }

  let dependencias: DependenciasProduto

  try {
    dependencias = await carregarDependenciasProduto(id)
  } catch (error) {
    return {
      erro:
        error instanceof Error
          ? error.message
          : 'Não foi possível validar o uso atual do produto.',
    }
  }

  if (dependencias.emTurnoAberto) {
    return { erro: obterMensagemProdutoEmUso() }
  }

  if (produtoTemHistorico(dependencias)) {
    return { erro: obterMensagemHistoricoProduto() }
  }

  const supabase = createAdminClient()

  const { error: deleteRoteiroError } = await supabase
    .from('produto_operacoes')
    .delete()
    .eq('produto_id', id)

  if (deleteRoteiroError) {
    return { erro: `Erro ao remover roteiro do produto: ${deleteRoteiroError.message}` }
  }

  const { error } = await supabase
    .from('produtos')
    .delete()
    .eq('id', id)

  if (error) {
    return { erro: `Erro ao excluir produto: ${error.message}` }
  }

  revalidatePath('/admin/produtos')
  revalidatePath(`/admin/produtos/${id}`)
  return { sucesso: true }
}
