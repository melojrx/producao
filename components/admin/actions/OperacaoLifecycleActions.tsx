'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, Trash2 } from 'lucide-react'
import { desativarOperacao, excluirOperacao } from '@/lib/actions/operacoes'

interface OperacaoLifecycleActionsProps {
  operacaoId: string
  codigo: string
  ativa: boolean
}

export function OperacaoLifecycleActions({
  operacaoId,
  codigo,
  ativa,
}: OperacaoLifecycleActionsProps) {
  const router = useRouter()
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function onDesativar() {
    if (!ativa) {
      return
    }

    if (!confirm(`Desativar a operação "${codigo}"?`)) {
      return
    }

    startTransition(async () => {
      const resultado = await desativarOperacao(operacaoId)
      if (resultado.erro) {
        setMensagem(resultado.erro)
        return
      }

      setMensagem('Operação desativada com sucesso.')
      router.refresh()
    })
  }

  function onExcluir() {
    if (!confirm(`Excluir permanentemente a operação "${codigo}"? Isso só é permitido sem dependências.`)) {
      return
    }

    startTransition(async () => {
      const resultado = await excluirOperacao(operacaoId)
      if (resultado.erro) {
        setMensagem(resultado.erro)
        return
      }

      router.push('/admin/operacoes')
      router.refresh()
    })
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
      <h2 className="text-lg font-semibold text-amber-900">Ações de ciclo de vida</h2>
      <p className="mt-1 text-sm text-amber-800">
        Em produção, prefira desativar a operação. Excluir só quando ela não estiver em roteiros nem histórico.
      </p>

      {mensagem ? (
        <div className="mt-4 rounded-lg border border-amber-300 bg-white px-4 py-3 text-sm text-amber-900">
          {mensagem}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={isPending || !ativa}
          onClick={onDesativar}
          title="Desativar esta operação sem apagar o histórico"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Ban size={16} />
          {!ativa ? 'Já desativada' : 'Desativar operação'}
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
