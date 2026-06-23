import 'server-only'

import type { EditarMetaMensalInput, SalvarMetaMensalInput } from '@/lib/actions/metas-mensais'
import type { MetaMensal } from '@/types'
import { normalizarCompetenciaMensal, obterCompetenciaMesAtual } from '@/lib/utils/data'
import { djangoFetch } from '../client'
import { mapearMetaMensalDjango, type DjangoMetaMensalJson } from '../queries/metas-mappers'
import { obterAccessTokenDjango } from '../queries/obter-token-servidor'

const PREFIXO_METAS = '/api/v1/metas'

function resolverCompetencia(competencia: string): string {
  return normalizarCompetenciaMensal(competencia) ?? obterCompetenciaMesAtual()
}

function construirPayloadMetaMensal(input: SalvarMetaMensalInput): Record<string, unknown> {
  return {
    competencia: resolverCompetencia(input.competencia),
    meta_pecas: input.metaPecas,
    dias_produtivos: input.diasProdutivos,
    observacao: input.observacao?.trim() ?? '',
  }
}

async function djangoFetchMetas<T>(path: string, init: { method: string; body?: unknown }): Promise<T> {
  const accessToken = await obterAccessTokenDjango()
  return djangoFetch<T>(`${PREFIXO_METAS}${path}`, {
    accessToken,
    method: init.method,
    body: init.body,
  })
}

export async function criarMetaMensalDjango(input: SalvarMetaMensalInput): Promise<MetaMensal> {
  const resposta = await djangoFetchMetas<DjangoMetaMensalJson>('/', {
    method: 'POST',
    body: construirPayloadMetaMensal(input),
  })

  return mapearMetaMensalDjango(resposta)
}

export async function editarMetaMensalDjango(input: EditarMetaMensalInput): Promise<MetaMensal> {
  const resposta = await djangoFetchMetas<DjangoMetaMensalJson>(`/${input.id}/`, {
    method: 'PATCH',
    body: construirPayloadMetaMensal(input),
  })

  return mapearMetaMensalDjango(resposta)
}
