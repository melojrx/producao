import { djangoFetch } from '../client.ts'
import { normalizarClassificacaoTipoDefeito } from '../../utils/qualidade-defeitos.ts'
import type { QualidadeDefeitoClassificacao } from '@/types'
import type { QualidadeDefeitoCatalogoItem } from '@/lib/queries/qualidade'
import {
  type DjangoQualidadeDefeitoJson,
} from './qualidade-defeitos-mappers.ts'
import { obterAccessTokenDjango } from './obter-token-servidor.ts'

const PREFIXO_QUALIDADE = '/api/v1'

async function djangoFetchQualidadeCatalogo<T>(path: string): Promise<T> {
  const accessToken = await obterAccessTokenDjango()
  return djangoFetch<T>(`${PREFIXO_QUALIDADE}${path}`, { accessToken })
}

function normalizarClassificacaoDefeito(valor: string): QualidadeDefeitoClassificacao {
  return (
    normalizarClassificacaoTipoDefeito(valor) ?? ('processo' satisfies QualidadeDefeitoClassificacao)
  )
}

export async function listarCatalogoDefeitosQualidadeDjango(): Promise<QualidadeDefeitoCatalogoItem[]> {
  const defeitos = await djangoFetchQualidadeCatalogo<DjangoQualidadeDefeitoJson[]>(
    '/qualidade/defeitos/?ativo=true'
  )

  const ordenados = [...defeitos].sort((primeiro, segundo) =>
    primeiro.nome.localeCompare(segundo.nome, 'pt-BR', { sensitivity: 'base' })
  )

  return ordenados.map((defeito, indice) => ({
    id: defeito.id,
    nome: defeito.nome,
    classificacao: normalizarClassificacaoDefeito(defeito.classificacao),
    ordem: indice,
  }))
}
