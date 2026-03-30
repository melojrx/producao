import Link from 'next/link'
import type { RelatorioFiltros, RelatorioRegistroItem } from '@/types'

interface TabelaRelatoriosProps {
  itens: RelatorioRegistroItem[]
  filtros: RelatorioFiltros
  page: number
  pageSize: number
  total: number
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

function construirHrefPaginacao(filtros: RelatorioFiltros, page: number): string {
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

  return `/admin/relatorios?${params.toString()}`
}

export function TabelaRelatorios({
  itens,
  filtros,
  page,
  pageSize,
  total,
}: TabelaRelatoriosProps) {
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize))
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1320px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Origem</th>
              <th className="px-4 py-3 font-medium">Turno</th>
              <th className="px-4 py-3 font-medium">OP</th>
              <th className="px-4 py-3 font-medium">Setor</th>
              <th className="px-4 py-3 font-medium">Operador</th>
              <th className="px-4 py-3 font-medium">Operação</th>
              <th className="px-4 py-3 font-medium">Apontado</th>
              <th className="px-4 py-3 font-medium">Realizado operação</th>
              <th className="px-4 py-3 font-medium">Realizado seção</th>
              <th className="px-4 py-3 font-medium">Realizado OP</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Último apontamento</th>
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

      <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Página {page} de {totalPaginas}
        </p>

        <div className="flex gap-2">
          <Link
            href={construirHrefPaginacao(filtros, Math.max(1, page - 1))}
            aria-disabled={!podeVoltar}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              podeVoltar
                ? 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                : 'cursor-not-allowed border border-slate-200 text-slate-400'
            }`}
          >
            Anterior
          </Link>
          <Link
            href={construirHrefPaginacao(filtros, Math.min(totalPaginas, page + 1))}
            aria-disabled={!podeAvancar}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              podeAvancar
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'cursor-not-allowed bg-slate-200 text-slate-500'
            }`}
          >
            Próxima
          </Link>
        </div>
      </div>
    </section>
  )
}
