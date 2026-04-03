import type { TurnoSetorDashboardItem } from '@/lib/utils/turno-setores'

export interface QRCodesPrintLayout {
  colunas: number
  id: number
  maxDemandasImpressao: number
  qrSizeMm: number
  rotulo: string
}

export const QRCODES_PRINT_LAYOUTS: QRCodesPrintLayout[] = [
  { id: 1, rotulo: '1 por página', colunas: 1, maxDemandasImpressao: 6, qrSizeMm: 58 },
  { id: 2, rotulo: '2 por página', colunas: 2, maxDemandasImpressao: 5, qrSizeMm: 42 },
  { id: 4, rotulo: '4 por página', colunas: 2, maxDemandasImpressao: 3, qrSizeMm: 34 },
  { id: 6, rotulo: '6 por página', colunas: 2, maxDemandasImpressao: 2, qrSizeMm: 27 },
  { id: 8, rotulo: '8 por página', colunas: 2, maxDemandasImpressao: 2, qrSizeMm: 22 },
  { id: 12, rotulo: '12 por página', colunas: 3, maxDemandasImpressao: 1, qrSizeMm: 16 },
]

export function obterLayoutImpressaoQRCodes(
  layoutId: number | string | undefined
): QRCodesPrintLayout {
  const layoutNumero =
    typeof layoutId === 'number'
      ? layoutId
      : typeof layoutId === 'string'
        ? Number.parseInt(layoutId, 10)
        : Number.NaN

  return QRCODES_PRINT_LAYOUTS.find((layout) => layout.id === layoutNumero) ?? QRCODES_PRINT_LAYOUTS[2]
}

export function dividirItensPorPagina<T>(itens: T[], tamanhoPagina: number): T[][] {
  if (tamanhoPagina <= 0) {
    return [itens]
  }

  const paginas: T[][] = []

  for (let indice = 0; indice < itens.length; indice += tamanhoPagina) {
    paginas.push(itens.slice(indice, indice + tamanhoPagina))
  }

  return paginas
}

export function resumirDemandasParaImpressao(
  demandas: TurnoSetorDashboardItem['demandas'],
  maxDemandasImpressao: number
): {
  demandasOcultas: number
  demandasVisiveis: TurnoSetorDashboardItem['demandas']
} {
  const demandasVisiveis = demandas.slice(0, maxDemandasImpressao)

  return {
    demandasVisiveis,
    demandasOcultas: Math.max(demandas.length - demandasVisiveis.length, 0),
  }
}
