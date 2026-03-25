import { createClient } from '@/lib/supabase/server'
import type { OperacaoListItem } from '@/types'
import type { Tables } from '@/types/supabase'

type OperacaoRow = Tables<'operacoes'>

function mapearOperacoesComTipo(
  operacoes: OperacaoRow[],
  tiposMaquina: Tables<'tipos_maquina'>[]
): OperacaoListItem[] {
  const tiposPorCodigo = new Map(tiposMaquina.map((tipo) => [tipo.codigo, tipo.nome]))

  return operacoes.map((operacao) => ({
    ...operacao,
    tipoNome: operacao.tipo_maquina_codigo
      ? tiposPorCodigo.get(operacao.tipo_maquina_codigo) ?? null
      : null,
  }))
}

export async function listarOperacoes(): Promise<OperacaoListItem[]> {
  const supabase = await createClient()

  const [{ data: operacoes, error: operacoesError }, { data: tiposMaquina, error: tiposError }] =
    await Promise.all([
      supabase.from('operacoes').select('*').order('codigo'),
      supabase.from('tipos_maquina').select('*').order('nome'),
    ])

  if (operacoesError) {
    throw new Error(`Erro ao listar operações: ${operacoesError.message}`)
  }

  if (tiposError) {
    throw new Error(`Erro ao listar tipos de máquina: ${tiposError.message}`)
  }

  return mapearOperacoesComTipo(operacoes, tiposMaquina)
}

export async function buscarOperacaoPorId(id: string): Promise<OperacaoListItem | null> {
  const supabase = await createClient()

  const { data: operacao, error } = await supabase
    .from('operacoes')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !operacao) {
    return null
  }

  const { data: tiposMaquina, error: tiposError } = await supabase
    .from('tipos_maquina')
    .select('*')
    .order('nome')

  if (tiposError) {
    throw new Error(`Erro ao listar tipos de máquina: ${tiposError.message}`)
  }

  return mapearOperacoesComTipo([operacao], tiposMaquina)[0] ?? null
}

export async function buscarOperacaoPorToken(token: string): Promise<OperacaoListItem | null> {
  const supabase = await createClient()

  const { data: operacao, error } = await supabase
    .from('operacoes')
    .select('*')
    .eq('qr_code_token', token)
    .single()

  if (error || !operacao) {
    return null
  }

  const { data: tiposMaquina, error: tiposError } = await supabase
    .from('tipos_maquina')
    .select('*')
    .order('nome')

  if (tiposError) {
    throw new Error(`Erro ao listar tipos de máquina: ${tiposError.message}`)
  }

  return mapearOperacoesComTipo([operacao], tiposMaquina)[0] ?? null
}
