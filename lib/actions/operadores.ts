'use server'

import { revalidatePath } from 'next/cache'
import {
  getAuthorizationErrorMessage,
  requireAdminUser,
} from '@/lib/auth/require-admin-user'
import { createAdminClient } from '@/lib/supabase/admin'
import type { FormActionState } from '@/types'

function obterTexto(formData: FormData, campo: string): string {
  const valor = formData.get(campo)
  return typeof valor === 'string' ? valor.trim() : ''
}

function obterTextoOpcional(formData: FormData, campo: string): string | null {
  const valor = obterTexto(formData, campo)
  return valor ? valor : null
}

function obterNumeroInteiro(formData: FormData, campo: string): number {
  const valor = formData.get(campo)

  if (typeof valor !== 'string') {
    return Number.NaN
  }

  return Number.parseInt(valor, 10)
}

function obterMensagemDependencia(totalRegistros: number): string | null {
  if (totalRegistros > 0) {
    return 'Este operador já possui registros de produção e não pode ser excluído permanentemente.'
  }

  return null
}

export async function criarOperador(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  try {
    await requireAdminUser({ redirectOnFail: false })
  } catch (error) {
    return { erro: getAuthorizationErrorMessage(error) ?? 'Não foi possível validar sua sessão.' }
  }

  const supabase = createAdminClient()

  const nome = obterTexto(formData, 'nome')
  const matricula = obterTexto(formData, 'matricula')
  const funcao = obterTextoOpcional(formData, 'funcao')
  const cargaHorariaMin = obterNumeroInteiro(formData, 'carga_horaria_min')

  if (!nome || !matricula || cargaHorariaMin <= 0) {
    return { erro: 'Nome, matrícula e carga horária válida são obrigatórios' }
  }

  const { error } = await supabase
    .from('operadores')
    .insert({
      nome,
      matricula,
      funcao,
      carga_horaria_min: cargaHorariaMin,
    })

  if (error) {
    if (error.code === '23505') return { erro: 'Matrícula já cadastrada' }
    return { erro: `Erro ao criar operador: ${error.message}` }
  }

  revalidatePath('/admin/operadores')
  return { sucesso: true }
}

export async function editarOperador(
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

  const nome = obterTexto(formData, 'nome')
  const matricula = obterTexto(formData, 'matricula')
  const funcao = obterTextoOpcional(formData, 'funcao')
  const cargaHorariaMin = obterNumeroInteiro(formData, 'carga_horaria_min')
  const status = obterTexto(formData, 'status')

  if (!nome || !matricula || cargaHorariaMin <= 0) {
    return { erro: 'Nome, matrícula e carga horária válida são obrigatórios' }
  }

  const { error } = await supabase
    .from('operadores')
    .update({
      nome,
      matricula,
      funcao,
      carga_horaria_min: cargaHorariaMin,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    if (error.code === '23505') return { erro: 'Matrícula já cadastrada' }
    return { erro: `Erro ao editar operador: ${error.message}` }
  }

  revalidatePath('/admin/operadores')
  revalidatePath(`/admin/operadores/${id}`)
  return { sucesso: true }
}

export async function excluirOperador(id: string): Promise<FormActionState> {
  try {
    await requireAdminUser({ redirectOnFail: false })
  } catch (error) {
    return { erro: getAuthorizationErrorMessage(error) ?? 'Não foi possível validar sua sessão.' }
  }

  const supabase = createAdminClient()

  const { count, error: countError } = await supabase
    .from('registros_producao')
    .select('*', { count: 'exact', head: true })
    .eq('operador_id', id)

  if (countError) {
    return { erro: `Erro ao validar vínculos do operador: ${countError.message}` }
  }

  const mensagemDependencia = obterMensagemDependencia(count ?? 0)
  if (mensagemDependencia) {
    return { erro: mensagemDependencia }
  }

  const { error } = await supabase
    .from('operadores')
    .delete()
    .eq('id', id)

  if (error) return { erro: `Erro ao excluir operador: ${error.message}` }

  revalidatePath('/admin/operadores')
  revalidatePath(`/admin/operadores/${id}`)
  return { sucesso: true }
}

export async function desativarOperador(id: string): Promise<FormActionState> {
  try {
    await requireAdminUser({ redirectOnFail: false })
  } catch (error) {
    return { erro: getAuthorizationErrorMessage(error) ?? 'Não foi possível validar sua sessão.' }
  }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('operadores')
    .update({
      status: 'inativo',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return { erro: `Erro ao desativar operador: ${error.message}` }
  }

  revalidatePath('/admin/operadores')
  revalidatePath(`/admin/operadores/${id}`)
  return { sucesso: true }
}
