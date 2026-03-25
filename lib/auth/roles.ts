import type { User } from '@supabase/supabase-js'

export const ADMIN_ROLES = ['admin', 'supervisor'] as const

export type AdminRole = (typeof ADMIN_ROLES)[number]

interface UserWithRoleMetadata {
  app_metadata?: User['app_metadata']
  user_metadata?: User['user_metadata']
}

function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === 'string' && ADMIN_ROLES.includes(value as AdminRole)
}

export function extractAdminRole(user: UserWithRoleMetadata): AdminRole | null {
  const appRole = user.app_metadata?.role
  if (isAdminRole(appRole)) {
    return appRole
  }

  const userRole = user.user_metadata?.role
  if (isAdminRole(userRole)) {
    return userRole
  }

  return null
}
