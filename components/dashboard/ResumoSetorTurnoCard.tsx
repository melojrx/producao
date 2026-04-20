'use client'

import { AlertTriangle } from 'lucide-react'
import type { TurnoSetorDashboardItem } from '@/lib/utils/turno-setores'
import { resumirPlanoDiarioTurno } from '@/lib/utils/plano-diario-turno'

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

function formatarQuantidade(valor: number): string {
  return valor.toLocaleString('pt-BR')
}

export function ResumoSetorTurnoCard({ setor, onClick }: ResumoSetorTurnoCardProps) {
  const disponibilidadeAgora = setor.demandas.reduce(
    (soma, demanda) => soma + demanda.quantidadeDisponivelApontamento,
    0
  )
  const resumoPlano = resumirPlanoDiarioTurno({
    quantidadeAceitaTurno: setor.quantidadeAceitaTurno,
    quantidadeConcluida: setor.quantidadeConcluida,
    quantidadeDisponivelApontamento: disponibilidadeAgora,
  })

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

      <div className="mt-6 grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Backlog vivo
          </p>
          <p className="mt-1 font-semibold text-slate-900">
            {formatarQuantidade(setor.quantidadeBacklogTotal)}
          </p>
        </div>
        <div className="rounded-xl bg-blue-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
            Plano do dia
          </p>
          <p className="mt-1 font-semibold text-blue-900">
            {formatarQuantidade(setor.quantidadeAceitaTurno)}
          </p>
        </div>
        <div className="rounded-xl bg-emerald-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
            Concluido
          </p>
          <p className="mt-1 font-semibold text-emerald-900">
            {formatarQuantidade(setor.quantidadeConcluida)}
          </p>
        </div>
        <div className="rounded-xl bg-amber-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
            Excedente
          </p>
          <p className="mt-1 font-semibold text-amber-900">
            {formatarQuantidade(setor.quantidadeExcedenteTurno)}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-cyan-50 px-3 py-2 text-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-700">
          Disponível agora
        </p>
        <p className="mt-1 font-semibold text-cyan-900">
          {formatarQuantidade(disponibilidadeAgora)}
        </p>
      </div>

      {resumoPlano.excedePlanoAtual ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <p>
              A execução atual já ultrapassa o saldo visual do plano do dia. O setor segue
              operando, mas o turno passou do teto diário planejado.
            </p>
          </div>
        </div>
      ) : null}

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
