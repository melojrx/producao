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

function obterAtivo(formData: FormData): boolean {
  return formData.get('ativo') === 'true'
}

async function validarSessaoAdmin(): Promise<FormActionState | null> {
  try {
    await requireAdminUser({ redirectOnFail: false })
    return null
  } catch (error) {
    return {
      erro: getAuthorizationErrorMessage(error) ?? 'Não foi possível validar sua sessão.',
    }
  }
}

export async function criarSetor(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const erroSessao = await validarSessaoAdmin()
  if (erroSessao) {
    return erroSessao
  }

  const nome = obterTexto(formData, 'nome')
  if (!nome) {
    return { erro: 'Nome do setor é obrigatório.' }
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('setores').insert({
    nome,
  })

  if (error) {
    if (error.code === '23505') {
      return { erro: 'Já existe um setor com este nome.' }
    }

    return { erro: `Erro ao criar setor: ${error.message}` }
  }

  revalidatePath('/admin/setores')
  return { sucesso: true }
}

export async function editarSetor(
  id: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const erroSessao = await validarSessaoAdmin()
  if (erroSessao) {
    return erroSessao
  }

  const nome = obterTexto(formData, 'nome')
  if (!nome) {
    return { erro: 'Nome do setor é obrigatório.' }
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('setores')
    .update({
      nome,
      ativo: obterAtivo(formData),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    if (error.code === '23505') {
      return { erro: 'Já existe um setor com este nome.' }
    }

    return { erro: `Erro ao editar setor: ${error.message}` }
  }

  revalidatePath('/admin/setores')
  return { sucesso: true }
}

export async function excluirSetor(id: string): Promise<FormActionState> {
  const erroSessao = await validarSessaoAdmin()
  if (erroSessao) {
    return erroSessao
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('setores')
    .delete()
    .eq('id', id)

  if (error) {
    return { erro: `Erro ao excluir setor: ${error.message}` }
  }

  revalidatePath('/admin/setores')
  return { sucesso: true }
}
