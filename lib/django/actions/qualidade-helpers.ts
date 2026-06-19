import type {
  RegistrarRevisaoQualidadeInput,
  RegistrarRevisaoQualidadeResultado,
} from '@/lib/actions/qualidade'
import type { DjangoUsuarioAutenticado } from '../types.ts'
import { DjangoApiError } from '../client.ts'
import type {
  DjangoTurnoOpJson,
  DjangoTurnoSetorDemandaJson,
  DjangoTurnoSetorOperacaoJson,
} from './producao-helpers.ts'

export interface DjangoQualidadeDetalheJson {
  id: string
  quantidade_defeito: number
}

export interface DjangoQualidadeRegistroJson {
  id: string
  quantidade_aprovada: number
  quantidade_reprovada: number
  turno_setor_operacao: string | null
  turno: string | null
  turno_op: string | null
  detalhes: DjangoQualidadeDetalheJson[]
}

export interface DjangoTurnoSetorOperacaoEnrichmentJson extends DjangoTurnoSetorOperacaoJson {
  turno_setor_demanda: string | null
}

export interface DjangoRevisaoQualidadePayload {
  turno_setor_operacao_id_qualidade: string
  quantidade_aprovada: number
  quantidade_reprovada: number
  origem_lancamento: 'scanner_qualidade' | 'manual_qualidade'
  defeitos: Array<{
    turno_setor_operacao_id_origem: string
    qualidade_defeito_id: string
    quantidade_defeito: number
    observacao?: string
  }>
}

export function construirPayloadRevisaoQualidadeDjango(
  input: RegistrarRevisaoQualidadeInput
): DjangoRevisaoQualidadePayload {
  const payload: DjangoRevisaoQualidadePayload = {
    turno_setor_operacao_id_qualidade: input.turnoSetorOperacaoIdQualidade,
    quantidade_aprovada: input.quantidadeAprovada,
    quantidade_reprovada: input.quantidadeReprovada,
    origem_lancamento: input.origemLancamento,
    defeitos: input.defeitos.map((defeito) => {
      const item: DjangoRevisaoQualidadePayload['defeitos'][number] = {
        turno_setor_operacao_id_origem: defeito.turnoSetorOperacaoIdOrigem,
        qualidade_defeito_id: defeito.qualidadeDefeitoId,
        quantidade_defeito: defeito.quantidadeDefeito,
      }

      const observacao = defeito.observacao?.trim()
      if (observacao) {
        item.observacao = observacao
      }

      return item
    }),
  }

  return payload
}

export function validarPermissaoRevisorQualidadeDjango(
  usuario: DjangoUsuarioAutenticado
): string | null {
  if (!usuario.ativo) {
    return 'Seu usuário administrativo não foi encontrado para autoria da revisão.'
  }

  if (usuario.pode_revisar_qualidade !== true) {
    return 'Seu usuário não possui permissão para registrar revisões de qualidade.'
  }

  return null
}

function calcularSaldoRestante(planejado: number, realizado: number): number {
  return Math.max(planejado - realizado, 0)
}

function calcularTotalDefeitos(detalhes: DjangoQualidadeDetalheJson[]): number {
  return detalhes.reduce((soma, detalhe) => soma + detalhe.quantidade_defeito, 0)
}

export function mapearResultadoRevisaoQualidadeDjango(
  registro: DjangoQualidadeRegistroJson,
  operacao?: DjangoTurnoSetorOperacaoJson | null,
  demanda?: DjangoTurnoSetorDemandaJson | null,
  turnoOp?: DjangoTurnoOpJson | null
): RegistrarRevisaoQualidadeResultado {
  const quantidadeRevisada = registro.quantidade_aprovada + registro.quantidade_reprovada
  const totalDefeitos = calcularTotalDefeitos(registro.detalhes ?? [])

  const resultado: RegistrarRevisaoQualidadeResultado = {
    sucesso: true,
    qualidadeRegistroId: registro.id,
    quantidadeAprovada: registro.quantidade_aprovada,
    quantidadeReprovada: registro.quantidade_reprovada,
    quantidadeRevisada,
    totalDefeitos,
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

export function mapearErroAcaoQualidadeDjango(error: unknown): string {
  if (error instanceof Error && error.name === 'DjangoTokenAusenteError') {
    return 'Autenticação Django necessária para revisão de qualidade: configure DJANGO_DEV_ACCESS_TOKEN (dev) ou NEXT_PUBLIC_USE_DJANGO_AUTH=true com sessão ativa.'
  }

  if (error instanceof DjangoApiError) {
    const mensagem = error.message

    if (mensagem.includes('saldo fisico') || mensagem.includes('saldo físico')) {
      return mensagem.replace('peca(s)', 'peça(s)').replace('saldo fisico', 'saldo físico')
    }

    if (mensagem.includes('peca aprovada ou reprovada')) {
      return mensagem.replace('peca', 'peça')
    }

    if (mensagem.includes('pecas reprovadas')) {
      return mensagem.replace('pecas', 'peças')
    }

    if (error.status === 401 || error.status === 403) {
      return 'Sua sessão expirou. Faça login novamente.'
    }

    return mensagem
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Não foi possível registrar a revisão de qualidade.'
}
