'use client'

import { AlertTriangle, ArrowRight, Factory, Timer, Users } from 'lucide-react'
import {
  construirColunasKanbanOperacional,
  type KanbanOperacionalColuna,
} from '@/lib/utils/kanban-operacional-turno'
import type {
  DiagnosticoCapacidadeSetorV2,
  PlanejamentoTurnoDashboardV2,
  TurnoSetorFilaStatusV2,
} from '@/types'

interface KanbanOperacionalTurnoProps {
  planejamento: PlanejamentoTurnoDashboardV2
  onSelecionarOp: (turnoOpId: string) => void
  onSelecionarSetor: (setorId: string) => void
}

function normalizarNumero(valor?: number | null): number {
  return Number.isFinite(valor) ? Number(valor) : 0
}

function formatarQuantidade(valor?: number | null): string {
  return normalizarNumero(valor).toLocaleString('pt-BR')
}

function formatarMinutos(valor?: number | null): string {
  return `${formatarQuantidade(valor)} min`
}

function formatarStatusFila(status: TurnoSetorFilaStatusV2): string {
  switch (status) {
    case 'liberada':
      return 'Liberada'
    case 'em_fila':
      return 'Em fila'
    case 'em_producao':
      return 'Em producao'
    case 'parcial':
      return 'Parcial'
    case 'concluida_setor':
      return 'Concluida no setor'
    default:
      return 'Sem fila'
  }
}

function formatarDiagnosticoCapacidade(status?: DiagnosticoCapacidadeSetorV2): string {
  switch (status) {
    case 'dentro_capacidade':
      return 'Dentro da capacidade'
    case 'no_limite':
      return 'No limite'
    case 'acima_capacidade':
      return 'Gargalo de capacidade'
    default:
      return 'Sem carga relevante'
  }
}

function corDiagnosticoCapacidade(status?: DiagnosticoCapacidadeSetorV2): string {
  switch (status) {
    case 'dentro_capacidade':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'no_limite':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    case 'acima_capacidade':
      return 'border-red-200 bg-red-50 text-red-700'
    default:
      return 'border-slate-200 bg-slate-100 text-slate-600'
  }
}

function corStatusFila(status: TurnoSetorFilaStatusV2): string {
  switch (status) {
    case 'liberada':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'em_fila':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    case 'em_producao':
      return 'border-blue-200 bg-blue-50 text-blue-700'
    case 'parcial':
      return 'border-indigo-200 bg-indigo-50 text-indigo-700'
    case 'concluida_setor':
      return 'border-slate-200 bg-slate-100 text-slate-600'
    default:
      return 'border-slate-200 bg-slate-100 text-slate-600'
  }
}

