import type { RegistrarProducaoOperacaoInput, RegistrarProducaoOperacaoResultado } from '@/lib/actions/producao'
import { resolverUsuarioDjangoAutenticadoOpcional } from '@/lib/auth/resolver-usuario-django'
import { djangoFetch } from '../client.ts'
import { obterAccessTokenDjango } from '../queries/obter-token-servidor.ts'
import {
  construirPayloadApontamentoDjango,
  mapearErroAcaoProducaoDjango,
  mapearResultadoApontamentoDjango,
  type DjangoRegistroProducaoJson,
  type DjangoTurnoOpJson,
  type DjangoTurnoSetorDemandaJson,
  type DjangoTurnoSetorOperacaoJson,
} from './producao-helpers.ts'

const CAMINHO_APONTAMENTOS = '/api/v1/producao/apontamentos/'
const CAMINHO_TURNO_OPERACOES = '/api/v1/turnos-operacoes/'
const CAMINHO_TURNO_DEMANDAS = '/api/v1/turnos-demandas/'
const CAMINHO_TURNO_OPS = '/api/v1/turnos-ops/'

export { mapearErroAcaoProducaoDjango, construirPayloadApontamentoDjango } from './producao-helpers.ts'

async function djangoFetchProducao<T>(path: string, init: { method: string; body?: unknown }): Promise<T> {
  const accessToken = await obterAccessTokenDjango()
  return djangoFetch<T>(path, {
    accessToken,
    method: init.method,
    body: init.body,
  })
}

async function buscarTurnoSetorOperacaoAtualizada(
  demandaId: string,
  operacaoId: string
): Promise<DjangoTurnoSetorOperacaoJson | null> {
  const operacoes = await djangoFetchProducao<DjangoTurnoSetorOperacaoJson[]>(
    `${CAMINHO_TURNO_OPERACOES}?demanda=${demandaId}`,
    { method: 'GET' }
  )

  return operacoes.find((item) => item.id === operacaoId) ?? null
}

async function buscarDemandaAtualizada(
  turnoId: string,
  demandaId: string
): Promise<DjangoTurnoSetorDemandaJson | null> {
  const demandas = await djangoFetchProducao<DjangoTurnoSetorDemandaJson[]>(
    `${CAMINHO_TURNO_DEMANDAS}?turno=${turnoId}`,
    { method: 'GET' }
  )

  return demandas.find((item) => item.id === demandaId) ?? null
}

async function buscarTurnoOpAtualizada(
  turnoId: string,
  turnoOpId: string
): Promise<DjangoTurnoOpJson | null> {
  const ops = await djangoFetchProducao<DjangoTurnoOpJson[]>(`${CAMINHO_TURNO_OPS}?turno=${turnoId}`, {
    method: 'GET',
  })

  return ops.find((item) => item.id === turnoOpId) ?? null
}

export async function registrarProducaoOperacaoDjango(
  input: RegistrarProducaoOperacaoInput
): Promise<RegistrarProducaoOperacaoResultado> {
  const usuarioDjangoId = await resolverUsuarioDjangoAutenticadoOpcional()

  const registro = await djangoFetchProducao<DjangoRegistroProducaoJson>(CAMINHO_APONTAMENTOS, {
    method: 'POST',
    body: construirPayloadApontamentoDjango(input, usuarioDjangoId),
  })

  let operacao: DjangoTurnoSetorOperacaoJson | null = null
  let demanda: DjangoTurnoSetorDemandaJson | null = null
  let turnoOp: DjangoTurnoOpJson | null = null

  if (registro.turno_setor_demanda && registro.turno_setor_operacao) {
    operacao = await buscarTurnoSetorOperacaoAtualizada(
      registro.turno_setor_demanda,
      registro.turno_setor_operacao
    )
  }

  if (registro.turno && registro.turno_setor_demanda) {
    demanda = await buscarDemandaAtualizada(registro.turno, registro.turno_setor_demanda)
  }

  if (registro.turno && registro.turno_op) {
    turnoOp = await buscarTurnoOpAtualizada(registro.turno, registro.turno_op)
  }

  return mapearResultadoApontamentoDjango(registro, operacao, demanda, turnoOp)
}
