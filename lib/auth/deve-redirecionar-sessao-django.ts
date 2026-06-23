import { DjangoApiError } from '../django/client.ts'
import { DjangoTokenAusenteError } from '../django/errors.ts'

export function deveRedirecionarSessaoDjangoExpirada(error: unknown): boolean {
  if (error instanceof DjangoTokenAusenteError) {
    return true
  }

  if (error instanceof DjangoApiError && (error.status === 401 || error.status === 403)) {
    return true
  }

  return false
}
