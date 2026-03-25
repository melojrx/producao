'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Eye, Pencil, Plus, Search } from 'lucide-react'
import { ModalProduto } from '@/components/ui/ModalProduto'
import type { OperacaoListItem, ProdutoListItem } from '@/types'

interface ListaProdutosProps {
  produtosIniciais: ProdutoListItem[]
  operacoes: OperacaoListItem[]
}

export function ListaProdutos({ produtosIniciais, operacoes }: ListaProdutosProps) {
  const [modalAberto, setModalAberto] = useState(false)
  const [produtoEditando, setProdutoEditando] = useState<ProdutoListItem | undefined>()
  const [busca, setBusca] = useState('')

  const produtosFiltrados = produtosIniciais.filter((produto) => {
    const termo = busca.toLowerCase()
    return (
      produto.nome.toLowerCase().includes(termo) ||
      produto.referencia.toLowerCase().includes(termo)
    )
  })

  function abrirCriar() {
    setProdutoEditando(undefined)
    setModalAberto(true)
  }

  function abrirEditar(produto: ProdutoListItem) {
    setProdutoEditando(produto)
    setModalAberto(true)
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
            placeholder="Buscar por referência ou nome..."
            aria-label="Buscar produtos"
            className="w-full rounded-lg border border-gray-300 py-2 pr-3 pl-9 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={abrirCriar}
          title="Cadastrar um novo produto"
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus size={16} />
          Novo Produto
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Referência</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">T.P Produto</th>
                <th className="hidden px-4 py-3 text-left font-medium text-gray-600 md:table-cell">
                  Operações
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    Nenhum produto encontrado
                  </td>
                </tr>
              ) : (
                produtosFiltrados.map((produto) => (
                  <tr key={produto.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {produto.referencia}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{produto.nome}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {produto.tp_produto_min?.toFixed(2) ?? '—'}
                    </td>
                    <td className="hidden px-4 py-3 text-gray-600 md:table-cell">
                      {produto.roteiro.length}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          produto.ativo ?? true
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {produto.ativo ?? true ? 'ativo' : 'inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => abrirEditar(produto)}
                        aria-label={`Editar ${produto.referencia}`}
                        title={`Editar ${produto.referencia}`}
                        className="inline-flex p-1.5 text-gray-400 transition-colors hover:text-blue-600"
                      >
                        <Pencil size={16} />
                      </button>
                      <Link
                        href={`/admin/produtos/${produto.id}`}
                        aria-label={`Ver detalhes de ${produto.referencia}`}
                        title={`Ver detalhes de ${produto.referencia}`}
                        className="inline-flex p-1.5 text-gray-400 transition-colors hover:text-indigo-600"
                      >
                        <Eye size={16} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalAberto ? (
        <ModalProduto
          produto={produtoEditando}
          operacoes={operacoes}
          aoFechar={() => setModalAberto(false)}
        />
      ) : null}
    </>
  )
}
