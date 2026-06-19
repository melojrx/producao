import 'server-only'

import { getOptionalAdminSession } from '@/lib/auth/require-admin-user'
import { estaUsandoDjango } from '@/lib/django/flags'

/**
 * Retorna o UUID do User Django (accounts.User) quando auth cutover está ativo
 * e há sessão admin válida. Scanner público sem login retorna null — válido para MDJ-10.
 */
export async function resolverUsuarioDjangoAutenticadoOpcional(): Promise<string | null> {
  if (!estaUsandoDjango('auth')) {
    return null
  }

  const sessao = await getOptionalAdminSession()
  return sessao?.user.id ?? null
}
