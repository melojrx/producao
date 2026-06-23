import 'server-only'

import { DjangoTokenAusenteError } from '../errors.ts'
import { resolverAccessTokenDjangoLeitura } from './resolver-token-servidor.ts'

export { DjangoTokenAusenteError } from '../errors.ts'

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
