import { createClient } from '@/lib/supabase/server'
import type { OperacaoListItem } from '@/types'
import type { Tables } from '@/types/supabase'

type OperacaoRow = Tables<'operacoes'>
type MaquinaRow = Tables<'maquinas'>
type SetorRow = Tables<'setores'>

function mapearOperacoes(
  operacoes: OperacaoRow[],
  maquinas: MaquinaRow[],
  setores: SetorRow[]
): OperacaoListItem[] {
  const maquinasPorId = new Map(maquinas.map((maquina) => [maquina.id, maquina]))
  const setoresPorId = new Map(setores.map((setor) => [setor.id, setor]))

  return operacoes.map((operacao) => ({
    ...operacao,
    maquinaCodigo: operacao.maquina_id ? maquinasPorId.get(operacao.maquina_id)?.codigo ?? null : null,
    maquinaModelo: operacao.maquina_id ? maquinasPorId.get(operacao.maquina_id)?.modelo ?? null : null,
    setorCodigo: operacao.setor_id ? setoresPorId.get(operacao.setor_id)?.codigo ?? null : null,
    setorNome: operacao.setor_id ? setoresPorId.get(operacao.setor_id)?.nome ?? null : null,
  }))
}

export async function listarOperacoes(): Promise<OperacaoListItem[]> {
  const supabase = await createClient()

  const [
    { data: operacoes, error: operacoesError },
    { data: maquinas, error: maquinasError },
    { data: setores, error: setoresError },
  ] =
    await Promise.all([
      supabase.from('operacoes').select('*').order('codigo'),
      supabase.from('maquinas').select('*').order('modelo').order('codigo'),
      supabase.from('setores').select('*').order('codigo'),
    ])

  if (operacoesError) {
    throw new Error(`Erro ao listar operações: ${operacoesError.message}`)
  }

  if (maquinasError) {
    throw new Error(`Erro ao listar máquinas das operações: ${maquinasError.message}`)
  }

  if (setoresError) {
    throw new Error(`Erro ao listar setores das operações: ${setoresError.message}`)
  }

  return mapearOperacoes(operacoes, maquinas, setores)
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
    { data: maquinas, error: maquinasError },
    { data: setores, error: setoresError },
  ] = await Promise.all([
    supabase.from('maquinas').select('*').order('modelo').order('codigo'),
    supabase.from('setores').select('*').order('codigo'),
  ])

  if (maquinasError) {
    throw new Error(`Erro ao listar máquinas das operações: ${maquinasError.message}`)
  }

  if (setoresError) {
    throw new Error(`Erro ao listar setores das operações: ${setoresError.message}`)
  }

  return mapearOperacoes([operacao], maquinas, setores)[0] ?? null
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
    { data: maquinas, error: maquinasError },
    { data: setores, error: setoresError },
  ] = await Promise.all([
    supabase.from('maquinas').select('*').order('modelo').order('codigo'),
    supabase.from('setores').select('*').order('codigo'),
  ])

  if (maquinasError) {
    throw new Error(`Erro ao listar máquinas das operações: ${maquinasError.message}`)
  }

  if (setoresError) {
    throw new Error(`Erro ao listar setores das operações: ${setoresError.message}`)
  }

  return mapearOperacoes([operacao], maquinas, setores)[0] ?? null
}
