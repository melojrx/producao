'use client'

import { ArrowRight, Boxes, GitBranch, Link2, PackageSearch } from 'lucide-react'
import type {
  OperadorScaneado,
  TurnoSetorDemandaScaneada,
  TurnoSetorScaneado,
} from '@/types'

interface SelecaoDemandaScannerProps {
  demandas: TurnoSetorDemandaScaneada[]
  operador: OperadorScaneado
  onSelecionarDemanda: (demandaId: string) => void | Promise<void>
  onTrocarOperador: () => void
  setor: TurnoSetorScaneado
}

function statusTema(status: TurnoSetorDemandaScaneada['status']): string {
  if (status === 'concluida') {
    return 'bg-emerald-100 text-emerald-700'
  }

  if (status === 'em_andamento') {
    return 'bg-blue-100 text-blue-700'
  }

  if (status === 'encerrada_manualmente') {
    return 'bg-amber-100 text-amber-700'
  }

  return 'bg-slate-100 text-slate-700'
}

export function SelecaoDemandaScanner({
  demandas,
  operador,
  onSelecionarDemanda,
  onTrocarOperador,
  setor,
}: SelecaoDemandaScannerProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/60 p-5 shadow-[0_20px_48px_rgba(2,6,23,0.45)] backdrop-blur-xl">
      <div className="flex items-center gap-2 text-sm text-cyan-300">
        <PackageSearch size={18} />
        OPs e produtos ativos do setor
      </div>

      <h2 className="mt-3 text-xl font-semibold text-white">{setor.setorNome}</h2>
      <p className="mt-2 text-sm text-slate-300">
        Operador <strong className="text-white">{operador.nome}</strong> pronto para escolher a
        demanda dentro deste setor.
      </p>
      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
        {demandas.length} OP/produto(s) com saldo neste setor
      </p>

      <div className="mt-5 space-y-3">
        {demandas.map((demanda) => {
          const demandaDisponivel =
            demanda.saldoRestante > 0 &&
            demanda.status !== 'concluida' &&
            demanda.status !== 'encerrada_manualmente'

          return (
            <button
              key={demanda.id}
              type="button"
              onClick={() => {
                if (!demandaDisponivel) {
                  return
                }

                void onSelecionarDemanda(demanda.id)
              }}
              disabled={!demandaDisponivel}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:border-white/20 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{demanda.numeroOp}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {demanda.produtoReferencia} · {demanda.produtoNome}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Setor {setor.setorNome}</p>
                </div>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusTema(demanda.status)}`}
                >
                  {demanda.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-xl bg-slate-900/60 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Planejado</p>
                  <p className="mt-1 font-semibold text-white">{demanda.quantidadePlanejada}</p>
                </div>
                <div className="rounded-xl bg-slate-900/60 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    Peças completas
                  </p>
                  <p className="mt-1 font-semibold text-white">{demanda.quantidadeConcluida}</p>
                </div>
                <div className="rounded-xl bg-slate-900/60 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Saldo</p>
                  <p className="mt-1 font-semibold text-white">{demanda.saldoRestante}</p>
                </div>
              </div>

              <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-cyan-200/80">
                Progresso operacional {demanda.progressoOperacionalPct.toFixed(0)}%
              </p>

              {demanda.etapaFluxoChave === 'frente' || demanda.etapaFluxoChave === 'costa' ? (
                <div className="mt-3 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-2 text-xs text-fuchsia-100">
                  <div className="flex items-start gap-2">
                    <GitBranch size={14} className="mt-0.5 shrink-0" />
                    <p>
                      Bifurcação oficial ativa: esta OP segue simultaneamente em Frente e Costa
                      após Preparação.
                    </p>
                  </div>
                </div>
              ) : null}

              {(demanda.quantidadeSincronizadaMontagem ?? 0) > 0 ||
              (demanda.quantidadeBloqueadaSincronizacao ?? 0) > 0 ? (
                <div className="mt-3 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
                  <div className="flex items-start gap-2">
                    <Link2 size={14} className="mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p>
                        Montagem sincronizada:{' '}
                        <strong>{demanda.quantidadeSincronizadaMontagem ?? 0}</strong>
                      </p>
                      <p>
                        Ainda bloqueada pela trilha irmã:{' '}
                        <strong>{demanda.quantidadeBloqueadaSincronizacao ?? 0}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-300">
                {demandaDisponivel ? 'Selecionar OP/produto' : 'Demanda sem saldo'}
                <ArrowRight size={16} />
              </div>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onTrocarOperador}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-3xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
      >
        <Boxes size={16} />
        Trocar operador
      </button>
    </section>
  )
}
