import 'server-only'

import { buscarPlanejamentoTurnoPorId, buscarTurnoAberto } from '@/lib/queries/turnos'
import { mapearSetoresTurnoParaDashboard } from '@/lib/utils/turno-setores'

export async function buscarRelatorioQRCodesTurno(turnoId?: string) {
  const planejamento = turnoId ? await buscarPlanejamentoTurnoPorId(turnoId) : await buscarTurnoAberto()

  if (!planejamento) {
    return null
  }

  return {
    planejamento,
    setores: mapearSetoresTurnoParaDashboard(planejamento),
  }
}
