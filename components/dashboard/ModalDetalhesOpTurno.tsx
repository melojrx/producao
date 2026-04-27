'use client'

import { useMemo, useState } from 'react'
import {
  Activity,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Layers3,
  Package,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react'
import { ModalDetalhesSecaoTurno } from '@/components/dashboard/ModalDetalhesSecaoTurno'
import type { TurnoOpResumoDashboardItem } from '@/lib/utils/turno-setores'
import type {
  ProdutoListItem,
  QualidadeResumoOpV2,
  TurnoOperadorAtividadeSetorV2,
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
  quantidadeBacklogTotal: number
  quantidadeAceitaTurno: number
  quantidadeExcedenteTurno: number
  quantidadeDisponivelApontamento: number
}

interface ModalDetalhesOpTurnoProps {
  op: TurnoOpV2
  opResumo: TurnoOpResumoDashboardItem | null
  secoes: SecaoDetalheOp[]
  qualidadeResumo: QualidadeResumoOpV2 | null
  iniciadoEmTurno: string
  produtosCatalogo: ProdutoListItem[]
  operadoresTurno: TurnoOperadorV2[]
  operadoresAtividadeSetor: TurnoOperadorAtividadeSetorV2[]
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

function formatarPercentual(valor: number | null): string {
  if (valor === null || Number.isNaN(valor)) {
    return 'sem dados'
  }

  return `${valor.toFixed(1)}%`
}

export function ModalDetalhesOpTurno({
  op,
  opResumo,
  secoes,
  qualidadeResumo,
  iniciadoEmTurno,
  produtosCatalogo,
  operadoresTurno,
  operadoresAtividadeSetor,
  operacoesSecao,
  aoFechar,
}: ModalDetalhesOpTurnoProps) {
  const [secaoSelecionadaId, setSecaoSelecionadaId] = useState<string | null>(null)
  const hrefApontamentos = `/admin/apontamentos?aba=operacao_turno&turnoOpId=${encodeURIComponent(
    op.id
  )}`
  const secoesConcluidas = secoes.filter((secao) => secao.status === 'concluida').length
  const secoesPendentes = secoes.length - secoesConcluidas
  const progresso = op.progressoOperacionalPct
  const quantidadeDisponivelAgora = secoes.reduce(
    (soma, secao) => soma + secao.quantidadeDisponivelApontamento,
    0
  )
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
              <div className="mt-3">
                <a
                  href={hrefApontamentos}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  Ir para apontamentos
                  <ExternalLink size={14} />
                </a>
              </div>
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

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Backlog vivo
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">
                    {opResumo?.quantidadeBacklogTotal ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                  <ClipboardList size={18} />
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
                    Plano do dia
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-blue-900">
                    {opResumo?.quantidadeAceitaTurno ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
                  <Package size={18} />
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-cyan-700">
                    Disponível agora
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-cyan-900">
                    {quantidadeDisponivelAgora}
                  </p>
                </div>
                <div className="rounded-2xl bg-cyan-100 p-3 text-cyan-700">
                  <Activity size={18} />
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                    Peças completas
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-emerald-900">
                    {op.quantidadeConcluida}
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
                    Excedente
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-amber-900">
                    {opResumo?.quantidadeExcedenteTurno ?? 0}
                  </p>
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
                    Progresso operacional
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-blue-900">
                    {progresso.toFixed(0)}%
                  </p>
                  <p className="mt-1 text-xs font-medium text-blue-800">
                    {op.cargaRealizadaTp.toFixed(2)} / {op.cargaPlanejadaTp.toFixed(2)} min
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
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-slate-900">Qualidade da OP</h3>
                <p className="text-sm text-slate-600">
                  Leitura administrativa da revisão sem distorcer o andamento produtivo.
                </p>
              </div>
              {qualidadeResumo ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                  <ShieldAlert size={14} />
                  {qualidadeResumo.operacoesComDefeito.length} operação(ões) com defeito
                </span>
              ) : null}
            </div>

            {qualidadeResumo ? (
              <div className="mt-5 space-y-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Peças revisadas
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">
                      {qualidadeResumo.quantidadeRevisada}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {qualidadeResumo.quantidadeAprovada} aprovadas
                    </p>
                  </article>

                  <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                      Peças reprovadas
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-amber-900">
                      {qualidadeResumo.quantidadeReprovada}
                    </p>
                    <p className="mt-1 text-xs font-medium text-amber-800">
                      {formatarPercentual(qualidadeResumo.percentualReprovacao)}
                    </p>
                  </article>

                  <article className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-violet-700">
                      Total de defeitos
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-violet-900">
                      {qualidadeResumo.totalDefeitos}
                    </p>
                    <p className="mt-1 text-xs font-medium text-violet-800">
                      {qualidadeResumo.operacoesProdutivasCount} operações produtivas na base
                    </p>
                  </article>

                  <article className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-rose-700">
                      Intensidade de defeitos
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-rose-900">
                      {formatarPercentual(qualidadeResumo.percentualDefeitosOp)}
                    </p>
                    <p className="mt-1 text-xs font-medium text-rose-800">
                      {qualidadeResumo.oportunidadesRevisadas} oportunidades revisadas
                    </p>
                  </article>
                </div>

                {qualidadeResumo.operacoesComDefeito.length > 0 ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">
                        Operações com defeito
                      </h4>
                      <p className="mt-1 text-sm text-slate-600">
                        Cada linha mostra a origem do defeito e os operadores envolvidos quando há
                        rastreio nos apontamentos produtivos.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {qualidadeResumo.operacoesComDefeito.map((operacao) => (
                        <article
                          key={operacao.turnoSetorOperacaoIdOrigem}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {operacao.operacaoCodigoOrigem} · {operacao.operacaoDescricaoOrigem}
                              </p>
                              <p className="mt-1 text-sm text-slate-600">
                                {operacao.setorNomeOrigem}
                              </p>
                            </div>

                            <div className="grid min-w-[220px] gap-2 sm:grid-cols-2">
                              <div className="rounded-xl border border-violet-200 bg-white p-3">
                                <p className="text-[11px] font-medium uppercase tracking-wide text-violet-700">
                                  Defeitos
                                </p>
                                <p className="mt-2 text-xl font-semibold text-violet-900">
                                  {operacao.quantidadeDefeitos}
                                </p>
                              </div>

                              <div className="rounded-xl border border-rose-200 bg-white p-3">
                                <p className="text-[11px] font-medium uppercase tracking-wide text-rose-700">
                                  Índice da operação
                                </p>
                                <p className="mt-2 text-xl font-semibold text-rose-900">
                                  {formatarPercentual(operacao.percentualDefeitosOperacao)}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                              <Users size={14} />
                              Operadores envolvidos
                            </div>

                            {operacao.possuiApontamentos ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {operacao.operadoresEnvolvidos.map((operador) => (
                                  <span
                                    key={operador.operadorId}
                                    className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                                  >
                                    {operador.nome} ({operador.quantidadeApontada})
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-3 text-sm text-slate-600">
                                Sem apontamentos individuais rastreados nesta operação.
                              </p>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    Revisões registradas sem defeitos operacionais apontados até o momento.
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                Nenhuma revisão de qualidade foi lançada para esta OP até o momento.
              </div>
            )}
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
                const progressoSecao = secao.progressoOperacionalPct

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

                    <div className="mt-4 grid gap-3 sm:grid-cols-4">
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                          Backlog vivo
                        </p>
                        <p className="mt-2 text-xl font-semibold text-slate-900">
                          {secao.quantidadeBacklogTotal}
                        </p>
                      </div>

                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-blue-700">
                          Plano do dia
                          </p>
                        <p className="mt-2 text-xl font-semibold text-blue-900">
                          {secao.quantidadeAceitaTurno}
                        </p>
                      </div>

                      <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-cyan-700">
                          Disponível agora
                        </p>
                        <p className="mt-2 text-xl font-semibold text-cyan-900">
                          {secao.quantidadeDisponivelApontamento}
                        </p>
                      </div>

                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">
                          Concluido
                        </p>
                        <p className="mt-2 text-xl font-semibold text-emerald-900">
                          {secao.quantidadeConcluida}
                        </p>
                      </div>

                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-amber-700">
                          Excedente
                        </p>
                        <p className="mt-2 text-xl font-semibold text-amber-900">
                          {secao.quantidadeExcedenteTurno}
                        </p>
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
          operadoresTurno={operadoresTurno}
          operadoresAtividadeSetor={operadoresAtividadeSetor}
          operacoesSecao={operacoesSecao.filter(
            (operacao) => operacao.turnoSetorOpId === secaoSelecionada.id
          )}
          aoFechar={() => setSecaoSelecionadaId(null)}
        />
      ) : null}
    </div>
  )
}
