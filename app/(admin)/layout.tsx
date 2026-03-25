import { AdminShell } from '@/components/admin/AdminShell'

export default function LegacyAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminShell>{children}</AdminShell>
}
