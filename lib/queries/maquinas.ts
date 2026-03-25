import { createClient } from '@/lib/supabase/server'
import type { MaquinaListItem, TipoMaquinaOption } from '@/types'
import type { Tables } from '@/types/supabase'

type MaquinaRow = Tables<'maquinas'>

function mapearMaquinasComTipo(
  maquinas: MaquinaRow[],
  tiposMaquina: TipoMaquinaOption[]
): MaquinaListItem[] {
  const tiposPorCodigo = new Map(tiposMaquina.map((tipo) => [tipo.codigo, tipo.nome]))

  return maquinas.map((maquina) => ({
    ...maquina,
    tipoNome: maquina.tipo_maquina_codigo
      ? tiposPorCodigo.get(maquina.tipo_maquina_codigo) ?? null
      : null,
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

  const [{ data: maquinas, error: maquinasError }, { data: tiposMaquina, error: tiposError }] =
    await Promise.all([
      supabase.from('maquinas').select('*').order('codigo'),
      supabase.from('tipos_maquina').select('*').order('nome'),
    ])

  if (maquinasError) {
    throw new Error(`Erro ao listar máquinas: ${maquinasError.message}`)
  }

  if (tiposError) {
    throw new Error(`Erro ao listar tipos de máquina: ${tiposError.message}`)
  }

  return mapearMaquinasComTipo(maquinas, tiposMaquina)
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

  const { data: tiposMaquina, error: tiposError } = await supabase
    .from('tipos_maquina')
    .select('*')
    .order('nome')

  if (tiposError) {
    throw new Error(`Erro ao listar tipos de máquina: ${tiposError.message}`)
  }

  return mapearMaquinasComTipo([maquina], tiposMaquina)[0] ?? null
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

  const { data: tiposMaquina, error: tiposError } = await supabase
    .from('tipos_maquina')
    .select('*')
    .order('nome')

  if (tiposError) {
    throw new Error(`Erro ao listar tipos de máquina: ${tiposError.message}`)
  }

  return mapearMaquinasComTipo([maquina], tiposMaquina)[0] ?? null
}
