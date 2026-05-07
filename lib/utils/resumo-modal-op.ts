export type ResumoModalOpCardTipo =
  | 'quantidade_op'
  | 'pecas_completas'
  | 'progresso_operacional'
  | 'secoes_concluidas'

export interface ResumoModalOpInput {
  quantidadeOp: number
  pecasCompletas: number
  progressoOperacionalPct: number
  secoesConcluidas: number
  totalSecoes: number
}

export interface ResumoModalOpCard {
  tipo: ResumoModalOpCardTipo
  rotulo: string
  valor: string
  detalhe: string | null
}

function normalizarInteiroNaoNegativo(valor: number): number {
  if (!Number.isFinite(valor) || valor <= 0) {
    return 0
  }

  return Math.floor(valor)
}

function normalizarPercentual(valor: number): number {
  if (!Number.isFinite(valor) || valor <= 0) {
    return 0
  }

  return Math.min(valor, 100)
}

export function montarCardsResumoModalOp(input: ResumoModalOpInput): ResumoModalOpCard[] {
  const secoesConcluidas = normalizarInteiroNaoNegativo(input.secoesConcluidas)
  const totalSecoes = normalizarInteiroNaoNegativo(input.totalSecoes)
  const secoesPendentes = Math.max(totalSecoes - secoesConcluidas, 0)

  return [
    {
      tipo: 'quantidade_op',
      rotulo: 'Quantidade da OP',
      valor: String(normalizarInteiroNaoNegativo(input.quantidadeOp)),
      detalhe: 'base do turno',
    },
    {
      tipo: 'pecas_completas',
      rotulo: 'Peças completas',
      valor: String(normalizarInteiroNaoNegativo(input.pecasCompletas)),
      detalhe: 'funil completo',
    },
    {
      tipo: 'progresso_operacional',
      rotulo: 'Progresso operacional',
      valor: `${normalizarPercentual(input.progressoOperacionalPct).toFixed(0)}%`,
      detalhe: 'ponderado por T.P.',
    },
    {
      tipo: 'secoes_concluidas',
      rotulo: 'Seções concluídas',
      valor: `${secoesConcluidas}/${totalSecoes}`,
      detalhe: `${secoesPendentes} pendentes`,
    },
  ]
}
