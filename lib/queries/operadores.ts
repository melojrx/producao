import { estaUsandoDjango } from '@/lib/django/flags'
import {
  buscarOperadorPorIdDjango,
  buscarOperadorPorTokenDjango,
  listarOperadoresDjango,
} from '@/lib/django/queries/cadastros'
import { createClient } from '@/lib/supabase/server'
import type { OperadorListItem } from '@/types'

async function listarOperadoresSupabase(): Promise<OperadorListItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('operadores')
    .select('*')
    .order('nome')

  if (error) throw new Error(`Erro ao listar operadores: ${error.message}`)
  return data
}

async function buscarOperadorPorIdSupabase(id: string): Promise<OperadorListItem | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('operadores')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

async function buscarOperadorPorTokenSupabase(token: string): Promise<OperadorListItem | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('operadores')
    .select('*')
    .eq('qr_code_token', token)
    .single()

  if (error) return null
  return data
}

export async function listarOperadores(): Promise<OperadorListItem[]> {
  if (estaUsandoDjango('cadastros_reads')) {
    return listarOperadoresDjango()
  }

  return listarOperadoresSupabase()
}

export async function buscarOperadorPorId(id: string): Promise<OperadorListItem | null> {
  if (estaUsandoDjango('cadastros_reads')) {
    return buscarOperadorPorIdDjango(id)
  }

  return buscarOperadorPorIdSupabase(id)
}

export async function buscarOperadorPorToken(token: string): Promise<OperadorListItem | null> {
  if (estaUsandoDjango('cadastros_reads')) {
    return buscarOperadorPorTokenDjango(token)
  }

  return buscarOperadorPorTokenSupabase(token)
}
