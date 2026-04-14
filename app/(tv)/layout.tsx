import { requireAdminUser } from '@/lib/auth/require-admin-user'

export default async function TvLayout({ children }: { children: React.ReactNode }) {
  await requireAdminUser()

  return <>{children}</>
}
