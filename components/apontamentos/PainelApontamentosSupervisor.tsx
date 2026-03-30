'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ClipboardList,
  Factory,
  Filter,
  ListChecks,
  Minus,
  Package,
  Plus,
  Save,
  UserRound,
} from 'lucide-react'
import {
  registrarApontamentosSupervisor,
  type RegistrarApontamentosSupervisorActionState,
} from '@/lib/actions/producao'
import type {
  PlanejamentoTurnoV2,
  TurnoOperadorV2,
  TurnoSetorOperacaoStatusV2,
  TurnoSetorOperacaoApontamentoV2,
  TurnoSetorOpV2,
  TurnoSetorOpStatusV2,
} from '@/types'

interface PainelApontamentosSupervisorProps {
  planejamento: PlanejamentoTurnoV2
  operacoesTurno: TurnoSetorOperacaoApontamentoV2[]
  origemOperadores?: 'turno' | 'fallback_ativos'
}

interface SecaoComContexto extends TurnoSetorOpV2 {
  numeroOp: string
  produtoNome: string
  produtoReferencia: string
}

interface LancamentoDraft {
  id: string
  operadorId: string
  turnoSetorOperacaoId: string
  quantidade: string
}

const estadoInicial: RegistrarApontamentosSupervisorActionState = {
  sucesso: false,
}

