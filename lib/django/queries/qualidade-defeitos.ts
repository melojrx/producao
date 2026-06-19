import { djangoFetch } from '../client.ts'
import type {
  QualidadeTipoDefeitoListItem,
  QualidadeTiposDefeitoListagemParams,
} from '@/types'

import { obterAccessTokenDjango } from './obter-token-servidor.ts'
import {
  contarHistoricoPorDefeitoId,
  mapearDefeitosComHistoricoDjango,
  type DjangoQualidadeDefeitoJson,
  type DjangoQualidadeDetalheJson,
} from './qualidade-defeitos-mappers.ts'

const PREFIXO_QUALIDADE = '/api/v1'

async function djangoFetchQualidade<T>(path: string): Promise<T> {
  const accessToken = await obterAccessTokenDjango()
  return djangoFetch<T>(`${PREFIXO_QUALIDADE}${path}`, { accessToken })
}

function normalizarTexto(valor: string | null | undefined): string {
  return (valor ?? '').trim().toLocaleLowerCase('pt-BR')
}

function aplicarBusca(
  defeitos: QualidadeTipoDefeitoListItem[],
  busca: string
): QualidadeTipoDefeitoListItem[] {
  const termo = normalizarTexto(busca)

  if (!termo) {
    return defeitos
  }

  return defeitos.filter((defeito) => {
    return (
      normalizarTexto(defeito.nome).includes(termo) ||
      normalizarTexto(defeito.classificacao).includes(termo)
    )
  })
}

function aplicarStatus(
  defeitos: QualidadeTipoDefeitoListItem[],
  status: QualidadeTiposDefeitoListagemParams['status']
): QualidadeTipoDefeitoListItem[] {
  if (status === 'ativos') {
    return defeitos.filter((defeito) => defeito.ativo)
  }

  if (status === 'inativos') {
    return defeitos.filter((defeito) => !defeito.ativo)
  }

  return defeitos
}

export async function listarTiposDefeitoQualidadeDjango(
  params: QualidadeTiposDefeitoListagemParams = {
    busca: '',
    status: 'todos',
  }
): Promise<QualidadeTipoDefeitoListItem[]> {
  const [defeitosAtivos, defeitosInativos, detalhes] = await Promise.all([
    djangoFetchQualidade<DjangoQualidadeDefeitoJson[]>('/qualidade/defeitos/?ativo=true'),
    djangoFetchQualidade<DjangoQualidadeDefeitoJson[]>('/qualidade/defeitos/?ativo=false'),
    djangoFetchQualidade<DjangoQualidadeDetalheJson[]>('/qualidade/detalhes/'),
  ])

  const todosDefeitos = [...defeitosAtivos, ...defeitosInativos]
  const historicoPorDefeitoId = contarHistoricoPorDefeitoId(detalhes)
  const defeitosComHistorico = mapearDefeitosComHistoricoDjango(todosDefeitos, historicoPorDefeitoId)

  return aplicarBusca(aplicarStatus(defeitosComHistorico, params.status), params.busca)
}
