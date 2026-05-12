interface SaldoFisicoOperacaoInput {
  quantidadePlanejadaOp: number
  quantidadeProduzidaAcumuladaOperacao: number
  quantidadeRealizadaTurnoOperacao: number
}

interface ValidacaoConsumoSaldoFisicoInput extends SaldoFisicoOperacaoInput {
  numeroOp: string
  quantidadeSolicitada: number
}

interface ValidacaoConsumoSaldoFisicoResultado {
  permitido: boolean
  saldoFisicoRestante: number
  mensagem?: string
}

function normalizarInteiroNaoNegativo(valor: number): number {
  if (!Number.isFinite(valor) || valor <= 0) {
    return 0
  }

  return Math.floor(valor)
}

export function calcularSaldoFisicoRestanteOperacao(
  input: SaldoFisicoOperacaoInput
): number {
  const quantidadePlanejadaOp = normalizarInteiroNaoNegativo(input.quantidadePlanejadaOp)
  const quantidadeConsumida = Math.max(
    normalizarInteiroNaoNegativo(input.quantidadeProduzidaAcumuladaOperacao),
    normalizarInteiroNaoNegativo(input.quantidadeRealizadaTurnoOperacao)
  )

  return Math.max(quantidadePlanejadaOp - quantidadeConsumida, 0)
}

export function validarConsumoSaldoFisicoOperacao(
  input: ValidacaoConsumoSaldoFisicoInput
): ValidacaoConsumoSaldoFisicoResultado {
  const saldoFisicoRestante = calcularSaldoFisicoRestanteOperacao(input)
  const quantidadeSolicitada = normalizarInteiroNaoNegativo(input.quantidadeSolicitada)

  if (saldoFisicoRestante <= 0) {
    return {
      permitido: false,
      saldoFisicoRestante,
      mensagem: `A OP ${input.numeroOp} não possui mais saldo físico nesta operação. Registre a próxima produção em outra OP.`,
    }
  }

  if (quantidadeSolicitada > saldoFisicoRestante) {
    return {
      permitido: false,
      saldoFisicoRestante,
      mensagem: `A OP ${input.numeroOp} possui apenas ${saldoFisicoRestante} peça(s) com saldo físico nesta operação. Ajuste o lote ou selecione outra OP.`,
    }
  }

  return {
    permitido: true,
    saldoFisicoRestante,
  }
}
