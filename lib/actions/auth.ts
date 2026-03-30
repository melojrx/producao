'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buscarPapelAdminPorAuthUserId } from '@/lib/queries/usuarios-sistema'
import type { FormActionState } from '@/types'

function obterTexto(formData: FormData, campo: string): string {
  const valor = formData.get(campo)
  return typeof valor === 'string' ? valor.trim() : ''
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

export async function sairAdmin(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
