import 'server-only'

import { DjangoTokenAusenteError } from '@/lib/django/queries/obter-token-servidor'
import { redirect } from 'next/navigation'

export function redirecionarSeSessaoDjangoExpirada(error: unknown): never {
  if (error instanceof DjangoTokenAusenteError) {
    redirect('/login?erro=sessao-expirada')
  }

  throw error
}

export async function executarQueryAdminDjango<T>(consulta: () => Promise<T>): Promise<T> {
  try {
    return await consulta()
  } catch (error: unknown) {
    redirecionarSeSessaoDjangoExpirada(error)
  }
}
