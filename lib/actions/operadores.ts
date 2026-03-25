'use server'

import { revalidatePath } from 'next/cache'
import {
  getAuthorizationErrorMessage,
  requireAdminUser,
} from '@/lib/auth/require-admin-user'
import { createAdminClient } from '@/lib/supabase/admin'
import type { FormActionState } from '@/types'

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

  const nome = formData.get('nome') as string
  const matricula = formData.get('matricula') as string
  const setor = (formData.get('setor') as string) || null
  const funcao = (formData.get('funcao') as string) || null

  if (!nome?.trim() || !matricula?.trim()) {
    return { erro: 'Nome e matrícula são obrigatórios' }
  }

  const { error } = await supabase
    .from('operadores')
    .insert({ nome: nome.trim(), matricula: matricula.trim(), setor, funcao })

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

  const nome = formData.get('nome') as string
  const matricula = formData.get('matricula') as string
  const setor = (formData.get('setor') as string) || null
  const funcao = (formData.get('funcao') as string) || null
  const status = formData.get('status') as string

  if (!nome?.trim() || !matricula?.trim()) {
    return { erro: 'Nome e matrícula são obrigatórios' }
  }

  const { error } = await supabase
    .from('operadores')
    .update({
      nome: nome.trim(),
      matricula: matricula.trim(),
      setor,
      funcao,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    if (error.code === '23505') return { erro: 'Matrícula já cadastrada' }
    return { erro: `Erro ao editar operador: ${error.message}` }
  }

  revalidatePath('/admin/operadores')
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
