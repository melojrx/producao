import type { RegistrarRevisaoQualidadeInput, RegistrarRevisaoQualidadeResultado } from '@/lib/actions/qualidade'
import { obterUsuarioAtualDjango } from '../auth.ts'
import { djangoFetch } from '../client.ts'
import { obterAccessTokenDjango } from '../queries/obter-token-servidor.ts'
import type { DjangoTurnoOpJson, DjangoTurnoSetorDemandaJson } from './producao-helpers.ts'
import {
  construirPayloadRevisaoQualidadeDjango,
  mapearResultadoRevisaoQualidadeDjango,
  validarPermissaoRevisorQualidadeDjango,
  type DjangoQualidadeRegistroJson,
  type DjangoTurnoSetorOperacaoEnrichmentJson,
} from './qualidade-helpers.ts'

const CAMINHO_REVISOES = '/api/v1/qualidade/revisoes/'
const CAMINHO_TURNO_OPERACOES = '/api/v1/turnos-operacoes/'
const CAMINHO_TURNO_DEMANDAS = '/api/v1/turnos-demandas/'
const CAMINHO_TURNO_OPS = '/api/v1/turnos-ops/'

export {
  construirPayloadRevisaoQualidadeDjango,
  mapearErroAcaoQualidadeDjango,
  mapearResultadoRevisaoQualidadeDjango,
  validarPermissaoRevisorQualidadeDjango,
} from './qualidade-helpers.ts'

async function djangoFetchQualidade<T>(path: string, init: { method: string; body?: unknown }): Promise<T> {
  const accessToken = await obterAccessTokenDjango()
  return djangoFetch<T>(path, {
    accessToken,
    method: init.method,
    body: init.body,
  })
}

export async function resolverRevisorQualidadeDjango(): Promise<{ ok: true } | { erro: string }> {
  const accessToken = await obterAccessTokenDjango()
  const usuario = await obterUsuarioAtualDjango(accessToken)
  const erroPermissao = validarPermissaoRevisorQualidadeDjango(usuario)

  if (erroPermissao) {
    return { erro: erroPermissao }
  }

  return { ok: true }
}

async function buscarTurnoSetorOperacaoPorTurno(
  turnoId: string,
  operacaoId: string
): Promise<DjangoTurnoSetorOperacaoEnrichmentJson | null> {
  const operacoes = await djangoFetchQualidade<DjangoTurnoSetorOperacaoEnrichmentJson[]>(
    `${CAMINHO_TURNO_OPERACOES}?turno=${turnoId}`,
    { method: 'GET' }
  )

  return operacoes.find((item) => item.id === operacaoId) ?? null
}

async function buscarDemandaAtualizada(
  turnoId: string,
  demandaId: string
): Promise<DjangoTurnoSetorDemandaJson | null> {
  const demandas = await djangoFetchQualidade<DjangoTurnoSetorDemandaJson[]>(
    `${CAMINHO_TURNO_DEMANDAS}?turno=${turnoId}`,
    { method: 'GET' }
  )

  return demandas.find((item) => item.id === demandaId) ?? null
}

async function buscarTurnoOpAtualizada(
  turnoId: string,
  turnoOpId: string
): Promise<DjangoTurnoOpJson | null> {
  const ops = await djangoFetchQualidade<DjangoTurnoOpJson[]>(`${CAMINHO_TURNO_OPS}?turno=${turnoId}`, {
    method: 'GET',
  })

  return ops.find((item) => item.id === turnoOpId) ?? null
}

export async function registrarRevisaoQualidadeDjango(
  input: RegistrarRevisaoQualidadeInput
): Promise<RegistrarRevisaoQualidadeResultado> {
  const revisor = await resolverRevisorQualidadeDjango()

  if ('erro' in revisor) {
    return {
      sucesso: false,
      erro: revisor.erro,
    }
  }

  const registro = await djangoFetchQualidade<DjangoQualidadeRegistroJson>(CAMINHO_REVISOES, {
    method: 'POST',
    body: construirPayloadRevisaoQualidadeDjango(input),
  })

  let operacao: DjangoTurnoSetorOperacaoEnrichmentJson | null = null
  let demanda: DjangoTurnoSetorDemandaJson | null = null
  let turnoOp: DjangoTurnoOpJson | null = null

  if (registro.turno && registro.turno_setor_operacao) {
    operacao = await buscarTurnoSetorOperacaoPorTurno(registro.turno, registro.turno_setor_operacao)
  }

  if (registro.turno && operacao?.turno_setor_demanda) {
    demanda = await buscarDemandaAtualizada(registro.turno, operacao.turno_setor_demanda)
  }

  if (registro.turno && registro.turno_op) {
    turnoOp = await buscarTurnoOpAtualizada(registro.turno, registro.turno_op)
  }

  return mapearResultadoRevisaoQualidadeDjango(registro, operacao, demanda, turnoOp)
}
