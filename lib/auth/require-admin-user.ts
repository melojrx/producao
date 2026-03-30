import 'server-only'

import type { User } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AdminRole } from '@/lib/auth/roles'
import { buscarPapelAdminPorAuthUserId } from '@/lib/queries/usuarios-sistema'

export class AdminAuthorizationError extends Error {
  constructor(public readonly reason: 'unauthenticated' | 'unauthorized' | 'admin-only') {
    super(
      reason === 'unauthenticated'
        ? 'Usuário não autenticado'
        : reason === 'admin-only'
          ? 'Usuário sem permissão de administrador do sistema'
          : 'Usuário sem permissão para área administrativa'
    )
    this.name = 'AdminAuthorizationError'
  }
}

export interface AdminSession {
  user: User
  role: AdminRole
}

export function getAuthorizationErrorMessage(error: unknown): string | null {
  if (!(error instanceof AdminAuthorizationError)) {
    return null
  }

  if (error.reason === 'unauthenticated') {
    return 'Sua sessão expirou. Faça login novamente.'
  }

  if (error.reason === 'admin-only') {
    return 'Apenas administradores podem gerenciar usuários do sistema.'
  }

  return 'Sua conta não tem permissão para acessar a área administrativa.'
}

export async function getOptionalAdminSession(): Promise<AdminSession | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  const role = await buscarPapelAdminPorAuthUserId(supabase, user.id)
  if (!role) {
    return null
  }

  return { user, role }
}

interface RequireAdminUserOptions {
  redirectOnFail?: boolean
  redirectTo?: string
}

export async function requireAdminUser(
  options: RequireAdminUserOptions = {}
): Promise<AdminSession> {
  const { redirectOnFail = true, redirectTo = '/login' } = options
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    if (redirectOnFail) {
      redirect(redirectTo)
    }

    throw new AdminAuthorizationError('unauthenticated')
  }

  const role = await buscarPapelAdminPorAuthUserId(supabase, user.id)

  if (!role) {
    if (redirectOnFail) {
      redirect(`${redirectTo}?erro=sem-permissao`)
    }

    throw new AdminAuthorizationError('unauthorized')
  }

  return { user, role }
}

export async function requireSystemAdmin(
  options: RequireAdminUserOptions = {}
): Promise<AdminSession> {
  const sessao = await requireAdminUser(options)

  if (sessao.role !== 'admin') {
    const { redirectOnFail = true, redirectTo = '/admin/dashboard' } = options

    if (redirectOnFail) {
      redirect(redirectTo)
    }

    throw new AdminAuthorizationError('admin-only')
  }

  return sessao
}
