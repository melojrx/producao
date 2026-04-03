import { createClient } from '@/lib/supabase/server'
import type { MaquinaListItem, TipoMaquinaOption } from '@/types'

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

  const { data: maquinas, error } = await supabase
    .from('maquinas')
    .select('*')
    .order('codigo')

  if (error) {
    throw new Error(`Erro ao listar máquinas: ${error.message}`)
  }

  return maquinas ?? []
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

  return maquina
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

  return maquina
}
