function decodificarPayloadJwt(token: string): Record<string, unknown> | null {
  const partes = token.split('.')
  if (partes.length < 2) {
    return null
  }

  try {
    const payloadBase64 = partes[1].replace(/-/g, '+').replace(/_/g, '/')
    const padding = '='.repeat((4 - (payloadBase64.length % 4)) % 4)
    const json = atob(payloadBase64 + padding)
    const payload = JSON.parse(json) as unknown

    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      return null
    }

    return payload as Record<string, unknown>
  } catch {
    return null
  }
}

export function tokenJwtExpirado(token: string, margemSegundos = 0): boolean {
  const payload = decodificarPayloadJwt(token)
  if (!payload || typeof payload.exp !== 'number') {
    return true
  }

  const expiraEmMs = payload.exp * 1000
  return expiraEmMs <= Date.now() + margemSegundos * 1000
}

export function tokenJwtPareceValido(token: string): boolean {
  return !tokenJwtExpirado(token)
}
