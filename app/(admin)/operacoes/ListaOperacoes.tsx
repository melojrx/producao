'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Eye, Pencil, Plus, Search } from 'lucide-react'
import { ModalOperacao } from '@/components/ui/ModalOperacao'
import type { OperacaoListItem, SetorOption, TipoMaquinaOption } from '@/types'

interface ListaOperacoesProps {
  operacoesIniciais: OperacaoListItem[]
  tiposMaquina: TipoMaquinaOption[]
  setores: SetorOption[]
}

export function ListaOperacoes({ operacoesIniciais, tiposMaquina, setores }: ListaOperacoesProps) {
  const [modalAberto, setModalAberto] = useState(false)
  const [operacaoEditando, setOperacaoEditando] = useState<OperacaoListItem | undefined>()
  const [busca, setBusca] = useState('')

  const operacoesFiltradas = operacoesIniciais.filter((operacao) => {
    const termo = busca.toLowerCase()
    return (
      operacao.codigo.toLowerCase().includes(termo) ||
      operacao.descricao.toLowerCase().includes(termo) ||
      (operacao.tipoNome ?? '').toLowerCase().includes(termo) ||
      (operacao.setorNome ?? '').toLowerCase().includes(termo)
    )
  })

  function abrirCriar() {
    setOperacaoEditando(undefined)
    setModalAberto(true)
  }

  function abrirEditar(operacao: OperacaoListItem) {
    setOperacaoEditando(operacao)
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
            placeholder="Buscar por código, descrição, tipo ou setor..."
            aria-label="Buscar operações"
            className="w-full rounded-lg border border-gray-300 py-2 pr-3 pl-9 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={abrirCriar}
          title="Cadastrar uma nova operação"
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus size={16} />
          Nova Operação
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Código</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Descrição</th>
                <th className="hidden px-4 py-3 text-left font-medium text-gray-600 md:table-cell">
                  Tipo
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-gray-600 lg:table-cell">
                  Setor
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">T.P</th>
                <th className="hidden px-4 py-3 text-left font-medium text-gray-600 md:table-cell">
                  Meta/hora
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-gray-600 md:table-cell">
                  Meta/dia
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {operacoesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    Nenhuma operação encontrada
                  </td>
                </tr>
              ) : (
                operacoesFiltradas.map((operacao) => (
                  <tr key={operacao.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-900">{operacao.codigo}</td>
                    <td className="px-4 py-3 text-gray-600">{operacao.descricao}</td>
                    <td className="hidden px-4 py-3 text-gray-600 md:table-cell">
                      {operacao.tipoNome ?? '—'}
                    </td>
                    <td className="hidden px-4 py-3 text-gray-600 lg:table-cell">
                      {operacao.setorNome ?? 'Não definido'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{operacao.tempo_padrao_min}</td>
                    <td className="hidden px-4 py-3 text-gray-600 md:table-cell">
                      {operacao.meta_hora ?? '—'}
                    </td>
                    <td className="hidden px-4 py-3 text-gray-600 md:table-cell">
                      {operacao.meta_dia ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          operacao.ativa ?? true
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {operacao.ativa ?? true ? 'ativa' : 'inativa'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => abrirEditar(operacao)}
                        aria-label={`Editar ${operacao.codigo}`}
                        title={`Editar ${operacao.codigo}`}
                        className="inline-flex p-1.5 text-gray-400 transition-colors hover:text-blue-600"
                      >
                        <Pencil size={16} />
                      </button>
                      <Link
                        href={`/admin/operacoes/${operacao.id}`}
                        aria-label={`Ver detalhes de ${operacao.codigo}`}
                        title={`Ver detalhes de ${operacao.codigo}`}
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
        <ModalOperacao
          operacao={operacaoEditando}
          tiposMaquina={tiposMaquina}
          setores={setores}
          aoFechar={() => setModalAberto(false)}
        />
      ) : null}
    </>
  )
}
