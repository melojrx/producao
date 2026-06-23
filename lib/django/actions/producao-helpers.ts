import type {
  RegistrarProducaoOperacaoInput,
  RegistrarProducaoOperacaoResultado,
} from '@/lib/actions/producao'
import { DjangoApiError } from '../client.ts'

export interface DjangoRegistroProducaoJson {
  id: string
  quantidade: number
  turno_setor_operacao: string | null
  turno_setor_demanda: string | null
  turno_setor: string | null
  turno: string | null
  turno_op: string | null
}

export interface DjangoTurnoSetorOperacaoJson {
  id: string
  quantidade_planejada: number
  quantidade_realizada: number
  status: string
}

export interface DjangoTurnoSetorDemandaJson {
  id: string
  quantidade_planejada: number
  quantidade_realizada: number
  status: string
}

export interface DjangoTurnoOpJson {
  id: string
  quantidade_planejada: number
  quantidade_realizada: number
  status: string
}

export interface DjangoApontamentoPayload {
  turno_setor_operacao: string
  operador: string
  quantidade: number
  origem_apontamento: 'operador_qr' | 'operador_manual' | 'supervisor_manual'
  maquina?: string | null
  usuario_sistema?: string | null
  observacao?: string
}

export function construirPayloadApontamentoDjango(
  input: RegistrarProducaoOperacaoInput,
  usuarioDjangoId: string | null
): DjangoApontamentoPayload {
  const payload: DjangoApontamentoPayload = {
    turno_setor_operacao: input.turnoSetorOperacaoId,
    operador: input.operadorId,
    quantidade: input.quantidade,
    origem_apontamento: input.origemApontamento ?? 'operador_qr',
  }

  if (input.maquinaId) {
    payload.maquina = input.maquinaId
  }

  if (usuarioDjangoId) {
    payload.usuario_sistema = usuarioDjangoId
  }

  const observacao = input.observacao?.trim()
  if (observacao) {
    payload.observacao = observacao
  }

  return payload
}

function calcularSaldoRestante(planejado: number, realizado: number): number {
  return Math.max(planejado - realizado, 0)
}

export function mapearResultadoApontamentoDjango(
  registro: DjangoRegistroProducaoJson,
  operacao?: DjangoTurnoSetorOperacaoJson | null,
  demanda?: DjangoTurnoSetorDemandaJson | null,
  turnoOp?: DjangoTurnoOpJson | null
): RegistrarProducaoOperacaoResultado {
  const resultado: RegistrarProducaoOperacaoResultado = {
    sucesso: true,
    registroId: registro.id,
  }

  if (operacao) {
    resultado.quantidadeRealizadaOperacao = operacao.quantidade_realizada
    resultado.statusTurnoSetorOperacao = operacao.status
    resultado.saldoRestanteOperacao = calcularSaldoRestante(
      operacao.quantidade_planejada,
      operacao.quantidade_realizada
    )
  }

  if (demanda) {
    resultado.quantidadeRealizadaSecao = demanda.quantidade_realizada
    resultado.saldoRestanteSecao = calcularSaldoRestante(
      demanda.quantidade_planejada,
      demanda.quantidade_realizada
    )
    resultado.statusTurnoSetorOp = demanda.status
  }

  if (turnoOp) {
    resultado.quantidadeRealizadaTurnoOp = turnoOp.quantidade_realizada
    resultado.statusTurnoOp = turnoOp.status
  }

  return resultado
}

export function mapearErroAcaoProducaoDjango(error: unknown): string {
  if (error instanceof Error && error.name === 'DjangoTokenAusenteError') {
    return 'Autenticação Django necessária para apontamentos: configure DJANGO_DEV_ACCESS_TOKEN (dev) ou NEXT_PUBLIC_USE_DJANGO_AUTH=true com sessão ativa.'
  }

  if (error instanceof DjangoApiError) {
    const mensagem = error.message

    if (mensagem.includes('saldo fisico') || mensagem.includes('saldo físico')) {
      return mensagem.replace('peca(s)', 'peça(s)').replace('saldo fisico', 'saldo físico')
    }

    if (mensagem.includes('Operacao do turno nao esta disponivel')) {
      return 'Operação do turno não está disponível para apontamento.'
    }

    if (mensagem.includes('Turno deve estar aberto')) {
      return 'Turno deve estar aberto para registrar produção.'
    }

    if (mensagem.includes('Operador deve estar ativo')) {
      return 'Operador deve estar ativo para registrar produção.'
    }

    return mensagem
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Não foi possível registrar a produção na operação da demanda do setor.'
}
