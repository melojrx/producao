import { MINUTOS_TURNO_PADRAO } from '@/lib/constants'

export function calcularMetaHora(tempoPadraoMin: number): number {
  if (tempoPadraoMin <= 0) return 0
  return Math.floor(60 / tempoPadraoMin)
}

export function calcularMetaDia(
  tempoPadraoMin: number,
  minutosTurno = MINUTOS_TURNO_PADRAO
): number {
  if (tempoPadraoMin <= 0) return 0
  return Math.floor(minutosTurno / tempoPadraoMin)
}

export function calcularMetaIndividual(
  minutosTurno: number,
  tpOperacao: number
): number {
  if (tpOperacao <= 0 || minutosTurno <= 0) return 0
  return Math.floor(minutosTurno / tpOperacao)
}

export function calcularMetaGrupo(
  funcionariosAtivos: number,
  minutosTurno: number,
  tpProduto: number
): number {
  if (tpProduto <= 0 || funcionariosAtivos <= 0 || minutosTurno <= 0) return 0
  return Math.floor((funcionariosAtivos * minutosTurno) / tpProduto)
}

export function calcularTpProduto(
  operacoes: Array<{ tempoPadraoMin: number }>
): number {
  return operacoes.reduce((soma, op) => soma + op.tempoPadraoMin, 0)
}

export function calcularEficiencia(
  quantidadeProduzida: number,
  tpOperacao: number,
  minutosTrabalhados: number
): number {
  if (minutosTrabalhados <= 0) return 0
  const minutosNecessarios = quantidadeProduzida * tpOperacao
  return Math.round((minutosNecessarios / minutosTrabalhados) * 100)
}
