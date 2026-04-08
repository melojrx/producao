import Link from 'next/link'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import type {
  RelatorioFiltros,
  RelatorioRegistroItem,
  RelatorioSortField,
  SortDirection,
} from '@/types'

interface TabelaRelatoriosProps {
  itens: RelatorioRegistroItem[]
  filtros: RelatorioFiltros
  page: number
  pageSize: number
  sortBy: RelatorioSortField
  sortDir: SortDirection
  total: number
}

interface SortableHeaderProps {
  activeField: RelatorioSortField
  className?: string
  direction: SortDirection
  field: RelatorioSortField
  filtros: RelatorioFiltros
  label: string
}

function formatarDataHora(hora: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Fortaleza',
  }).format(new Date(hora))
}

function temaStatus(status: RelatorioRegistroItem['statusOp']): string {
  if (status === 'concluida') {
    return 'bg-emerald-100 text-emerald-700'
  }

  if (status === 'em_andamento') {
    return 'bg-blue-100 text-blue-700'
  }

  if (status === 'encerrada_manualmente') {
    return 'bg-amber-100 text-amber-700'
  }

  return 'bg-slate-100 text-slate-700'
}

function temaOrigem(origem: RelatorioRegistroItem['origem']): string {
  if (origem === 'legado') {
    return 'bg-amber-100 text-amber-700'
  }

  return 'bg-blue-100 text-blue-700'
}

function formatarOrigem(origem: RelatorioRegistroItem['origem']): string {
  return origem === 'legado' ? 'Legado' : 'V2'
}

