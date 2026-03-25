import { QRTipo, QRScanResult } from '@/types'

const TIPOS_VALIDOS: QRTipo[] = ['operador', 'maquina', 'operacao']

export function parseQRCode(raw: string): QRScanResult | null {
  const parts = raw.split(':')
  if (parts.length !== 2) return null
  const [tipo, token] = parts
  if (!TIPOS_VALIDOS.includes(tipo as QRTipo)) return null
  if (!token || token.length < 10) return null
  return { tipo: tipo as QRTipo, token }
}
