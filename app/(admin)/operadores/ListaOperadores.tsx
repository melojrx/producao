'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UserMinus, UserPlus, Pencil, Search, Eye } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ModalOperador } from '@/components/ui/ModalOperador'
import { desativarOperador } from '@/lib/actions/operadores'
import { Tables } from '@/types/supabase'

type Operador = Tables<'operadores'>

const CORES_STATUS: Record<string, string> = {
  ativo: 'bg-green-100 text-green-800',
  inativo: 'bg-gray-100 text-gray-600',
  afastado: 'bg-yellow-100 text-yellow-800',
}

interface ListaOperadoresProps {
  operadoresIniciais: Operador[]
}

export function ListaOperadores({ operadoresIniciais }: ListaOperadoresProps) {
  const router = useRouter()
  const [modalAberto, setModalAberto] = useState(false)
  const [operadorEditando, setOperadorEditando] = useState<Operador | undefined>()
  const [busca, setBusca] = useState('')
  const [, startTransition] = useTransition()

  const operadoresFiltrados = operadoresIniciais.filter(op =>
    op.nome.toLowerCase().includes(busca.toLowerCase()) ||
    op.matricula.toLowerCase().includes(busca.toLowerCase())
  )

  function abrirCriar() {
    setOperadorEditando(undefined)
    setModalAberto(true)
  }

  function abrirEditar(operador: Operador) {
    setOperadorEditando(operador)
    setModalAberto(true)
  }

  function confirmarDesativacao(id: string, nome: string, status: string | null) {
    if (status === 'inativo') return
    if (!confirm(`Desativar operador "${nome}"? Para excluir permanentemente, use a tela de detalhes.`)) return
    startTransition(async () => {
      await desativarOperador(id)
      router.refresh()
    })
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Buscar por nome ou matrícula..."
            aria-label="Buscar operadores"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="button"
          onClick={abrirCriar}
          aria-label="Adicionar novo operador"
          title="Cadastrar um novo operador"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <UserPlus size={16} />
          Novo Operador
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Matrícula</th>
              <th className="hidden md:table-cell text-left px-4 py-3 font-medium text-gray-600">Setor</th>
              <th className="hidden md:table-cell text-left px-4 py-3 font-medium text-gray-600">Função</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {operadoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    Nenhum operador encontrado
                  </td>
                </tr>
              ) : (
                operadoresFiltrados.map(op => (
                  <motion.tr
                    key={op.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{op.nome}</td>
                    <td className="px-4 py-3 text-gray-600">{op.matricula}</td>
                    <td className="hidden md:table-cell px-4 py-3 text-gray-600">{op.setor ?? '—'}</td>
                    <td className="hidden md:table-cell px-4 py-3 text-gray-600">{op.funcao ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CORES_STATUS[op.status ?? 'ativo']}`}>
                        {op.status ?? 'ativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => abrirEditar(op)}
                          aria-label={`Editar ${op.nome}`}
                          title={`Editar ${op.nome}`}
                          className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <Link
                          href={`/admin/operadores/${op.id}`}
                          aria-label={`Ver detalhes de ${op.nome}`}
                          title={`Ver detalhes de ${op.nome}`}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                        >
                          <Eye size={15} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => confirmarDesativacao(op.id, op.nome, op.status)}
                          aria-label={`Desativar ${op.nome}`}
                          title={`Desativar ${op.nome}`}
                          disabled={op.status === 'inativo'}
                          className="p-1.5 text-gray-400 hover:text-amber-600 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <UserMinus size={15} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <ModalOperador
          operador={operadorEditando}
          aoFechar={() => setModalAberto(false)}
        />
      )}
    </>
  )
}
