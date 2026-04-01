'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  Activity,
  Boxes,
  ClipboardList,
  OctagonX,
  PackageCheck,
  PencilLine,
  RefreshCw,
  Signal,
  TimerReset,
} from 'lucide-react'
import { CardKPI } from '@/components/dashboard/CardKPI'
import { ModalEditarTurnoAbertoV2 } from '@/components/dashboard/ModalEditarTurnoAbertoV2'
import { ModalDetalhesOpTurno } from '@/components/dashboard/ModalDetalhesOpTurno'
import { ModalEncerrarTurno } from '@/components/dashboard/ModalEncerrarTurno'
import { ModalNovoTurnoV2 } from '@/components/dashboard/ModalNovoTurnoV2'
import { QROperacionaisTurnoV2 } from '@/components/dashboard/QROperacionaisTurnoV2'
import { ResumoPlanejamentoTurnoV2 } from '@/components/dashboard/ResumoPlanejamentoTurnoV2'
import { encerrarTurno } from '@/lib/actions/turnos'
import { mapearSetoresTurnoParaDashboard } from '@/lib/utils/turno-setores'
import { useRealtimePlanejamentoTurnoV2 } from '@/hooks/useRealtimePlanejamentoTurnoV2'
import type {
  ConfiguracaoTurnoComBlocos,
  MaquinaListItem,
  PlanejamentoTurnoDashboardV2,
  ProdutoListItem,
  ProdutoTurnoOption,
  TurnoOpV2,
  TurnoSetorOpV2,
} from '@/types'

interface MonitorPlanejamentoTurnoV2Props {
  configuracaoAtual: ConfiguracaoTurnoComBlocos | null
  initialPlanning: PlanejamentoTurnoDashboardV2 | null
  produtos: ProdutoTurnoOption[]
  produtosCatalogo: ProdutoListItem[]
  maquinas: MaquinaListItem[]
}

interface SecaoComContexto extends TurnoSetorOpV2 {
  numeroOp: string
  produtoNome: string
  produtoReferencia: string
}

function formatarUltimaAtualizacao(data: Date | null): string {
  if (!data) {
    return 'Aguardando primeira sincronização'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Fortaleza',
  }).format(data)
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

    return primeiraSecao.setorNome.localeCompare(segundaSecao.setorNome)
  })
}

