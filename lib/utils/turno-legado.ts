import { estaUsandoDjango } from '../django/flags.ts'

/** Mensagem exibida ao tentar mutações no fluxo `configuracao_turno` com turno V2 ativo. */
export const MENSAGEM_FLUXO_TURNO_LEGADO_DESATIVADO =
  'O fluxo de configuração de turno legado foi descontinuado. Use Novo Turno ou Encerrar Turno no dashboard.'

/**
 * Turno V2 (API Django / tabela `turnos`) é o fluxo operacional oficial.
 * `configuracao_turno` permanece apenas como histórico no banco — sem escrita no frontend.
 */
export function fluxoTurnoLegadoDesativado(): boolean {
  return estaUsandoDjango('dashboard_reads')
}
