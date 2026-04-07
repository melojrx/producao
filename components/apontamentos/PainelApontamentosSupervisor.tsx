'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Filter,
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
import { compararSetoresPorOrdem } from '@/lib/utils/setor-ordem'
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

function saldoRestanteSecao(secao: TurnoSetorOpV2): number {
  return Math.max(secao.quantidadePlanejada - secao.quantidadeConcluida, 0)
}

function saldoRestanteOperacao(operacao: TurnoSetorOperacaoApontamentoV2): number {
  return Math.max(operacao.quantidadePlanejada - operacao.quantidadeRealizada, 0)
}

function statusPermiteApontamento(
  status: TurnoSetorOpStatusV2 | TurnoSetorOperacaoStatusV2
): boolean {
  return status !== 'concluida' && status !== 'encerrada_manualmente'
}

function secaoEstaAcionavel(secao: TurnoSetorOpV2): boolean {
  return statusPermiteApontamento(secao.status) && saldoRestanteSecao(secao) > 0
}

function operacaoEstaAcionavel(operacao: TurnoSetorOperacaoApontamentoV2): boolean {
  return statusPermiteApontamento(operacao.status) && saldoRestanteOperacao(operacao) > 0
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

      return compararSetoresPorOrdem(primeiraSecao, segundaSecao)
    })
}

function criarLancamentoDraft(
  operadores: TurnoOperadorV2[],
  operacoes: TurnoSetorOperacaoApontamentoV2[]
): LancamentoDraft {
  const operacaoInicial = operacoes[0]

  return {
    id: criarIdLocal(),
    operadorId: operadores[0]?.operadorId ?? '',
    turnoSetorOperacaoId: operacaoInicial?.id ?? '',
    quantidade: operacaoInicial ? String(saldoRestanteOperacao(operacaoInicial)) : '',
  }
}

function obterQuantidadeSugerida(
  turnoSetorOperacaoId: string,
  operacoes: TurnoSetorOperacaoApontamentoV2[]
): string {
  const operacaoSelecionada = operacoes.find((operacao) => operacao.id === turnoSetorOperacaoId)

  return operacaoSelecionada ? String(saldoRestanteOperacao(operacaoSelecionada)) : ''
}

