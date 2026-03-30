'use client'

import { useState, useTransition } from 'react'
import { Pencil, Plus, Search, UserMinus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ModalUsuarioSistema } from '@/components/ui/ModalUsuarioSistema'
import { inativarUsuarioSistema } from '@/lib/actions/usuarios-sistema'
import type { UsuarioSistemaListItem } from '@/types'

interface ListaUsuariosSistemaProps {
  usuariosIniciais: UsuarioSistemaListItem[]
}

export function ListaUsuariosSistema({ usuariosIniciais }: ListaUsuariosSistemaProps) {
  const router = useRouter()
  const [modalAberto, setModalAberto] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioSistemaListItem | undefined>()
  const [busca, setBusca] = useState('')
  const [, startTransition] = useTransition()

  const usuariosFiltrados = usuariosIniciais.filter((usuario) => {
    const termo = busca.toLowerCase()
    return (
      usuario.nome.toLowerCase().includes(termo) ||
      usuario.email.toLowerCase().includes(termo) ||
      usuario.papel.toLowerCase().includes(termo)
    )
  })

  function abrirCriar() {
    setUsuarioEditando(undefined)
    setModalAberto(true)
  }

  function abrirEditar(usuario: UsuarioSistemaListItem) {
    setUsuarioEditando(usuario)
    setModalAberto(true)
  }

  function confirmarInativacao(usuario: UsuarioSistemaListItem) {
    if (!(usuario.ativo ?? true)) {
      return
    }

    const confirmou = confirm(
      `Inativar o usuário "${usuario.nome}"? Ele deixará de acessar a área administrativa.`
    )

    if (!confirmou) {
      return
    }

    startTransition(async () => {
      const resultado = await inativarUsuarioSistema(usuario.id)
      if (resultado.sucesso) {
        router.refresh()
      } else if (resultado.erro) {
        alert(resultado.erro)
      }
    })
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
          />
          <input
            type="search"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por nome, email ou papel..."
            aria-label="Buscar usuários do sistema"
            className="w-full rounded-lg border border-gray-300 py-2 pr-3 pl-9 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={abrirCriar}
          title="Cadastrar um novo usuário administrativo"
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus size={16} />
          Novo Usuário
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Papel</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((usuario) => (
                  <tr key={usuario.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-900">{usuario.nome}</td>
                    <td className="px-4 py-3 text-gray-600">{usuario.email}</td>
                    <td className="px-4 py-3 text-gray-600">{usuario.papel}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          usuario.ativo ?? true
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {usuario.ativo ?? true ? 'ativo' : 'inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => abrirEditar(usuario)}
                        aria-label={`Editar ${usuario.nome}`}
                        title={`Editar ${usuario.nome}`}
                        className="inline-flex p-1.5 text-gray-400 transition-colors hover:text-blue-600"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmarInativacao(usuario)}
                        aria-label={`Inativar ${usuario.nome}`}
                        title={`Inativar ${usuario.nome}`}
                        disabled={!(usuario.ativo ?? true)}
                        className="inline-flex p-1.5 text-gray-400 transition-colors hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <UserMinus size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalAberto ? (
        <ModalUsuarioSistema
          usuario={usuarioEditando}
          aoFechar={() => setModalAberto(false)}
        />
      ) : null}
    </>
  )
}
