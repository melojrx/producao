import { cookies } from 'next/headers'

import { DJANGO_ACCESS_TOKEN_COOKIE } from '../session.ts'

export class DjangoTokenAusenteError extends Error {
  constructor() {
    super(
      'Login Django necessario: token JWT ausente. Configure o cookie django_access_token (HU 16.11) ou DJANGO_DEV_ACCESS_TOKEN apenas em desenvolvimento.'
    )
    this.name = 'DjangoTokenAusenteError'
  }
}

export async function obterAccessTokenDjango(): Promise<string> {
  const cookieStore = await cookies()
  const tokenCookie = cookieStore.get(DJANGO_ACCESS_TOKEN_COOKIE)?.value

  if (tokenCookie) {
    return tokenCookie
  }

  // Somente para testes locais com flag cadastros_reads ligada antes da HU 16.11.
  const devToken = process.env.DJANGO_DEV_ACCESS_TOKEN?.trim()
  if (devToken) {
    return devToken
  }

  throw new DjangoTokenAusenteError()
}
