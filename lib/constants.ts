export const MINUTOS_TURNO_PADRAO = 540
export const ALERTA_MAQUINA_PARADA = 15
export const ALERTA_EFICIENCIA_BAIXA = 70
export const ALERTA_EFICIENCIA_CRITICA = 50
export const QR_TIPOS = ['operador', 'maquina', 'operacao'] as const
export type QRTipo = typeof QR_TIPOS[number]
