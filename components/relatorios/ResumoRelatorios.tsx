import type { RelatorioResumoItem } from '@/types'

interface ResumoRelatoriosProps {
  resumo: RelatorioResumoItem
}

function temaStatus(status: RelatorioResumoItem['statusGeral']): string {
  if (status === 'concluida') {
    return 'bg-emerald-100 text-emerald-700'
  }

  if (status === 'em_andamento') {
    return 'bg-blue-100 text-blue-700'
  }

  if (status === 'encerrada_manualmente') {
    return 'bg-amber-100 text-amber-700'
  }

  if (status === 'misto') {
    return 'bg-violet-100 text-violet-700'
  }

  return 'bg-slate-100 text-slate-700'
}

export function ResumoRelatorios({ resumo }: ResumoRelatoriosProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Resumo consolidado</h2>
          <p className="mt-1 text-sm text-slate-600">
            O relatório separa peças completas do progresso operacional ponderado por T.P. no
            escopo filtrado.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {resumo.turnosNoEscopo} turno(s)
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {resumo.opsNoEscopo} OP(s)
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${temaStatus(resumo.statusGeral)}`}>
            {resumo.statusGeral}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Planejado</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{resumo.totalPlanejado}</p>
        </article>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            Peças completas
          </p>
          <p className="mt-2 text-2xl font-semibold text-emerald-900">{resumo.totalRealizado}</p>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
            Saldo de peças
          </p>
          <p className="mt-2 text-2xl font-semibold text-amber-900">{resumo.saldo}</p>
        </article>
        <article className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
            Progresso operacional
          </p>
          <p className="mt-2 text-2xl font-semibold text-blue-900">
            {resumo.progressoPct.toFixed(0)}%
          </p>
          <p className="mt-1 text-xs text-blue-700">
            {resumo.totalCargaRealizadaTp.toFixed(2)} / {resumo.totalCargaPlanejadaTp.toFixed(2)} min
          </p>
        </article>
        <article className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-700">
            Demandas concluídas
          </p>
          <p className="mt-2 text-2xl font-semibold text-violet-900">{resumo.secoesConcluidas}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Apontado no filtro
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {resumo.quantidadeApontadaFiltro}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {resumo.secoesPendentes} demanda(s) pendentes
          </p>
        </article>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Quando o filtro de operador está ativo, o card <strong>Apontado no filtro</strong> reflete
        apenas os lançamentos atômicos desse operador. Os cards gerenciais continuam consolidados no
        escopo selecionado de turno, OP e setor, mantendo <strong>peças completas</strong> separado
        de <strong>progresso operacional</strong>.
      </p>

      {resumo.registrosLegados > 0 ? (
        <p className="mt-2 text-xs text-slate-500">
          O período atual inclui {resumo.registrosLegados} registro(s) do fluxo legado. Eles seguem
          visíveis durante a transição, mas não entram na consolidação estrutural por turno, OP e
          demanda setorial da V2.
        </p>
      ) : null}
    </section>
  )
}
