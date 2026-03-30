import { QR_TIPOS } from '@/lib/constants'
import type { QRTipo, QRScanResult } from '@/types'

export const QR_TIPO_OPERACIONAL_SETOR_OP = 'setor-op'

export function parseQRCode(raw: string): QRScanResult | null {
  const parts = raw.split(':')
  if (parts.length !== 2) return null
  const [tipo, token] = parts
  if (!QR_TIPOS.includes(tipo as QRTipo)) return null
  if (!token || token.length < 10) return null
  return { tipo: tipo as QRTipo, token }
}

// O scanner V2 passa a reconhecer este prefixo na Sprint 8.1.
export function gerarValorQROperacionalSetorOp(token: string): string {
  return `${QR_TIPO_OPERACIONAL_SETOR_OP}:${token}`
}

export function descreverTipoQRCode(tipo: QRTipo): string {
  switch (tipo) {
    case 'operador':
      return 'operador'
    case 'maquina':
      return 'máquina'
    case 'operacao':
      return 'operação'
    case 'setor-op':
      return 'QR operacional da seção do turno'
    default:
      return tipo
  }
}
