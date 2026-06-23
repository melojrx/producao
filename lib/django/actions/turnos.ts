import 'server-only'

import { djangoFetch } from '../client.ts'
import { obterAccessTokenDjango } from '../queries/obter-token-servidor.ts'

const PREFIXO_TURNOS = '/api/v1/turnos'

interface DjangoTurnoEncerradoJson {
  id: string
  status: string
}

export async function encerrarTurnoDjango(turnoId: string): Promise<void> {
  const accessToken = await obterAccessTokenDjango()
  await djangoFetch<DjangoTurnoEncerradoJson>(`${PREFIXO_TURNOS}/${turnoId}/encerrar/`, {
    accessToken,
    method: 'POST',
    body: {},
  })
}
