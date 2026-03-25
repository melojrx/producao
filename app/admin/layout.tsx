import { AdminShell } from '@/components/admin/AdminShell'
import { requireAdminUser } from '@/lib/auth/require-admin-user'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, role } = await requireAdminUser()

  return (
    <AdminShell currentUserEmail={user.email ?? null} currentUserRole={role}>
      {children}
    </AdminShell>
  )
}
