import { estaUsandoDjango } from '@/lib/django/flags'
import {
  buscarMaquinaPorIdDjango,
  buscarMaquinaPorTokenDjango,
  listarMaquinasDjango,
} from '@/lib/django/queries/cadastros'
import { createClient } from '@/lib/supabase/server'
import type { MaquinaListItem } from '@/types'

async function listarMaquinasSupabase(): Promise<MaquinaListItem[]> {
  const supabase = await createClient()

  const { data: maquinas, error } = await supabase
    .from('maquinas')
    .select('*')
    .order('modelo')
    .order('codigo')

  if (error) {
    throw new Error(`Erro ao listar máquinas: ${error.message}`)
  }

  return maquinas ?? []
}

async function buscarMaquinaPorIdSupabase(id: string): Promise<MaquinaListItem | null> {
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

async function buscarMaquinaPorTokenSupabase(token: string): Promise<MaquinaListItem | null> {
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

export async function listarMaquinas(): Promise<MaquinaListItem[]> {
  if (estaUsandoDjango('cadastros_reads')) {
    return listarMaquinasDjango()
  }

  return listarMaquinasSupabase()
}

export async function buscarMaquinaPorId(id: string): Promise<MaquinaListItem | null> {
  if (estaUsandoDjango('cadastros_reads')) {
    return buscarMaquinaPorIdDjango(id)
  }

  return buscarMaquinaPorIdSupabase(id)
}

export async function buscarMaquinaPorToken(token: string): Promise<MaquinaListItem | null> {
  if (estaUsandoDjango('cadastros_reads')) {
    return buscarMaquinaPorTokenDjango(token)
  }

  return buscarMaquinaPorTokenSupabase(token)
}
