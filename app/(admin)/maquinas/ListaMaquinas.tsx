'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Eye, Pencil, Plus, Search } from 'lucide-react'
import { ModalMaquina } from '@/components/ui/ModalMaquina'
import type { MaquinaListItem, MaquinaStatus, SetorOption, TipoMaquinaOption } from '@/types'

const CORES_STATUS: Record<MaquinaStatus, string> = {
  ativa: 'bg-green-100 text-green-800',
  parada: 'bg-yellow-100 text-yellow-800',
  manutencao: 'bg-red-100 text-red-800',
}

interface ListaMaquinasProps {
  maquinasIniciais: MaquinaListItem[]
  tiposMaquina: TipoMaquinaOption[]
  setores: SetorOption[]
}

export function ListaMaquinas({ maquinasIniciais, tiposMaquina, setores }: ListaMaquinasProps) {
  const [modalAberto, setModalAberto] = useState(false)
  const [maquinaEditando, setMaquinaEditando] = useState<MaquinaListItem | undefined>()
  const [busca, setBusca] = useState('')

  const maquinasFiltradas = maquinasIniciais.filter((maquina) => {
    const termo = busca.toLowerCase()
    return (
      maquina.codigo.toLowerCase().includes(termo) ||
      (maquina.modelo ?? '').toLowerCase().includes(termo) ||
      (maquina.marca ?? '').toLowerCase().includes(termo) ||
      (maquina.tipoNome ?? '').toLowerCase().includes(termo) ||
      (maquina.setorNome ?? '').toLowerCase().includes(termo)
    )
  })

  function abrirCriar() {
    setMaquinaEditando(undefined)
    setModalAberto(true)
  }

  function abrirEditar(maquina: MaquinaListItem) {
    setMaquinaEditando(maquina)
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
            placeholder="Buscar por código, modelo, marca, tipo ou setor..."
            aria-label="Buscar máquinas"
            className="w-full rounded-lg border border-gray-300 py-2 pr-3 pl-9 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={abrirCriar}
          title="Cadastrar uma nova máquina"
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus size={16} />
          Nova Máquina
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Código</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tipo</th>
                <th className="hidden px-4 py-3 text-left font-medium text-gray-600 md:table-cell">
                  Modelo
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-gray-600 md:table-cell">
                  Setor
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {maquinasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    Nenhuma máquina encontrada
                  </td>
                </tr>
              ) : (
                maquinasFiltradas.map((maquina) => {
                  const statusAtual = (maquina.status ?? 'ativa') as MaquinaStatus

                  return (
                    <tr key={maquina.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-gray-900">{maquina.codigo}</td>
                      <td className="px-4 py-3 text-gray-600">{maquina.tipoNome ?? '—'}</td>
                      <td className="hidden px-4 py-3 text-gray-600 md:table-cell">
                        {maquina.modelo ?? '—'}
                      </td>
                      <td className="hidden px-4 py-3 text-gray-600 md:table-cell">
                        {maquina.setorNome ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${CORES_STATUS[statusAtual]}`}
                        >
                          {statusAtual}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => abrirEditar(maquina)}
                          aria-label={`Editar ${maquina.codigo}`}
                          title={`Editar ${maquina.codigo}`}
                          className="inline-flex p-1.5 text-gray-400 transition-colors hover:text-blue-600"
                        >
                          <Pencil size={16} />
                        </button>
                        <Link
                          href={`/admin/maquinas/${maquina.id}`}
                          aria-label={`Ver detalhes de ${maquina.codigo}`}
                          title={`Ver detalhes de ${maquina.codigo}`}
                          className="inline-flex p-1.5 text-gray-400 transition-colors hover:text-indigo-600"
                        >
                          <Eye size={16} />
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalAberto ? (
        <ModalMaquina
          maquina={maquinaEditando}
          tiposMaquina={tiposMaquina}
          setores={setores}
          aoFechar={() => setModalAberto(false)}
        />
      ) : null}
    </>
  )
}
