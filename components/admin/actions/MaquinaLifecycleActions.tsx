'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, Trash2 } from 'lucide-react'
import { desativarMaquina, excluirMaquina } from '@/lib/actions/maquinas'

interface MaquinaLifecycleActionsProps {
  maquinaId: string
  codigo: string
  statusAtual: string | null
}

export function MaquinaLifecycleActions({
  maquinaId,
  codigo,
  statusAtual,
}: MaquinaLifecycleActionsProps) {
  const router = useRouter()
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function onDesativar() {
    if (statusAtual === 'parada') {
      return
    }

    if (!confirm(`Colocar a máquina "${codigo}" como parada?`)) {
      return
    }

    startTransition(async () => {
      const resultado = await desativarMaquina(maquinaId)
      if (resultado.erro) {
        setMensagem(resultado.erro)
        return
      }

      setMensagem('Máquina marcada como parada.')
      router.refresh()
    })
  }

  function onExcluir() {
    if (!confirm(`Excluir permanentemente a máquina "${codigo}"? Isso só é permitido sem histórico de produção.`)) {
      return
    }

    startTransition(async () => {
      const resultado = await excluirMaquina(maquinaId)
      if (resultado.erro) {
        setMensagem(resultado.erro)
        return
      }

      router.push('/admin/maquinas')
      router.refresh()
    })
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <h2 className="text-lg font-semibold text-amber-900">Ações de ciclo de vida</h2>
      <p className="mt-1 text-sm text-amber-800">
        Em produção, prefira marcar a máquina como parada ou manutenção. Excluir só sem dependências.
      </p>

      {mensagem ? (
        <div className="mt-4 rounded-lg border border-amber-300 bg-white px-4 py-3 text-sm text-amber-900">
          {mensagem}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={isPending || statusAtual === 'parada'}
          onClick={onDesativar}
          title="Marcar esta máquina como parada"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Ban size={16} />
          {statusAtual === 'parada' ? 'Já parada' : 'Marcar como parada'}
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={onExcluir}
          title="Excluir permanentemente se não houver dependências"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 size={16} />
          Excluir permanentemente
        </button>
      </div>
    </div>
  )
}
