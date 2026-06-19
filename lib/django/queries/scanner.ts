import { DjangoApiError, djangoFetch } from '../client.ts'
import type {
  OperadorScaneado,
  TurnoSetorDemandaScaneada,
  TurnoSetorScaneado,
} from '@/types'
import { consolidarSetorScaneadoPorDemandas } from '@/lib/utils/consolidacao-turno'
import {
  inferirModoApontamentoSetor,
  setorParticipaFluxoProdutivoAtivo,
} from '@/lib/utils/qualidade'

import {
  mapearDemandasScaneadasDjango,
  mapearOperadorScaneadoDjango,
  mapearTurnoSetorScaneadoBaseDjango,
  type DjangoOperadorScannerJson,
  type DjangoTurnoSetorDemandaScannerJson,
  type DjangoTurnoSetorScannerJson,
} from './scanner-mappers.ts'

const PREFIXO_SCANNER = '/api/v1/scanner'

async function buscarRecursoScannerOuNull<T>(path: string): Promise<T | null> {
  try {
    return await djangoFetch<T>(path)
  } catch (error) {
    if (error instanceof DjangoApiError && error.status === 404) {
      return null
    }

    throw error
  }
}

export async function buscarOperadorScaneadoPorTokenDjango(
  token: string
): Promise<OperadorScaneado | null> {
  const resposta = await buscarRecursoScannerOuNull<DjangoOperadorScannerJson>(
    `${PREFIXO_SCANNER}/operador/${encodeURIComponent(token)}/`
  )

  return resposta ? mapearOperadorScaneadoDjango(resposta) : null
}

export async function buscarTurnoSetorScaneadoBasePorTokenDjango(
  token: string
): Promise<DjangoTurnoSetorScannerJson | null> {
  return buscarRecursoScannerOuNull<DjangoTurnoSetorScannerJson>(
    `${PREFIXO_SCANNER}/setor/${encodeURIComponent(token)}/`
  )
}

export async function buscarDemandasScaneadasPorTokenSetorDjango(
  token: string
): Promise<TurnoSetorDemandaScaneada[]> {
  const resposta = await buscarRecursoScannerOuNull<DjangoTurnoSetorDemandaScannerJson[]>(
    `${PREFIXO_SCANNER}/setor/${encodeURIComponent(token)}/demandas/`
  )

  if (!resposta) {
    return []
  }

  return mapearDemandasScaneadasDjango(resposta)
}

export async function buscarDemandasScaneadasPorTurnoSetorDjango(
  turnoSetorId: string
): Promise<TurnoSetorDemandaScaneada[]> {
  const resposta = await buscarRecursoScannerOuNull<DjangoTurnoSetorDemandaScannerJson[]>(
    `${PREFIXO_SCANNER}/turno-setor/${encodeURIComponent(turnoSetorId)}/demandas/`
  )

  if (!resposta) {
    return []
  }

  return mapearDemandasScaneadasDjango(resposta)
}

export async function buscarTurnoSetorScaneadoPorTokenDjango(
  token: string
): Promise<TurnoSetorScaneado | null> {
  const turnoSetor = await buscarTurnoSetorScaneadoBasePorTokenDjango(token)

  if (!turnoSetor?.turno_iniciado_em || !turnoSetor.setor_nome) {
    return null
  }

  const modoApontamento = inferirModoApontamentoSetor(
    turnoSetor.setor_nome,
    turnoSetor.setor_modo_apontamento === 'revisao_qualidade'
      ? 'revisao_qualidade'
      : 'producao_padrao'
  )

  const setorBase = mapearTurnoSetorScaneadoBaseDjango(turnoSetor, modoApontamento)

  if (!setorParticipaFluxoProdutivoAtivo(setorBase.setorNome, setorBase.modoApontamento)) {
    return setorBase
  }

  const demandasNormalizadas = await buscarDemandasScaneadasPorTokenSetorDjango(token)
  return consolidarSetorScaneadoPorDemandas(setorBase, demandasNormalizadas)
}
