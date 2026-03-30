export const ADMIN_ROLES = ['admin', 'supervisor'] as const

export type AdminRole = (typeof ADMIN_ROLES)[number]

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === 'string' && ADMIN_ROLES.includes(value as AdminRole)
}
