'use server'

import { buscarTurnoAbertoOuUltimoEncerrado } from '@/lib/queries/turnos'
import type { PlanejamentoTurnoDashboardV2 } from '@/types'

export async function buscarPlanejamentoTurnoDashboardAction(): Promise<PlanejamentoTurnoDashboardV2 | null> {
  return buscarTurnoAbertoOuUltimoEncerrado()
}
