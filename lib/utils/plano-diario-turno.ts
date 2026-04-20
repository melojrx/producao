function normalizarNumero(valor?: number | null): number {
  return Number.isFinite(valor) ? Number(valor) : 0
}

interface PlanoDiarioTurnoInput {
  quantidadeAceitaTurno?: number | null
  quantidadeConcluida?: number | null
  quantidadeRealizada?: number | null
  quantidadeDisponivelApontamento?: number | null
  quantidadeSelecionada?: number | null
}

export interface ResumoPlanoDiarioTurno {
  planoDiaPecas: number
  quantidadeConcluida: number
  saldoPlanoPecas: number
  quantidadeDisponivelAgora: number
  excedePlanoAtual: boolean
  excedePlanoComQuantidade: boolean
}

export function resumirPlanoDiarioTurno(
  input: PlanoDiarioTurnoInput
): ResumoPlanoDiarioTurno {
  const planoDiaPecas = Math.max(normalizarNumero(input.quantidadeAceitaTurno), 0)
  const quantidadeConcluida = Math.max(
    normalizarNumero(input.quantidadeConcluida ?? input.quantidadeRealizada),
    0
  )
  const saldoPlanoPecas = Math.max(planoDiaPecas - quantidadeConcluida, 0)
  const quantidadeDisponivelAgora = Math.max(
    normalizarNumero(input.quantidadeDisponivelApontamento),
    0
  )
  const quantidadeSelecionada = Math.max(normalizarNumero(input.quantidadeSelecionada), 0)

  return {
    planoDiaPecas,
    quantidadeConcluida,
    saldoPlanoPecas,
    quantidadeDisponivelAgora,
    excedePlanoAtual:
      quantidadeConcluida > planoDiaPecas || quantidadeDisponivelAgora > saldoPlanoPecas,
    excedePlanoComQuantidade: quantidadeConcluida + quantidadeSelecionada > planoDiaPecas,
  }
}
