import 'server-only'

import { getOptionalAdminSession } from '@/lib/auth/require-admin-user'
import { estaUsandoDjango } from '@/lib/django/flags'
import { obterUsuarioAtualDjango } from '@/lib/django/auth.ts'
import { obterTokensJwtDosCookies } from '@/lib/django/cookies.ts'
import { buscarUsuarioSistemaPorAuthUserId } from '@/lib/queries/usuarios-sistema'
import { createClient } from '@/lib/supabase/server'

export interface PerfilRevisorQualidadeOpcional {
  podeRevisarQualidade: boolean
  nome: string | null
}

export async function obterPerfilRevisorQualidadeOpcional(): Promise<PerfilRevisorQualidadeOpcional | null> {
  if (estaUsandoDjango('auth')) {
    const sessao = await getOptionalAdminSession()

    if (!sessao) {
      return null
    }

    const tokens = await obterTokensJwtDosCookies()
    const accessToken = tokens.accessToken

    if (!accessToken) {
      return null
    }

    try {
      const usuario = await obterUsuarioAtualDjango(accessToken)
      return {
        podeRevisarQualidade: usuario.pode_revisar_qualidade === true,
        nome: usuario.nome || null,
      }
    } catch {
      return null
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const usuarioSistema = await buscarUsuarioSistemaPorAuthUserId(supabase, user.id)

  if (!usuarioSistema) {
    return null
  }

  return {
    podeRevisarQualidade: usuarioSistema.pode_revisar_qualidade === true,
    nome: usuarioSistema.nome ?? null,
  }
}
