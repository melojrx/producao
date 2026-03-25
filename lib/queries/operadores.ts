import { createClient } from '@/lib/supabase/server'

export async function listarOperadores() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('operadores')
    .select('*')
    .order('nome')

  if (error) throw new Error(`Erro ao listar operadores: ${error.message}`)
  return data
}

export async function buscarOperadorPorId(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('operadores')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function buscarOperadorPorToken(token: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('operadores')
    .select('*')
    .eq('qr_code_token', token)
    .single()

  if (error) return null
  return data
}
