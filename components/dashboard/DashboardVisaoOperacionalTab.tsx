'use client'

import { Activity, Boxes, ClipboardList, PackageCheck, ShieldCheck, Target, Users } from 'lucide-react'
import { CardKPI } from '@/components/dashboard/CardKPI'
import { GraficoMetaGrupoTurnoV2 } from '@/components/dashboard/GraficoMetaGrupoTurnoV2'
import { KanbanOperacionalTurno } from '@/components/dashboard/KanbanOperacionalTurno'
import type {
  ComparativoMetaGrupoHoraItem,
  QualidadeIndicadoresTurnoV2,
  PlanejamentoTurnoDashboardV2,
  QualidadeResumoTurnoV2,
  TurnoOpV2,
} from '@/types'
import type {
  TurnoOpResumoDashboardItem,
  TurnoSetorDashboardItem,
} from '@/lib/utils/turno-setores'

interface ResumoVisaoOperacionalDashboard {
  opsEmAndamento: number
  quantidadeBacklogTotal: number
  quantidadeAceitaTurno: number
  quantidadeDisponivelAgora: number
  quantidadeExcedenteTurno: number
  totalPlanejado: number
  totalRealizado: number
  progressoOperacionalTurnoPct: number
  operadoresDisponiveis: number
  operadoresAlocadosFormais: number
  operadoresComAtividade: number
  operadoresSugeridosCapacidade: number
  operadoresEnvolvidos: number
  totalOps: number
  opsConcluidas: number
  progressoOpsPct: number
  setoresAtivosCount: number
  setoresConcluidosCount: number
  progressoSetoresPct: number
  ops: TurnoOpV2[]
  opsAbertasLista: TurnoOpResumoDashboardItem[]
  setoresCardsLista: TurnoSetorDashboardItem[]
  setoresPendentesLista: TurnoSetorDashboardItem[]
  setoresConcluidosLista: TurnoSetorDashboardItem[]
}

