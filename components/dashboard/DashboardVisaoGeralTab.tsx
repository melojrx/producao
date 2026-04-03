'use client'

import { Activity, Boxes, ClipboardList, PackageCheck, Target } from 'lucide-react'
import { CardKPI } from '@/components/dashboard/CardKPI'
import { GraficoMetaGrupoTurnoV2 } from '@/components/dashboard/GraficoMetaGrupoTurnoV2'
import type { ComparativoMetaGrupoHoraItem, TurnoOpV2 } from '@/types'
import type { TurnoSetorDashboardItem } from '@/lib/utils/turno-setores'

interface ResumoVisaoGeralDashboard {
  opsEmAndamento: number
  totalPlanejado: number
  totalRealizado: number
  progressoOperacionalTurnoPct: number
  operadoresDisponiveis: number
  operadoresAlocados: number
  totalOps: number
  opsConcluidas: number
  progressoOpsPct: number
  setoresAtivosCount: number
  setoresConcluidosCount: number
  progressoSetoresPct: number
  ops: TurnoOpV2[]
  setoresPendentesLista: TurnoSetorDashboardItem[]
  setoresConcluidosLista: TurnoSetorDashboardItem[]
}

interface DashboardVisaoGeralTabProps {
  turnoAberto: boolean
  metaGrupo: number
  mediaTpProduto: number
  resumo: ResumoVisaoGeralDashboard
  erroMetaGrupo?: string | null
  comparativoPorHora: ComparativoMetaGrupoHoraItem[]
  estaCarregandoGrafico: boolean
  onSelecionarOp: (turnoOpId: string) => void
}

function corStatus(status: string): string {
  if (status === 'concluida' || status === 'encerrado') {
    return 'bg-emerald-100 text-emerald-700'
  }

  if (status === 'em_andamento' || status === 'aberta' || status === 'aberto') {
    return 'bg-blue-100 text-blue-700'
  }

  if (status === 'encerrada_manualmente') {
    return 'bg-amber-100 text-amber-700'
  }

  return 'bg-slate-100 text-slate-700'
}

