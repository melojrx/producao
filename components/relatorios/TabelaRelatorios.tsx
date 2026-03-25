import Link from 'next/link'
import type { RelatorioFiltros, RelatorioRegistroItem } from '@/types'

interface TabelaRelatoriosProps {
  itens: RelatorioRegistroItem[]
  filtros: RelatorioFiltros
  page: number
  pageSize: number
  total: number
}

function formatarDataHora(data: string, hora: string): string {
  if (!hora) {
    return data
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Fortaleza',
  }).format(new Date(hora))
}

function construirHrefPaginacao(filtros: RelatorioFiltros, page: number): string {
  const params = new URLSearchParams()
  params.set('dataInicio', filtros.dataInicio)
  params.set('dataFim', filtros.dataFim)

  if (filtros.operadorId) {
    params.set('operadorId', filtros.operadorId)
  }

  if (filtros.operacaoId) {
    params.set('operacaoId', filtros.operacaoId)
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
        <h2 className="text-sm font-semibold text-slate-900">Registros filtrados</h2>
        <p className="mt-1 text-sm text-slate-600">
          {total} registro(s) encontrado(s) no período selecionado.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Operador</th>
              <th className="px-4 py-3 font-medium">Operação</th>
              <th className="px-4 py-3 font-medium">Máquina</th>
              <th className="px-4 py-3 font-medium">Quantidade</th>
              <th className="px-4 py-3 font-medium">Data/Hora</th>
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                  Nenhum registro encontrado com os filtros atuais.
                </td>
              </tr>
            ) : (
              itens.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-900">{item.operadorNome}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="font-medium text-slate-900">{item.operacaoCodigo}</div>
                    <div className="text-xs text-slate-500">{item.operacaoDescricao}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.maquinaCodigo ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-900">{item.quantidade}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatarDataHora(item.dataProducao, item.horaRegistro)}
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
