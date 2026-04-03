import type { IndicadoresOperacionais } from '@/types'

export interface ProgressoOperacionalItem {
  quantidadePlanejada: number
  quantidadeRealizada: number
  tempoPadraoMin: number
}

export interface CargaOperacionalTp {
  cargaPlanejadaTp: number
  cargaRealizadaTp: number
}

function limitarQuantidadeAoPlanejado(
  quantidadeRealizada: number,
  quantidadePlanejada: number
): number {
  if (quantidadePlanejada <= 0 || quantidadeRealizada <= 0) {
    return 0
  }

  return Math.min(quantidadeRealizada, quantidadePlanejada)
}

export function calcularPercentualOperacional(
  cargaRealizadaTp: number,
  cargaPlanejadaTp: number
): number {
  if (cargaPlanejadaTp <= 0) {
    return 0
  }

  return Math.min((cargaRealizadaTp / cargaPlanejadaTp) * 100, 100)
}

export function calcularCargaOperacionalTp(
  itens: ProgressoOperacionalItem[]
): CargaOperacionalTp {
  return itens.reduce<CargaOperacionalTp>(
    (acumulado, item) => {
      if (item.quantidadePlanejada <= 0 || item.tempoPadraoMin <= 0) {
        return acumulado
      }

      const quantidadeRealizadaLimitada = limitarQuantidadeAoPlanejado(
        item.quantidadeRealizada,
        item.quantidadePlanejada
      )

      return {
        cargaPlanejadaTp:
          acumulado.cargaPlanejadaTp + item.quantidadePlanejada * item.tempoPadraoMin,
        cargaRealizadaTp:
          acumulado.cargaRealizadaTp + quantidadeRealizadaLimitada * item.tempoPadraoMin,
      }
    },
    { cargaPlanejadaTp: 0, cargaRealizadaTp: 0 }
  )
}

export function somarCargasOperacionaisTp(cargas: CargaOperacionalTp[]): CargaOperacionalTp {
  return cargas.reduce<CargaOperacionalTp>(
    (acumulado, carga) => ({
      cargaPlanejadaTp: acumulado.cargaPlanejadaTp + carga.cargaPlanejadaTp,
      cargaRealizadaTp: acumulado.cargaRealizadaTp + carga.cargaRealizadaTp,
    }),
    { cargaPlanejadaTp: 0, cargaRealizadaTp: 0 }
  )
}

export function montarIndicadoresOperacionais(
  quantidadeConcluida: number,
  carga: CargaOperacionalTp
): IndicadoresOperacionais {
  return {
    quantidadeConcluida,
    cargaPlanejadaTp: carga.cargaPlanejadaTp,
    cargaRealizadaTp: Math.min(carga.cargaRealizadaTp, carga.cargaPlanejadaTp),
    progressoOperacionalPct: calcularPercentualOperacional(
      Math.min(carga.cargaRealizadaTp, carga.cargaPlanejadaTp),
      carga.cargaPlanejadaTp
    ),
  }
}

export function calcularIndicadoresOperacionaisPorItens(
  quantidadeConcluida: number,
  itens: ProgressoOperacionalItem[]
): IndicadoresOperacionais {
  return montarIndicadoresOperacionais(
    quantidadeConcluida,
    calcularCargaOperacionalTp(itens)
  )
}
