import type { AdminRole } from './roles.ts'
import { isAdminRole } from './roles.ts'
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

export interface DependenciasResolverSessaoDjango {
  obterUsuarioAtual: (accessToken: string) => Promise<DjangoUsuarioAutenticado>
}

export async function resolverSessaoAdminDjango(
  deps: DependenciasResolverSessaoDjango,
  options?: { accessTokenOverride?: string | null }
): Promise<AdminSessionBase | null> {
  const accessToken =
    options?.accessTokenOverride !== undefined
      ? options.accessTokenOverride
      : await import('../django/queries/resolver-token-servidor.ts').then((modulo) =>
          modulo.resolverAccessTokenDjangoLeitura()
        )

  if (!accessToken) {
    return null
  }

  try {
    const usuario = await deps.obterUsuarioAtual(accessToken)

    if (!usuarioDjangoTemAcessoAdmin(usuario)) {
      return null
    }

    return mapearUsuarioDjangoParaSessaoAdmin(usuario)
  } catch {
    return null
  }
}
