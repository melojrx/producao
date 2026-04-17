'use client'

import { Factory, Layers3, Package, X } from 'lucide-react'
import type { TurnoSetorDashboardItem } from '@/lib/utils/turno-setores'

interface ModalDetalhesSetorTurnoProps {
  setor: TurnoSetorDashboardItem
  aoFechar: () => void
}

function obterTemaStatus(status: TurnoSetorDashboardItem['status'] | TurnoSetorDashboardItem['demandas'][number]['status']): string {
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

export function ModalDetalhesSetorTurno({ setor, aoFechar }: ModalDetalhesSetorTurnoProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/65 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes do setor ${setor.setorNome}`}
    >
      <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              <Factory size={14} />
              Detalhe consolidado do setor
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold text-slate-900">{setor.setorNome}</h2>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${obterTemaStatus(setor.status)}`}
              >
                {setor.status}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar modal de detalhes do setor"
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Demandas</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{setor.demandas.length}</p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Backlog</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {formatarQuantidade(setor.quantidadeBacklogTotal)}
              </p>
            </article>

            <article className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
                Aceito no turno
              </p>
              <p className="mt-2 text-3xl font-semibold text-blue-900">
                {formatarQuantidade(setor.quantidadeAceitaTurno)}
              </p>
            </article>

            <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                Peças completas
              </p>
              <p className="mt-2 text-3xl font-semibold text-emerald-900">
                {formatarQuantidade(setor.quantidadeConcluida)}
              </p>
            </article>

            <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                Excedente
              </p>
              <p className="mt-2 text-3xl font-semibold text-amber-900">
                {formatarQuantidade(setor.quantidadeExcedenteTurno)}
              </p>
            </article>

            <article className="rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-violet-700">
                Progresso operacional
              </p>
              <p className="mt-2 text-3xl font-semibold text-violet-900">
                {setor.progressoOperacionalPct.toFixed(0)}%
              </p>
            </article>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-slate-900">OPs dentro do setor</h3>
              <p className="text-sm text-slate-600">
                Detalhamento das demandas internas que compõem o progresso consolidado deste setor.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {setor.demandas.map((demanda) => (
                <article
                  key={demanda.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                        <Layers3 size={12} />
                        {demanda.numeroOp}
                      </div>
                      <h4 className="mt-3 text-sm font-semibold text-slate-900">
                        {demanda.produtoNome}
                      </h4>
                      <p className="text-sm text-slate-600">{demanda.produtoReferencia}</p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${obterTemaStatus(demanda.status)}`}
                    >
                      {demanda.status}
                    </span>
                  </div>

                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all"
                      style={{ width: `${demanda.progressoOperacionalPct}%` }}
                    />
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        Backlog
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatarQuantidade(demanda.quantidadeBacklogSetor)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-blue-700">
                        Aceito
                      </p>
                      <p className="mt-1 text-sm font-semibold text-blue-900">
                        {formatarQuantidade(demanda.quantidadeAceitaTurno)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">
                        Concluido
                      </p>
                      <p className="mt-1 text-sm font-semibold text-emerald-900">
                        {formatarQuantidade(demanda.quantidadeConcluida)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-amber-700">
                        Excedente
                      </p>
                      <p className="mt-1 text-sm font-semibold text-amber-900">
                        {formatarQuantidade(demanda.quantidadeExcedenteTurno)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Disponível agora {formatarQuantidade(demanda.quantidadeDisponivelApontamento)}
                    </span>
                    <span>
                      Carga T.P. {demanda.cargaRealizadaTp.toFixed(2)} /{' '}
                      {demanda.cargaPlanejadaTp.toFixed(2)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              <Package size={14} />
              QR {setor.qrCodeToken.slice(0, 16)}...
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
