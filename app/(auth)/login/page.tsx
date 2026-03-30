import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/LoginForm'
import { getOptionalAdminSession } from '@/lib/auth/require-admin-user'

interface LoginPageProps {
  searchParams: Promise<{
    erro?: string
  }>
}

function getMensagemErro(erro?: string): string | null {
  if (erro === 'sem-permissao') {
    return 'Sua conta está autenticada, mas não possui cadastro administrativo ativo.'
  }

  if (erro === 'sessao-expirada') {
    return 'Sua sessão expirou. Faça login novamente.'
  }

  return null
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [{ erro }, sessaoAdmin] = await Promise.all([
    searchParams,
    getOptionalAdminSession(),
  ])

  if (sessaoAdmin) {
    redirect('/admin/dashboard')
  }

  const mensagemErro = getMensagemErro(erro)

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/60">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-700">
            Área Administrativa
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Entrar</h1>
          <p className="mt-2 text-sm text-slate-500">
            Supervisores e administradores acessam o dashboard e os cadastros por aqui.
          </p>
        </div>

        {mensagemErro ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {mensagemErro}
          </div>
        ) : null}

        <LoginForm />
      </div>
    </main>
  )
}
