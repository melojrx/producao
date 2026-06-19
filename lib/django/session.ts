import type { DjangoLoginResponse } from './types.ts'

/** Nomes reservados para persistencia via cookies em Server Actions (HU 16.11). */
export const DJANGO_ACCESS_TOKEN_COOKIE = 'django_access_token'
export const DJANGO_REFRESH_TOKEN_COOKIE = 'django_refresh_token'

export interface DjangoSessaoJwt {
  accessToken: string
  refreshToken: string
}

export function criarSessaoJwtDeLogin(resposta: DjangoLoginResponse): DjangoSessaoJwt {
  return {
    accessToken: resposta.access,
    refreshToken: resposta.refresh,
  }
}

export function atualizarAccessTokenSessao(
  sessao: DjangoSessaoJwt,
  novoAccessToken: string,
  novoRefreshToken?: string
): DjangoSessaoJwt {
  return {
    accessToken: novoAccessToken,
    refreshToken: novoRefreshToken ?? sessao.refreshToken,
  }
}

let sessaoMemoria: DjangoSessaoJwt | null = null

/** Armazenamento em memoria apenas para testes e ferramentas locais — nao usar em producao. */
export function salvarSessaoJwtMemoria(sessao: DjangoSessaoJwt | null): void {
  sessaoMemoria = sessao
}

export function obterSessaoJwtMemoria(): DjangoSessaoJwt | null {
  return sessaoMemoria
}

export function limparSessaoJwtMemoria(): void {
  sessaoMemoria = null
}
