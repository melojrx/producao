import type { QualidadeDefeitoClassificacao } from '@/types'

export interface TipoDefeitoInput {
  nome: string
  classificacao: string
  ordem: number
  ativo: boolean
}

export interface TipoDefeitoDadosNormalizados {
  nome: string
  classificacao: QualidadeDefeitoClassificacao
  ordem: number
  ativo: boolean
}

export type ValidarTipoDefeitoResult =
  | {
      valido: true
      dados: TipoDefeitoDadosNormalizados
    }
  | {
      valido: false
      erro: string
    }

export function normalizarClassificacaoTipoDefeito(
  classificacao: string
): QualidadeDefeitoClassificacao | null {
  if (
    classificacao === 'maquina' ||
    classificacao === 'operador' ||
    classificacao === 'processo' ||
    classificacao === 'materia_prima'
  ) {
    return classificacao
  }

  return null
}

export function validarTipoDefeitoInput(
  input: TipoDefeitoInput
): ValidarTipoDefeitoResult {
  const nome = input.nome.trim()

  if (!nome) {
    return {
      valido: false,
      erro: 'Nome do tipo de defeito é obrigatório.',
    }
  }

  const classificacao = normalizarClassificacaoTipoDefeito(input.classificacao)

  if (!classificacao) {
    return {
      valido: false,
      erro: 'Classificação interna do tipo de defeito inválida.',
    }
  }

  if (!Number.isInteger(input.ordem) || input.ordem < 0) {
    return {
      valido: false,
      erro: 'A ordem do tipo de defeito deve ser um número inteiro maior ou igual a zero.',
    }
  }

  return {
    valido: true,
    dados: {
      nome,
      classificacao,
      ordem: input.ordem,
      ativo: input.ativo,
    },
  }
}
