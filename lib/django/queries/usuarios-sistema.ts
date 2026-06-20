import { djangoFetch } from '../client.ts'
import { isAdminRole } from '@/lib/auth/roles'
import type { UsuarioSistemaListItem, UsuarioSistemaStatus } from '@/types'
import { obterAccessTokenDjango } from './obter-token-servidor.ts'

const PREFIXO_ACCOUNTS = '/api/v1/accounts'

export interface DjangoUsuarioSistemaJson {
  id: string
  email: string
  nome: string
  papel: string
  pode_revisar_qualidade: boolean
  ativo: boolean
  supabase_auth_uid: string | null
  created_at: string
  updated_at: string
}

function mapearStatusUsuarioSistema(ativo: boolean): UsuarioSistemaStatus {
  return ativo ? 'ativo' : 'inativo'
}

function mapearUsuarioSistemaDjango(usuario: DjangoUsuarioSistemaJson): UsuarioSistemaListItem {
  const papel = isAdminRole(usuario.papel) ? usuario.papel : 'supervisor'

  return {
    id: usuario.id,
    auth_user_id: usuario.supabase_auth_uid ?? usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    papel,
    pode_revisar_qualidade: usuario.pode_revisar_qualidade,
    ativo: usuario.ativo,
    status: mapearStatusUsuarioSistema(usuario.ativo),
    created_at: usuario.created_at,
    updated_at: usuario.updated_at,
  }
}

export async function listarUsuariosSistemaDjango(): Promise<UsuarioSistemaListItem[]> {
  const accessToken = await obterAccessTokenDjango()
  const resposta = await djangoFetch<DjangoUsuarioSistemaJson[]>(`${PREFIXO_ACCOUNTS}/usuarios/`, {
    accessToken,
  })

  return resposta.map(mapearUsuarioSistemaDjango)
}
