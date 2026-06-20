import { djangoFetch } from '../client.ts'
import { listarSetoresDjango } from './cadastros.ts'
import {
  mapearTurnoSetorOperacoesDjango,
  type DjangoTurnoSetorOperacaoJson,
} from './turnos-dashboard-mappers.ts'
import { obterAccessTokenDjango } from './obter-token-servidor.ts'
import { setorParticipaFluxoProdutivoAtivo } from '@/lib/utils/qualidade'
import type { TurnoSetorOperacaoApontamentoV2 } from '@/types'

const PREFIXO_API = '/api/v1'

async function djangoFetchApontamentos<T>(path: string): Promise<T> {
  const accessToken = await obterAccessTokenDjango()
  return djangoFetch<T>(`${PREFIXO_API}${path}`, { accessToken })
}

export async function listarTurnoSetorOperacoesDoTurnoDjango(
  turnoId: string
): Promise<TurnoSetorOperacaoApontamentoV2[]> {
  const [operacoesJson, setores] = await Promise.all([
    djangoFetchApontamentos<DjangoTurnoSetorOperacaoJson[]>(
      `/turnos-operacoes/?turno=${encodeURIComponent(turnoId)}`
    ),
    listarSetoresDjango(),
  ])

  const setoresPorId = new Map(setores.map((setor) => [setor.id, setor]))
  const operacoes = mapearTurnoSetorOperacoesDjango(operacoesJson)

  return operacoes.filter((operacao) => {
    const setor = setoresPorId.get(operacao.setorId)
    return Boolean(setor && setorParticipaFluxoProdutivoAtivo(setor.nome, setor.modo_apontamento))
  })
}
