'use client'

import { ArrowUpRight } from 'lucide-react'
import { OpSetoresStatusDots } from '@/components/dashboard/OpSetoresStatusDots'
import type { TurnoOpResumoDashboardItem } from '@/lib/utils/turno-setores'

interface ResumoOpTurnoCardProps {
  op: TurnoOpResumoDashboardItem
  onClick: (turnoOpId: string) => void
}

function corStatus(status: TurnoOpResumoDashboardItem['status']): string {
  if (status === 'concluida') {
    return 'bg-emerald-100 text-emerald-700'
  }

  if (status === 'encerrada_manualmente') {
    return 'bg-amber-100 text-amber-700'
  }

  if (status === 'em_andamento') {
    return 'bg-blue-100 text-blue-700'
  }

  return 'bg-slate-100 text-slate-700'
}

function formatarQuantidade(valor: number): string {
  return valor.toLocaleString('pt-BR')
}

export function ResumoOpTurnoCard({ op, onClick }: ResumoOpTurnoCardProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(op.id)}
      className="flex min-h-[18.5rem] h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
            {op.numeroOp}
          </div>
          <h3 className="mt-3 text-base font-semibold text-slate-900">{op.produtoNomeResumido}</h3>
          <p className="text-sm text-slate-600">{op.produtoReferencia}</p>
        </div>

        <span
          className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${corStatus(op.status)}`}
        >
          {op.status}
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Backlog vivo
          </p>
          <p className="mt-1 font-semibold text-slate-900">
            {formatarQuantidade(op.quantidadeBacklogTotal)}
          </p>
        </div>
        <div className="rounded-xl bg-blue-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
            Plano do dia
          </p>
          <p className="mt-1 font-semibold text-blue-900">
            {formatarQuantidade(op.quantidadeAceitaTurno)}
          </p>
        </div>
        <div className="rounded-xl bg-emerald-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
            Concluido
          </p>
          <p className="mt-1 font-semibold text-emerald-900">
            {formatarQuantidade(op.quantidadeConcluida)}
          </p>
        </div>
        <div className="rounded-xl bg-amber-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
            Excedente
          </p>
          <p className="mt-1 font-semibold text-amber-900">
            {formatarQuantidade(op.quantidadeExcedenteTurno)}
          </p>
        </div>
      </div>

      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{ width: `${op.progressoOperacionalPct}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-700">
          {op.progressoOperacionalPct.toFixed(0)}% de progresso operacional
        </p>
        <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-blue-700">
          Ver detalhes
          <ArrowUpRight size={14} />
        </span>
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Linha do tempo por setor
        </p>
        <OpSetoresStatusDots setores={op.setores} />
      </div>
    </button>
  )
}
