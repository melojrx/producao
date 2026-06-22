import 'server-only'

import { resolverAccessTokenDjangoLeitura } from './resolver-token-servidor.ts'

export class DjangoTokenAusenteError extends Error {
  constructor() {
    super(
      'Login Django necessario: token JWT ausente. Configure o cookie django_access_token (HU 16.11) ou DJANGO_DEV_ACCESS_TOKEN apenas em desenvolvimento.'
    )
    this.name = 'DjangoTokenAusenteError'
  }
}

export async function obterAccessTokenDjango(): Promise<string> {
  const tokenRequest = await resolverAccessTokenDjangoLeitura()
  if (tokenRequest) {
    return tokenRequest
  }

  const devToken = process.env.DJANGO_DEV_ACCESS_TOKEN?.trim()
  if (devToken) {
    return devToken
  }

  throw new DjangoTokenAusenteError()
}
