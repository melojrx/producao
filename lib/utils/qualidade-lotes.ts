import type { QualidadeLoteStatus } from '@/types'

export interface ApontamentoProdutivoParaLoteQualidade {
  registroProducaoId: string
  turnoId: string
  turnoOpId: string
  produtoId: string | null
  turnoSetorOperacaoIdOrigem: string
  operacaoIdOrigem: string
  setorIdOrigem: string
  quantidade: number
  criadoEm: string
}

export interface LoteQualidadePendente {
  registroProducaoId: string
  turnoId: string
  turnoOpId: string
  produtoId: string | null
  turnoSetorOperacaoIdOrigem: string
  operacaoIdOrigem: string
  setorIdOrigem: string
  quantidadeLote: number
  status: Extract<QualidadeLoteStatus, 'pendente'>
  criadoEm: string
}

export interface AplicarLoteQualidadePendenteResult {
  lotes: LoteQualidadePendente[]
  criado: boolean
}

export interface ValidarRevisaoLoteQualidadeInput {
  quantidadeLote: number
  quantidadeAprovada: number
  quantidadeReprovada: number
  statusAtual: QualidadeLoteStatus
}

export interface DefeitoRevisaoLoteQualidade {
  turnoSetorOperacaoIdOrigem?: string
  qualidadeDefeitoId: string
  quantidadeDefeito: number
  observacao?: string
}

export interface ValidarRevisaoLoteComDefeitosQualidadeInput
  extends ValidarRevisaoLoteQualidadeInput {
  defeitos: DefeitoRevisaoLoteQualidade[]
}

export interface ValidarRevisaoLoteQualidadeResult {
  permitido: boolean
  quantidadeRevisada: number
  proximoStatus?: QualidadeLoteStatus
  mensagem?: string
}

export function calcularQuantidadeRevisadaLoteQualidade(
  quantidadeAprovada: number,
  quantidadeReprovada: number
): number {
  return quantidadeAprovada + quantidadeReprovada
}

export function montarLoteQualidadePendenteDeApontamento(
  apontamento: ApontamentoProdutivoParaLoteQualidade
): LoteQualidadePendente {
  if (!Number.isInteger(apontamento.quantidade) || apontamento.quantidade <= 0) {
    throw new Error('O lote de qualidade precisa nascer de uma quantidade produtiva maior que zero.')
  }

  return {
    registroProducaoId: apontamento.registroProducaoId,
    turnoId: apontamento.turnoId,
    turnoOpId: apontamento.turnoOpId,
    produtoId: apontamento.produtoId,
    turnoSetorOperacaoIdOrigem: apontamento.turnoSetorOperacaoIdOrigem,
    operacaoIdOrigem: apontamento.operacaoIdOrigem,
    setorIdOrigem: apontamento.setorIdOrigem,
    quantidadeLote: apontamento.quantidade,
    status: 'pendente',
    criadoEm: apontamento.criadoEm,
  }
}

export function aplicarLoteQualidadePendenteIdempotente(
  lotesAtuais: LoteQualidadePendente[],
  novoLote: LoteQualidadePendente
): AplicarLoteQualidadePendenteResult {
  const loteExistente = lotesAtuais.some(
    (lote) => lote.registroProducaoId === novoLote.registroProducaoId
  )

  if (loteExistente) {
    return {
      lotes: lotesAtuais,
      criado: false,
    }
  }

  return {
    lotes: [...lotesAtuais, novoLote],
    criado: true,
  }
}

export function validarRevisaoCompletaLoteQualidade(
  input: ValidarRevisaoLoteQualidadeInput
): ValidarRevisaoLoteQualidadeResult {
  if (!Number.isInteger(input.quantidadeLote) || input.quantidadeLote <= 0) {
    return {
      permitido: false,
      quantidadeRevisada: 0,
      mensagem: 'O lote de qualidade precisa ter uma quantidade inteira maior que zero.',
    }
  }

  if (!Number.isInteger(input.quantidadeAprovada) || input.quantidadeAprovada < 0) {
    return {
      permitido: false,
      quantidadeRevisada: 0,
      mensagem: 'A quantidade aprovada deve ser um número inteiro maior ou igual a zero.',
    }
  }

  if (!Number.isInteger(input.quantidadeReprovada) || input.quantidadeReprovada < 0) {
    return {
      permitido: false,
      quantidadeRevisada: 0,
      mensagem: 'A quantidade reprovada deve ser um número inteiro maior ou igual a zero.',
    }
  }

  if (input.statusAtual === 'revisado' || input.statusAtual === 'cancelado') {
    return {
      permitido: false,
      quantidadeRevisada: 0,
      mensagem: 'O lote de qualidade já foi finalizado e não pode receber nova revisão.',
    }
  }

  const quantidadeRevisada = calcularQuantidadeRevisadaLoteQualidade(
    input.quantidadeAprovada,
    input.quantidadeReprovada
  )

  if (quantidadeRevisada !== input.quantidadeLote) {
    return {
      permitido: false,
      quantidadeRevisada,
      mensagem:
        'A soma de aprovadas e reprovadas precisa fechar exatamente a quantidade do lote de qualidade.',
    }
  }

  return {
    permitido: true,
    quantidadeRevisada,
    proximoStatus: 'revisado',
  }
}

export function validarRevisaoLoteComDefeitosQualidade(
  input: ValidarRevisaoLoteComDefeitosQualidadeInput
): ValidarRevisaoLoteQualidadeResult {
  const resultadoRevisao = validarRevisaoCompletaLoteQualidade(input)

  if (!resultadoRevisao.permitido) {
    return resultadoRevisao
  }

  if (input.quantidadeReprovada === 0) {
    return input.defeitos.length > 0
      ? {
          permitido: false,
          quantidadeRevisada: resultadoRevisao.quantidadeRevisada,
          mensagem: 'Não informe defeitos quando o lote não possuir peças reprovadas.',
        }
      : resultadoRevisao
  }

  if (input.defeitos.length === 0) {
    return {
      permitido: false,
      quantidadeRevisada: resultadoRevisao.quantidadeRevisada,
      mensagem: 'Informe ao menos um defeito do catálogo para as peças reprovadas.',
    }
  }

  for (const defeito of input.defeitos) {
    if (!defeito.turnoSetorOperacaoIdOrigem) {
      return {
        permitido: false,
        quantidadeRevisada: resultadoRevisao.quantidadeRevisada,
        mensagem: 'Cada defeito precisa informar a operação produtiva analisada.',
      }
    }

    if (!defeito.qualidadeDefeitoId) {
      return {
        permitido: false,
        quantidadeRevisada: resultadoRevisao.quantidadeRevisada,
        mensagem: 'Cada defeito precisa estar vinculado ao catálogo de defeitos.',
      }
    }

    if (!Number.isInteger(defeito.quantidadeDefeito) || defeito.quantidadeDefeito <= 0) {
      return {
        permitido: false,
        quantidadeRevisada: resultadoRevisao.quantidadeRevisada,
        mensagem: 'Cada defeito precisa informar uma quantidade inteira maior que zero.',
      }
    }
  }

  return resultadoRevisao
}

export function podeCriarNovoLoteQualidadeParaRetorno(statusAnterior: QualidadeLoteStatus): boolean {
  return statusAnterior === 'revisado'
}
