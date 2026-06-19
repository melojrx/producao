'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { usuarioDjangoTemAcessoAdmin } from '@/lib/auth/sessao-django'
import { loginDjango } from '@/lib/django/auth.ts'
import { limparSessaoJwtCookies, persistirSessaoJwtCookies } from '@/lib/django/cookies.ts'
import { DjangoApiError } from '@/lib/django/client.ts'
import { estaUsandoDjango } from '@/lib/django/flags.ts'
import { buscarPapelAdminPorAuthUserId } from '@/lib/queries/usuarios-sistema'
import type { FormActionState } from '@/types'

function obterTexto(formData: FormData, campo: string): string {
  const valor = formData.get(campo)
  return typeof valor === 'string' ? valor.trim() : ''
}

async function entrarAdminSupabase(
  email: string,
  senha: string
): Promise<FormActionState> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  })

  if (error || !data.user) {
    return { erro: 'Email ou senha inválidos' }
  }

  const role = await buscarPapelAdminPorAuthUserId(supabase, data.user.id)

  if (!role) {
    await supabase.auth.signOut()
    return { erro: 'Sua conta não possui cadastro administrativo ativo.' }
  }

  redirect('/admin/dashboard')
}

async function entrarAdminDjango(
  email: string,
  senha: string
): Promise<FormActionState> {
  try {
    const resposta = await loginDjango(email, senha)

    if (!usuarioDjangoTemAcessoAdmin(resposta.user)) {
      await limparSessaoJwtCookies()
      return { erro: 'Sua conta não possui cadastro administrativo ativo.' }
    }

    await persistirSessaoJwtCookies(resposta.access, resposta.refresh)
    redirect('/admin/dashboard')
  } catch (error) {
    if (error instanceof DjangoApiError) {
      return { erro: 'Email ou senha inválidos' }
    }

    throw error
  }
}

export async function entrarAdmin(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const email = obterTexto(formData, 'email')
  const senha = obterTexto(formData, 'senha')

  if (!email || !senha) {
    return { erro: 'Email e senha são obrigatórios' }
  }

  if (estaUsandoDjango('auth')) {
    return entrarAdminDjango(email, senha)
  }

  return entrarAdminSupabase(email, senha)
}

export async function sairAdmin(): Promise<void> {
  if (estaUsandoDjango('auth')) {
    await limparSessaoJwtCookies()
  }

  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
