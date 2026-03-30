'use client'

import { useActionState, useEffect } from 'react'
import { X } from 'lucide-react'
import { criarUsuarioSistema, editarUsuarioSistema } from '@/lib/actions/usuarios-sistema'
import type { FormActionState, UsuarioSistemaListItem } from '@/types'

interface ModalUsuarioSistemaProps {
  usuario?: UsuarioSistemaListItem
  aoFechar: () => void
}

const estadoInicial: FormActionState = {
  erro: undefined,
  sucesso: false,
}

export function ModalUsuarioSistema({ usuario, aoFechar }: ModalUsuarioSistemaProps) {
  const acao = usuario ? editarUsuarioSistema.bind(null, usuario.id) : criarUsuarioSistema
  const [estado, executar, pendente] = useActionState(acao, estadoInicial)
  const modoEdicao = Boolean(usuario)

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
      aria-label={modoEdicao ? 'Editar usuário do sistema' : 'Novo usuário do sistema'}
    >
      <div className="mx-4 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {modoEdicao ? 'Editar Usuário' : 'Novo Usuário'}
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

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="nome" className="text-sm font-medium text-gray-700">
                Nome <span aria-hidden>*</span>
              </label>
              <input
                id="nome"
                name="nome"
                type="text"
                required
                defaultValue={usuario?.nome ?? ''}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="papel" className="text-sm font-medium text-gray-700">
                Papel <span aria-hidden>*</span>
              </label>
              <select
                id="papel"
                name="papel"
                required
                defaultValue={usuario?.papel ?? 'supervisor'}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="admin">Admin</option>
                <option value="supervisor">Supervisor</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email <span aria-hidden>*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={usuario?.email ?? ''}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="senha" className="text-sm font-medium text-gray-700">
              {modoEdicao ? 'Nova senha' : 'Senha inicial'} {!modoEdicao ? <span aria-hidden>*</span> : null}
            </label>
            <input
              id="senha"
              name="senha"
              type="password"
              required={!modoEdicao}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <p className="text-xs text-gray-500">
              {modoEdicao
                ? 'Deixe em branco para manter a senha atual.'
                : 'A senha inicial deve ter pelo menos 6 caracteres.'}
            </p>
          </div>

          {modoEdicao ? (
            <>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Auth User ID</p>
                <p className="break-all text-sm font-medium text-gray-900">
                  {usuario?.auth_user_id ?? '—'}
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
                  Situação
                </label>
                <select
                  id="ativo"
                  name="ativo"
                  defaultValue={String(usuario?.ativo ?? true)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </div>
            </>
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
              title={pendente ? 'Salvando usuário' : 'Salvar usuário'}
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
