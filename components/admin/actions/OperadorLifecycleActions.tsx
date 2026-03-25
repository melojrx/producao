'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, Trash2 } from 'lucide-react'
import { desativarOperador, excluirOperador } from '@/lib/actions/operadores'

interface OperadorLifecycleActionsProps {
  operadorId: string
  nome: string
  statusAtual: string | null
}

export function OperadorLifecycleActions({
  operadorId,
  nome,
  statusAtual,
}: OperadorLifecycleActionsProps) {
  const router = useRouter()
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function onDesativar() {
    if (statusAtual === 'inativo') {
      return
    }

    if (!confirm(`Desativar o operador "${nome}"? Ele deixará de aparecer como ativo no processo.`)) {
      return
    }

    startTransition(async () => {
      const resultado = await desativarOperador(operadorId)
      if (resultado.erro) {
        setMensagem(resultado.erro)
        return
      }

      setMensagem('Operador desativado com sucesso.')
      router.refresh()
    })
  }

  function onExcluir() {
    if (!confirm(`Excluir permanentemente "${nome}"? Isso só é permitido sem histórico de produção.`)) {
      return
    }

    startTransition(async () => {
      const resultado = await excluirOperador(operadorId)
      if (resultado.erro) {
        setMensagem(resultado.erro)
        return
      }

      router.push('/admin/operadores')
      router.refresh()
    })
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
      <h2 className="text-lg font-semibold text-amber-900">Ações de ciclo de vida</h2>
      <p className="mt-1 text-sm text-amber-800">
        Em produção, prefira desativar. A exclusão permanente só ocorre quando não há dependências.
      </p>

      {mensagem ? (
        <div className="mt-4 rounded-lg border border-amber-300 bg-white px-4 py-3 text-sm text-amber-900">
          {mensagem}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={isPending || statusAtual === 'inativo'}
          onClick={onDesativar}
          title="Desativar este operador sem apagar o histórico"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Ban size={16} />
          {statusAtual === 'inativo' ? 'Já desativado' : 'Desativar operador'}
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={onExcluir}
          title="Excluir permanentemente se não houver dependências"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 size={16} />
          Excluir permanentemente
        </button>
      </div>
    </div>
  )
}
