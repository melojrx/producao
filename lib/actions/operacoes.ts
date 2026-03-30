'use server'

import { revalidatePath } from 'next/cache'
import {
  getAuthorizationErrorMessage,
  requireAdminUser,
} from '@/lib/auth/require-admin-user'
import { createAdminClient } from '@/lib/supabase/admin'
import { MINUTOS_TURNO_PADRAO } from '@/lib/constants'
import { calcularMetaDia, calcularMetaHora } from '@/lib/utils/producao'
import type { FormActionState } from '@/types'

function obterTexto(formData: FormData, campo: string): string {
  const valor = formData.get(campo)
  return typeof valor === 'string' ? valor.trim() : ''
}

function obterTextoOpcional(formData: FormData, campo: string): string | null {
  const valor = obterTexto(formData, campo)
  return valor ? valor : null
}

function obterNumero(formData: FormData, campo: string): number {
  const valor = formData.get(campo)

  if (typeof valor !== 'string') {
    return Number.NaN
  }

  return Number.parseFloat(valor)
}

function obterAtiva(formData: FormData): boolean {
  const valor = formData.get('ativa')
  return valor === 'true'
}

function obterMensagemDependencia(
  totalRoteiros: number,
  totalRegistros: number
): string | null {
  if (totalRoteiros > 0 || totalRegistros > 0) {
    return 'Esta operação já faz parte de roteiro ou histórico de produção e não pode ser excluída permanentemente.'
  }

  return null
}

export async function criarOperacao(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  try {
    await requireAdminUser({ redirectOnFail: false })
  } catch (error) {
    return { erro: getAuthorizationErrorMessage(error) ?? 'Não foi possível validar sua sessão.' }
  }

  const supabase = createAdminClient()

  const descricao = obterTexto(formData, 'descricao')
  const setorId = obterTexto(formData, 'setor_id')
  const tipoMaquinaCodigo = obterTextoOpcional(formData, 'tipo_maquina_codigo')
  const tempoPadraoMin = obterNumero(formData, 'tempo_padrao_min')

  if (!descricao || !setorId || !tipoMaquinaCodigo || tempoPadraoMin <= 0) {
    return { erro: 'Setor, descrição, tipo da máquina e T.P válido são obrigatórios' }
  }

  const metaHora = calcularMetaHora(tempoPadraoMin)
  const metaDia = calcularMetaDia(tempoPadraoMin, MINUTOS_TURNO_PADRAO)

  const { error } = await supabase.from('operacoes').insert({
    descricao,
    setor_id: setorId,
    tipo_maquina_codigo: tipoMaquinaCodigo,
    tempo_padrao_min: tempoPadraoMin,
    meta_hora: metaHora,
    meta_dia: metaDia,
  })

  if (error) {
    if (error.code === '23505') {
      return { erro: 'Código da operação já cadastrado' }
    }

    return { erro: `Erro ao criar operação: ${error.message}` }
  }

  revalidatePath('/admin/operacoes')
  return { sucesso: true }
}

export async function desativarOperacao(id: string): Promise<FormActionState> {
  try {
    await requireAdminUser({ redirectOnFail: false })
  } catch (error) {
    return { erro: getAuthorizationErrorMessage(error) ?? 'Não foi possível validar sua sessão.' }
  }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('operacoes')
    .update({
      ativa: false,
    })
    .eq('id', id)

  if (error) {
    return { erro: `Erro ao desativar operação: ${error.message}` }
  }

  revalidatePath('/admin/operacoes')
  revalidatePath(`/admin/operacoes/${id}`)
  return { sucesso: true }
}

export async function excluirOperacao(id: string): Promise<FormActionState> {
  try {
    await requireAdminUser({ redirectOnFail: false })
  } catch (error) {
    return { erro: getAuthorizationErrorMessage(error) ?? 'Não foi possível validar sua sessão.' }
  }

  const supabase = createAdminClient()

  const [{ count: totalRoteiros, error: roteiroError }, { count: totalRegistros, error: registrosError }] =
    await Promise.all([
      supabase
        .from('produto_operacoes')
        .select('*', { count: 'exact', head: true })
        .eq('operacao_id', id),
      supabase
        .from('registros_producao')
        .select('*', { count: 'exact', head: true })
        .eq('operacao_id', id),
    ])

  if (roteiroError) {
    return { erro: `Erro ao validar vínculos da operação: ${roteiroError.message}` }
  }

  if (registrosError) {
    return { erro: `Erro ao validar histórico da operação: ${registrosError.message}` }
  }

  const mensagemDependencia = obterMensagemDependencia(totalRoteiros ?? 0, totalRegistros ?? 0)
  if (mensagemDependencia) {
    return { erro: mensagemDependencia }
  }

  const { error } = await supabase
    .from('operacoes')
    .delete()
    .eq('id', id)

  if (error) {
    return { erro: `Erro ao excluir operação: ${error.message}` }
  }

  revalidatePath('/admin/operacoes')
  revalidatePath(`/admin/operacoes/${id}`)
  return { sucesso: true }
}

export async function editarOperacao(
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

  const descricao = obterTexto(formData, 'descricao')
  const setorId = obterTexto(formData, 'setor_id')
  const tipoMaquinaCodigo = obterTextoOpcional(formData, 'tipo_maquina_codigo')
  const tempoPadraoMin = obterNumero(formData, 'tempo_padrao_min')
  const ativa = obterAtiva(formData)

  if (!descricao || !setorId || !tipoMaquinaCodigo || tempoPadraoMin <= 0) {
    return { erro: 'Setor, descrição, tipo da máquina e T.P válido são obrigatórios' }
  }

  const metaHora = calcularMetaHora(tempoPadraoMin)
  const metaDia = calcularMetaDia(tempoPadraoMin, MINUTOS_TURNO_PADRAO)

  const { error } = await supabase
    .from('operacoes')
    .update({
      descricao,
      setor_id: setorId,
      tipo_maquina_codigo: tipoMaquinaCodigo,
      tempo_padrao_min: tempoPadraoMin,
      meta_hora: metaHora,
      meta_dia: metaDia,
      ativa,
    })
    .eq('id', id)

  if (error) {
    if (error.code === '23505') {
      return { erro: 'Código da operação já cadastrado' }
    }

    return { erro: `Erro ao editar operação: ${error.message}` }
  }

  revalidatePath('/admin/operacoes')
  revalidatePath(`/admin/operacoes/${id}`)
  return { sucesso: true }
}
