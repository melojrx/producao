'use server'

import { revalidatePath } from 'next/cache'
import {
  getAuthorizationErrorMessage,
  requireSystemAdmin,
} from '@/lib/auth/require-admin-user'
import { isAdminRole } from '@/lib/auth/roles'
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
    await requireSystemAdmin({ redirectOnFail: false })
    return null
  } catch (error) {
    return {
      erro: getAuthorizationErrorMessage(error) ?? 'Não foi possível validar sua sessão.',
    }
  }
}

export async function criarUsuarioSistema(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const erroSessao = await validarSessaoAdmin()
  if (erroSessao) {
    return erroSessao
  }

  const nome = obterTexto(formData, 'nome')
  const email = obterTexto(formData, 'email').toLowerCase()
  const senha = obterTexto(formData, 'senha')
  const papel = obterTexto(formData, 'papel')

  if (!nome || !email || !senha || !isAdminRole(papel)) {
    return { erro: 'Nome, email, senha e papel válidos são obrigatórios.' }
  }

  if (senha.length < 6) {
    return { erro: 'A senha inicial deve ter pelo menos 6 caracteres.' }
  }

  const supabase = createAdminClient()

  const { data: existente } = await supabase
    .from('usuarios_sistema')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existente) {
    return { erro: 'Já existe um usuário do sistema com este email.' }
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return { erro: `Erro ao criar usuário de autenticação: ${authError?.message ?? 'erro desconhecido'}` }
  }

  const { error: insertError } = await supabase.from('usuarios_sistema').insert({
    auth_user_id: authData.user.id,
    nome,
    email,
    papel,
    ativo: true,
  })

  if (insertError) {
    await supabase.auth.admin.deleteUser(authData.user.id)

    if (insertError.code === '23505') {
      return { erro: 'Já existe um usuário do sistema com este email.' }
    }

    return { erro: `Erro ao criar cadastro administrativo: ${insertError.message}` }
  }

  revalidatePath('/admin/usuarios')
  return { sucesso: true }
}

export async function editarUsuarioSistema(
  id: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const erroSessao = await validarSessaoAdmin()
  if (erroSessao) {
    return erroSessao
  }

  const nome = obterTexto(formData, 'nome')
  const email = obterTexto(formData, 'email').toLowerCase()
  const senha = obterTexto(formData, 'senha')
  const papel = obterTexto(formData, 'papel')
  const ativo = obterAtivo(formData)

  if (!nome || !email || !isAdminRole(papel)) {
    return { erro: 'Nome, email e papel válidos são obrigatórios.' }
  }

  if (senha && senha.length < 6) {
    return { erro: 'A nova senha deve ter pelo menos 6 caracteres.' }
  }

  const supabase = createAdminClient()

  const { data: atual, error: atualError } = await supabase
    .from('usuarios_sistema')
    .select('*')
    .eq('id', id)
    .single()

  if (atualError || !atual) {
    return { erro: 'Usuário do sistema não encontrado.' }
  }

  if (email !== atual.email) {
    const { data: duplicado } = await supabase
      .from('usuarios_sistema')
      .select('id')
      .eq('email', email)
      .neq('id', id)
      .maybeSingle()

    if (duplicado) {
      return { erro: 'Já existe outro usuário do sistema com este email.' }
    }
  }

  const payloadAuth: {
    email?: string
    password?: string
  } = {}

  if (email !== atual.email) {
    payloadAuth.email = email
  }

  if (senha) {
    payloadAuth.password = senha
  }

  if (payloadAuth.email || payloadAuth.password) {
    const { error: authError } = await supabase.auth.admin.updateUserById(
      atual.auth_user_id,
      payloadAuth
    )

    if (authError) {
      return { erro: `Erro ao atualizar autenticação do usuário: ${authError.message}` }
    }
  }

  const { error: updateError } = await supabase
    .from('usuarios_sistema')
    .update({
      nome,
      email,
      papel,
      ativo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    return { erro: `Erro ao atualizar cadastro administrativo: ${updateError.message}` }
  }

  revalidatePath('/admin/usuarios')
  return { sucesso: true }
}

export async function inativarUsuarioSistema(id: string): Promise<FormActionState> {
  const erroSessao = await validarSessaoAdmin()
  if (erroSessao) {
    return erroSessao
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('usuarios_sistema')
    .update({
      ativo: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return { erro: `Erro ao inativar usuário do sistema: ${error.message}` }
  }

  revalidatePath('/admin/usuarios')
  return { sucesso: true }
}
