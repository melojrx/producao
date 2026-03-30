const VALORES_VERDADEIROS = new Set(['1', 'true', 'on'])
const VALORES_FALSOS = new Set(['0', 'false', 'off'])

function normalizarBooleanEnv(value: string | undefined): boolean | null {
  if (!value) {
    return null
  }

  const normalizado = value.trim().toLowerCase()

  if (VALORES_VERDADEIROS.has(normalizado)) {
    return true
  }

  if (VALORES_FALSOS.has(normalizado)) {
    return false
  }

  return null
}

export function isScannerV2Enabled(): boolean {
  const valorExplicito = normalizarBooleanEnv(process.env.NEXT_PUBLIC_SCANNER_V2_ENABLED)

  if (valorExplicito !== null) {
    return valorExplicito
  }

  return process.env.NODE_ENV !== 'production'
}
