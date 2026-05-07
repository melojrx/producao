import type {
  TurnoSetorDemandaStatusV2,
  TurnoSetorOperacaoStatusV2,
  TurnoSetorOpStatusV2,
} from '@/types'

function normalizarNumeroPositivo(valor?: number | null): number {
  return Number.isFinite(valor) && Number(valor) > 0 ? Number(valor) : 0
}

export interface SaldoManualPermitidoInput {
  quantidadeAceitaAcumuladaSetor?: number | null
  quantidadeConcluidaNoSetor?: number | null
  planoDoDiaSetor?: number | null
  quantidadeConcluidaTotalSetor?: number | null
}

export interface SupervisorLancamentoPayload {
  operadorId: string
  turnoSetorOperacaoId: string
  quantidade: number
}

export interface SupervisorDisponibilidadeOperacaoContexto {
  turnoSetorOperacaoId: string
  numeroOp: string
  setorNome: string
  setorAnteriorNome: string | null
  quantidadeDisponivelOperacao: number
  quantidadeManualPermitidaOperacao: number
  saldoManualPermitido: number
}

export interface SupervisorAcionamentoContexto {
  status: TurnoSetorDemandaStatusV2 | TurnoSetorOperacaoStatusV2 | TurnoSetorOpStatusV2
  quantidadeDisponivelApontamento?: number | null
  saldoManualPermitido?: number | null
}

export interface ValidacaoLancamentoSupervisorResultado {
  erro?: string
}

function statusPermiteApontamentoSupervisor(
  status: SupervisorAcionamentoContexto['status']
): boolean {
  return status !== 'encerrada_manualmente'
}

export function calcularSaldoAceitoDaOp(
  quantidadeAceitaAcumuladaSetor?: number | null,
  quantidadeConcluidaNoSetor?: number | null
): number {
  return Math.max(
    normalizarNumeroPositivo(quantidadeAceitaAcumuladaSetor) -
      normalizarNumeroPositivo(quantidadeConcluidaNoSetor),
    0
  )
}

export function calcularSaldoSetorialDoDia(
  planoDoDiaSetor?: number | null,
  quantidadeConcluidaTotalSetor?: number | null
): number {
  return Math.max(
    normalizarNumeroPositivo(planoDoDiaSetor) -
      normalizarNumeroPositivo(quantidadeConcluidaTotalSetor),
    0
  )
}

export function calcularSaldoManualPermitido(input: SaldoManualPermitidoInput): number {
  const saldoAceitoDaOp = calcularSaldoAceitoDaOp(
    input.quantidadeAceitaAcumuladaSetor,
    input.quantidadeConcluidaNoSetor
  )
  const saldoSetorialDoDia = calcularSaldoSetorialDoDia(
    input.planoDoDiaSetor,
    input.quantidadeConcluidaTotalSetor
  )

  return Math.min(saldoAceitoDaOp, saldoSetorialDoDia)
}

export function calcularQuantidadeManualPermitidaOperacao(input: {
  quantidadePlanejadaOperacao: number
  quantidadeRealizadaOperacao: number
  quantidadeRealizadaDemanda: number
  saldoManualPermitido?: number | null
}): number {
  return Math.max(
    Math.min(
      normalizarNumeroPositivo(input.quantidadePlanejadaOperacao),
      normalizarNumeroPositivo(input.quantidadeRealizadaDemanda) +
        normalizarNumeroPositivo(input.saldoManualPermitido)
    ) - normalizarNumeroPositivo(input.quantidadeRealizadaOperacao),
    0
  )
}

export function supervisorPodeAcionarContexto(
  contexto: SupervisorAcionamentoContexto
): boolean {
  if (!statusPermiteApontamentoSupervisor(contexto.status)) {
    return false
  }

  return true
}

export function supervisorDependeDeExcecaoManual(
  contexto: Pick<
    SupervisorAcionamentoContexto,
    'quantidadeDisponivelApontamento' | 'saldoManualPermitido'
  >
): boolean {
  return (
    normalizarNumeroPositivo(contexto.quantidadeDisponivelApontamento) <= 0 &&
    normalizarNumeroPositivo(contexto.saldoManualPermitido) > 0
  )
}

export function validarLancamentosSupervisorContraContextos(
  lancamentos: SupervisorLancamentoPayload[],
  contextos: SupervisorDisponibilidadeOperacaoContexto[]
): ValidacaoLancamentoSupervisorResultado {
  const contextoPorOperacaoId = new Map(
    contextos.map((contexto) => [contexto.turnoSetorOperacaoId, contexto] as const)
  )

  for (const lancamento of lancamentos) {
    if (!contextoPorOperacaoId.has(lancamento.turnoSetorOperacaoId)) {
      return {
        erro: 'Uma das operações selecionadas não foi encontrada no fluxo sequencial do turno.',
      }
    }
  }

  return {}
}
