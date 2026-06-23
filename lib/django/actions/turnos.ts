import 'server-only'

import type { CriarTurnoV2Input, PlanejamentoTurnoV2 } from '@/types'
import { djangoFetch } from '../client.ts'
import { buscarPlanejamentoTurnoPorIdDjango } from '../queries/turnos-dashboard.ts'
import { obterAccessTokenDjango } from '../queries/obter-token-servidor.ts'

const PREFIXO_TURNOS = '/api/v1/turnos'

interface DjangoTurnoJson {
  id: string
  status: string
}

function construirPayloadAbrirTurnoDjango(input: CriarTurnoV2Input): Record<string, unknown> {
  return {
    operadores_disponiveis: input.operadoresDisponiveis,
    minutos_turno: input.minutosTurno,
    observacao: input.observacao ?? '',
    operador_ids: input.operadorIds ?? [],
    ops: input.ops.map((op) => ({
      numero_op: op.numeroOp,
      produto_id: op.produtoId,
      quantidade_planejada: op.quantidadePlanejada,
    })),
    encerrar_turno_aberto_anterior: true,
    carregar_pendencias_turno_anterior: input.carregarPendenciasTurnoAnterior ?? false,
    turno_origem_pendencias_id: input.turnoOrigemPendenciasId ?? null,
    turno_op_ids_pendentes: input.turnoOpIdsPendentes ?? [],
  }
}

export async function abrirTurnoDjango(input: CriarTurnoV2Input): Promise<PlanejamentoTurnoV2> {
  const accessToken = await obterAccessTokenDjango()
  const turno = await djangoFetch<DjangoTurnoJson>(`${PREFIXO_TURNOS}/abrir/`, {
    accessToken,
    method: 'POST',
    body: construirPayloadAbrirTurnoDjango(input),
  })

  const planejamento = await buscarPlanejamentoTurnoPorIdDjango(turno.id)
  if (!planejamento) {
    throw new Error('O turno foi criado, mas não pôde ser recarregado para a dashboard.')
  }

  return planejamento
}

export async function encerrarTurnoDjango(turnoId: string): Promise<void> {
  const accessToken = await obterAccessTokenDjango()
  await djangoFetch<DjangoTurnoJson>(`${PREFIXO_TURNOS}/${turnoId}/encerrar/`, {
    accessToken,
    method: 'POST',
    body: {},
  })
}
