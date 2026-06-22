import type { SupabaseClient } from '@supabase/supabase-js'
import { estaUsandoDjango } from '@/lib/django/flags'
import type { QualidadeDefeitoClassificacao } from '@/types'
import type { Database, Tables } from '@/types/supabase'
import type { QualidadeDefeitoCatalogoItem } from '@/lib/queries/qualidade-turno-client-base'

type QualidadeDefeitoCatalogoRow = Pick<
  Tables<'qualidade_defeitos'>,
  'id' | 'nome' | 'classificacao' | 'ordem'
>

export type {
  QualidadeOperadorEnvolvido,
  QualidadeOperacaoOrigemEnvolvida,
  ResumoQualidadeTurnoResult,
  QualidadeDefeitoCatalogoItem,
} from '@/lib/queries/qualidade-turno-client-base'

export {
  listarIndicadoresQualidadeTurnoComClient,
  listarOperadoresEnvolvidosPorOperacoesOrigemComClient,
  listarResumoQualidadeTurnoComClient,
} from '@/lib/queries/qualidade-turno-client-base'

interface QueryErrorLike {
  code?: string
  message?: string
}

function isQueryErrorLike(value: unknown): value is QueryErrorLike {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    candidate.code === undefined || typeof candidate.code === 'string'
  ) && (candidate.message === undefined || typeof candidate.message === 'string')
}

function isSchemaQualidadeIndisponivel(error: unknown): boolean {
  if (!isQueryErrorLike(error)) {
    return false
  }

  if (error.code === '42P01' || error.code === '42703') {
    return true
  }

  const mensagem = (error.message ?? '').toLowerCase()

  return (
    mensagem.includes('does not exist') ||
    mensagem.includes('schema cache') ||
    mensagem.includes('could not find the table')
  )
}

function normalizarClassificacaoDefeito(classificacao: string): QualidadeDefeitoClassificacao {
  if (
    classificacao === 'maquina' ||
    classificacao === 'operador' ||
    classificacao === 'processo' ||
    classificacao === 'materia_prima'
  ) {
    return classificacao
  }

  return 'processo'
}

export async function listarCatalogoDefeitosQualidade(): Promise<QualidadeDefeitoCatalogoItem[]> {
  if (estaUsandoDjango('admin_writes') || estaUsandoDjango('qualidade_writes')) {
    const { listarCatalogoDefeitosQualidadeDjango } = await import(
      '@/lib/django/queries/qualidade-catalogo'
    )
    return listarCatalogoDefeitosQualidadeDjango()
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  return listarCatalogoDefeitosQualidadeComClient(supabase)
}

export async function listarCatalogoDefeitosQualidadeComClient(
  supabase: SupabaseClient<Database>
): Promise<QualidadeDefeitoCatalogoItem[]> {
  const { data, error } = await supabase
    .from('qualidade_defeitos')
    .select('id, nome, classificacao, ordem')
    .eq('ativo', true)
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true })
    .returns<QualidadeDefeitoCatalogoRow[]>()

  if (error) {
    if (isSchemaQualidadeIndisponivel(error)) {
      return []
    }

    throw new Error(`Erro ao listar catálogo de defeitos da qualidade: ${error.message}`)
  }

  return (data ?? []).map((defeito) => ({
    id: defeito.id,
    nome: defeito.nome,
    classificacao: normalizarClassificacaoDefeito(defeito.classificacao),
    ordem: defeito.ordem,
  }))
}
