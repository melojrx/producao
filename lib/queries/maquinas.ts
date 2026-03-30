import { createClient } from '@/lib/supabase/server'
import type { MaquinaListItem, TipoMaquinaOption } from '@/types'
import type { Tables } from '@/types/supabase'

type MaquinaRow = Tables<'maquinas'>
type SetorRow = Tables<'setores'>

function mapearMaquinasComTipo(
  maquinas: MaquinaRow[],
  tiposMaquina: TipoMaquinaOption[],
  setores: SetorRow[]
): MaquinaListItem[] {
  const tiposPorCodigo = new Map(tiposMaquina.map((tipo) => [tipo.codigo, tipo.nome]))
  const setoresPorId = new Map(setores.map((setor) => [setor.id, setor.nome]))

  return maquinas.map((maquina) => ({
    ...maquina,
    tipoNome: maquina.tipo_maquina_codigo
      ? tiposPorCodigo.get(maquina.tipo_maquina_codigo) ?? null
      : null,
    setorNome: maquina.setor_id
      ? setoresPorId.get(maquina.setor_id) ?? maquina.setor ?? null
      : maquina.setor ?? null,
  }))
}

export async function listarTiposMaquina(): Promise<TipoMaquinaOption[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tipos_maquina')
    .select('*')
    .order('nome')

  if (error) {
    throw new Error(`Erro ao listar tipos de máquina: ${error.message}`)
  }

  return data
}

export async function listarMaquinas(): Promise<MaquinaListItem[]> {
  const supabase = await createClient()

  const [
    { data: maquinas, error: maquinasError },
    { data: tiposMaquina, error: tiposError },
    { data: setores, error: setoresError },
  ] =
    await Promise.all([
      supabase.from('maquinas').select('*').order('codigo'),
      supabase.from('tipos_maquina').select('*').order('nome'),
      supabase.from('setores').select('*').order('codigo'),
    ])

  if (maquinasError) {
    throw new Error(`Erro ao listar máquinas: ${maquinasError.message}`)
  }

  if (tiposError) {
    throw new Error(`Erro ao listar tipos de máquina: ${tiposError.message}`)
  }

  if (setoresError) {
    throw new Error(`Erro ao listar setores das máquinas: ${setoresError.message}`)
  }

  return mapearMaquinasComTipo(maquinas, tiposMaquina, setores)
}

export async function buscarMaquinaPorId(id: string): Promise<MaquinaListItem | null> {
  const supabase = await createClient()

  const { data: maquina, error } = await supabase
    .from('maquinas')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !maquina) {
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
    throw new Error(`Erro ao listar setores das máquinas: ${setoresError.message}`)
  }

  return mapearMaquinasComTipo([maquina], tiposMaquina, setores)[0] ?? null
}

export async function buscarMaquinaPorToken(token: string): Promise<MaquinaListItem | null> {
  const supabase = await createClient()

  const { data: maquina, error } = await supabase
    .from('maquinas')
    .select('*')
    .eq('qr_code_token', token)
    .single()

  if (error || !maquina) {
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
    throw new Error(`Erro ao listar setores das máquinas: ${setoresError.message}`)
  }

  return mapearMaquinasComTipo([maquina], tiposMaquina, setores)[0] ?? null
}
