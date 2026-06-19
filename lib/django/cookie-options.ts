const MAX_AGE_ACCESS_SEGUNDOS = 60 * 60 * 24
const MAX_AGE_REFRESH_SEGUNDOS = 60 * 60 * 24 * 7

export function construirOpcoesCookieJwt(maxAgeSegundos: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSegundos,
  }
}

export { MAX_AGE_ACCESS_SEGUNDOS, MAX_AGE_REFRESH_SEGUNDOS }