export function DashboardVisaoGeralTab({
  turnoAberto,
  metaGrupo,
  mediaTpProduto,
  resumo,
  erroMetaGrupo,
  comparativoPorHora,
  estaCarregandoGrafico,
  onSelecionarOp,
}: DashboardVisaoGeralTabProps) {
  return (
    <>
      {turnoAberto ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
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
              Operadores alocados
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {resumo.operadoresAlocados}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">OPs</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{resumo.totalOps}</p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              OPs concluídas
            </p>
            <p className="mt-2 text-3xl font-semibold text-emerald-900">{resumo.opsConcluidas}</p>
            <p className="mt-1 text-xs font-medium text-emerald-800">{resumo.progressoOpsPct}% do turno</p>
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
          titulo="OPs em andamento"
          valor={resumo.opsEmAndamento}
          desabilitado={!turnoAberto}
          motivoDesabilitado="Indisponível sem turno aberto. As OPs em andamento só fazem sentido no acompanhamento operacional corrente."
          descricao="Quantidade de OPs já iniciadas, mas ainda não concluídas no turno carregado."
          icone={Activity}
          destaque="blue"
        />
        <CardKPI
          titulo="Planejado"
          valor={resumo.totalPlanejado}
          descricao="Soma planejada das OPs do turno, sem supercontar o mesmo produto por setor."
          icone={ClipboardList}
          destaque="slate"
        />
        <CardKPI
          titulo="Peças completas"
          valor={resumo.totalRealizado}
          descricao="Quantidade concluída do turno, preservando a leitura de peças completas separada do progresso operacional."
          icone={PackageCheck}
          destaque="emerald"
        />
        <CardKPI
          titulo="Progresso do turno"
          valor={resumo.progressoOperacionalTurnoPct}
          descricao="Avanço operacional ponderado por T.P. das operações, sem depender apenas das peças completas."
          icone={Boxes}
          destaque="amber"
        />
      </div>

      {erroMetaGrupo ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erroMetaGrupo}
        </section>
      ) : null}

      <GraficoMetaGrupoTurnoV2
        dados={comparativoPorHora}
        estaCarregando={estaCarregandoGrafico}
        desabilitado={!turnoAberto}
        motivoDesabilitado="O gráfico horário de capacidade é dinâmico e volta a ser recalculado quando um novo turno for aberto."
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">Progresso por OP</h2>
          <p className="text-sm text-slate-600">
            Cada OP destaca o progresso operacional ponderado por T.P. e mantém as peças completas
            separadas para evitar ambiguidade.
          </p>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {resumo.ops.map((op) => {
            const percentual = op.progressoOperacionalPct

            return (
              <button
                key={op.id}
                type="button"
                onClick={() => onSelecionarOp(op.id)}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                      {op.numeroOp}
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-slate-900">{op.produtoNome}</h3>
                    <p className="text-sm text-slate-600">{op.produtoReferencia}</p>
                  </div>

                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${corStatus(op.status)}`}
                  >
                    {op.status}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                  <span>Peças completas {op.quantidadeConcluida}</span>
                  <span>Planejado {op.quantidadePlanejada}</span>
                </div>

                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${percentual}%` }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-700">
                    {percentual.toFixed(0)}% de progresso operacional
                  </p>
                  <span className="text-xs font-medium uppercase tracking-wide text-blue-700">
                    Ver detalhes
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Setores pendentes</h2>
            <p className="text-sm text-slate-600">
              Setores ainda abertos ou em andamento, com suas OPs e produtos consolidados dentro da
              mesma estrutura física do turno.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {resumo.setoresPendentesLista.length === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Nenhuma pendência operacional no turno carregado.
              </div>
            ) : (
              resumo.setoresPendentesLista.map((setor) => {
                const percentual = setor.progressoOperacionalPct

                return (
                  <article key={setor.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{setor.setorNome}</p>
                        <p className="text-sm text-slate-600">
                          {setor.demandas.length} demanda(s) ativa(s) neste setor.
                        </p>
                      </div>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${corStatus(setor.status)}`}
                      >
                        {setor.status}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                      <span>{setor.quantidadeConcluida} peças completas</span>
                      <span>{setor.quantidadePlanejada} planejado</span>
                    </div>

                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all"
                        style={{ width: `${percentual}%` }}
                      />
                    </div>

                    <div className="mt-3 space-y-2">
                      {setor.demandas.map((demanda) => (
                        <div
                          key={demanda.id}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{demanda.numeroOp}</p>
                              <p className="text-sm text-slate-600">
                                {demanda.produtoNome} ({demanda.produtoReferencia})
                              </p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                              {demanda.status}
                            </span>
                          </div>

                          <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                            <span>Planejado {demanda.quantidadePlanejada}</span>
                            <span>Peças completas {demanda.quantidadeConcluida}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Setores concluídos</h2>
            <p className="text-sm text-slate-600">
              Histórico setorial já encerrado no turno carregado.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {resumo.setoresConcluidosLista.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Ainda não há setores concluídos neste turno.
              </div>
            ) : (
              resumo.setoresConcluidosLista.map((setor) => (
                <article key={setor.id} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-emerald-950">{setor.setorNome}</p>
                      <p className="text-sm text-emerald-800">
                        {setor.demandas.length} demanda(s) encerrada(s) neste setor.
                      </p>
                    </div>
                    <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      concluida
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {setor.demandas.map((demanda) => (
                      <div
                        key={demanda.id}
                        className="rounded-xl border border-emerald-200 bg-white/70 px-3 py-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-emerald-950">{demanda.numeroOp}</p>
                            <p className="text-sm text-emerald-800">
                              {demanda.produtoNome} ({demanda.produtoReferencia})
                            </p>
                          </div>
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                            {demanda.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </>
  )
}
