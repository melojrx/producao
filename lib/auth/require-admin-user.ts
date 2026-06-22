import 'server-only'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AdminRole } from '@/lib/auth/roles'
import {
  resolverSessaoAdminDjango,
  type AdminSessionUser,
} from '@/lib/auth/sessao-django'
import { obterUsuarioAtualDjango } from '@/lib/django/auth.ts'
import { estaUsandoDjango } from '@/lib/django/flags.ts'
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
  user: AdminSessionUser
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

async function obterSessaoAdminDjango(): Promise<AdminSession | null> {
  return resolverSessaoAdminDjango({
    obterUsuarioAtual: obterUsuarioAtualDjango,
  })
}

async function obterSessaoAdminSupabase(): Promise<AdminSession | null> {
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

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    role,
  }
}

export async function getOptionalAdminSession(): Promise<AdminSession | null> {
  if (estaUsandoDjango('auth')) {
    return obterSessaoAdminDjango()
  }

  return obterSessaoAdminSupabase()
}

interface RequireAdminUserOptions {
  redirectOnFail?: boolean
  redirectTo?: string
}

export async function requireAdminUser(
  options: RequireAdminUserOptions = {}
): Promise<AdminSession> {
  const { redirectOnFail = true, redirectTo = '/login' } = options

  if (estaUsandoDjango('auth')) {
    const sessao = await obterSessaoAdminDjango()

    if (!sessao) {
      if (redirectOnFail) {
        redirect(`${redirectTo}?erro=sessao-expirada`)
      }

      throw new AdminAuthorizationError('unauthenticated')
    }

    return sessao
  }

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

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    role,
  }
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