function normalizarQuantidadeInput(valor: string, saldoMaximo: number): string {
  if (valor.trim() === '') {
    return ''
  }

  const quantidade = Number.parseInt(valor, 10)
  if (!Number.isFinite(quantidade)) {
    return ''
  }

  const quantidadeNormalizada = Math.min(Math.max(quantidade, 1), Math.max(saldoMaximo, 1))
  return String(quantidadeNormalizada)
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
  const pendenciaAnteriorRef = useRef(pendente)
  const reconciliacaoPosSucessoRef = useRef<{
    secaoId: string
    secoesOrdenadas: string[]
  } | null>(null)
  const [erroLocal, setErroLocal] = useState<string | null>(null)
  const [mensagemFluxo, setMensagemFluxo] = useState<string | null>(null)
  const [filtroOp, setFiltroOp] = useState('')
  const [filtroSetor, setFiltroSetor] = useState('')
  const [filtroProduto, setFiltroProduto] = useState('')
  const secoes = useMemo(() => montarSecoesComContexto(planejamento), [planejamento])
  const secoesAcionaveis = useMemo(
    () => secoes.filter((secao) => secaoEstaAcionavel(secao)),
    [secoes]
  )
  const opcoesOp = useMemo(
    () =>
      Array.from(
        new Map(
          secoesAcionaveis
            .filter(
              (secao) =>
                (!filtroSetor || secao.setorId === filtroSetor) &&
                (!filtroProduto || secao.produtoReferencia === filtroProduto)
            )
            .map((secao) => [
              secao.turnoOpId,
              {
                id: secao.turnoOpId,
                numeroOp: secao.numeroOp,
                produtoReferencia: secao.produtoReferencia,
              },
            ])
        ).values()
      ).sort((primeiraOp, segundaOp) => primeiraOp.numeroOp.localeCompare(segundaOp.numeroOp)),
    [filtroProduto, filtroSetor, secoesAcionaveis]
  )
  const opcoesSetor = useMemo(
    () =>
      Array.from(
        new Map(
          secoesAcionaveis
            .filter(
              (secao) =>
                (!filtroOp || secao.turnoOpId === filtroOp) &&
                (!filtroProduto || secao.produtoReferencia === filtroProduto)
            )
            .map((secao) => [secao.setorId, secao])
        ).values()
      ).sort((primeiroSetor, segundoSetor) =>
        compararSetoresPorOrdem(primeiroSetor, segundoSetor)
      ),
    [filtroOp, filtroProduto, secoesAcionaveis]
  )
  const opcoesProduto = useMemo(
    () =>
      Array.from(
        new Map(
          secoesAcionaveis
            .filter(
              (secao) =>
                (!filtroOp || secao.turnoOpId === filtroOp) &&
                (!filtroSetor || secao.setorId === filtroSetor)
            )
            .map((secao) => [
              secao.produtoReferencia,
              {
                referencia: secao.produtoReferencia,
                nome: secao.produtoNome,
              },
            ])
        ).values()
      ).sort((primeiroProduto, segundoProduto) =>
        primeiroProduto.referencia.localeCompare(segundoProduto.referencia)
      ),
    [filtroOp, filtroSetor, secoesAcionaveis]
  )
  const secoesFiltradas = useMemo(
    () =>
      secoesAcionaveis.filter((secao) => {
        const correspondeOp = !filtroOp || secao.turnoOpId === filtroOp
        const correspondeSetor = !filtroSetor || secao.setorId === filtroSetor
        const correspondeProduto = !filtroProduto || secao.produtoReferencia === filtroProduto

        return correspondeOp && correspondeSetor && correspondeProduto
      }),
    [filtroOp, filtroProduto, filtroSetor, secoesAcionaveis]
  )
  const [secaoSelecionadaId, setSecaoSelecionadaId] = useState<string>(
    secoesFiltradas[0]?.id ?? secoesAcionaveis[0]?.id ?? ''
  )
  const [lancamentos, setLancamentos] = useState<LancamentoDraft[]>([])

  const secaoSelecionada = useMemo(
    () =>
      secoesAcionaveis.find((secao) => secao.id === secaoSelecionadaId) ?? secoesFiltradas[0] ?? null,
    [secaoSelecionadaId, secoesAcionaveis, secoesFiltradas]
  )

  const operacoesDaSecao = useMemo(
    () =>
      secaoSelecionada
        ? operacoesTurno.filter(
            (operacao) =>
              operacao.turnoSetorOpId === secaoSelecionada.id && operacaoEstaAcionavel(operacao)
          )
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
  const operacoesDaSecaoPorId = useMemo(
    () => new Map(operacoesDaSecao.map((operacao) => [operacao.id, operacao])),
    [operacoesDaSecao]
  )

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
    if (!secaoSelecionada && secoesAcionaveis.length > 0) {
      setSecaoSelecionadaId(secoesAcionaveis[0].id)
    }
  }, [secaoSelecionada, secoesAcionaveis])

  useEffect(() => {
    if (filtroOp && !opcoesOp.some((op) => op.id === filtroOp)) {
      setFiltroOp('')
    }
  }, [filtroOp, opcoesOp])

  useEffect(() => {
    if (filtroSetor && !opcoesSetor.some((secao) => secao.setorId === filtroSetor)) {
      setFiltroSetor('')
    }
  }, [filtroSetor, opcoesSetor])

  useEffect(() => {
    if (filtroProduto && !opcoesProduto.some((produto) => produto.referencia === filtroProduto)) {
      setFiltroProduto('')
    }
  }, [filtroProduto, opcoesProduto])

  useEffect(() => {
    setMensagemFluxo(null)
  }, [filtroOp, filtroProduto, filtroSetor])

  useEffect(() => {
    const reconciliacaoPendente = reconciliacaoPosSucessoRef.current

    if (secoesFiltradas.length === 0) {
      setSecaoSelecionadaId('')
      setLancamentos([])
      if (reconciliacaoPendente) {
        setMensagemFluxo(
          'Lançamento registrado. O recorte atual foi concluído e não restam pendências para os filtros ativos.'
        )
        reconciliacaoPosSucessoRef.current = null
      }
      return
    }

    const secaoAindaVisivel = secoesFiltradas.some((secao) => secao.id === secaoSelecionadaId)

    if (reconciliacaoPendente) {
      const secaoAnteriorSegueDisponivel = secoesFiltradas.some(
        (secao) => secao.id === reconciliacaoPendente.secaoId
      )

      if (secaoAnteriorSegueDisponivel) {
        if (secaoSelecionadaId !== reconciliacaoPendente.secaoId) {
          setSecaoSelecionadaId(reconciliacaoPendente.secaoId)
          return
        }

        setMensagemFluxo(
          'Lançamento registrado. O contexto atual ainda possui saldo e permanece pronto para o próximo apontamento.'
        )
        reconciliacaoPosSucessoRef.current = null
        return
      }

      const proximaSecaoId =
        reconciliacaoPendente.secoesOrdenadas
          .slice(reconciliacaoPendente.secoesOrdenadas.indexOf(reconciliacaoPendente.secaoId) + 1)
          .find((secaoId) => secoesFiltradas.some((secao) => secao.id === secaoId)) ??
        secoesFiltradas[0]?.id ??
        ''

      if (proximaSecaoId && secaoSelecionadaId !== proximaSecaoId) {
        setSecaoSelecionadaId(proximaSecaoId)
        return
      }

      setMensagemFluxo(
        'Lançamento registrado. O item atual foi concluído e a tela avançou para a próxima pendência acionável.'
      )
      reconciliacaoPosSucessoRef.current = null
      return
    }

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
        const proximoEstado = estadoAtual.map((lancamento) => {
          const operadorId =
            operadoresDaSecao.some((operador) => operador.operadorId === lancamento.operadorId)
              ? lancamento.operadorId
              : (operadoresDaSecao[0]?.operadorId ?? '')
          const turnoSetorOperacaoId = operacoesDaSecao.some(
            (operacao) => operacao.id === lancamento.turnoSetorOperacaoId
          )
            ? lancamento.turnoSetorOperacaoId
            : (operacoesDaSecao[0]?.id ?? '')
          const operacaoSelecionada = operacoesDaSecao.find(
            (operacao) => operacao.id === turnoSetorOperacaoId
          )
          const saldoMaximo = operacaoSelecionada ? saldoRestanteOperacao(operacaoSelecionada) : 0
          const quantidade =
            turnoSetorOperacaoId !== lancamento.turnoSetorOperacaoId
              ? obterQuantidadeSugerida(turnoSetorOperacaoId, operacoesDaSecao)
              : normalizarQuantidadeInput(lancamento.quantidade, saldoMaximo)

          return {
            ...lancamento,
            operadorId,
            turnoSetorOperacaoId,
            quantidade,
          }
        })

        const estadoMudou = proximoEstado.some(
          (lancamento, index) =>
            lancamento.operadorId !== estadoAtual[index]?.operadorId ||
            lancamento.turnoSetorOperacaoId !== estadoAtual[index]?.turnoSetorOperacaoId ||
            lancamento.quantidade !== estadoAtual[index]?.quantidade
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
    const finalizouComSucesso = pendenciaAnteriorRef.current && !pendente && estado.sucesso
    pendenciaAnteriorRef.current = pendente

    if (!finalizouComSucesso) {
      return
    }

    setErroLocal(null)
    setMensagemFluxo(null)
    if (secaoSelecionada) {
      reconciliacaoPosSucessoRef.current = {
        secaoId: secaoSelecionada.id,
        secoesOrdenadas: secoesFiltradas.map((secao) => secao.id),
      }
    }
    router.refresh()
  }, [estado.sucesso, pendente, router, secaoSelecionada, secoesFiltradas])

  function selecionarSecao(secaoId: string): void {
    setSecaoSelecionadaId(secaoId)
    setErroLocal(null)
    setMensagemFluxo(null)
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
      const operacaoSelecionada = operacoesDaSecaoPorId.get(lancamento.turnoSetorOperacaoId)
      return (
        !lancamento.operadorId ||
        !lancamento.turnoSetorOperacaoId ||
        !operacaoSelecionada ||
        !Number.isInteger(quantidade) ||
        quantidade <= 0 ||
        quantidade > saldoRestanteOperacao(operacaoSelecionada)
      )
    })

    if (possuiLancamentoInvalido) {
      return 'Preencha operador, operação e quantidade válida sem ultrapassar o saldo da operação.'
    }

    const quantidadePorOperacao = new Map<string, number>()

    for (const lancamento of lancamentos) {
      const quantidade = Number.parseInt(lancamento.quantidade, 10)
      const totalAtual = quantidadePorOperacao.get(lancamento.turnoSetorOperacaoId) ?? 0
      quantidadePorOperacao.set(lancamento.turnoSetorOperacaoId, totalAtual + quantidade)
    }

    const excedeuSaldoAgregado = Array.from(quantidadePorOperacao.entries()).some(
      ([turnoSetorOperacaoId, quantidadeTotal]) => {
        const operacaoSelecionada = operacoesDaSecaoPorId.get(turnoSetorOperacaoId)

        return operacaoSelecionada
          ? quantidadeTotal > saldoRestanteOperacao(operacaoSelecionada)
          : true
      }
    )

    if (excedeuSaldoAgregado) {
      return 'A soma das linhas não pode ultrapassar o saldo pendente da mesma operação.'
    }

    return null
  }

  const saldoSecaoSelecionada = secaoSelecionada
    ? saldoRestanteSecao(secaoSelecionada)
    : 0

  return (
    <section className="space-y-6">
      <section className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900">Filtros rápidos</h2>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
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
                {opcoesOp.map((op) => (
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
                {opcoesSetor.map((secao) => (
                  <option key={secao.setorId} value={secao.setorId}>
                    {secao.setorNome}
                  </option>
                ))}
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
                {opcoesProduto.map((produto) => (
                  <option key={produto.referencia} value={produto.referencia}>
                    {produto.referencia} · {produto.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {!secaoSelecionada ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-600">
              Nenhuma pendência operacional encontrada para os filtros atuais.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-4 border-b border-slate-200 pb-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-blue-700">Contexto operacional</p>
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

                {secoesFiltradas.length > 1 ? (
                  <div className="flex flex-col gap-1">
                    <label htmlFor="contexto-secao" className="text-sm font-medium text-slate-700">
                      Contexto acionável
                    </label>
                    <select
                      id="contexto-secao"
                      value={secaoSelecionada.id}
                      onChange={(event) => selecionarSecao(event.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {secoesFiltradas.map((secao) => (
                        <option key={secao.id} value={secao.id}>
                          {secao.numeroOp} · {secao.setorNome} · saldo {saldoRestanteSecao(secao)}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500">
                      Os filtros atuais ainda possuem mais de uma pendência. Escolha o contexto que
                      vai receber o lançamento agora.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                    O recorte filtrado já convergiu para uma única pendência acionável. O formulário
                    abaixo está pronto para lançamento direto.
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-4">
                  <article className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Planejado
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {secaoSelecionada.quantidadePlanejada}
                    </p>
                  </article>
                  <article className="rounded-2xl bg-emerald-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                      Peças completas
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-emerald-900">
                      {secaoSelecionada.quantidadeConcluida}
                    </p>
                  </article>
                  <article className="rounded-2xl bg-amber-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                      Saldo
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-amber-900">
                      {saldoSecaoSelecionada}
                    </p>
                  </article>
                  <article className="rounded-2xl bg-blue-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
                      Progresso operacional
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-blue-900">
                      {secaoSelecionada.progressoOperacionalPct.toFixed(0)}%
                    </p>
                  </article>
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
                    <h3 className="text-base font-semibold text-slate-900">
                      Lançamentos do supervisor
                    </h3>
                    <p className="text-sm text-slate-600">
                      O formulário já está focado no contexto filtrado. Registre apenas o que foi
                      concluído neste momento.
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

                {mensagemFluxo ? (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                    {mensagemFluxo}
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

                  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-2 font-medium">
                        <Package size={16} />
                        {operacoesDaSecao.length} operação(ões) acionável(is)
                      </span>
                      <span className="inline-flex items-center gap-2 font-medium">
                        <UserRound size={16} />
                        {operadoresDaSecao.length} operador(es) elegível(is)
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {lancamentos.map((lancamento, index) => {
                      const operacaoSelecionada = operacoesDaSecaoPorId.get(
                        lancamento.turnoSetorOperacaoId
                      )
                      const saldoMaximo = operacaoSelecionada
                        ? saldoRestanteOperacao(operacaoSelecionada)
                        : 0

                      return (
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
                              <label className="text-sm font-medium text-slate-700">Operador</label>
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
                              <label className="text-sm font-medium text-slate-700">Operação</label>
                              <select
                                value={lancamento.turnoSetorOperacaoId}
                                onChange={(event) => {
                                  const turnoSetorOperacaoId = event.target.value

                                  atualizarLancamento(lancamento.id, {
                                    turnoSetorOperacaoId,
                                    quantidade: obterQuantidadeSugerida(
                                      turnoSetorOperacaoId,
                                      operacoesDaSecao
                                    ),
                                  })
                                }}
                                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Selecione</option>
                                {operacoesDaSecao.map((operacao) => (
                                  <option key={operacao.id} value={operacao.id}>
                                    {operacao.sequencia}. {operacao.operacaoCodigo} · saldo{' '}
                                    {saldoRestanteOperacao(operacao)}
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
                                max={operacaoSelecionada ? saldoMaximo : undefined}
                                step={1}
                                value={lancamento.quantidade}
                                onChange={(event) =>
                                  atualizarLancamento(lancamento.id, {
                                    quantidade: normalizarQuantidadeInput(
                                      event.target.value,
                                      saldoMaximo
                                    ),
                                  })
                                }
                                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <p className="text-xs text-slate-500">
                                Sugestão automática: saldo atual da operação selecionada.
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                    <p className="text-sm text-slate-500">
                      {secaoSelecionada.numeroOp} · {secaoSelecionada.setorNome} · saldo atual{' '}
                      {saldoSecaoSelecionada}.
                    </p>

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
            </div>
          )}
        </section>
      </section>
    </section>
  )
}
