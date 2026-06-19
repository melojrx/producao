import { djangoFetch } from '../client.ts'
import { obterAccessTokenDjango } from './obter-token-servidor.ts'
import {
  mapearDashboardResumoDjango,
  mapearIndicadoresQualidadeDjango,
  mapearProducaoDiariaDjango,
  type DjangoDashboardResumoJson,
  type DjangoIndicadoresQualidadeJson,
  type DjangoProducaoDiariaJson,
} from './dashboard-relatorios-mappers.ts'

const PREFIXO_RELATORIOS = '/api/v1/relatorios/dashboard'

async function djangoFetchRelatorios<T>(path: string): Promise<T> {
  const accessToken = await obterAccessTokenDjango()
  return djangoFetch<T>(`${PREFIXO_RELATORIOS}${path}`, { accessToken })
}

export async function buscarDashboardResumoDjango() {
  const resposta = await djangoFetchRelatorios<DjangoDashboardResumoJson>('/')
  return mapearDashboardResumoDjango(resposta)
}

export async function buscarProducaoDiariaDjango(dias = 30) {
  const resposta = await djangoFetchRelatorios<DjangoProducaoDiariaJson[]>(
    `/producao_diaria/?dias=${dias}`
  )
  return mapearProducaoDiariaDjango(resposta)
}

export async function buscarIndicadoresQualidadeDashboardDjango(dias = 30) {
  const resposta = await djangoFetchRelatorios<DjangoIndicadoresQualidadeJson>(
    `/indicadores_qualidade/?dias=${dias}`
  )
  return mapearIndicadoresQualidadeDjango(resposta)
}