export function KanbanOperacionalTurno({
  planejamento,
  onSelecionarOp,
  onSelecionarSetor,
}: KanbanOperacionalTurnoProps) {
  const colunas: KanbanOperacionalColuna[] = construirColunasKanbanOperacional(planejamento)

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
            <Factory size={14} />
            Kanban operacional
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Fila setorial em tempo real do turno
            </h2>
            <p className="text-sm text-slate-600">
              Cada coluna representa o setor fisico atual da OP ou do saldo efetivamente liberado.
              O quadro evita duplicacao ficticia e evidencia fila, capacidade e gargalos.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Setores monitorados
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{colunas.length}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Itens aguardando
            </p>
            <p className="mt-2 text-2xl font-semibold text-amber-900">
              {colunas.reduce((soma, coluna) => soma + coluna.aguardandoLiberacao, 0)}
            </p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
              Gargalos ativos
            </p>
            <p className="mt-2 text-2xl font-semibold text-red-900">
              {
                colunas.filter(
                  (coluna) => coluna.setor.diagnosticoCapacidade === 'acima_capacidade'
                ).length
              }
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto pb-2">
        <div className="grid min-w-[84rem] grid-cols-1 gap-4 xl:grid-cols-5">
          {colunas.map((coluna) => {
            const capacidadeTotal = normalizarNumero(coluna.setor.capacidadeMinutosTotal)
            const capacidadeRestante = normalizarNumero(coluna.setor.capacidadeMinutosRestante)
            const larguraCapacidade =
              capacidadeTotal > 0
                ? Math.min((coluna.capacidadeComprometida / capacidadeTotal) * 100, 100)
                : 0

            return (
              <section
                key={coluna.setor.setorId}
                className="flex min-h-[30rem] flex-col rounded-3xl border border-slate-200 bg-slate-50/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Etapa {coluna.setor.setorCodigo ?? '-'}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-900">
                      {coluna.setor.setorNome}
                    </h3>
                  </div>

                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${corDiagnosticoCapacidade(
                      coluna.setor.diagnosticoCapacidade
                    )}`}
                  >
                    {formatarDiagnosticoCapacidade(coluna.setor.diagnosticoCapacidade)}
                  </span>
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Em quadro
                      </p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">
                        {coluna.demandasEmQuadro.length}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Fila ativa
                      </p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">
                        {coluna.demandasAtivas.length}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                    <div className="flex items-center justify-between gap-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                      <span>Capacidade do setor</span>
                      <span>{formatarMinutos(capacidadeTotal)}</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full ${
                          coluna.setor.diagnosticoCapacidade === 'acima_capacidade'
                            ? 'bg-red-500'
                            : coluna.setor.diagnosticoCapacidade === 'no_limite'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${larguraCapacidade}%` }}
                      />
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600">
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2">
                          <Timer size={14} />
                          Comprometida
                        </span>
                        <span className="font-semibold text-slate-900">
                          {formatarMinutos(coluna.capacidadeComprometida)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2">
                          <Users size={14} />
                          Restante
                        </span>
                        <span className="font-semibold text-slate-900">
                          {formatarMinutos(capacidadeRestante)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Operadores alocados</span>
                        <span className="font-semibold text-slate-900">
                          {formatarQuantidade(coluna.setor.operadoresAlocados)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {coluna.aguardandoLiberacao > 0 ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                        <p>
                          {coluna.aguardandoLiberacao} item(ns) aguardando liberacao do setor
                          anterior para entrar no quadro deste ponto do fluxo.
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex-1 space-y-3">
                  {coluna.demandasEmQuadro.length === 0 ? (
                    <div className="flex h-full min-h-[12rem] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/80 px-4 text-center text-sm text-slate-500">
                      Nenhum lote liberado ou em producao neste setor agora.
                    </div>
                  ) : (
                    coluna.demandasEmQuadro.map((demanda) => (
                      <button
                        key={demanda.id}
                        type="button"
                        onClick={() => onSelecionarOp(demanda.turnoOpId)}
                        className="w-full rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                              OP {demanda.numeroOp}
                            </p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">
                              {demanda.produtoReferencia} · {demanda.produtoNome}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${corStatusFila(
                                demanda.statusFila ?? 'sem_fila'
                              )}`}
                            >
                              {formatarStatusFila(demanda.statusFila ?? 'sem_fila')}
                            </span>
                            {demanda.posicaoFila ? (
                              <span className="text-xs font-semibold text-slate-500">
                                Fila #{demanda.posicaoFila}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-4">
                          <div className="rounded-2xl bg-slate-50 px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Backlog
                            </p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">
                              {formatarQuantidade(demanda.quantidadeBacklogSetor)}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-blue-50 px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                              Aceito
                            </p>
                            <p className="mt-1 text-lg font-semibold text-blue-900">
                              {formatarQuantidade(demanda.quantidadeAceitaTurno)}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-emerald-50 px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                              Concluido
                            </p>
                            <p className="mt-1 text-lg font-semibold text-emerald-900">
                              {formatarQuantidade(demanda.quantidadeConcluida)}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-amber-50 px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                              Excedente
                            </p>
                            <p className="mt-1 text-lg font-semibold text-amber-900">
                              {formatarQuantidade(demanda.quantidadeExcedenteTurno)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
                          <span>
                            Disponivel agora:{' '}
                            {formatarQuantidade(demanda.quantidadeDisponivelApontamento)}
                          </span>
                          <span className="inline-flex items-center gap-1 font-semibold text-blue-700">
                            Abrir OP
                            <ArrowRight size={14} />
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onSelecionarSetor(coluna.setor.setorId)}
                  className="mt-4 inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"
                >
                  Ver detalhes do setor
                </button>
              </section>
            )
          })}
        </div>
      </div>
    </section>
  )
}
