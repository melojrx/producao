import { createClient } from '@/lib/supabase/server'
import type { SetorListItem } from '@/types'

export async function listarSetores(): Promise<SetorListItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('setores')
    .select('*')
    .order('codigo')

  if (error) {
    throw new Error(`Erro ao listar setores: ${error.message}`)
  }

  return data
}

export async function buscarSetorPorId(id: string): Promise<SetorListItem | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('setores')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data
}
