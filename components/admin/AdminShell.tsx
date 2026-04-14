'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Activity,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileBarChart2,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  QrCode,
  Settings2,
  ShieldCheck,
  ShieldUser,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import { sairAdmin } from '@/lib/actions/auth'
import type { AdminRole } from '@/lib/auth/roles'

const navLinks = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/apontamentos', label: 'Apontamentos', icon: ClipboardList },
  { href: '/admin/setores', label: 'Setores', icon: Building2 },
  { href: '/admin/operadores', label: 'Operadores', icon: Users },
  { href: '/admin/maquinas', label: 'Máquinas', icon: Settings2 },
  { href: '/admin/operacoes', label: 'Operações', icon: Wrench },
  { href: '/admin/produtos', label: 'Produtos', icon: Package },
  { href: '/admin/qrcodes', label: 'QR Codes', icon: QrCode },
  { href: '/admin/relatorios', label: 'Relatórios', icon: FileBarChart2 },
  { href: '/admin/usuarios', label: 'Usuários', icon: ShieldUser, adminOnly: true },
]

interface AdminShellProps {
  children: React.ReactNode
  currentUserEmail?: string | null
  currentUserRole?: AdminRole
}

export function AdminShell({
  children,
  currentUserEmail,
  currentUserRole,
}: AdminShellProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const navLinksDisponiveis = navLinks.filter(
    (link) => !link.adminOnly || currentUserRole === 'admin'
  )

  useEffect(() => {
    const storedValue = window.localStorage.getItem('admin-sidebar-collapsed')
    setSidebarCollapsed(storedValue === 'true')
  }, [])

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((currentValue) => {
      const nextValue = !currentValue
      window.localStorage.setItem('admin-sidebar-collapsed', String(nextValue))
      return nextValue
    })
  }

  return (
    <div className="flex min-h-screen bg-gray-50 print:block print:min-h-0 print:bg-white">
      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden print:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-white shadow-lg transition-[width,transform] duration-200 print:hidden lg:static lg:translate-x-0 ${
          sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'
        } ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div
          className={`border-b border-gray-100 ${
            sidebarCollapsed
              ? 'flex h-16 items-center justify-center'
              : 'flex h-16 items-center justify-between px-6'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600">
              <Activity className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            {!sidebarCollapsed && (
              <span className="text-lg font-bold text-gray-900">Produção</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Fechar menu"
              title="Fechar menu"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <nav className="mt-4 px-3">
          {navLinksDisponiveis.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href

            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                title={label}
                className={`mb-1 flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                } ${
                  sidebarCollapsed ? 'justify-center gap-0' : 'gap-3'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className={sidebarCollapsed ? 'sr-only' : undefined}>{label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col print:block">
        <header className="flex h-16 items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 print:hidden lg:px-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menu"
              title="Abrir menu"
            >
              <Menu className="h-6 w-6 text-gray-600" />
            </button>
            <button
              type="button"
              className="hidden rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 lg:inline-flex"
              onClick={toggleSidebarCollapsed}
              aria-label={sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
              title={sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </button>
            <h1 className="text-base font-semibold text-gray-800">
              {navLinksDisponiveis.find((link) => link.href === pathname)?.label ?? 'Admin'}
            </h1>
          </div>

          {currentUserEmail && currentUserRole ? (
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-3 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 sm:flex">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  <ShieldCheck size={16} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {currentUserEmail}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    {currentUserRole}
                  </p>
                </div>
              </div>

              <form action={sairAdmin}>
                <button
                  type="submit"
                  title="Encerrar sessão administrativa"
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <LogOut size={16} />
                  Sair
                </button>
              </form>
            </div>
          ) : null}
        </header>

        <main className="flex-1 p-4 print:p-0 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
