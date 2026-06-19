import { DjangoApiError, djangoFetch } from '../client.ts'
import { normalizarCompetenciaMensal, obterCompetenciaMesAtual } from '@/lib/utils/data'

import {
  mapearMetaMensalDjango,
  mapearResumoMetaMensalDashboardDjango,
  type DjangoMetaMensalJson,
  type DjangoMetaMensalResumoDashboardJson,
} from './metas-mappers.ts'
import { obterAccessTokenDjango } from './obter-token-servidor.ts'

const PREFIXO_METAS = '/api/v1/metas'

async function djangoFetchMetas<T>(path: string): Promise<T> {
  const accessToken = await obterAccessTokenDjango()
  return djangoFetch<T>(`${PREFIXO_METAS}${path}`, { accessToken })
}

async function buscarRecursoMetasOuNull<T>(path: string): Promise<T | null> {
  try {
    return await djangoFetchMetas<T>(path)
  } catch (error) {
    if (error instanceof DjangoApiError && error.status === 404) {
      return null
    }

    throw error
  }
}

function resolverCompetenciaQuery(competenciaSelecionada?: string): string {
  const competencia =
    normalizarCompetenciaMensal(competenciaSelecionada ?? obterCompetenciaMesAtual()) ??
    obterCompetenciaMesAtual()

  return `?competencia=${encodeURIComponent(competencia)}`
}

export async function buscarMetaMensalCompetenciaDjango(
  competenciaSelecionada?: string
): Promise<{
  competencia: string
  metaMensal: ReturnType<typeof mapearMetaMensalDjango> | null
}> {
  const competencia =
    normalizarCompetenciaMensal(competenciaSelecionada ?? obterCompetenciaMesAtual()) ??
    obterCompetenciaMesAtual()

  const resposta = await buscarRecursoMetasOuNull<DjangoMetaMensalJson>(
    `/competencia/${competencia}/`
  )

  return {
    competencia,
    metaMensal: resposta ? mapearMetaMensalDjango(resposta) : null,
  }
}

export async function buscarResumoMetaMensalDashboardDjango(
  competenciaSelecionada?: string
): Promise<ReturnType<typeof mapearResumoMetaMensalDashboardDjango>> {
  const resposta = await djangoFetchMetas<DjangoMetaMensalResumoDashboardJson>(
    `/resumo${resolverCompetenciaQuery(competenciaSelecionada)}`
  )

  return mapearResumoMetaMensalDashboardDjango(resposta)
}
