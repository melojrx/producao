import { DjangoApiError } from '../client.ts'
import type { TipoDefeitoDadosNormalizados } from '../../utils/qualidade-defeitos.ts'

export function construirPayloadDefeitoDjango(dados: TipoDefeitoDadosNormalizados): {
  nome: string
  classificacao: string
  ativo: boolean
} {
  return {
    nome: dados.nome,
    classificacao: dados.classificacao,
    ativo: dados.ativo,
  }
}

export function mapearErroAcaoQualidadeDefeitoDjango(error: unknown): string {
  if (error instanceof Error && error.name === 'DjangoTokenAusenteError') {
    return error.message
  }

  if (error instanceof DjangoApiError) {
    if (error.message.includes('Ja existe um tipo de defeito')) {
      return 'Já existe um tipo de defeito com este nome.'
    }

    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Não foi possível concluir a operação no catálogo de tipos de defeito.'
}

/** Django não expõe DELETE — exclusão sempre vira inativação. */
export const EXCLUSAO_DJANGO_USA_INATIVACAO = true