function criarIdLocal(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `lancamento-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function calcularPercentual(realizado: number, planejado: number): number {
  if (planejado <= 0) {
    return 0
  }

  return Math.min((realizado / planejado) * 100, 100)
}

function montarSecoesComContexto(planejamento: PlanejamentoTurnoV2): SecaoComContexto[] {
  const opPorId = new Map(planejamento.ops.map((op) => [op.id, op]))

  return planejamento.secoesSetorOp
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
    .sort((primeiraSecao, segundaSecao) => {
      const comparacaoOp = primeiraSecao.numeroOp.localeCompare(segundaSecao.numeroOp)
      if (comparacaoOp !== 0) {
        return comparacaoOp
      }

      return primeiraSecao.setorNome.localeCompare(segundaSecao.setorNome)
    })
}

function criarLancamentoDraft(
  operadores: TurnoOperadorV2[],
  operacoes: TurnoSetorOperacaoApontamentoV2[]
): LancamentoDraft {
  return {
    id: criarIdLocal(),
    operadorId: operadores[0]?.operadorId ?? '',
    turnoSetorOperacaoId: operacoes[0]?.id ?? '',
    quantidade: '1',
  }
}

function statusSecaoTema(status: TurnoSetorOpStatusV2 | TurnoSetorOperacaoStatusV2): string {
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

export function PainelApontamentosSupervisor({
  planejamento,
  operacoesTurno,
  origemOperadores = 'turno',
}: PainelApontamentosSupervisorProps) {
  const router = useRouter()
  const [estado, executar, pendente] = useActionState(
    registrarApontamentosSupervisor,
    estadoInicial
  )
  const [erroLocal, setErroLocal] = useState<string | null>(null)
  const [filtroOp, setFiltroOp] = useState('')
  const [filtroSetor, setFiltroSetor] = useState('')
  const [filtroProduto, setFiltroProduto] = useState('')
  const secoes = useMemo(() => montarSecoesComContexto(planejamento), [planejamento])
  const secoesFiltradas = useMemo(
    () =>
      secoes.filter((secao) => {
        const correspondeOp = !filtroOp || secao.turnoOpId === filtroOp
        const correspondeSetor = !filtroSetor || secao.setorId === filtroSetor
        const correspondeProduto = !filtroProduto || secao.produtoReferencia === filtroProduto

        return correspondeOp && correspondeSetor && correspondeProduto
      }),
    [filtroOp, filtroProduto, filtroSetor, secoes]
  )
  const [secaoSelecionadaId, setSecaoSelecionadaId] = useState<string>(
    secoesFiltradas[0]?.id ?? secoes[0]?.id ?? ''
  )
  const [lancamentos, setLancamentos] = useState<LancamentoDraft[]>([])

  const secaoSelecionada = useMemo(
    () => secoes.find((secao) => secao.id === secaoSelecionadaId) ?? secoesFiltradas[0] ?? null,
    [secaoSelecionadaId, secoes, secoesFiltradas]
  )

  const operacoesDaSecao = useMemo(
    () =>
      secaoSelecionada
        ? operacoesTurno.filter((operacao) => operacao.turnoSetorOpId === secaoSelecionada.id)
        : [],
    [operacoesTurno, secaoSelecionada]
  )

  const operadoresDaSecao = useMemo(() => {
    if (!secaoSelecionada) {
      return [] as TurnoOperadorV2[]
    }

    const operadoresDaSecaoBase = planejamento.operadores.filter(
      (operador) => operador.setorId === secaoSelecionada.setorId || operador.setorId === null
    )

    return operadoresDaSecaoBase.length > 0 ? operadoresDaSecaoBase : planejamento.operadores
  }, [planejamento.operadores, secaoSelecionada])

  const payloadLancamentos = useMemo(
    () =>
      JSON.stringify(
        lancamentos
          .filter(
            (lancamento) =>
              lancamento.operadorId &&
              lancamento.turnoSetorOperacaoId &&
              Number.parseInt(lancamento.quantidade, 10) > 0
          )
          .map((lancamento) => ({
            operadorId: lancamento.operadorId,
            turnoSetorOperacaoId: lancamento.turnoSetorOperacaoId,
            quantidade: Number.parseInt(lancamento.quantidade, 10),
          }))
      ),
    [lancamentos]
  )

  useEffect(() => {
    if (!secaoSelecionada && secoes.length > 0) {
      setSecaoSelecionadaId(secoes[0].id)
    }
  }, [secaoSelecionada, secoes])

  useEffect(() => {
    if (secoesFiltradas.length === 0) {
      setSecaoSelecionadaId('')
      setLancamentos([])
      return
    }

    const secaoAindaVisivel = secoesFiltradas.some((secao) => secao.id === secaoSelecionadaId)

    if (!secaoAindaVisivel) {
      setSecaoSelecionadaId(secoesFiltradas[0].id)
    }
  }, [secoesFiltradas, secaoSelecionadaId])

  useEffect(() => {
    if (!secaoSelecionada) {
      setLancamentos([])
      return
    }

    setLancamentos((estadoAtual) => {
      if (estadoAtual.length > 0) {
        const proximoEstado = estadoAtual.map((lancamento) => ({
          ...lancamento,
          operadorId:
            operadoresDaSecao.some((operador) => operador.operadorId === lancamento.operadorId)
              ? lancamento.operadorId
              : (operadoresDaSecao[0]?.operadorId ?? ''),
          turnoSetorOperacaoId: operacoesDaSecao.some(
            (operacao) => operacao.id === lancamento.turnoSetorOperacaoId
          )
            ? lancamento.turnoSetorOperacaoId
            : (operacoesDaSecao[0]?.id ?? ''),
        }))

        const estadoMudou = proximoEstado.some(
          (lancamento, index) =>
            lancamento.operadorId !== estadoAtual[index]?.operadorId ||
            lancamento.turnoSetorOperacaoId !== estadoAtual[index]?.turnoSetorOperacaoId
        )

        return estadoMudou ? proximoEstado : estadoAtual
      }

      if (operadoresDaSecao.length === 0 || operacoesDaSecao.length === 0) {
        return []
      }

      return [criarLancamentoDraft(operadoresDaSecao, operacoesDaSecao)]
    })
  }, [operacoesDaSecao, operadoresDaSecao, secaoSelecionada])

  useEffect(() => {
    if (!estado.sucesso) {
      return
    }

    setErroLocal(null)
    if (secaoSelecionada) {
      setLancamentos([criarLancamentoDraft(operadoresDaSecao, operacoesDaSecao)])
    }
    router.refresh()
  }, [estado.sucesso, router, secaoSelecionada, operadoresDaSecao, operacoesDaSecao])

  function selecionarSecao(secaoId: string): void {
    setSecaoSelecionadaId(secaoId)
    setErroLocal(null)
  }

  function adicionarLancamento(): void {
    setLancamentos((estadoAtual) => [
      ...estadoAtual,
      criarLancamentoDraft(operadoresDaSecao, operacoesDaSecao),
    ])
  }

  function removerLancamento(lancamentoId: string): void {
    setLancamentos((estadoAtual) => {
      if (estadoAtual.length === 1) {
        return estadoAtual
      }

      return estadoAtual.filter((lancamento) => lancamento.id !== lancamentoId)
    })
  }

  function atualizarLancamento(
    lancamentoId: string,
    atualizacao: Partial<LancamentoDraft>
  ): void {
    setLancamentos((estadoAtual) =>
      estadoAtual.map((lancamento) =>
        lancamento.id === lancamentoId ? { ...lancamento, ...atualizacao } : lancamento
      )
    )
  }

  function validarFormulario(): string | null {
    if (!secaoSelecionada) {
      return 'Selecione uma seção para registrar apontamentos.'
    }

    if (operacoesDaSecao.length === 0) {
      return 'A seção selecionada ainda não possui operações derivadas para apontamento.'
    }

    if (lancamentos.length === 0) {
      return 'Adicione ao menos um lançamento antes de registrar.'
    }

    const possuiLancamentoInvalido = lancamentos.some((lancamento) => {
      const quantidade = Number.parseInt(lancamento.quantidade, 10)
      return (
        !lancamento.operadorId ||
        !lancamento.turnoSetorOperacaoId ||
        !Number.isInteger(quantidade) ||
        quantidade <= 0
      )
    })

    if (possuiLancamentoInvalido) {
      return 'Preencha operador, operação e quantidade válida em todas as linhas.'
    }

    return null
  }

  const secoesPendentes = secoes.filter((secao) => secao.status !== 'concluida').length
  const totalPlanejado = secoes.reduce((soma, secao) => soma + secao.quantidadePlanejada, 0)
  const totalRealizado = secoes.reduce((soma, secao) => soma + secao.quantidadeRealizada, 0)
  const saldoSecaoSelecionada = secaoSelecionada
    ? Math.max(secaoSelecionada.quantidadePlanejada - secaoSelecionada.quantidadeRealizada, 0)
    : 0

  return (
    <section className="space-y-6">
      <section className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-cyan-50 p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
              <ClipboardList size={14} />
              Apontamento incremental do supervisor
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Apontamentos do Supervisor</h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-600">
                Registre no mesmo envio as quantidades produzidas por operador e operação dentro de
                uma seção. O sistema consolida automaticamente operação, seção, OP e turno sem
                supercontar a produção.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <article className="rounded-2xl border border-white/80 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Turno</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">Aberto</p>
            </article>
            <article className="rounded-2xl border border-white/80 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Seções pendentes</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{secoesPendentes}</p>
            </article>
            <article className="rounded-2xl border border-white/80 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Planejado vs realizado</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {totalRealizado} / {totalPlanejado}
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr,1.8fr]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-500" />
              <h2 className="text-base font-semibold text-slate-900">Filtros rápidos</h2>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-1">
              <div className="flex flex-col gap-1">
                <label htmlFor="filtro-op" className="text-sm font-medium text-slate-700">
                  OP
                </label>
                <select
                  id="filtro-op"
                  value={filtroOp}
                  onChange={(event) => setFiltroOp(event.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas as OPs</option>
                  {planejamento.ops.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.numeroOp} · {op.produtoReferencia}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="filtro-setor" className="text-sm font-medium text-slate-700">
                  Setor
                </label>
                <select
                  id="filtro-setor"
                  value={filtroSetor}
                  onChange={(event) => setFiltroSetor(event.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os setores</option>
                  {Array.from(new Map(secoes.map((secao) => [secao.setorId, secao])).values()).map(
                    (secao) => (
                      <option key={secao.setorId} value={secao.setorId}>
                        {secao.setorNome}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="filtro-produto" className="text-sm font-medium text-slate-700">
                  Produto
                </label>
                <select
                  id="filtro-produto"
                  value={filtroProduto}
                  onChange={(event) => setFiltroProduto(event.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os produtos</option>
                  {Array.from(
                    new Map(secoes.map((secao) => [secao.produtoReferencia, secao])).values()
                  ).map((secao) => (
                    <option key={secao.produtoReferencia} value={secao.produtoReferencia}>
                      {secao.produtoReferencia} · {secao.produtoNome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Seções do turno</h2>
                <p className="text-sm text-slate-600">
                  Selecione a seção que vai receber os apontamentos deste momento.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {secoesFiltradas.length} seção(ões)
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {secoesFiltradas.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                  Nenhuma seção encontrada para os filtros atuais.
                </div>
              ) : (
                secoesFiltradas.map((secao) => {
                  const saldo = Math.max(secao.quantidadePlanejada - secao.quantidadeRealizada, 0)
                  const progresso = calcularPercentual(
                    secao.quantidadeRealizada,
                    secao.quantidadePlanejada
                  )
                  const selecionada = secao.id === secaoSelecionada?.id

                  return (
                    <button
                      key={secao.id}
                      type="button"
                      onClick={() => selecionarSecao(secao.id)}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                        selecionada
                          ? 'border-blue-300 bg-blue-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {secao.numeroOp} · {secao.setorNome}
                          </p>
                          <p className="text-sm text-slate-600">
                            {secao.produtoReferencia} · {secao.produtoNome}
                          </p>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusSecaoTema(secao.status)}`}
                        >
                          {secao.status}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-4">
                        <div className="rounded-xl bg-white/80 px-3 py-2">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Planejado</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {secao.quantidadePlanejada}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white/80 px-3 py-2">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Realizado</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {secao.quantidadeRealizada}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white/80 px-3 py-2">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Saldo</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{saldo}</p>
                        </div>
                        <div className="rounded-xl bg-white/80 px-3 py-2">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Progresso</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {progresso.toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {!secaoSelecionada ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-600">
              Selecione uma seção para visualizar as operações e registrar os apontamentos.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-slate-900">
                      {secaoSelecionada.numeroOp} · {secaoSelecionada.setorNome}
                    </h2>
                    <p className="text-sm text-slate-600">
                      {secaoSelecionada.produtoReferencia} · {secaoSelecionada.produtoNome}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusSecaoTema(secaoSelecionada.status)}`}
                  >
                    {secaoSelecionada.status}
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <article className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Planejado</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {secaoSelecionada.quantidadePlanejada}
                    </p>
                  </article>
                  <article className="rounded-2xl bg-emerald-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Realizado</p>
                    <p className="mt-2 text-2xl font-semibold text-emerald-900">
                      {secaoSelecionada.quantidadeRealizada}
                    </p>
                  </article>
                  <article className="rounded-2xl bg-amber-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Saldo</p>
                    <p className="mt-2 text-2xl font-semibold text-amber-900">
                      {saldoSecaoSelecionada}
                    </p>
                  </article>
                  <article className="rounded-2xl bg-blue-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Operações</p>
                    <p className="mt-2 text-2xl font-semibold text-blue-900">{operacoesDaSecao.length}</p>
                  </article>
                </div>
              </div>

              <section className="grid gap-5 lg:grid-cols-[1.1fr,1.4fr]">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ListChecks size={16} className="text-slate-500" />
                    <h3 className="text-base font-semibold text-slate-900">Operações da seção</h3>
                  </div>

                  <div className="space-y-3">
                    {operacoesDaSecao.map((operacao) => {
                      const saldoOperacao = Math.max(
                        operacao.quantidadePlanejada - operacao.quantidadeRealizada,
                        0
                      )

                      return (
                        <article
                          key={operacao.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {operacao.sequencia}. {operacao.operacaoCodigo}
                              </p>
                              <p className="text-sm text-slate-600">{operacao.operacaoDescricao}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                T.P {operacao.tempoPadraoMinSnapshot} min · Máquina{' '}
                                {operacao.tipoMaquinaCodigo ?? 'manual'}
                              </p>
                            </div>
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusSecaoTema(operacao.status)}`}
                            >
                              {operacao.status}
                            </span>
                          </div>

                          <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            <div className="rounded-xl bg-white px-3 py-2">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Planejado</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {operacao.quantidadePlanejada}
                              </p>
                            </div>
                            <div className="rounded-xl bg-white px-3 py-2">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Realizado</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {operacao.quantidadeRealizada}
                              </p>
                            </div>
                            <div className="rounded-xl bg-white px-3 py-2">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Saldo</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {saldoOperacao}
                              </p>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  {origemOperadores === 'fallback_ativos' ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      Este turno ainda não possui operadores alocados nominalmente. A tela está
                      exibindo os operadores ativos do cadastro como fallback operacional até que a
                      alocação do turno seja preenchida.
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">Lançamentos do supervisor</h3>
                      <p className="text-sm text-slate-600">
                        Adicione uma linha por operador e operação concluída neste momento.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={adicionarLancamento}
                      disabled={pendente || operacoesDaSecao.length === 0}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Plus size={16} />
                      Nova linha
                    </button>
                  </div>

                  {estado.erro ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {estado.erro}
                    </div>
                  ) : null}

                  {estado.sucesso && estado.mensagem ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      {estado.mensagem}
                    </div>
                  ) : null}

                  {erroLocal ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      {erroLocal}
                    </div>
                  ) : null}

                  <form
                    action={executar}
                    className="space-y-4"
                    onSubmit={(event) => {
                      const erro = validarFormulario()
                      if (erro) {
                        event.preventDefault()
                        setErroLocal(erro)
                        return
                      }

                      setErroLocal(null)
                    }}
                  >
                    <input type="hidden" name="turno_setor_op_id" value={secaoSelecionada.id} />
                    <input type="hidden" name="lancamentos" value={payloadLancamentos} />

                    <div className="space-y-3">
                      {lancamentos.map((lancamento, index) => (
                        <div
                          key={lancamento.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-900">
                              Lançamento {index + 1}
                            </p>
                            <button
                              type="button"
                              onClick={() => removerLancamento(lancamento.id)}
                              disabled={pendente || lancamentos.length === 1}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Minus size={14} />
                              Remover
                            </button>
                          </div>

                          <div className="grid gap-3 md:grid-cols-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-sm font-medium text-slate-700">
                                Operador
                              </label>
                              <select
                                value={lancamento.operadorId}
                                onChange={(event) =>
                                  atualizarLancamento(lancamento.id, {
                                    operadorId: event.target.value,
                                  })
                                }
                                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Selecione</option>
                                {operadoresDaSecao.map((operador) => (
                                  <option key={operador.id} value={operador.operadorId}>
                                    {operador.operadorNome} · {operador.matricula}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-sm font-medium text-slate-700">
                                Operação
                              </label>
                              <select
                                value={lancamento.turnoSetorOperacaoId}
                                onChange={(event) =>
                                  atualizarLancamento(lancamento.id, {
                                    turnoSetorOperacaoId: event.target.value,
                                  })
                                }
                                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Selecione</option>
                                {operacoesDaSecao.map((operacao) => (
                                  <option key={operacao.id} value={operacao.id}>
                                    {operacao.sequencia}. {operacao.operacaoCodigo} ·{' '}
                                    {operacao.operacaoDescricao}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-sm font-medium text-slate-700">
                                Quantidade
                              </label>
                              <input
                                type="number"
                                min={1}
                                step={1}
                                value={lancamento.quantidade}
                                onChange={(event) =>
                                  atualizarLancamento(lancamento.id, {
                                    quantidade: event.target.value,
                                  })
                                }
                                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold">Resumo da seção selecionada</p>
                          <p>
                            {secaoSelecionada.numeroOp} · {secaoSelecionada.setorNome} · saldo atual{' '}
                            {saldoSecaoSelecionada}.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Factory size={16} />
                          {operadoresDaSecao.length} operador(es) disponível(is) para esta seção
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Package size={16} />
                        {operacoesDaSecao.length} operação(ões) derivada(s) da seção
                        <UserRound size={16} className="ml-3" />
                        {operadoresDaSecao.length} operador(es) elegível(is)
                      </div>

                      <button
                        type="submit"
                        disabled={pendente || secaoSelecionada.status === 'concluida'}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Save size={16} />
                        {pendente ? 'Registrando...' : 'Registrar lançamentos'}
                      </button>
                    </div>
                  </form>
                </div>
              </section>
            </div>
          )}
        </section>
      </section>
    </section>
  )
}