function corStatus(status: PlanejamentoTurnoDashboardV2['turno']['status'] | TurnoOpV2['status'] | TurnoSetorOpV2['status']): string {
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
  configuracaoAtual,
  initialPlanning,
  produtos,
  produtosCatalogo,
  maquinas,
}: MonitorPlanejamentoTurnoV2Props) {
  const [modalAberto, setModalAberto] = useState(initialPlanning === null)
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false)
  const [modalEncerramentoAberto, setModalEncerramentoAberto] = useState(false)
  const [turnoOpSelecionadaId, setTurnoOpSelecionadaId] = useState<string | null>(null)
  const [encerrandoTurno, iniciarEncerramentoTurno] = useTransition()
  const [retornoEncerramento, setRetornoEncerramento] = useState<string | null>(null)
  const { planejamento, ultimaAtualizacao, statusConexao, estaCarregando, erro, recarregar } =
    useRealtimePlanejamentoTurnoV2(initialPlanning)
  const descricaoConfiguracao = configuracaoAtual
    ? `${configuracaoAtual.funcionariosAtivos} operadores previstos e ${configuracaoAtual.minutosTurno} minutos produtivos configurados para hoje.`
    : 'Defina operadores disponíveis, minutos produtivos e as OPs do dia para destravar a operação.'
  const podeEncerrarTurno =
    planejamento?.origem === 'aberto' && planejamento.turno.status === 'aberto'

  function executarEncerramentoTurno(): void {
    if (!planejamento || !podeEncerrarTurno) {
      return
    }

    setRetornoEncerramento(null)
    iniciarEncerramentoTurno(async () => {
      const resultado = await encerrarTurno(planejamento.turno.id)

      if (!resultado.sucesso) {
        setRetornoEncerramento(resultado.erro ?? 'Não foi possível encerrar o turno atual.')
        return
      }

      setModalEncerramentoAberto(false)
      await recarregar()
      setRetornoEncerramento('Turno encerrado com sucesso.')
    })
  }

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

  const indicadorConexao =
    statusConexao === 'ativo'
      ? 'bg-emerald-500'
      : statusConexao === 'erro'
        ? 'bg-red-500'
        : 'bg-amber-400'

  return (
    <section className="space-y-6">
      <section className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-cyan-50 p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <span className={`h-2.5 w-2.5 rounded-full ${indicadorConexao}`} aria-hidden />
              Dashboard{' '}
              {statusConexao === 'ativo'
                ? 'em tempo real'
                : statusConexao === 'erro'
                  ? 'com erro de conexão'
                  : 'conectando'}
            </div>

            <h1 className="text-2xl font-bold text-slate-900">Dashboard de Planejamento do Turno</h1>
            <p className="max-w-3xl text-sm text-slate-600">
              O novo turno define operadores disponíveis, minutos produtivos e as OPs do dia. A
              partir disso, o sistema ativa os setores necessários do turno e alimenta as
              próximas etapas do scanner e do acompanhamento operacional.
            </p>
            <p className="text-sm font-medium text-slate-700">{descricaoConfiguracao}</p>
            <p className="max-w-3xl text-sm text-slate-600">
              Acompanhamento gerencial do turno com progresso consolidado por OP e por setor ativo,
              sem duplicar a estrutura física da fábrica quando novas OPs entram no mesmo dia.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:min-w-64 lg:items-end">
            <button
              type="button"
              onClick={() => setModalAberto(true)}
              title="Abrir novo turno"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-blue-200 transition-colors hover:bg-blue-700"
            >
              <PencilLine size={18} />
              {planejamento ? 'Novo Turno' : 'Abrir primeiro turno'}
            </button>
            {podeEncerrarTurno ? (
              <button
                type="button"
                onClick={() => setModalEdicaoAberto(true)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-sm font-medium text-cyan-900 transition-colors hover:bg-cyan-100"
              >
                <PencilLine size={16} />
                Editar turno
              </button>
            ) : null}
            {podeEncerrarTurno ? (
              <button
                type="button"
                onClick={() => setModalEncerramentoAberto(true)}
                disabled={encerrandoTurno}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <OctagonX size={16} />
                {encerrandoTurno ? 'Encerrando turno...' : 'Encerrar Turno'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                void recarregar()
              }}
              disabled={estaCarregando}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <RefreshCw size={16} />
              {estaCarregando ? 'Atualizando...' : 'Atualizar agora'}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
            <Signal size={14} />
            {statusConexao}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
            <TimerReset size={14} />
            {formatarUltimaAtualizacao(ultimaAtualizacao)}
          </span>
        </div>

        {retornoEncerramento ? (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
              retornoEncerramento === 'Turno encerrado com sucesso.'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {retornoEncerramento}
          </div>
        ) : null}
      </section>

      {!planejamento ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          O dashboard depende da abertura de um turno com operadores e OPs planejadas. Abra o
          primeiro turno para ativar os setores participantes e destravar a operação do dia.
        </div>
      ) : null}

      {erro ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </section>
      ) : null}

      <ResumoPlanejamentoTurnoV2 planejamento={planejamento} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

      {modalAberto ? (
        <ModalNovoTurnoV2
          planejamentoAtual={planejamento}
          produtos={produtos}
          bloqueante={planejamento === null}
          aoFechar={() => setModalAberto(false)}
        />
      ) : null}

      {modalEdicaoAberto && planejamento && podeEncerrarTurno ? (
        <ModalEditarTurnoAbertoV2
          planejamento={planejamento}
          produtos={produtos}
          aoAtualizarPlanejamento={recarregar}
          aoFechar={() => setModalEdicaoAberto(false)}
        />
      ) : null}

      {modalEncerramentoAberto && planejamento ? (
        <ModalEncerrarTurno
          encerrando={encerrandoTurno}
          observacao={planejamento.turno.observacao}
          operadoresAlocados={planejamento.operadores.length}
          opsPlanejadas={planejamento.ops.length}
          setoresAtivos={resumo.setoresAtivos.length}
          aoCancelar={() => setModalEncerramentoAberto(false)}
          aoConfirmar={executarEncerramentoTurno}
        />
      ) : null}

      {opSelecionada && planejamento ? (
        <ModalDetalhesOpTurno
          op={opSelecionada.op}
          secoes={opSelecionada.secoes}
          iniciadoEmTurno={planejamento.turno.iniciadoEm}
          produtosCatalogo={produtosCatalogo}
          maquinas={maquinas}
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
