import { cookies } from 'next/headers'

import { construirOpcoesCookieJwt, MAX_AGE_ACCESS_SEGUNDOS, MAX_AGE_REFRESH_SEGUNDOS } from './cookie-options.ts'
import {
  DJANGO_ACCESS_TOKEN_COOKIE,
  DJANGO_REFRESH_TOKEN_COOKIE,
} from './session.ts'

export { construirOpcoesCookieJwt } from './cookie-options.ts'

export async function persistirSessaoJwtCookies(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  const cookieStore = await cookies()

  cookieStore.set(
    DJANGO_ACCESS_TOKEN_COOKIE,
    accessToken,
    construirOpcoesCookieJwt(MAX_AGE_ACCESS_SEGUNDOS)
  )
  cookieStore.set(
    DJANGO_REFRESH_TOKEN_COOKIE,
    refreshToken,
    construirOpcoesCookieJwt(MAX_AGE_REFRESH_SEGUNDOS)
  )
}

export async function limparSessaoJwtCookies(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(DJANGO_ACCESS_TOKEN_COOKIE)
  cookieStore.delete(DJANGO_REFRESH_TOKEN_COOKIE)
}

export async function obterTokensJwtDosCookies(): Promise<{
  accessToken: string | undefined
  refreshToken: string | undefined
}> {
  const cookieStore = await cookies()

  return {
    accessToken: cookieStore.get(DJANGO_ACCESS_TOKEN_COOKIE)?.value,
    refreshToken: cookieStore.get(DJANGO_REFRESH_TOKEN_COOKIE)?.value,
  }
}
