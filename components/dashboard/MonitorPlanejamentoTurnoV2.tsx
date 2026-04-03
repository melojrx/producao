'use client'

import { useMemo, useState } from 'react'
import {
  Activity,
  Boxes,
  ClipboardList,
  PackageCheck,
  Target,
} from 'lucide-react'
import { CardKPI } from '@/components/dashboard/CardKPI'
import { GraficoMetaGrupoTurnoV2 } from '@/components/dashboard/GraficoMetaGrupoTurnoV2'
import { ModalDetalhesOpTurno } from '@/components/dashboard/ModalDetalhesOpTurno'
import { QROperacionaisTurnoV2 } from '@/components/dashboard/QROperacionaisTurnoV2'
import { ResumoPlanejamentoTurnoV2 } from '@/components/dashboard/ResumoPlanejamentoTurnoV2'
import { useMetaGrupoTurnoV2 } from '@/hooks/useMetaGrupoTurnoV2'
import { compararSetoresPorOrdem } from '@/lib/utils/setor-ordem'
import { mapearSetoresTurnoParaDashboard } from '@/lib/utils/turno-setores'
import { useRealtimePlanejamentoTurnoV2 } from '@/hooks/useRealtimePlanejamentoTurnoV2'
import type {
  PlanejamentoTurnoDashboardV2,
  ProdutoListItem,
  TurnoOpV2,
  TurnoSetorOpV2,
} from '@/types'

interface MonitorPlanejamentoTurnoV2Props {
  initialPlanning: PlanejamentoTurnoDashboardV2 | null
  produtosCatalogo: ProdutoListItem[]
}

interface SecaoComContexto extends TurnoSetorOpV2 {
  numeroOp: string
  produtoNome: string
  produtoReferencia: string
}

function calcularPercentual(realizado: number, planejado: number): number {
  if (planejado <= 0) {
    return 0
  }

  return Math.min((realizado / planejado) * 100, 100)
}

function mapearSecoesComContexto(
  secoes: TurnoSetorOpV2[],
  ops: TurnoOpV2[]
): SecaoComContexto[] {
  const opPorId = new Map(ops.map((op) => [op.id, op]))

  return secoes
    .map((secao) => {
      const op = opPorId.get(secao.turnoOpId)
      if (!op) {
        return null
      }

      return {
        ...secao,
        numeroOp: op.numeroOp,
        produtoNome: op.produtoNome,
        produtoReferencia: op.produtoReferencia,
      }
    })
    .filter((secao): secao is SecaoComContexto => Boolean(secao))
}

function ordenarSecoes(secoes: SecaoComContexto[]): SecaoComContexto[] {
  return [...secoes].sort((primeiraSecao, segundaSecao) => {
    const comparacaoNumeroOp = primeiraSecao.numeroOp.localeCompare(segundaSecao.numeroOp)

    if (comparacaoNumeroOp !== 0) {
      return comparacaoNumeroOp
    }

    return compararSetoresPorOrdem(primeiraSecao, segundaSecao)
  })
}

