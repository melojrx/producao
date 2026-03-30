'use client'

import { useMemo, useState } from 'react'
import {
  Activity,
  CheckCircle2,
  ClipboardList,
  Layers3,
  Package,
  X,
} from 'lucide-react'
import { ModalDetalhesSecaoTurno } from '@/components/dashboard/ModalDetalhesSecaoTurno'
import type {
  MaquinaListItem,
  ProdutoListItem,
  TurnoOpStatusV2,
  TurnoOpV2,
  TurnoOperadorV2,
  TurnoSetorOperacaoApontamentoV2,
  TurnoSetorOpStatusV2,
  TurnoSetorOpV2,
} from '@/types'

interface SecaoDetalheOp extends TurnoSetorOpV2 {
  produtoNome: string
  produtoReferencia: string
  numeroOp: string
}

interface ModalDetalhesOpTurnoProps {
  op: TurnoOpV2
  secoes: SecaoDetalheOp[]
  iniciadoEmTurno: string
  produtosCatalogo: ProdutoListItem[]
  maquinas: MaquinaListItem[]
  operadoresTurno: TurnoOperadorV2[]
  operacoesSecao: TurnoSetorOperacaoApontamentoV2[]
  aoFechar: () => void
}

function formatarDataHora(valor: string | null): string {
  if (!valor) {
    return '—'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Fortaleza',
  }).format(new Date(valor))
}

function calcularPercentual(realizado: number, planejado: number): number {
  if (planejado <= 0) {
    return 0
  }

  return Math.min((realizado / planejado) * 100, 100)
}

function obterTemaStatus(status: TurnoOpStatusV2 | TurnoSetorOpStatusV2): string {
  if (status === 'concluida') {
    return 'bg-emerald-100 text-emerald-700'
  }

  if (status === 'em_andamento' || status === 'aberta') {
    return 'bg-blue-100 text-blue-700'
  }

  if (status === 'encerrada_manualmente') {
    return 'bg-amber-100 text-amber-700'
  }

  return 'bg-slate-100 text-slate-700'
}

export function ModalDetalhesOpTurno({
  op,
  secoes,
  iniciadoEmTurno,
  produtosCatalogo,
  maquinas,
  operadoresTurno,
  operacoesSecao,
  aoFechar,
}: ModalDetalhesOpTurnoProps) {
  const [secaoSelecionadaId, setSecaoSelecionadaId] = useState<string | null>(null)
  const secoesConcluidas = secoes.filter((secao) => secao.status === 'concluida').length
  const secoesPendentes = secoes.length - secoesConcluidas
  const saldoRestante = Math.max(op.quantidadePlanejada - op.quantidadeRealizada, 0)
  const progresso = calcularPercentual(op.quantidadeRealizada, op.quantidadePlanejada)
  const secaoSelecionada = useMemo(
    () => secoes.find((secao) => secao.id === secaoSelecionadaId) ?? null,
    [secaoSelecionadaId, secoes]
  )
  const produtoDetalhado = useMemo(
    () => produtosCatalogo.find((produto) => produto.id === op.produtoId) ?? null,
    [op.produtoId, produtosCatalogo]
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes da OP ${op.numeroOp}`}
    >
      <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              <Package size={14} />
              Detalhe operacional da OP
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-semibold text-slate-900">{op.numeroOp}</h2>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${obterTemaStatus(op.status)}`}
                >
                  {op.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {op.produtoNome} ({op.produtoReferencia})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar modal de detalhes da OP"
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-6 p-6">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Produto
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{op.produtoNome}</p>
                <p className="text-sm text-slate-600">{op.produtoReferencia}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Turno iniciado em
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {formatarDataHora(iniciadoEmTurno)}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  OP iniciada em
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {formatarDataHora(op.iniciadoEm)}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  OP encerrada em
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {formatarDataHora(op.encerradoEm)}
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Planejado
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">
                    {op.quantidadePlanejada}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                  <ClipboardList size={18} />
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                    Realizado
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-emerald-900">
                    {op.quantidadeRealizada}
                  </p>
                </div>
                <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                  <CheckCircle2 size={18} />
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                    Saldo restante
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-amber-900">{saldoRestante}</p>
                </div>
                <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                  <Activity size={18} />
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
                    Progresso
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-blue-900">
                    {progresso.toFixed(0)}%
                  </p>
                </div>
                <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
                  <Package size={18} />
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-violet-700">
                    Seções concluídas
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-violet-900">
                    {secoesConcluidas}/{secoes.length}
                  </p>
                  <p className="mt-1 text-xs font-medium text-violet-800">
                    {secoesPendentes} pendentes
                  </p>
                </div>
                <div className="rounded-2xl bg-violet-100 p-3 text-violet-700">
                  <Layers3 size={18} />
                </div>
              </div>
            </article>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-900">Seções da OP</h3>
              <p className="text-sm text-slate-600">
                Acompanhamento por setor para evitar supercontagem e localizar exatamente onde a OP
                ainda está pendente.
              </p>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {secoes.map((secao) => {
                const operacoesDaSecao = operacoesSecao.filter(
                  (operacao) => operacao.turnoSetorOpId === secao.id
                )
                const progressoSecao = calcularPercentual(
                  secao.quantidadeRealizada,
                  secao.quantidadePlanejada
                )
                const saldoSecao = Math.max(
                  secao.quantidadePlanejada - secao.quantidadeRealizada,
                  0
                )

                return (
                  <button
                    key={secao.id}
                    type="button"
                    onClick={() => setSecaoSelecionadaId(secao.id)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{secao.setorNome}</p>
                        <p className="text-sm text-slate-600">
                          {secao.produtoNome} ({secao.produtoReferencia})
                        </p>
                      </div>

                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${obterTemaStatus(secao.status)}`}
                      >
                        {secao.status}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                          Planejado
                        </p>
                        <p className="mt-2 text-xl font-semibold text-slate-900">
                          {secao.quantidadePlanejada}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                          Realizado
                        </p>
                        <p className="mt-2 text-xl font-semibold text-slate-900">
                          {secao.quantidadeRealizada}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                          Saldo
                        </p>
                        <p className="mt-2 text-xl font-semibold text-slate-900">{saldoSecao}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                      <span>QR {secao.qrCodeToken.slice(0, 10)}...</span>
                      <span>
                        {operacoesDaSecao.length} operação(ões) · {progressoSecao.toFixed(0)}%
                      </span>
                    </div>

                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all"
                        style={{ width: `${progressoSecao}%` }}
                      />
                    </div>
                    <div className="mt-3 flex justify-end">
                      <span className="text-xs font-medium uppercase tracking-wide text-blue-700">
                        Ver detalhe do setor
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      </div>

      {secaoSelecionada ? (
        <ModalDetalhesSecaoTurno
          secao={secaoSelecionada}
          produto={produtoDetalhado}
          maquinas={maquinas}
          operadoresTurno={operadoresTurno}
          operacoesSecao={operacoesSecao.filter(
            (operacao) => operacao.turnoSetorOpId === secaoSelecionada.id
          )}
          aoFechar={() => setSecaoSelecionadaId(null)}
        />
      ) : null}
    </div>
  )
}
