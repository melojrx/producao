import type { PlanejamentoTurnoV2 } from '@/types'

type PlanejamentoOperadoresResumo = Pick<
  PlanejamentoTurnoV2,
  'operadores' | 'operadoresAtividadeSetor'
>

export function contarOperadoresEnvolvidosNoTurno(
  planejamento: PlanejamentoOperadoresResumo | null
): number {
  if (!planejamento) {
    return 0
  }

  const operadoresEnvolvidos = new Set<string>()

  for (const operador of planejamento.operadores) {
    operadoresEnvolvidos.add(operador.operadorId)
  }

  for (const atividade of planejamento.operadoresAtividadeSetor ?? []) {
    operadoresEnvolvidos.add(atividade.operadorId)
  }

  return operadoresEnvolvidos.size
}
