'use client'

import { ShieldCheck, UserCheck } from 'lucide-react'
import { montarRankingOperacoesQualidade } from '@/lib/utils/dashboard-qualidade'
import type {
  QualidadeIndicadoresTurnoV2,
  QualidadeResumoOpV2,
  QualidadeResumoTurnoV2,
} from '@/types'

interface DashboardQualidadeTabProps {
  resumoQualidade: QualidadeResumoTurnoV2 | null
  indicadoresQualidade: QualidadeIndicadoresTurnoV2 | null
  qualidadeResumoOps: QualidadeResumoOpV2[]
}

function formatarPercentual(valor: number | null): string {
  if (valor === null || Number.isNaN(valor)) {
    return 'sem dados'
  }

  return `${valor.toFixed(1)}%`
}

function formatarHorario(valor: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(valor))
}

export function DashboardQualidadeTab({
  resumoQualidade,
  indicadoresQualidade,
  qualidadeResumoOps,
}: DashboardQualidadeTabProps) {
  const rankingOperacoes = montarRankingOperacoesQualidade(qualidadeResumoOps).slice(0, 8)

  if (!indicadoresQualidade) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          <ShieldCheck size={14} />
          Qualidade
        </div>
        <h2 className="mt-4 text-xl font-semibold text-slate-900">
          Sem indicadores de qualidade
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          A aba passa a exibir pendências de revisão, reprovações e defeitos assim que houver
          dados da etapa Qualidade no turno selecionado.
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              <ShieldCheck size={14} />
              Qualidade contínua
            </div>
            <h2 className="mt-3 text-lg font-semibold text-slate-900">
              Indicadores da etapa Qualidade
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Peças reprovadas e ocorrências de defeito ficam separadas da leitura produtiva do
              turno.
            </p>
          </div>
        </div>
      </section>

      {resumoQualidade && resumoQualidade.quantidadeRevisadaTotal > 0 ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Peças revisadas
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {resumoQualidade.quantidadeRevisadaTotal}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {resumoQualidade.opsComRevisao} OPs com revisão
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
              Peças reprovadas
            </p>
            <p className="mt-2 text-3xl font-semibold text-amber-900">
              {resumoQualidade.quantidadeReprovadaTotal}
            </p>
            <p className="mt-1 text-xs font-medium text-amber-800">
              {resumoQualidade.opsComReprovacao} OPs com reprovação
            </p>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-rose-700">
              Taxa de reprovação
            </p>
            <p className="mt-2 text-3xl font-semibold text-rose-900">
              {resumoQualidade.percentualReprovacao?.toFixed(1) ?? '0.0'}%
            </p>
            <p className="mt-1 text-xs font-medium text-rose-800">
              Reprovadas sobre revisadas
            </p>
          </div>

          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-violet-700">
              Ocorrências de defeito
            </p>
            <p className="mt-2 text-3xl font-semibold text-violet-900">
              {resumoQualidade.totalDefeitos}
            </p>
            <p className="mt-1 text-xs font-medium text-violet-800">
              {resumoQualidade.percentualDefeitosOperacionais?.toFixed(1) ?? '0.0'}% da base
              revisada
            </p>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
              Fila pendente
            </p>
            <p className="mt-2 text-3xl font-semibold text-amber-900">
              {indicadoresQualidade.pendenciasRevisao}
            </p>
            <p className="mt-1 text-xs font-medium text-amber-800">
              {indicadoresQualidade.pecasPendentesRevisao} peça(s) aguardando
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Revisões realizadas
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {indicadoresQualidade.revisoesRealizadas}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">Histórico operacional</p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Taxa de aprovação
            </p>
            <p className="mt-2 text-3xl font-semibold text-emerald-900">
              {formatarPercentual(indicadoresQualidade.taxaAprovacao)}
            </p>
            <p className="mt-1 text-xs font-medium text-emerald-800">
              {indicadoresQualidade.quantidadeAprovadaTotal} aprovada(s)
            </p>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-rose-700">
              Peças reprovadas
            </p>
            <p className="mt-2 text-3xl font-semibold text-rose-900">
              {indicadoresQualidade.quantidadeRetrabalhoTotal}
            </p>
            <p className="mt-1 text-xs font-medium text-rose-800">
              {formatarPercentual(indicadoresQualidade.taxaReprovacao)} das revisadas
            </p>
          </div>

          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-violet-700">
              Ocorrências de defeito
            </p>
            <p className="mt-2 text-3xl font-semibold text-violet-900">
              {indicadoresQualidade.totalDefeitos}
            </p>
            <p className="mt-1 text-xs font-medium text-violet-800">Catálogo estruturado</p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
              Peças revisadas
            </p>
            <p className="mt-2 text-3xl font-semibold text-blue-900">
              {indicadoresQualidade.quantidadeRevisadaTotal}
            </p>
            <p className="mt-1 text-xs font-medium text-blue-800">
              Aprovadas + reprovadas
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Pendências de revisão</h3>
            <div className="mt-3 space-y-2">
              {indicadoresQualidade.pendenciasRevisaoLista.slice(0, 5).map((pendencia) => (
                <article key={pendencia.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{pendencia.numeroOp}</p>
                      <p className="text-xs text-slate-600">
                        {pendencia.produtoReferencia} · {pendencia.produtoNome}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                      {pendencia.quantidadePendente}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {formatarHorario(pendencia.criadoEm)}
                    {pendencia.operadorNome ? ` · ${pendencia.operadorNome}` : ''}
                  </p>
                </article>
              ))}

              {indicadoresQualidade.pendenciasRevisaoLista.length === 0 ? (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  Nenhuma pendência aguardando revisão.
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Ranking de defeitos</h3>
            <div className="mt-3 space-y-2">
              {indicadoresQualidade.rankingDefeitos.slice(0, 5).map((defeito) => (
                <div
                  key={defeito.qualidadeDefeitoId ?? defeito.defeitoNome}
                  className="rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{defeito.defeitoNome}</p>
                    <p className="text-sm font-semibold text-violet-700">
                      {defeito.quantidadeDefeitos}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatarPercentual(defeito.percentualDefeitos)} dos defeitos
                  </p>
                </div>
              ))}

              {indicadoresQualidade.rankingDefeitos.length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                  Nenhum defeito catalogado no turno.
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2">
              <UserCheck size={16} className="text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-900">Revisores</h3>
            </div>
            <div className="mt-3 space-y-2">
              {indicadoresQualidade.rankingRevisores.slice(0, 5).map((revisor) => (
                <div
                  key={revisor.revisorId}
                  className="rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {revisor.revisorNome}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {revisor.revisoesRealizadas} revisão(ões)
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-emerald-700">
                      {revisor.quantidadeAprovada}
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {revisor.quantidadeReprovada} reprovada(s) · {revisor.quantidadeDefeitos}{' '}
                    ocorrência(s) de defeito
                  </p>
                </div>
              ))}

              {indicadoresQualidade.rankingRevisores.length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                  Nenhum revisor com revisão registrada no turno.
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Ranking por operação</h3>
            <div className="mt-3 space-y-2">
              {rankingOperacoes.slice(0, 5).map((operacao) => (
                <div
                  key={operacao.turnoSetorOperacaoIdOrigem}
                  className="rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {operacao.operacaoCodigoOrigem}
                      </p>
                      <p className="text-xs text-slate-600">
                        {operacao.operacaoDescricaoOrigem}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-violet-700">
                      {operacao.quantidadeDefeitos}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {operacao.setorNomeOrigem}
                  </p>
                </div>
              ))}

              {rankingOperacoes.length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                  Nenhuma operação com defeito catalogado.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {indicadoresQualidade.ops.length > 0 ? (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
            <div className="grid min-w-[860px] grid-cols-[1.2fr_repeat(6,minmax(86px,1fr))] gap-px bg-slate-200 text-sm">
              <div className="bg-slate-50 px-3 py-2 font-semibold text-slate-700">OP</div>
              <div className="bg-slate-50 px-3 py-2 font-semibold text-slate-700">Fila</div>
              <div className="bg-slate-50 px-3 py-2 font-semibold text-slate-700">Revisadas</div>
              <div className="bg-slate-50 px-3 py-2 font-semibold text-slate-700">Aprovadas</div>
              <div className="bg-slate-50 px-3 py-2 font-semibold text-slate-700">Reprovadas</div>
              <div className="bg-slate-50 px-3 py-2 font-semibold text-slate-700">Defeitos</div>
              <div className="bg-slate-50 px-3 py-2 font-semibold text-slate-700">Aprovação</div>
              {indicadoresQualidade.ops.slice(0, 8).map((op) => (
                <div key={op.turnoOpId} className="contents">
                  <div className="bg-white px-3 py-2">
                    <p className="font-semibold text-slate-900">{op.numeroOp}</p>
                    <p className="text-xs text-slate-500">{op.produtoReferencia}</p>
                  </div>
                  <div className="bg-white px-3 py-2 text-slate-700">
                    {op.pecasPendentesRevisao}
                  </div>
                  <div className="bg-white px-3 py-2 text-slate-700">
                    {op.quantidadeRevisada}
                  </div>
                  <div className="bg-white px-3 py-2 text-slate-700">
                    {op.quantidadeAprovada}
                  </div>
                  <div className="bg-white px-3 py-2 text-slate-700">
                    {op.quantidadeReprovada}
                  </div>
                  <div className="bg-white px-3 py-2 text-slate-700">{op.totalDefeitos}</div>
                  <div className="bg-white px-3 py-2 text-slate-700">
                    {formatarPercentual(op.taxaAprovacao)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </section>
  )
}
