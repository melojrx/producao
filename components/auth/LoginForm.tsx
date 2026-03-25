'use client'

import { useActionState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { entrarAdmin } from '@/lib/actions/auth'
import type { FormActionState } from '@/types'

const estadoInicial: FormActionState = { erro: undefined, sucesso: false }

export function LoginForm() {
  const [estado, executar, pendente] = useActionState(entrarAdmin, estadoInicial)

  return (
    <form action={executar} className="space-y-4">
      {estado.erro ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {estado.erro}
        </div>
      ) : null}

      <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <ShieldCheck size={18} className="shrink-0" />
        <p>Acesso restrito a usuários com role <strong>admin</strong> ou <strong>supervisor</strong>.</p>
      </div>

      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="senha" className="text-sm font-medium text-gray-700">
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={pendente}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {pendente ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  )
}
