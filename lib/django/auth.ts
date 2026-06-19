import { djangoFetch } from './client.ts'
import type {
  DjangoLoginResponse,
  DjangoRefreshResponse,
  DjangoUsuarioAutenticado,
} from './types.ts'

const CAMINHO_LOGIN = '/api/v1/accounts/login/'
const CAMINHO_REFRESH = '/api/v1/accounts/refresh/'
const CAMINHO_ME = '/api/v1/accounts/me/'

export async function loginDjango(email: string, senha: string): Promise<DjangoLoginResponse> {
  return djangoFetch<DjangoLoginResponse>(CAMINHO_LOGIN, {
    method: 'POST',
    body: { email, senha },
  })
}

export async function refreshAccessToken(refresh: string): Promise<DjangoRefreshResponse> {
  return djangoFetch<DjangoRefreshResponse>(CAMINHO_REFRESH, {
    method: 'POST',
    body: { refresh },
  })
}

export async function obterUsuarioAtualDjango(
  accessToken: string
): Promise<DjangoUsuarioAutenticado> {
  return djangoFetch<DjangoUsuarioAutenticado>(CAMINHO_ME, {
    method: 'GET',
    accessToken,
  })
}
