'use client'

import { AlertTriangle, OctagonX, X } from 'lucide-react'

interface ModalEncerrarTurnoProps {
  encerrando: boolean
  observacao: string | null
  operadoresAlocados: number
  opsPlanejadas: number
  secoesPlanejadas: number
  aoCancelar: () => void
  aoConfirmar: () => void
}

export function ModalEncerrarTurno({
  encerrando,
  observacao,
  operadoresAlocados,
  opsPlanejadas,
  secoesPlanejadas,
  aoCancelar,
  aoConfirmar,
}: ModalEncerrarTurnoProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label="Encerrar turno"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              <AlertTriangle size={14} />
              Confirmação operacional
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Encerrar turno</h2>
              <p className="text-sm text-slate-600">
                O turno atual será encerrado manualmente e a dashboard passará a exibir o último
                turno encerrado até a abertura de um novo planejamento.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={aoCancelar}
            aria-label="Fechar modal de encerramento do turno"
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-6 p-6">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Use esta ação quando o planejamento do dia tiver sido concluído ou quando você precisar
            fechar formalmente o turno antes da abertura do próximo.
          </div>

          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Operadores alocados
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{operadoresAlocados}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                OPs planejadas
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{opsPlanejadas}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Seções planejadas
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{secoesPlanejadas}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Observação do turno
            </p>
            <p className="mt-2 text-sm text-slate-700">
              {observacao?.trim() ? observacao : 'Sem observações registradas para este turno.'}
            </p>
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={aoCancelar}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={aoConfirmar}
              disabled={encerrando}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <OctagonX size={16} />
              {encerrando ? 'Encerrando turno...' : 'Confirmar encerramento'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
