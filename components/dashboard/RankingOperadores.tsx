'use client'

import {
  ALERTA_EFICIENCIA_BAIXA,
  ALERTA_EFICIENCIA_CRITICA,
} from '@/lib/constants'
import type { ProducaoHojeRegistro } from '@/types'

interface RankingOperadoresProps {
  registros: ProducaoHojeRegistro[]
  estaCarregando?: boolean
}

function obterClasseEficiencia(eficienciaPct: number): string {
  if (eficienciaPct >= ALERTA_EFICIENCIA_BAIXA) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  }

  if (eficienciaPct >= ALERTA_EFICIENCIA_CRITICA) {
    return 'border-amber-200 bg-amber-50 text-amber-800'
  }

  return 'border-red-200 bg-red-50 text-red-800'
}

export function RankingOperadores({
  registros,
  estaCarregando = false,
}: RankingOperadoresProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">Top operadores hoje</h3>
        {estaCarregando ? <span className="text-xs text-slate-500">Sincronizando...</span> : null}
      </div>

      <div className="mt-4 space-y-3">
        {registros.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum registro encontrado para hoje.</p>
        ) : (
          registros.map((registro) => (
            <div
              key={registro.operadorId}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{registro.operadorNome}</p>
                <p className="text-xs text-slate-500">
                  {registro.totalPecas} peças • {registro.totalRegistros} registros
                </p>
              </div>

              <p
                className={`rounded-full border px-2.5 py-1 text-sm font-semibold ${obterClasseEficiencia(
                  registro.eficienciaPct
                )}`}
                title="Eficiência % do operador no dia"
                aria-label={`Eficiência do operador ${registro.operadorNome}: ${registro.eficienciaPct.toFixed(2)} por cento`}
              >
                {registro.eficienciaPct.toFixed(2)}%
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
