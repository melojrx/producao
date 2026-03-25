import type { OperacaoListItem, RelatorioFiltros } from '@/types'
import type { Tables } from '@/types/supabase'

interface FiltrosRelatoriosProps {
  filtros: RelatorioFiltros
  operadores: Tables<'operadores'>[]
  operacoes: OperacaoListItem[]
}

export function FiltrosRelatorios({
  filtros,
  operadores,
  operacoes,
}: FiltrosRelatoriosProps) {
  return (
    <form
      method="get"
      className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="dataInicio" className="text-sm font-medium text-slate-700">
          Data início
        </label>
        <input
          id="dataInicio"
          name="dataInicio"
          type="date"
          defaultValue={filtros.dataInicio}
          className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="dataFim" className="text-sm font-medium text-slate-700">
          Data fim
        </label>
        <input
          id="dataFim"
          name="dataFim"
          type="date"
          defaultValue={filtros.dataFim}
          className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="operadorId" className="text-sm font-medium text-slate-700">
          Operador
        </label>
        <select
          id="operadorId"
          name="operadorId"
          defaultValue={filtros.operadorId}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os operadores</option>
          {operadores.map((operador) => (
            <option key={operador.id} value={operador.id}>
              {operador.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="operacaoId" className="text-sm font-medium text-slate-700">
          Operação
        </label>
        <select
          id="operacaoId"
          name="operacaoId"
          defaultValue={filtros.operacaoId}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas as operações</option>
          {operacoes.map((operacao) => (
            <option key={operacao.id} value={operacao.id}>
              {operacao.codigo} • {operacao.descricao}
            </option>
          ))}
        </select>
      </div>

      <input type="hidden" name="page" value="1" />

      <div className="flex items-end gap-3 md:col-span-2 xl:col-span-4">
        <button
          type="submit"
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Aplicar filtros
        </button>
        <a
          href="/admin/relatorios"
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Limpar
        </a>
      </div>
    </form>
  )
}
