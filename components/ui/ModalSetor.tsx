'use client'

import { useActionState, useEffect } from 'react'
import { X } from 'lucide-react'
import { criarSetor, editarSetor } from '@/lib/actions/setores'
import type { FormActionState, SetorListItem } from '@/types'

interface ModalSetorProps {
  setor?: SetorListItem
  aoFechar: () => void
}

const estadoInicial: FormActionState = {
  erro: undefined,
  sucesso: false,
}

export function ModalSetor({ setor, aoFechar }: ModalSetorProps) {
  const acao = setor ? editarSetor.bind(null, setor.id) : criarSetor
  const [estado, executar, pendente] = useActionState(acao, estadoInicial)
  const modoEdicao = Boolean(setor)

  useEffect(() => {
    if (estado.sucesso) {
      aoFechar()
    }
  }, [aoFechar, estado.sucesso])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label={modoEdicao ? 'Editar setor' : 'Novo setor'}
    >
      <div className="mx-4 w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {modoEdicao ? 'Editar Setor' : 'Novo Setor'}
          </h2>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar modal"
            title="Fechar formulário"
            className="text-gray-400 transition-colors hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form action={executar} className="flex flex-col gap-4 p-5">
          {estado.erro ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
            >
              {estado.erro}
            </div>
          ) : null}

          {modoEdicao ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Código</p>
              <p className="text-lg font-semibold text-gray-900">{setor?.codigo ?? '—'}</p>
            </div>
          ) : null}

          <div className="flex flex-col gap-1">
            <label htmlFor="nome" className="text-sm font-medium text-gray-700">
              Nome do setor <span aria-hidden>*</span>
            </label>
            <input
              id="nome"
              name="nome"
              type="text"
              required
              defaultValue={setor?.nome ?? ''}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {modoEdicao ? (
            <div className="flex flex-col gap-1">
              <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
                Situação
              </label>
              <select
                id="ativo"
                name="ativo"
                defaultValue={String(setor?.ativo ?? true)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
          ) : (
            <input type="hidden" name="ativo" value="true" />
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={aoFechar}
              title="Cancelar edição"
              className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pendente}
              title={pendente ? 'Salvando setor' : 'Salvar setor'}
              className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {pendente ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
