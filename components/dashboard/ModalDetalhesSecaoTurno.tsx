'use client'

import {
  ClipboardCheck,
  Factory,
  ListChecks,
  Package,
  QrCode,
  UserRound,
  X,
} from 'lucide-react'
import type {
  ProdutoListItem,
  TurnoOperadorAtividadeSetorV2,
  TurnoOperadorV2,
  TurnoSetorOperacaoApontamentoV2,
  TurnoSetorOperacaoStatusV2,
  TurnoSetorOpV2,
} from '@/types'

interface SecaoDetalheOp extends TurnoSetorOpV2 {
  produtoNome: string
  produtoReferencia: string
  numeroOp: string
}

interface ModalDetalhesSecaoTurnoProps {
  secao: SecaoDetalheOp
  produto: ProdutoListItem | null
  operadoresTurno: TurnoOperadorV2[]
  operadoresAtividadeSetor: TurnoOperadorAtividadeSetorV2[]
  operacoesSecao: TurnoSetorOperacaoApontamentoV2[]
  aoFechar: () => void
}

function calcularPercentual(realizado: number, planejado: number): number {
  if (planejado <= 0) {
    return 0
  }

  return Math.min((realizado / planejado) * 100, 100)
}

function obterTemaStatus(status: TurnoSetorOpV2['status'] | TurnoSetorOperacaoStatusV2): string {
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

export function ModalDetalhesSecaoTurno({
  secao,
  produto,
  operadoresTurno,
  operadoresAtividadeSetor,
  operacoesSecao,
  aoFechar,
}: ModalDetalhesSecaoTurnoProps) {
  const operacoesSetor = [...operacoesSecao].sort(
    (primeiraOperacao, segundaOperacao) => primeiraOperacao.sequencia - segundaOperacao.sequencia
  )
  const operadoresDoSetor = operadoresTurno.filter((operador) => operador.setorId === secao.setorId)
  const operadoresComAtividade = operadoresAtividadeSetor.filter(
    (atividade) => atividade.turnoSetorOpId === secao.id
  )
  const operadoresSemSetor = operadoresTurno.filter((operador) => !operador.setorId)
  const saldoRestante = Math.max(secao.quantidadePlanejada - secao.quantidadeRealizada, 0)
  const progresso = calcularPercentual(secao.quantidadeRealizada, secao.quantidadePlanejada)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/65 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes da seção ${secao.setorNome}`}
    >
      <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              <Factory size={14} />
              Detalhe operacional do setor
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-semibold text-slate-900">
                  {secao.numeroOp} · {secao.setorNome}
                </h2>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${obterTemaStatus(secao.status)}`}
                >
                  {secao.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {secao.produtoNome} ({secao.produtoReferencia})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar modal de detalhes da seção"
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-6 p-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Planejado</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {secao.quantidadePlanejada}
              </p>
            </article>

            <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                Realizado
              </p>
              <p className="mt-2 text-3xl font-semibold text-emerald-900">
                {secao.quantidadeRealizada}
              </p>
            </article>

            <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Saldo</p>
              <p className="mt-2 text-3xl font-semibold text-amber-900">{saldoRestante}</p>
            </article>

            <article className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Progresso</p>
              <p className="mt-2 text-3xl font-semibold text-blue-900">
                {progresso.toFixed(0)}%
              </p>
            </article>

            <article className="rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-violet-700">
                Operações previstas
              </p>
              <p className="mt-2 text-3xl font-semibold text-violet-900">
                {operacoesSetor.length}
              </p>
            </article>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                <Package size={14} />
                Produto {secao.produtoReferencia}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                <QrCode size={14} />
                QR {secao.qrCodeToken.slice(0, 16)}...
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">Operações do setor</h3>
                <p className="text-sm text-slate-600">
                  Etapas do roteiro do produto previstas para este setor.
                </p>
              </div>

              <div className="mt-5 space-y-3">
                {operacoesSetor.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Nenhuma operação derivada foi encontrada para esta seção do turno.
                  </div>
                ) : (
                  operacoesSetor.map((operacao) => (
                    <article
                      key={operacao.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
                          <ListChecks size={16} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">
                              {operacao.operacaoCodigo}
                            </p>
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${obterTemaStatus(operacao.status)}`}
                            >
                              {operacao.status}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">{operacao.operacaoDescricao}</p>
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            Sequência {operacao.sequencia} · T.P {operacao.tempoPadraoMinSnapshot}{' '}
                            min · Máquina {operacao.tipoMaquinaCodigo ?? 'manual'}
                          </p>
                          <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                Planejado
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {operacao.quantidadePlanejada}
                              </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                Realizado
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {operacao.quantidadeRealizada}
                              </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                Saldo
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {Math.max(
                                  operacao.quantidadePlanejada - operacao.quantidadeRealizada,
                                  0
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">Operadores</h3>
                <p className="text-sm text-slate-600">
                  Alocações do planejamento e operadores que já registraram produção neste setor.
                </p>
              </div>

              <div className="mt-5 space-y-3">
                {operadoresComAtividade.length > 0 ? (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      {operadoresComAtividade.length} operador(es) já registraram produção neste
                      setor durante o turno.
                    </div>

                    {operadoresComAtividade.map((atividade) => (
                      <article
                        key={`atividade-${atividade.turnoSetorOpId}-${atividade.operadorId}`}
                        className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                            <UserRound size={16} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-900">
                              {atividade.operadorNome}
                            </p>
                            <p className="text-sm text-slate-600">
                              Matrícula {atividade.matricula} ·{' '}
                              {atividade.funcao ?? 'Função não informada'}
                            </p>
                            <div className="mt-3 grid gap-2 sm:grid-cols-3">
                              <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                  Registros
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                  {atividade.totalRegistros}
                                </p>
                              </div>
                              <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                  Peças
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                  {atividade.totalPecas}
                                </p>
                              </div>
                              <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                  Último registro
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                  {atividade.ultimoRegistroEm
                                    ? new Intl.DateTimeFormat('pt-BR', {
                                        dateStyle: 'short',
                                        timeStyle: 'short',
                                        timeZone: 'America/Fortaleza',
                                      }).format(new Date(atividade.ultimoRegistroEm))
                                    : '—'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}

                {operadoresDoSetor.length > 0 ? (
                  operadoresDoSetor.map((operador) => (
                    <article
                      key={operador.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                          <UserRound size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {operador.operadorNome}
                          </p>
                          <p className="text-sm text-slate-600">
                            Matrícula {operador.matricula} · {operador.funcao ?? 'Função não informada'}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))
                ) : operadoresComAtividade.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Nenhum operador foi alocado especificamente a este setor.
                  </div>
                ) : null}

                {operadoresSemSetor.length > 0 ? (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    {operadoresSemSetor.length} operador(es) do turno seguem sem alocação setorial
                    específica e podem atender este setor conforme decisão do supervisor.
                  </div>
                ) : null}

                {operadoresComAtividade.length === 0 &&
                operadoresDoSetor.length === 0 &&
                operadoresSemSetor.length === 0 ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Este turno não possui operadores alocados nominalmente para o setor no
                    planejamento atual.
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">Contexto patrimonial</h3>
                <p className="text-sm text-slate-600">
                  A V2 não mantém mais vínculo direto entre máquina e setor. O contexto operacional
                  desta tela nasce apenas do turno, da demanda setorial e das operações derivadas.
                </p>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  Máquinas seguem disponíveis apenas como cadastro patrimonial e QR físico. A
                  leitura e a consolidação desta seção não dependem de tipo de máquina nem de
                  máquina vinculada ao setor.
                </div>

                {produto ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Produto em execução: <strong className="text-slate-900">{produto.nome}</strong>{' '}
                    ({produto.referencia}).
                  </div>
                ) : null}
              </div>
            </section>
          </section>

          <div className="flex justify-end border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={aoFechar}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Fechar detalhe do setor
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
