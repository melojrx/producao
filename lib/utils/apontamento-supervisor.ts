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
  return status !== 'concluida' && status !== 'encerrada_manualmente'
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

  return (
    normalizarNumeroPositivo(contexto.quantidadeDisponivelApontamento) > 0 ||
    normalizarNumeroPositivo(contexto.saldoManualPermitido) > 0
  )
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
  const totaisPorOperacao = new Map<string, number>()

  for (const lancamento of lancamentos) {
    const totalAtual = totaisPorOperacao.get(lancamento.turnoSetorOperacaoId) ?? 0
    totaisPorOperacao.set(lancamento.turnoSetorOperacaoId, totalAtual + lancamento.quantidade)
  }

  const contextoPorOperacaoId = new Map(
    contextos.map((contexto) => [contexto.turnoSetorOperacaoId, contexto] as const)
  )

  for (const [turnoSetorOperacaoId, quantidadeTotal] of totaisPorOperacao.entries()) {
    const contexto = contextoPorOperacaoId.get(turnoSetorOperacaoId)

    if (!contexto) {
      return {
        erro: 'Uma das operações selecionadas não foi encontrada no fluxo sequencial do turno.',
      }
    }

    if (quantidadeTotal <= contexto.quantidadeManualPermitidaOperacao) {
      continue
    }

    if (contexto.saldoManualPermitido <= 0) {
      return {
        erro: `A operação ${contexto.numeroOp} em ${contexto.setorNome} não possui saldo manual permitido dentro do plano do dia.`,
      }
    }

    return {
      erro: `A operação ${contexto.numeroOp} em ${contexto.setorNome} permite no máximo ${contexto.quantidadeManualPermitidaOperacao} peça(s) dentro do saldo aceito do dia.`,
    }
  }

  return {}
}
