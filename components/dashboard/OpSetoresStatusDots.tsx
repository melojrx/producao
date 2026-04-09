'use client'

import type { OpSetorStatusDotItem } from '@/lib/utils/turno-setores'

interface OpSetoresStatusDotsProps {
  setores: OpSetorStatusDotItem[]
}

function classeStatusDot(status: OpSetorStatusDotItem['status']): string {
  if (status === 'concluida' || status === 'encerrada_manualmente') {
    return 'bg-emerald-500 ring-emerald-200'
  }

  if (status === 'em_andamento') {
    return 'bg-amber-400 ring-amber-200'
  }

  return 'bg-blue-500 ring-blue-200'
}

export function OpSetoresStatusDots({ setores }: OpSetoresStatusDotsProps) {
  if (setores.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
        Nenhum setor derivado nesta OP.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto pb-1">
      <div className="relative flex min-w-max items-start gap-3 px-2 py-1">
        <div className="absolute left-6 right-6 top-[0.85rem] h-px bg-slate-200" />
        {setores.map((setor) => (
          <div
            key={`${setor.setorId}-${setor.setorCodigo}`}
            title={`${setor.setorNome} · ${setor.status}`}
            aria-label={`${setor.setorNome} com status ${setor.status}`}
            className="relative z-10 flex min-w-[84px] max-w-[92px] flex-col items-center gap-2 text-center"
          >
            <span
              className={`h-4 w-4 rounded-full ring-4 ring-offset-4 ring-offset-white ${classeStatusDot(setor.status)}`}
            />
            <span className="text-[11px] font-medium leading-4 text-slate-600">
              {setor.setorNome}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