interface DashboardVisaoOperacionalTabProps {
  planejamento: PlanejamentoTurnoDashboardV2
  turnoAberto: boolean
  metaGrupo: number
  mediaTpProduto: number
  resumo: ResumoVisaoOperacionalDashboard
  erroMetaGrupo?: string | null
  comparativoPorHora: ComparativoMetaGrupoHoraItem[]
  estaCarregandoGrafico: boolean
  resumoQualidade: QualidadeResumoTurnoV2 | null
  indicadoresQualidade: QualidadeIndicadoresTurnoV2 | null
  onSelecionarOp: (turnoOpId: string) => void
  onSelecionarSetor: (setorId: string) => void
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

export function DashboardVisaoOperacionalTab({
  planejamento,
  turnoAberto,
  metaGrupo,
  mediaTpProduto,
  resumo,
  erroMetaGrupo,
  comparativoPorHora,
  estaCarregandoGrafico,
  resumoQualidade,
  indicadoresQualidade,
  onSelecionarOp,
  onSelecionarSetor,
}: DashboardVisaoOperacionalTabProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <CardKPI
          titulo="Capacidade Produtiva"
          valor={metaGrupo}
          desabilitado={!turnoAberto}
          motivoDesabilitado="Indisponível sem turno aberto. Este KPI é recalculado na abertura do próximo turno."
          descricao={
            mediaTpProduto > 0
              ? `Meta coletiva do turno pela média simples dos T.Ps dos produtos planejados. T.P médio ${mediaTpProduto.toFixed(2)} min.`
              : 'Meta coletiva do turno baseada na média simples dos T.Ps dos produtos planejados.'
          }
          icone={Target}
          destaque="blue"
        />
        <CardKPI
          titulo="Peças da OP"
          valor={resumo.quantidadeBacklogTotal}
          descricao="Fila real ainda presente nos setores do turno, incluindo o que já estava pendente e o que entrou pelo fluxo durante o dia."
          icone={ClipboardList}
          destaque="slate"
        />
        <CardKPI
          titulo="Capacidade"
          valor={resumo.quantidadeAceitaTurno}
          descricao="Teto visual do dia em peças completas, derivado da capacidade global do turno e redistribuído operacionalmente pelos setores."
          icone={PackageCheck}
          destaque="blue"
        />
        <CardKPI
          titulo="Disponível"
          valor={resumo.quantidadeDisponivelAgora}
          descricao="Parcela que está liberada para execução imediata neste momento, já respeitando a prioridade operacional do setor."
          icone={Activity}
          destaque="blue"
        />
        <CardKPI
          titulo="Peças completas"
          valor={resumo.totalRealizado}
          descricao="Quantidade concluida do turno na leitura administrativa de produtos completos, separada do backlog setorial."
          icone={Boxes}
          destaque="emerald"
        />
        <CardKPI
          titulo="Saldo"
          valor={resumo.quantidadeExcedenteTurno}
          descricao="Saldo que nao coube na capacidade do dia e precisa seguir como backlog real para os proximos turnos."
          icone={Boxes}
          destaque="amber"
        />
      </div>

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
              Reprovação
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
              Defeitos operacionais
            </p>
            <p className="mt-2 text-3xl font-semibold text-violet-900">
              {resumoQualidade.totalDefeitos}
            </p>
            <p className="mt-1 text-xs font-medium text-violet-800">
              {resumoQualidade.percentualDefeitosOperacionais?.toFixed(1) ?? '0.0'}% da base revisada
            </p>
          </div>
        </section>
      ) : null}

      {indicadoresQualidade ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                <ShieldCheck size={14} />
                Qualidade contínua
              </div>
              <h2 className="mt-3 text-lg font-semibold text-slate-900">
                Indicadores de revisão por lote
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Fila, aprovação, retrabalho e defeitos sem alterar os KPIs produtivos do turno.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                Fila pendente
              </p>
              <p className="mt-2 text-3xl font-semibold text-amber-900">
                {indicadoresQualidade.lotesPendentes}
              </p>
              <p className="mt-1 text-xs font-medium text-amber-800">
                {indicadoresQualidade.pecasPendentes} peça(s) aguardando
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Lotes revisados
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {indicadoresQualidade.lotesRevisados}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Histórico vinculado a lotes
              </p>
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
                Retrabalho
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
                Defeitos
              </p>
              <p className="mt-2 text-3xl font-semibold text-violet-900">
                {indicadoresQualidade.totalDefeitos}
              </p>
              <p className="mt-1 text-xs font-medium text-violet-800">
                Catálogo estruturado
              </p>
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

          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Fila por lote</h3>
              <div className="mt-3 space-y-2">
                {indicadoresQualidade.lotesPendentesLista.slice(0, 5).map((lote) => (
                  <article key={lote.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{lote.numeroOp}</p>
                        <p className="text-xs text-slate-600">
                          {lote.produtoReferencia} · {lote.produtoNome}
                        </p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                        {lote.quantidadeLote}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {formatarHorario(lote.criadoEm)}
                      {lote.operadorNome ? ` · ${lote.operadorNome}` : ''}
                    </p>
                  </article>
                ))}

                {indicadoresQualidade.lotesPendentesLista.length === 0 ? (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    Nenhum lote aguardando revisão.
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
                <Users size={16} className="text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-900">Ranking de operadores</h3>
              </div>
              <div className="mt-3 space-y-2">
                {indicadoresQualidade.rankingOperadores.slice(0, 5).map((operador) => (
                  <div
                    key={operador.operadorId}
                    className="rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">
                        {operador.operadorNome}
                      </p>
                      <p className="text-sm font-semibold text-rose-700">
                        {operador.quantidadeReprovada}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {operador.quantidadeDefeitos} defeito(s) catalogados
                    </p>
                  </div>
                ))}

                {indicadoresQualidade.rankingOperadores.length === 0 ? (
                  <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                    Nenhum operador com reprovação vinculada a lote.
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {indicadoresQualidade.ops.length > 0 ? (
            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
              <div className="grid min-w-[760px] grid-cols-[1.2fr_repeat(5,minmax(86px,1fr))] gap-px bg-slate-200 text-sm">
                <div className="bg-slate-50 px-3 py-2 font-semibold text-slate-700">OP</div>
                <div className="bg-slate-50 px-3 py-2 font-semibold text-slate-700">Fila</div>
                <div className="bg-slate-50 px-3 py-2 font-semibold text-slate-700">Revisadas</div>
                <div className="bg-slate-50 px-3 py-2 font-semibold text-slate-700">Aprovadas</div>
                <div className="bg-slate-50 px-3 py-2 font-semibold text-slate-700">Retrabalho</div>
                <div className="bg-slate-50 px-3 py-2 font-semibold text-slate-700">Aprovação</div>
                {indicadoresQualidade.ops.slice(0, 8).map((op) => (
                  <div key={op.turnoOpId} className="contents">
                    <div className="bg-white px-3 py-2">
                      <p className="font-semibold text-slate-900">{op.numeroOp}</p>
                      <p className="text-xs text-slate-500">{op.produtoReferencia}</p>
                    </div>
                    <div className="bg-white px-3 py-2 text-slate-700">{op.pecasPendentes}</div>
                    <div className="bg-white px-3 py-2 text-slate-700">
                      {op.quantidadeRevisada}
                    </div>
                    <div className="bg-white px-3 py-2 text-slate-700">
                      {op.quantidadeAprovada}
                    </div>
                    <div className="bg-white px-3 py-2 text-slate-700">
                      {op.quantidadeReprovada}
                    </div>
                    <div className="bg-white px-3 py-2 text-slate-700">
                      {formatarPercentual(op.taxaAprovacao)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {turnoAberto ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Operadores disponíveis
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {resumo.operadoresDisponiveis}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Alocação formal
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {resumo.operadoresAlocadosFormais}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">Vínculo nominal no turno</p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Atividade real
            </p>
            <p className="mt-2 text-3xl font-semibold text-emerald-900">
              {resumo.operadoresComAtividade}
            </p>
            <p className="mt-1 text-xs font-medium text-emerald-800">
              Operadores com registro no setor
            </p>
          </div>

          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-violet-700">
              Sugestão setorial
            </p>
            <p className="mt-2 text-3xl font-semibold text-violet-900">
              {resumo.operadoresSugeridosCapacidade}
            </p>
            <p className="mt-1 text-xs font-medium text-violet-800">
              Pessoas sugeridas pela capacidade
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Envolvidos no turno
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {resumo.operadoresEnvolvidos}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              União de alocação formal e atividade real
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">OPs</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{resumo.totalOps}</p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
              OPs em andamento
            </p>
            <p className="mt-2 text-3xl font-semibold text-blue-900">{resumo.opsEmAndamento}</p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              OPs concluídas
            </p>
            <p className="mt-2 text-3xl font-semibold text-emerald-900">{resumo.opsConcluidas}</p>
            <p className="mt-1 text-xs font-medium text-emerald-800">
              {resumo.progressoOpsPct}% do turno
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Setores ativos
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {resumo.setoresAtivosCount}
            </p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
              Setores concluídos
            </p>
            <p className="mt-2 text-3xl font-semibold text-blue-900">
              {resumo.setoresConcluidosCount}
            </p>
            <p className="mt-1 text-xs font-medium text-blue-800">
              {resumo.progressoSetoresPct}% do turno
            </p>
          </div>
        </section>
      ) : null}

      {erroMetaGrupo ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erroMetaGrupo}
        </section>
      ) : null}

      <KanbanOperacionalTurno
        planejamento={planejamento}
        onSelecionarOp={onSelecionarOp}
        onSelecionarSetor={onSelecionarSetor}
      />

      <GraficoMetaGrupoTurnoV2
        dados={comparativoPorHora}
        estaCarregando={estaCarregandoGrafico}
        desabilitado={!turnoAberto}
        motivoDesabilitado="O gráfico horário de capacidade é dinâmico e volta a ser recalculado quando um novo turno for aberto."
      />

    </>
  )
}
