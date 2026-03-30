'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { ModalSetor } from '@/components/ui/ModalSetor'
import { excluirSetor } from '@/lib/actions/setores'
import type { SetorListItem } from '@/types'

interface ListaSetoresProps {
  setoresIniciais: SetorListItem[]
}

export function ListaSetores({ setoresIniciais }: ListaSetoresProps) {
  const router = useRouter()
  const [modalAberto, setModalAberto] = useState(false)
  const [setorEditando, setSetorEditando] = useState<SetorListItem | undefined>()
  const [busca, setBusca] = useState('')
  const [, startTransition] = useTransition()

  const setoresFiltrados = setoresIniciais.filter((setor) => {
    const termo = busca.toLowerCase()
    return (
      String(setor.codigo).includes(termo) ||
      setor.nome.toLowerCase().includes(termo)
    )
  })

  function abrirCriar() {
    setSetorEditando(undefined)
    setModalAberto(true)
  }

  function abrirEditar(setor: SetorListItem) {
    setSetorEditando(setor)
    setModalAberto(true)
  }

  function confirmarExclusao(setor: SetorListItem) {
    const confirmou = confirm(
      `Excluir permanentemente o setor "${setor.nome}"? Use esta ação apenas se ele ainda não estiver em uso.`
    )

    if (!confirmou) {
      return
    }

    startTransition(async () => {
      const resultado = await excluirSetor(setor.id)
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
            placeholder="Buscar por código ou nome..."
            aria-label="Buscar setores"
            className="w-full rounded-lg border border-gray-300 py-2 pr-3 pl-9 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={abrirCriar}
          title="Cadastrar um novo setor"
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus size={16} />
          Novo Setor
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Código</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {setoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-400">
                    Nenhum setor encontrado
                  </td>
                </tr>
              ) : (
                setoresFiltrados.map((setor) => (
                  <tr key={setor.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-900">{setor.codigo}</td>
                    <td className="px-4 py-3 text-gray-600">{setor.nome}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          setor.ativo ?? true
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {setor.ativo ?? true ? 'ativo' : 'inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => abrirEditar(setor)}
                        aria-label={`Editar ${setor.nome}`}
                        title={`Editar ${setor.nome}`}
                        className="inline-flex p-1.5 text-gray-400 transition-colors hover:text-blue-600"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmarExclusao(setor)}
                        aria-label={`Excluir ${setor.nome}`}
                        title={`Excluir ${setor.nome}`}
                        className="inline-flex p-1.5 text-gray-400 transition-colors hover:text-red-600"
                      >
                        <Trash2 size={16} />
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
        <ModalSetor setor={setorEditando} aoFechar={() => setModalAberto(false)} />
      ) : null}
    </>
  )
}
