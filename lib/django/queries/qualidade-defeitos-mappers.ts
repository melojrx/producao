import { normalizarClassificacaoTipoDefeito } from '../../utils/qualidade-defeitos.ts'
import type { QualidadeDefeitoClassificacao, QualidadeTipoDefeitoListItem } from '@/types'

export interface DjangoQualidadeDefeitoJson {
  id: string
  nome: string
  classificacao: string
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface DjangoQualidadeDetalheJson {
  id: string
  defeito: string
}

export function contarHistoricoPorDefeitoId(
  detalhes: Pick<DjangoQualidadeDetalheJson, 'defeito'>[]
): Map<string, number> {
  const historicoPorDefeitoId = new Map<string, number>()

  for (const detalhe of detalhes) {
    if (!detalhe.defeito) {
      continue
    }

    historicoPorDefeitoId.set(
      detalhe.defeito,
      (historicoPorDefeitoId.get(detalhe.defeito) ?? 0) + 1
    )
  }

  return historicoPorDefeitoId
}

export function mapearDefeitoDjango(
  defeito: DjangoQualidadeDefeitoJson,
  ordem: number,
  totalVinculosHistoricos: number
): QualidadeTipoDefeitoListItem {
  const classificacao =
    normalizarClassificacaoTipoDefeito(defeito.classificacao) ??
    ('processo' satisfies QualidadeDefeitoClassificacao)

  return {
    id: defeito.id,
    nome: defeito.nome,
    classificacao,
    ativo: defeito.ativo,
    ordem,
    created_at: defeito.created_at,
    updated_at: defeito.updated_at,
    totalVinculosHistoricos,
  }
}

export function mapearDefeitosComHistoricoDjango(
  defeitos: DjangoQualidadeDefeitoJson[],
  historicoPorDefeitoId: Map<string, number>
): QualidadeTipoDefeitoListItem[] {
  const ordenados = [...defeitos].sort((primeiro, segundo) =>
    primeiro.nome.localeCompare(segundo.nome, 'pt-BR', { sensitivity: 'base' })
  )

  return ordenados.map((defeito, indice) =>
    mapearDefeitoDjango(defeito, indice, historicoPorDefeitoId.get(defeito.id) ?? 0)
  )
}
