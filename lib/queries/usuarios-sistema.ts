import type { SupabaseClient } from '@supabase/supabase-js'
import { isAdminRole, type AdminRole } from '@/lib/auth/roles'
import type { UsuarioSistemaListItem, UsuarioSistemaStatus } from '@/types'
import type { Database, Tables } from '@/types/supabase'

type UsuarioSistemaRow = Tables<'usuarios_sistema'>

function mapearStatusUsuarioSistema(ativo: boolean | null): UsuarioSistemaStatus {
  return ativo === false ? 'inativo' : 'ativo'
}

function mapearUsuarioSistema(row: UsuarioSistemaRow): UsuarioSistemaListItem {
  return {
    ...row,
    papel: isAdminRole(row.papel) ? row.papel : 'supervisor',
    status: mapearStatusUsuarioSistema(row.ativo),
  }
}

export async function buscarUsuarioSistemaPorAuthUserId(
  supabase: SupabaseClient<Database>,
  authUserId: string
): Promise<UsuarioSistemaRow | null> {
  const { data, error } = await supabase
    .from('usuarios_sistema')
    .select('*')
    .eq('auth_user_id', authUserId)
    .eq('ativo', true)
    .maybeSingle<UsuarioSistemaRow>()

  if (error || !data) {
    return null
  }

  return data
}

export async function buscarPapelAdminPorAuthUserId(
  supabase: SupabaseClient<Database>,
  authUserId: string
): Promise<AdminRole | null> {
  const usuarioSistema = await buscarUsuarioSistemaPorAuthUserId(supabase, authUserId)

  if (!usuarioSistema || !isAdminRole(usuarioSistema.papel)) {
    return null
  }

  return usuarioSistema.papel
}

export async function listarUsuariosSistema(): Promise<UsuarioSistemaListItem[]> {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('usuarios_sistema')
    .select('*')
    .order('nome')

  if (error) {
    throw new Error(`Erro ao listar usuários do sistema: ${error.message}`)
  }

  return data.map(mapearUsuarioSistema)
}

export async function buscarUsuarioSistemaPorId(id: string): Promise<UsuarioSistemaListItem | null> {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('usuarios_sistema')
    .select('*')
    .eq('id', id)
    .maybeSingle<UsuarioSistemaRow>()

  if (error || !data) {
    return null
  }

  return mapearUsuarioSistema(data)
}
