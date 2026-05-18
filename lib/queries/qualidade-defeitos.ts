import { createClient } from '@/lib/supabase/server'
import { normalizarClassificacaoTipoDefeito } from '@/lib/utils/qualidade-defeitos'
import type {
  QualidadeDefeitoClassificacao,
  QualidadeTipoDefeitoListItem,
  QualidadeTiposDefeitoListagemParams,
} from '@/types'
import type { Tables } from '@/types/supabase'

type QualidadeDefeitoRow = Tables<'qualidade_defeitos'>
type QualidadeDetalheRow = Pick<Tables<'qualidade_detalhes'>, 'qualidade_defeito_id'>

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

function mapearDefeitosComHistorico(
  defeitos: QualidadeDefeitoRow[],
  detalhes: QualidadeDetalheRow[]
): QualidadeTipoDefeitoListItem[] {
  const historicoPorDefeitoId = new Map<string, number>()

  for (const detalhe of detalhes) {
    if (!detalhe.qualidade_defeito_id) {
      continue
    }

    historicoPorDefeitoId.set(
      detalhe.qualidade_defeito_id,
      (historicoPorDefeitoId.get(detalhe.qualidade_defeito_id) ?? 0) + 1
    )
  }

  return defeitos.map((defeito) => {
    const classificacao =
      normalizarClassificacaoTipoDefeito(defeito.classificacao) ??
      ('processo' satisfies QualidadeDefeitoClassificacao)

    return {
      ...defeito,
      classificacao,
      totalVinculosHistoricos: historicoPorDefeitoId.get(defeito.id) ?? 0,
    }
  })
}

export async function listarTiposDefeitoQualidade(
  params: QualidadeTiposDefeitoListagemParams = {
    busca: '',
    status: 'todos',
  }
): Promise<QualidadeTipoDefeitoListItem[]> {
  const supabase = await createClient()

  const [
    { data: defeitos, error: defeitosError },
    { data: detalhes, error: detalhesError },
  ] = await Promise.all([
    supabase
      .from('qualidade_defeitos')
      .select('*')
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true })
      .returns<QualidadeDefeitoRow[]>(),
    supabase
      .from('qualidade_detalhes')
      .select('qualidade_defeito_id')
      .not('qualidade_defeito_id', 'is', null)
      .returns<QualidadeDetalheRow[]>(),
  ])

  if (defeitosError) {
    throw new Error(`Erro ao listar tipos de defeito: ${defeitosError.message}`)
  }

  if (detalhesError) {
    throw new Error(`Erro ao carregar histórico dos tipos de defeito: ${detalhesError.message}`)
  }

  const defeitosComHistorico = mapearDefeitosComHistorico(defeitos ?? [], detalhes ?? [])
  return aplicarBusca(aplicarStatus(defeitosComHistorico, params.status), params.busca)
}
