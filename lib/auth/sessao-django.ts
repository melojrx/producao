import type { AdminRole } from './roles.ts'
import { isAdminRole } from './roles.ts'
import { refreshAccessToken } from '../django/auth.ts'
import { tokenJwtExpirado } from '../django/jwt.ts'
import type { DjangoUsuarioAutenticado } from '../django/types.ts'

export interface AdminSessionUser {
  id: string
  email: string | null
}

export interface AdminSessionBase {
  user: AdminSessionUser
  role: AdminRole
}

export function mapearUsuarioDjangoParaSessaoAdmin(
  usuario: DjangoUsuarioAutenticado
): AdminSessionBase {
  return {
    user: {
      id: usuario.id,
      email: usuario.email,
    },
    role: usuario.papel,
  }
}

export function usuarioDjangoTemAcessoAdmin(usuario: DjangoUsuarioAutenticado): boolean {
  return usuario.ativo && isAdminRole(usuario.papel)
}

export interface TokensJwtLidos {
  accessToken?: string
  refreshToken?: string
}

export interface DependenciasResolverSessaoDjango {
  obterTokens: () => Promise<TokensJwtLidos>
  persistirTokens: (accessToken: string, refreshToken: string) => Promise<void>
  limparTokens: () => Promise<void>
  refreshAccessToken: (refresh: string) => Promise<{ access: string; refresh?: string }>
  obterUsuarioAtual: (accessToken: string) => Promise<DjangoUsuarioAutenticado>
}

export async function resolverSessaoAdminDjango(
  deps: DependenciasResolverSessaoDjango
): Promise<AdminSessionBase | null> {
  const { accessToken: accessInicial, refreshToken } = await deps.obterTokens()

  if (!accessInicial && !refreshToken) {
    return null
  }

  let accessToken = accessInicial

  try {
    if (!accessToken || tokenJwtExpirado(accessToken)) {
      if (!refreshToken) {
        return null
      }

      const refreshResposta = await deps.refreshAccessToken(refreshToken)
      accessToken = refreshResposta.access
      await deps.persistirTokens(accessToken, refreshResposta.refresh ?? refreshToken)
    }

    const usuario = await deps.obterUsuarioAtual(accessToken)

    if (!usuarioDjangoTemAcessoAdmin(usuario)) {
      return null
    }

    return mapearUsuarioDjangoParaSessaoAdmin(usuario)
  } catch {
    await deps.limparTokens()
    return null
  }
}
