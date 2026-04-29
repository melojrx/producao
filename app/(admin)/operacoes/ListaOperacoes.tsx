'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Eye,
  Pencil,
  Plus,
  Search,
  X,
} from 'lucide-react'
import { OperacaoLifecycleActions } from '@/components/admin/actions/OperacaoLifecycleActions'
import { ModalOperacao } from '@/components/ui/ModalOperacao'
import type {
  MaquinaOption,
  OperacaoListItem,
  OperacaoSortField,
  SetorOption,
  SortDirection,
} from '@/types'

interface ListaOperacoesProps {
  buscaInicial: string
  maquinas: MaquinaOption[]
  operacoes: OperacaoListItem[]
  page: number
  pageSize: number
  setores: SetorOption[]
  sortBy: OperacaoSortField
  sortDir: SortDirection
  total: number
  totalPages: number
}

type ModalOperacaoModo = 'criar' | 'editar' | 'duplicar'

interface SortableHeaderProps {
  activeField: OperacaoSortField
  className?: string
  direction: SortDirection
  field: OperacaoSortField
  label: string
  onSort: (field: OperacaoSortField) => void
}

function SortableHeader({
  activeField,
  className,
  direction,
  field,
  label,
  onSort,
}: SortableHeaderProps) {
  const isActive = field === activeField
  const Icon = !isActive ? ArrowUpDown : direction === 'asc' ? ArrowUp : ArrowDown

  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-2 text-left transition-colors ${
          isActive ? 'text-slate-900' : 'text-gray-600 hover:text-slate-900'
        }`}
      >
        <span>{label}</span>
        <Icon size={14} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
      </button>
    </th>
  )
}

function construirPaginas(totalPages: number, currentPage: number): number[] {
  const inicio = Math.max(1, currentPage - 2)
  const fim = Math.min(totalPages, currentPage + 2)
  const paginas: number[] = []

  for (let pagina = inicio; pagina <= fim; pagina += 1) {
    paginas.push(pagina)
  }

  return paginas
}

function formatarTp(tempoPadraoMin: number): string {
  return tempoPadraoMin.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  })
}

export function ListaOperacoes({
  buscaInicial,
  maquinas,
  operacoes,
  page,
  pageSize,
  setores,
  sortBy,
  sortDir,
  total,
  totalPages,
}: ListaOperacoesProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [modalAberto, setModalAberto] = useState(false)
  const [modalModo, setModalModo] = useState<ModalOperacaoModo>('criar')
  const [operacaoSelecionada, setOperacaoSelecionada] = useState<OperacaoListItem | undefined>()
  const [busca, setBusca] = useState(buscaInicial)

  useEffect(() => {
    setBusca(buscaInicial)
  }, [buscaInicial])

  const paginaInicialItem = total === 0 ? 0 : (page - 1) * pageSize + 1
  const paginaFinalItem = total === 0 ? 0 : Math.min(total, page * pageSize)
  const paginas = useMemo(() => construirPaginas(totalPages, page), [page, totalPages])

  function atualizarUrl(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (!value) {
        params.delete(key)
        return
      }

      params.set(key, value)
    })

    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  function abrirCriar() {
    setModalModo('criar')
    setOperacaoSelecionada(undefined)
    setModalAberto(true)
  }

  function abrirEditar(operacao: OperacaoListItem) {
    setModalModo('editar')
    setOperacaoSelecionada(operacao)
    setModalAberto(true)
  }

  function abrirDuplicar(operacao: OperacaoListItem) {
    setModalModo('duplicar')
    setOperacaoSelecionada(operacao)
    setModalAberto(true)
  }

  function aplicarBusca(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    atualizarUrl({
      busca: busca.trim() || null,
      page: '1',
    })
  }

  function limparBusca() {
    setBusca('')
    atualizarUrl({
      busca: null,
      page: '1',
    })
  }

  function alterarOrdenacao(field: OperacaoSortField) {
    const nextSortDir =
      sortBy === field ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc'

    atualizarUrl({
      sortBy: field,
      sortDir: nextSortDir,
      page: '1',
    })
  }

  function irParaPagina(targetPage: number) {
    atualizarUrl({
      page: String(targetPage),
    })
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <form onSubmit={aplicarBusca} className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por código, descrição, máquina ou setor..."
              aria-label="Buscar operações"
              className="w-full rounded-lg border border-gray-300 py-2 pr-10 pl-9 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {busca ? (
              <button
                type="button"
                onClick={limparBusca}
                aria-label="Limpar busca"
                className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Search size={16} />
            Buscar
          </button>
        </form>

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

      <div className="mb-4 flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Mostrando <span className="font-semibold text-slate-900">{paginaInicialItem}</span>-
          <span className="font-semibold text-slate-900">{paginaFinalItem}</span> de{' '}
          <span className="font-semibold text-slate-900">{total}</span> operações
        </p>
        <p>
          Página <span className="font-semibold text-slate-900">{page}</span> de{' '}
          <span className="font-semibold text-slate-900">{totalPages}</span>
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <SortableHeader
                  activeField={sortBy}
                  className="px-4 py-3 text-left font-medium"
                  direction={sortDir}
                  field="codigo"
                  label="Código"
                  onSort={alterarOrdenacao}
                />
                <SortableHeader
                  activeField={sortBy}
                  className="px-4 py-3 text-left font-medium"
                  direction={sortDir}
                  field="descricao"
                  label="Descrição"
                  onSort={alterarOrdenacao}
                />
                <SortableHeader
                  activeField={sortBy}
                  className="hidden px-4 py-3 text-left font-medium md:table-cell"
                  direction={sortDir}
                  field="maquina"
                  label="Máquina"
                  onSort={alterarOrdenacao}
                />
                <SortableHeader
                  activeField={sortBy}
                  className="hidden px-4 py-3 text-left font-medium lg:table-cell"
                  direction={sortDir}
                  field="setor"
                  label="Setor"
                  onSort={alterarOrdenacao}
                />
                <SortableHeader
                  activeField={sortBy}
                  className="px-4 py-3 text-left font-medium"
                  direction={sortDir}
                  field="tempo_padrao_min"
                  label="T.P"
                  onSort={alterarOrdenacao}
                />
                <SortableHeader
                  activeField={sortBy}
                  className="hidden px-4 py-3 text-left font-medium md:table-cell"
                  direction={sortDir}
                  field="meta_hora"
                  label="Meta/hora"
                  onSort={alterarOrdenacao}
                />
                <SortableHeader
                  activeField={sortBy}
                  className="hidden px-4 py-3 text-left font-medium md:table-cell"
                  direction={sortDir}
                  field="meta_dia"
                  label="Meta/dia"
                  onSort={alterarOrdenacao}
                />
                <SortableHeader
                  activeField={sortBy}
                  className="px-4 py-3 text-left font-medium"
                  direction={sortDir}
                  field="ativa"
                  label="Status"
                  onSort={alterarOrdenacao}
                />
                <th className="px-4 py-3 text-right font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {operacoes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    Nenhuma operação encontrada
                  </td>
                </tr>
              ) : (
                operacoes.map((operacao) => (
                  <tr key={operacao.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-900">{operacao.codigo}</td>
                    <td className="px-4 py-3 text-gray-600">{operacao.descricao}</td>
                    <td className="hidden px-4 py-3 text-gray-600 md:table-cell">
                      {operacao.maquinaModelo
                        ? `${operacao.maquinaModelo}${operacao.maquinaCodigo ? ` • ${operacao.maquinaCodigo}` : ''}`
                        : '—'}
                    </td>
                    <td className="hidden px-4 py-3 text-gray-600 lg:table-cell">
                      {operacao.setorNome ?? 'Não definido'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatarTp(operacao.tempo_padrao_min)}
                    </td>
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
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-end gap-2">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => abrirEditar(operacao)}
                            aria-label={`Editar ${operacao.codigo}`}
                            title={`Editar ${operacao.codigo}`}
                            className="inline-flex rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => abrirDuplicar(operacao)}
                            aria-label={`Duplicar ${operacao.codigo}`}
                            title={`Duplicar ${operacao.codigo}`}
                            className="inline-flex rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-violet-50 hover:text-violet-600"
                          >
                            <Copy size={16} />
                          </button>
                          <Link
                            href={`/admin/operacoes/${operacao.id}`}
                            aria-label={`Ver detalhes de ${operacao.codigo}`}
                            title={`Ver detalhes de ${operacao.codigo}`}
                            className="inline-flex rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <Eye size={16} />
                          </Link>
                          <OperacaoLifecycleActions
                            operacaoId={operacao.id}
                            codigo={operacao.codigo}
                            ativa={operacao.ativa ?? true}
                            compact
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => irParaPagina(1)}
            disabled={page <= 1}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronsLeft size={16} />
            Primeira
          </button>
          <button
            type="button"
            onClick={() => irParaPagina(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft size={16} />
            Anterior
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {paginas.map((paginaNumero) => (
            <button
              key={paginaNumero}
              type="button"
              onClick={() => irParaPagina(paginaNumero)}
              aria-current={paginaNumero === page ? 'page' : undefined}
              className={`min-w-10 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                paginaNumero === page
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {paginaNumero}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => irParaPagina(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Próxima
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => irParaPagina(totalPages)}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Última
            <ChevronsRight size={16} />
          </button>
        </div>
      </div>

      {modalAberto ? (
        <ModalOperacao
          operacao={modalModo === 'editar' ? operacaoSelecionada : undefined}
          operacaoBase={modalModo === 'duplicar' ? operacaoSelecionada : undefined}
          maquinas={maquinas}
          setores={setores}
          aoFechar={() => setModalAberto(false)}
        />
      ) : null}
    </>
  )
}