function corStatus(
  status:
    | PlanejamentoTurnoDashboardV2['turno']['status']
    | TurnoOpV2['status']
    | TurnoSetorOpV2['status']
): string {
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

export function MonitorPlanejamentoTurnoV2({
  initialPlanning,
  produtosCatalogo,
}: MonitorPlanejamentoTurnoV2Props) {
  const [turnoOpSelecionadaId, setTurnoOpSelecionadaId] = useState<string | null>(null)
  const { planejamento, ultimaAtualizacao, statusConexao, estaCarregando, erro } =
    useRealtimePlanejamentoTurnoV2(initialPlanning)
  const {
    comparativoPorHora,
    erro: erroMetaGrupo,
    estaCarregando: estaCarregandoMetaGrupo,
    mediaTpProduto,
    metaGrupo,
  } = useMetaGrupoTurnoV2(planejamento, ultimaAtualizacao?.getTime() ?? 0)

  const resumo = useMemo(() => {
    if (!planejamento) {
      return {
        opsEmAndamento: 0,
        totalPlanejado: 0,
        totalRealizado: 0,
        setoresPendentes: 0,
        ops: [] as TurnoOpV2[],
        setoresPendentesLista: [],
        setoresConcluidosLista: [],
        setoresAtivos: [],
      }
    }

    const setoresAtivos = mapearSetoresTurnoParaDashboard(planejamento)
    const setoresPendentesLista = setoresAtivos.filter((setor) => setor.status !== 'concluida')
    const setoresConcluidosLista = setoresAtivos.filter((setor) => setor.status === 'concluida')

    return {
      opsEmAndamento: planejamento.ops.filter((op) => op.status === 'em_andamento').length,
      totalPlanejado: planejamento.ops.reduce((soma, op) => soma + op.quantidadePlanejada, 0),
      totalRealizado: planejamento.ops.reduce((soma, op) => soma + op.quantidadeRealizada, 0),
      setoresPendentes: setoresPendentesLista.length,
      ops: planejamento.ops,
      setoresPendentesLista,
      setoresConcluidosLista,
      setoresAtivos,
    }
  }, [planejamento])

  const opSelecionada = useMemo(() => {
    if (!planejamento || !turnoOpSelecionadaId) {
      return null
    }

    const op = planejamento.ops.find((item) => item.id === turnoOpSelecionadaId)
    if (!op) {
      return null
    }

    const secoes = ordenarSecoes(
      mapearSecoesComContexto(planejamento.secoesSetorOp, planejamento.ops).filter(
        (secao) => secao.turnoOpId === turnoOpSelecionadaId
      )
    )

    return { op, secoes }
  }, [planejamento, turnoOpSelecionadaId])

  return (
    <section className="space-y-6">
      {!planejamento ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Nenhum turno disponível para monitoramento neste momento.
        </div>
      ) : null}

      {erro ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </section>
      ) : null}

      <ResumoPlanejamentoTurnoV2
        planejamento={planejamento}
        statusConexao={statusConexao}
        ultimaAtualizacao={ultimaAtualizacao}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <CardKPI
          titulo="Meta do Grupo"
          valor={metaGrupo}
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
          titulo="Realizado"
          valor={resumo.totalRealizado}
          descricao="Produção consolidada do turno a partir do andamento agregado das OPs."
          icone={PackageCheck}
          destaque="emerald"
        />
        <CardKPI
          titulo="Setores pendentes"
          valor={resumo.setoresPendentes}
          descricao="Setores do turno ainda abertos ou em andamento, com saldo operacional ativo."
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
        estaCarregando={estaCarregando || estaCarregandoMetaGrupo}
      />

      {planejamento ? (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900">Progresso por OP</h2>
              <p className="text-sm text-slate-600">
                Cada OP mostra o planejado do dia versus o realizado consolidado pela conclusão das
                demandas distribuídas nos setores ativos do turno.
              </p>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {resumo.ops.map((op) => {
                const percentual = calcularPercentual(op.quantidadeRealizada, op.quantidadePlanejada)

                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => setTurnoOpSelecionadaId(op.id)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                          {op.numeroOp}
                        </div>
                        <h3 className="mt-3 text-base font-semibold text-slate-900">
                          {op.produtoNome}
                        </h3>
                        <p className="text-sm text-slate-600">{op.produtoReferencia}</p>
                      </div>

                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${corStatus(op.status)}`}
                      >
                        {op.status}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                      <span>Realizado {op.quantidadeRealizada}</span>
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
                        {percentual.toFixed(0)}% concluído
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
                  Setores ainda abertos ou em andamento, com suas OPs e produtos consolidados dentro
                  da mesma estrutura física do turno.
                </p>
              </div>

              <div className="mt-5 space-y-3">
                {resumo.setoresPendentesLista.length === 0 ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    Nenhuma pendência operacional no turno carregado.
                  </div>
                ) : (
                  resumo.setoresPendentesLista.map((setor) => {
                    const percentual = calcularPercentual(
                      setor.quantidadeRealizada,
                      setor.quantidadePlanejada
                    )

                    return (
                      <article
                        key={setor.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
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
                          <span>{setor.quantidadeRealizada} realizado</span>
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
                                  <p className="text-sm font-semibold text-slate-900">
                                    {demanda.numeroOp}
                                  </p>
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
                                <span>Realizado {demanda.quantidadeRealizada}</span>
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
                    <article
                      key={setor.id}
                      className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-emerald-950">
                            {setor.setorNome}
                          </p>
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
                                <p className="text-sm font-semibold text-emerald-950">
                                  {demanda.numeroOp}
                                </p>
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
      ) : !estaCarregando ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Nenhum turno disponível para monitoramento neste momento.
        </section>
      ) : null}

      <QROperacionaisTurnoV2 planejamento={planejamento} />

      {opSelecionada && planejamento ? (
        <ModalDetalhesOpTurno
          op={opSelecionada.op}
          secoes={opSelecionada.secoes}
          iniciadoEmTurno={planejamento.turno.iniciadoEm}
          produtosCatalogo={produtosCatalogo}
          operadoresTurno={planejamento.operadores}
          operadoresAtividadeSetor={planejamento.operadoresAtividadeSetor ?? []}
          operacoesSecao={planejamento.operacoesSecao.filter(
            (operacao) => operacao.turnoOpId === opSelecionada.op.id
          )}
          aoFechar={() => setTurnoOpSelecionadaId(null)}
        />
      ) : null}
    </section>
  )
}