function valorConsolidado(item: RelatorioRegistroItem, valor: number): string {
  if (item.origem === 'legado') {
    return '—'
  }

  return String(valor)
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

function construirHrefTabela(
  filtros: RelatorioFiltros,
  page: number,
  sortBy: RelatorioSortField,
  sortDir: SortDirection
): string {
  const params = new URLSearchParams()
  params.set('dataInicio', filtros.dataInicio)
  params.set('dataFim', filtros.dataFim)
  if (filtros.turnoId) {
    params.set('turnoId', filtros.turnoId)
  }
  if (filtros.turnoOpId) {
    params.set('turnoOpId', filtros.turnoOpId)
  }
  if (filtros.setorId) {
    params.set('setorId', filtros.setorId)
  }

  if (filtros.operadorId) {
    params.set('operadorId', filtros.operadorId)
  }

  params.set('page', String(page))
  params.set('sortBy', sortBy)
  params.set('sortDir', sortDir)

  return `/admin/relatorios?${params.toString()}`
}

function SortableHeader({
  activeField,
  className,
  direction,
  field,
  filtros,
  label,
}: SortableHeaderProps) {
  const isActive = field === activeField
  const Icon = !isActive ? ArrowUpDown : direction === 'asc' ? ArrowUp : ArrowDown
  const nextDirection = isActive && direction === 'asc' ? 'desc' : 'asc'

  return (
    <th className={className}>
      <Link
        href={construirHrefTabela(filtros, 1, field, nextDirection)}
        className={`inline-flex items-center gap-2 text-left transition-colors ${
          isActive ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <span>{label}</span>
        <Icon size={14} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
      </Link>
    </th>
  )
}

export function TabelaRelatorios({
  itens,
  filtros,
  page,
  pageSize,
  sortBy,
  sortDir,
  total,
}: TabelaRelatoriosProps) {
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize))
  const paginaInicialItem = total === 0 ? 0 : (page - 1) * pageSize + 1
  const paginaFinalItem = total === 0 ? 0 : Math.min(total, page * pageSize)
  const paginas = construirPaginas(totalPaginas, page)
  const podeVoltar = page > 1
  const podeAvancar = page < totalPaginas

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">Detalhamento atômico filtrado</h2>
        <p className="mt-1 text-sm text-slate-600">
          {total} linha(s) entre apontamentos V2 por operador e operação e histórico legado preservado.
        </p>
      </div>

      <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Mostrando <span className="font-semibold text-slate-900">{paginaInicialItem}</span>-
          <span className="font-semibold text-slate-900">{paginaFinalItem}</span> de{' '}
          <span className="font-semibold text-slate-900">{total}</span> registros
        </p>
        <p>
          Página <span className="font-semibold text-slate-900">{page}</span> de{' '}
          <span className="font-semibold text-slate-900">{totalPaginas}</span>
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1320px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <SortableHeader
                activeField={sortBy}
                className="px-4 py-3 font-medium"
                direction={sortDir}
                field="origem"
                filtros={filtros}
                label="Origem"
              />
              <th className="px-4 py-3 font-medium">Turno</th>
              <SortableHeader
                activeField={sortBy}
                className="px-4 py-3 font-medium"
                direction={sortDir}
                field="numeroOp"
                filtros={filtros}
                label="OP"
              />
              <SortableHeader
                activeField={sortBy}
                className="px-4 py-3 font-medium"
                direction={sortDir}
                field="setorNome"
                filtros={filtros}
                label="Setor"
              />
              <SortableHeader
                activeField={sortBy}
                className="px-4 py-3 font-medium"
                direction={sortDir}
                field="operadorNome"
                filtros={filtros}
                label="Operador"
              />
              <SortableHeader
                activeField={sortBy}
                className="px-4 py-3 font-medium"
                direction={sortDir}
                field="operacaoCodigo"
                filtros={filtros}
                label="Operação"
              />
              <SortableHeader
                activeField={sortBy}
                className="px-4 py-3 font-medium"
                direction={sortDir}
                field="quantidadeApontada"
                filtros={filtros}
                label="Apontado"
              />
              <SortableHeader
                activeField={sortBy}
                className="px-4 py-3 font-medium"
                direction={sortDir}
                field="quantidadeRealizadaOperacao"
                filtros={filtros}
                label="Realizado operação"
              />
              <SortableHeader
                activeField={sortBy}
                className="px-4 py-3 font-medium"
                direction={sortDir}
                field="quantidadeRealizadaSecao"
                filtros={filtros}
                label="Realizado seção"
              />
              <SortableHeader
                activeField={sortBy}
                className="px-4 py-3 font-medium"
                direction={sortDir}
                field="quantidadeRealizadaOp"
                filtros={filtros}
                label="Realizado OP"
              />
              <SortableHeader
                activeField={sortBy}
                className="px-4 py-3 font-medium"
                direction={sortDir}
                field="statusOp"
                filtros={filtros}
                label="Status"
              />
              <SortableHeader
                activeField={sortBy}
                className="px-4 py-3 font-medium"
                direction={sortDir}
                field="ultimaLeituraEm"
                filtros={filtros}
                label="Último apontamento"
              />
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-12 text-center text-slate-500">
                  Nenhum registro encontrado com os filtros atuais.
                </td>
              </tr>
            ) : (
              itens.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-700">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${temaOrigem(item.origem)}`}
                    >
                      {formatarOrigem(item.origem)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="font-medium text-slate-900">{item.turnoLabel}</div>
                    <div className="text-xs text-slate-500">{item.turnoStatus}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="font-medium text-slate-900">{item.numeroOp}</div>
                    <div className="text-xs text-slate-500">
                      {item.produtoReferencia} · {item.produtoNome}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.setorNome}</td>
                  <td className="px-4 py-3 text-slate-900">{item.operadorNome}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="font-medium text-slate-900">{item.operacaoCodigo}</div>
                    <div className="text-xs text-slate-500">{item.operacaoDescricao}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-900">{item.quantidadeApontada}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {valorConsolidado(item, item.quantidadeRealizadaOperacao)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {valorConsolidado(item, item.quantidadeRealizadaSecao)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {valorConsolidado(item, item.quantidadeRealizadaOp)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {item.origem === 'legado' ? (
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        histórico
                      </span>
                    ) : (
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${temaStatus(item.statusOp)}`}
                      >
                        {item.statusOp}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatarDataHora(item.ultimaLeituraEm)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {podeVoltar ? (
            <Link
              href={construirHrefTabela(filtros, 1, sortBy, sortDir)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <ChevronsLeft size={16} />
              Primeira
            </Link>
          ) : (
            <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 opacity-50">
              <ChevronsLeft size={16} />
              Primeira
            </span>
          )}
          {podeVoltar ? (
            <Link
              href={construirHrefTabela(filtros, Math.max(1, page - 1), sortBy, sortDir)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <ChevronLeft size={16} />
              Anterior
            </Link>
          ) : (
            <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 opacity-50">
              <ChevronLeft size={16} />
              Anterior
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {paginas.map((paginaNumero) => (
            <Link
              key={paginaNumero}
              href={construirHrefTabela(filtros, paginaNumero, sortBy, sortDir)}
              aria-current={paginaNumero === page ? 'page' : undefined}
              className={`min-w-10 rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors ${
                paginaNumero === page
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {paginaNumero}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {podeAvancar ? (
            <Link
              href={construirHrefTabela(filtros, Math.min(totalPaginas, page + 1), sortBy, sortDir)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Próxima
              <ChevronRight size={16} />
            </Link>
          ) : (
            <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 opacity-50">
              Próxima
              <ChevronRight size={16} />
            </span>
          )}
          {podeAvancar ? (
            <Link
              href={construirHrefTabela(filtros, totalPaginas, sortBy, sortDir)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Última
              <ChevronsRight size={16} />
            </Link>
          ) : (
            <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 opacity-50">
              Última
              <ChevronsRight size={16} />
            </span>
          )}
        </div>
      </div>
    </section>
  )
}
