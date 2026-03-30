import { createClient } from '@/lib/supabase/server'
import type { OperacaoListItem } from '@/types'
import type { Tables } from '@/types/supabase'

type OperacaoRow = Tables<'operacoes'>
type SetorRow = Tables<'setores'>

function mapearOperacoesComTipo(
  operacoes: OperacaoRow[],
  tiposMaquina: Tables<'tipos_maquina'>[],
  setores: SetorRow[]
): OperacaoListItem[] {
  const tiposPorCodigo = new Map(tiposMaquina.map((tipo) => [tipo.codigo, tipo.nome]))
  const setoresPorId = new Map(setores.map((setor) => [setor.id, setor.nome]))

  return operacoes.map((operacao) => ({
    ...operacao,
    tipoNome: operacao.tipo_maquina_codigo
      ? tiposPorCodigo.get(operacao.tipo_maquina_codigo) ?? null
      : null,
    setorNome: operacao.setor_id
      ? setoresPorId.get(operacao.setor_id) ?? null
      : null,
  }))
}

export async function listarOperacoes(): Promise<OperacaoListItem[]> {
  const supabase = await createClient()

  const [
    { data: operacoes, error: operacoesError },
    { data: tiposMaquina, error: tiposError },
    { data: setores, error: setoresError },
  ] =
    await Promise.all([
      supabase.from('operacoes').select('*').order('codigo'),
      supabase.from('tipos_maquina').select('*').order('nome'),
      supabase.from('setores').select('*').order('codigo'),
    ])

  if (operacoesError) {
    throw new Error(`Erro ao listar operações: ${operacoesError.message}`)
  }

  if (tiposError) {
    throw new Error(`Erro ao listar tipos de máquina: ${tiposError.message}`)
  }

  if (setoresError) {
    throw new Error(`Erro ao listar setores das operações: ${setoresError.message}`)
  }

  return mapearOperacoesComTipo(operacoes, tiposMaquina, setores)
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

  const [
    { data: tiposMaquina, error: tiposError },
    { data: setores, error: setoresError },
  ] = await Promise.all([
    supabase.from('tipos_maquina').select('*').order('nome'),
    supabase.from('setores').select('*').order('codigo'),
  ])

  if (tiposError) {
    throw new Error(`Erro ao listar tipos de máquina: ${tiposError.message}`)
  }

  if (setoresError) {
    throw new Error(`Erro ao listar setores das operações: ${setoresError.message}`)
  }

  return mapearOperacoesComTipo([operacao], tiposMaquina, setores)[0] ?? null
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

  const [
    { data: tiposMaquina, error: tiposError },
    { data: setores, error: setoresError },
  ] = await Promise.all([
    supabase.from('tipos_maquina').select('*').order('nome'),
    supabase.from('setores').select('*').order('codigo'),
  ])

  if (tiposError) {
    throw new Error(`Erro ao listar tipos de máquina: ${tiposError.message}`)
  }

  if (setoresError) {
    throw new Error(`Erro ao listar setores das operações: ${setoresError.message}`)
  }

  return mapearOperacoesComTipo([operacao], tiposMaquina, setores)[0] ?? null
}
