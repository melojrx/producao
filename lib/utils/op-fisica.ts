export interface OpFisicaExistente {
  id: string
  numeroOp: string
  status: string
  turnoOpOrigemId: string | null
  quantidadePlanejadaRemanescente: number
}

export interface ValidarNovaOpFisicaInput {
  numeroOp: string
  turnoOpOrigemId?: string | null
  opsExistentes: OpFisicaExistente[]
  ignorarTurnoOpId?: string | null
}

export interface ValidacaoNovaOpFisica {
  permitido: boolean
  mensagem?: string
}

export function validarNovaOpFisica(input: ValidarNovaOpFisicaInput): ValidacaoNovaOpFisica {
  const numeroOp = input.numeroOp.trim()
  const opsMesmaNumeracao = input.opsExistentes.filter(
    (op) => op.id !== input.ignorarTurnoOpId && op.numeroOp === numeroOp
  )

  if (opsMesmaNumeracao.length === 0) {
    return { permitido: true }
  }

  if (input.turnoOpOrigemId) {
    const pertenceLinhagemInformada = opsMesmaNumeracao.some(
      (op) => op.id === input.turnoOpOrigemId || op.turnoOpOrigemId === input.turnoOpOrigemId
    )

    if (pertenceLinhagemInformada) {
      return { permitido: true }
    }
  }

  const possuiSaldoPendente = opsMesmaNumeracao.some(
    (op) => op.status !== 'concluida' && op.quantidadePlanejadaRemanescente > 0
  )

  if (possuiSaldoPendente) {
    return {
      permitido: false,
      mensagem: `A OP ${numeroOp} já existe no histórico operacional com saldo físico pendente. Reabra essa OP por carry-over; não crie um novo container físico com o mesmo número.`,
    }
  }

  return {
    permitido: false,
    mensagem: `A OP ${numeroOp} já foi concluída no histórico operacional. A próxima produção deve usar outra OP.`,
  }
}
