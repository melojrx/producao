import { djangoFetch } from '../client.ts'
import type { TipoDefeitoDadosNormalizados } from '@/lib/utils/qualidade-defeitos'

import { obterAccessTokenDjango } from '../queries/obter-token-servidor.ts'
import type { DjangoQualidadeDefeitoJson } from '../queries/qualidade-defeitos-mappers.ts'
import { construirPayloadDefeitoDjango } from './qualidade-defeitos-helpers.ts'

const PREFIXO_DEFEITOS = '/api/v1/qualidade/defeitos'

interface DjangoFetchDefeitosOptions {
  method: 'POST' | 'PATCH'
  body?: unknown
}

async function djangoFetchDefeitos<T>(
  pathSuffix: string,
  options: DjangoFetchDefeitosOptions
): Promise<T> {
  const accessToken = await obterAccessTokenDjango()
  return djangoFetch<T>(`${PREFIXO_DEFEITOS}${pathSuffix}`, {
    accessToken,
    method: options.method,
    body: options.body,
  })
}

async function djangoPostDefeitos<T>(pathSuffix: string): Promise<T> {
  const accessToken = await obterAccessTokenDjango()
  return djangoFetch<T>(`${PREFIXO_DEFEITOS}${pathSuffix}`, {
    accessToken,
    method: 'POST',
  })
}

export {
  construirPayloadDefeitoDjango,
  EXCLUSAO_DJANGO_USA_INATIVACAO,
  mapearErroAcaoQualidadeDefeitoDjango,
} from './qualidade-defeitos-helpers.ts'

export async function criarTipoDefeitoQualidadeDjango(
  dados: TipoDefeitoDadosNormalizados
): Promise<void> {
  await djangoFetchDefeitos<DjangoQualidadeDefeitoJson>('/', {
    method: 'POST',
    body: construirPayloadDefeitoDjango(dados),
  })
}

export async function editarTipoDefeitoQualidadeDjango(
  id: string,
  dados: TipoDefeitoDadosNormalizados
): Promise<void> {
  await djangoFetchDefeitos<DjangoQualidadeDefeitoJson>(`/${id}/`, {
    method: 'PATCH',
    body: construirPayloadDefeitoDjango(dados),
  })
}

export async function inativarTipoDefeitoQualidadeDjango(id: string): Promise<void> {
  await djangoPostDefeitos<DjangoQualidadeDefeitoJson>(`/${id}/inativar/`)
}

export async function reativarTipoDefeitoQualidadeDjango(id: string): Promise<void> {
  await djangoPostDefeitos<DjangoQualidadeDefeitoJson>(`/${id}/reativar/`)
}
