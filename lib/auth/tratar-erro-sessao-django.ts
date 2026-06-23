import 'server-only'

import { redirect } from 'next/navigation'
import { deveRedirecionarSessaoDjangoExpirada } from '@/lib/auth/deve-redirecionar-sessao-django'
import { resolverAccessTokenDjangoLeitura } from '@/lib/django/queries/resolver-token-servidor'

export { deveRedirecionarSessaoDjangoExpirada } from '@/lib/auth/deve-redirecionar-sessao-django'

export function redirecionarSeSessaoDjangoExpirada(error: unknown): never {
  if (deveRedirecionarSessaoDjangoExpirada(error)) {
    redirect('/login?erro=sessao-expirada')
  }

  throw error
}

/**
 * Garante JWT Django antes de queries paralelas.
 * redirect() nao pode ser chamado dentro de Promise.all — Next.js exige fora de promises agregadas.
 */
export async function garantirSessaoAdminDjango(): Promise<void> {
  const token = await resolverAccessTokenDjangoLeitura()
  const devToken = process.env.DJANGO_DEV_ACCESS_TOKEN?.trim()

  if (!token && !devToken) {
    redirect('/login?erro=sessao-expirada')
  }
}

export async function executarPaginaAdminDjango<T>(carregar: () => Promise<T>): Promise<T> {
  await garantirSessaoAdminDjango()

  try {
    return await carregar()
  } catch (error: unknown) {
    redirecionarSeSessaoDjangoExpirada(error)
  }
}
