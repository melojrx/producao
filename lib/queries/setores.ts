import { estaUsandoDjango } from '@/lib/django/flags'
import { buscarSetorPorIdDjango, listarSetoresDjango } from '@/lib/django/queries/cadastros'
import { createClient } from '@/lib/supabase/server'
import type { SetorListItem } from '@/types'

async function listarSetoresSupabase(): Promise<SetorListItem[]> {
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

async function buscarSetorPorIdSupabase(id: string): Promise<SetorListItem | null> {
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

export async function listarSetores(): Promise<SetorListItem[]> {
  if (estaUsandoDjango('cadastros_reads')) {
    return listarSetoresDjango()
  }

  return listarSetoresSupabase()
}

export async function buscarSetorPorId(id: string): Promise<SetorListItem | null> {
  if (estaUsandoDjango('cadastros_reads')) {
    return buscarSetorPorIdDjango(id)
  }

  return buscarSetorPorIdSupabase(id)
}
