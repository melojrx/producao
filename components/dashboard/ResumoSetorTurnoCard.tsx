'use client'

import type { TurnoSetorDashboardItem } from '@/lib/utils/turno-setores'

interface ResumoSetorTurnoCardProps {
  setor: TurnoSetorDashboardItem
  onClick: (setorId: string) => void
}

function corStatus(status: TurnoSetorDashboardItem['status']): string {
  if (status === 'concluida') {
    return 'bg-emerald-100 text-emerald-700'
  }

  if (status === 'encerrada_manualmente') {
    return 'bg-amber-100 text-amber-700'
  }

  if (status === 'em_andamento' || status === 'aberta') {
    return 'bg-blue-100 text-blue-700'
  }

  return 'bg-slate-100 text-slate-700'
}

export function ResumoSetorTurnoCard({ setor, onClick }: ResumoSetorTurnoCardProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(setor.setorId)}
      className="flex min-h-[18.5rem] h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-slate-900">{setor.setorNome}</p>
          <p className="text-sm text-slate-600">{setor.demandas.length} demanda(s) ativa(s) neste setor.</p>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${corStatus(setor.status)}`}
        >
          {setor.status}
        </span>
      </div>

      <div className="mt-6 flex items-center justify-between text-sm text-slate-600">
        <span>{setor.quantidadeConcluida} peças completas</span>
        <span>{setor.quantidadePlanejada} planejado</span>
      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-amber-500 transition-all"
          style={{ width: `${setor.progressoOperacionalPct}%` }}
        />
      </div>

      <div className="mt-auto flex items-center justify-between pt-6 text-xs font-medium uppercase tracking-wide text-slate-500">
        <span>{setor.progressoOperacionalPct.toFixed(0)}% de progresso operacional</span>
        <span className="text-blue-700">Ver OPs do setor</span>
      </div>
    </button>
  )
}
