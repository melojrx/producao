import { cache } from 'react'
import { cookies } from 'next/headers'

import { refreshAccessToken } from '../auth.ts'
import { tokenJwtExpirado } from '../jwt.ts'
import {
  DJANGO_ACCESS_TOKEN_COOKIE,
  DJANGO_REFRESH_TOKEN_COOKIE,
} from '../session.ts'

/**
 * Resolve access token JWT para a requisicao SSR atual.
 * Renova via refresh cookie em memoria quando necessario — sem escrever cookies
 * (Server Components nao podem mutar cookies; ver Next.js docs).
 */
export const resolverAccessTokenDjangoLeitura = cache(async (): Promise<string | null> => {
  const cookieStore = await cookies()
  const accessInicial = cookieStore.get(DJANGO_ACCESS_TOKEN_COOKIE)?.value
  const refreshToken = cookieStore.get(DJANGO_REFRESH_TOKEN_COOKIE)?.value

  if (accessInicial && !tokenJwtExpirado(accessInicial)) {
    return accessInicial
  }

  if (!refreshToken) {
    return null
  }

  try {
    const refreshResposta = await refreshAccessToken(refreshToken)
    return refreshResposta.access
  } catch {
    return null
  }
})
