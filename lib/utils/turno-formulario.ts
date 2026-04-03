export const ABRIR_TURNO_FORM_FIELDS = {
  operadoresDisponiveis: 'operadores_disponiveis',
  minutosTurno: 'minutos_turno',
  opsPlanejadas: 'ops_planejadas',
  operadorIds: 'operador_ids',
  carregarPendenciasTurnoAnterior: 'carregar_pendencias_turno_anterior',
  turnoOrigemPendenciasId: 'turno_origem_pendencias_id',
  turnoOpIdsPendentes: 'turno_op_ids_pendentes',
} as const

export type AbrirTurnoFormFieldName =
  typeof ABRIR_TURNO_FORM_FIELDS[keyof typeof ABRIR_TURNO_FORM_FIELDS]

export const ABRIR_TURNO_FORM_FIELD_NAMES = Object.values(ABRIR_TURNO_FORM_FIELDS)
