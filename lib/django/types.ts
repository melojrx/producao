export type DjangoPapelUsuario = 'admin' | 'supervisor'

export interface DjangoUsuarioAutenticado {
  id: string
  email: string
  nome: string
  papel: DjangoPapelUsuario
  pode_revisar_qualidade: boolean
  ativo: boolean
}

export interface DjangoLoginResponse {
  access: string
  refresh: string
  user: DjangoUsuarioAutenticado
}

export interface DjangoRefreshResponse {
  access: string
  refresh?: string
}

export type DjangoErroDetalhes = Record<string, string | string[]>
