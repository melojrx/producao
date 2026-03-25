import 'server-only'

import type { User } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { extractAdminRole, type AdminRole } from '@/lib/auth/roles'

export class AdminAuthorizationError extends Error {
  constructor(public readonly reason: 'unauthenticated' | 'unauthorized') {
    super(
      reason === 'unauthenticated'
        ? 'Usuário não autenticado'
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

  const role = extractAdminRole(user)
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

  const role = extractAdminRole(user)

  if (!role) {
    if (redirectOnFail) {
      redirect(`${redirectTo}?erro=sem-permissao`)
    }

    throw new AdminAuthorizationError('unauthorized')
  }

  return { user, role }
}
