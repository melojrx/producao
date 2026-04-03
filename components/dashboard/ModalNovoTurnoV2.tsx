'use client'

import { useActionState, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AlertTriangle, CalendarClock, PackagePlus, Plus, Trash2, Users, X } from 'lucide-react'
import { abrirTurnoFormulario } from '@/lib/actions/turnos'
import { calcularDimensionamentoPessoasPorSetor } from '@/lib/utils/dimensionamento-pessoas-setor'
import { ABRIR_TURNO_FORM_FIELDS } from '@/lib/utils/turno-formulario'
import type {
  AbrirTurnoV2ActionState,
} from '@/lib/actions/turnos'
import type { DimensionamentoPessoasSetorInput } from '@/lib/utils/dimensionamento-pessoas-setor'
import type { PlanejamentoTurnoDashboardV2, ProdutoListItem } from '@/types'

interface ModalNovoTurnoV2Props {
  planejamentoAtual: PlanejamentoTurnoDashboardV2 | null
  produtos: ProdutoListItem[]
  bloqueante?: boolean
  aoFechar?: () => void
}

interface TurnoOpDraft {
  id: string
  numeroOp: string
  produtoId: string
  quantidadePlanejada: string
}

const estadoInicial: AbrirTurnoV2ActionState = {
  sucesso: false,
}

interface AvisoPreviaDimensionamento {
  id: string
  mensagem: string
}

function criarIdLocal(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `turno-op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function criarOpDraft(produtos: ProdutoListItem[]): TurnoOpDraft {
  return {
    id: criarIdLocal(),
    numeroOp: '',
    produtoId: produtos[0]?.id ?? '',
    quantidadePlanejada: '0',
  }
}

function formatarDataHoraAtual(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Fortaleza',
  }).format(new Date())
}

function manterApenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

function parseNumeroInteiroPositivo(valor: string): number {
  const numero = Number.parseInt(valor, 10)
  return Number.isInteger(numero) && numero > 0 ? numero : 0
}

function formatarNumero(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: Number.isInteger(valor) ? 0 : 2,
  }).format(valor)
}

function formatarCargaMinutos(valor: number): string {
  return `${formatarNumero(valor)} min`
}

export function ModalNovoTurnoV2({
  planejamentoAtual,
  produtos,
  bloqueante = false,
  aoFechar,
}: ModalNovoTurnoV2Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [estado, executar, pendente] = useActionState(abrirTurnoFormulario, estadoInicial)
  const [erroLocal, setErroLocal] = useState<string | null>(null)
  const [minutosTurno, setMinutosTurno] = useState(
    String(planejamentoAtual?.turno.minutosTurno ?? 540)
  )
  const [operadoresDisponiveis, setOperadoresDisponiveis] = useState(
    String(planejamentoAtual?.turno.operadoresDisponiveis ?? 20)
  )
  const [ops, setOps] = useState<TurnoOpDraft[]>([criarOpDraft(produtos)])
  const [carregarPendencias, setCarregarPendencias] = useState(false)
  const [turnoOpIdsPendentes, setTurnoOpIdsPendentes] = useState<string[]>([])
  const pendenciasDisponiveis = (planejamentoAtual?.ops ?? []).filter(
    (op) => op.quantidadePlanejadaRemanescente > 0
  )
  const pendenciasDisponiveisKey = pendenciasDisponiveis.map((op) => op.id).join('|')
  const pendenciasSelecionadas = pendenciasDisponiveis.filter((op) =>
    turnoOpIdsPendentes.includes(op.id)
  )

  useEffect(() => {
    if (!estado.sucesso) {
      return
    }

    if (aoFechar) {
      aoFechar()
    }

    if (pathname === '/admin/dashboard') {
      router.refresh()
      return
    }

    router.replace('/admin/dashboard')
  }, [aoFechar, estado.sucesso, pathname, router])

  useEffect(() => {
    if (pendenciasDisponiveis.length === 0) {
      setCarregarPendencias(false)
      setTurnoOpIdsPendentes([])
      return
    }

    setTurnoOpIdsPendentes((estadoAtual) =>
      estadoAtual.filter((turnoOpId) =>
        pendenciasDisponiveis.some((pendencia) => pendencia.id === turnoOpId)
      )
    )
  }, [pendenciasDisponiveisKey])

  function adicionarOp(): void {
    setOps((estadoAtual) => [...estadoAtual, criarOpDraft(produtos)])
    setErroLocal(null)
  }

  function removerOp(opId: string): void {
    setOps((estadoAtual) => estadoAtual.filter((op) => op.id !== opId))
    setErroLocal(null)
  }

  function atualizarOp(opId: string, atualizacao: Partial<TurnoOpDraft>): void {
    setOps((estadoAtual) =>
      estadoAtual.map((op) => (op.id === opId ? { ...op, ...atualizacao } : op))
    )
  }

  function alternarCarryOver(ativo: boolean): void {
    setCarregarPendencias(ativo)
    setTurnoOpIdsPendentes(ativo ? pendenciasDisponiveis.map((pendencia) => pendencia.id) : [])
    setErroLocal(null)
  }

  function alternarPendencia(turnoOpId: string): void {
    setTurnoOpIdsPendentes((estadoAtual) =>
      estadoAtual.includes(turnoOpId)
        ? estadoAtual.filter((id) => id !== turnoOpId)
        : [...estadoAtual, turnoOpId]
    )
    setErroLocal(null)
  }

  const payloadOps = JSON.stringify(
    ops.map((op) => ({
      numeroOp: op.numeroOp.trim(),
      produtoId: op.produtoId,
      quantidadePlanejada: Number.parseInt(op.quantidadePlanejada, 10) || 0,
    }))
  )
  const quantidadeTotalPlanejadaNovasOps = ops.reduce((soma, op) => {
    const quantidade = Number.parseInt(op.quantidadePlanejada, 10)
    return soma + (Number.isInteger(quantidade) ? quantidade : 0)
  }, 0)
  const quantidadeTotalPendencias = carregarPendencias
    ? pendenciasSelecionadas.reduce(
        (soma, pendencia) => soma + pendencia.quantidadePlanejadaRemanescente,
        0
      )
    : 0
  const quantidadeTotalPlanejada = quantidadeTotalPlanejadaNovasOps + quantidadeTotalPendencias
  const operadoresDisponiveisNumero = parseNumeroInteiroPositivo(operadoresDisponiveis)
  const minutosTurnoNumero = parseNumeroInteiroPositivo(minutosTurno)
  const produtosPorId = new Map(produtos.map((produto) => [produto.id, produto]))
  const avisosPrevia: AvisoPreviaDimensionamento[] = []
  const opsParaDimensionamento: DimensionamentoPessoasSetorInput['ops'] = []

  for (const op of ops) {
    const quantidadePlanejada = parseNumeroInteiroPositivo(op.quantidadePlanejada)
    const numeroOp = op.numeroOp.trim()
    const produtoSelecionado = produtosPorId.get(op.produtoId)

    if (!numeroOp || !produtoSelecionado || quantidadePlanejada <= 0) {
      if (numeroOp || op.produtoId || quantidadePlanejada > 0) {
        avisosPrevia.push({
          id: `draft-incompleto-${op.id}`,
          mensagem: `A OP ${numeroOp || 'sem número'} ainda está incompleta e não entrou na prévia.`,
        })
      }
      continue
    }

    if (produtoSelecionado.roteiro.length === 0) {
      avisosPrevia.push({
        id: `draft-sem-roteiro-${op.id}`,
        mensagem: `A OP ${numeroOp} usa o produto ${produtoSelecionado.nome}, mas ele não possui roteiro válido para dimensionamento.`,
      })
      continue
    }

    opsParaDimensionamento.push({
      numeroOp,
      produtoId: produtoSelecionado.id,
      produtoNome: produtoSelecionado.nome,
      produtoReferencia: produtoSelecionado.referencia,
      quantidadePlanejada,
      roteiro: produtoSelecionado.roteiro.map((item) => ({
        operacaoId: item.operacaoId,
        setorId: item.setorId,
        setorCodigo: item.setorCodigo,
        setorNome: item.setorNome,
        tempoPadraoMin: item.tempoPadraoMin,
      })),
    })
  }

  if (carregarPendencias) {
    for (const pendencia of pendenciasSelecionadas) {
      const produtoSelecionado = produtosPorId.get(pendencia.produtoId)

      if (!produtoSelecionado) {
        avisosPrevia.push({
          id: `pendencia-sem-produto-${pendencia.id}`,
          mensagem: `A pendência ${pendencia.numeroOp} não encontrou o produto correspondente no catálogo carregado.`,
        })
        continue
      }

      if (produtoSelecionado.roteiro.length === 0) {
        avisosPrevia.push({
          id: `pendencia-sem-roteiro-${pendencia.id}`,
          mensagem: `A pendência ${pendencia.numeroOp} usa o produto ${produtoSelecionado.nome}, mas ele não possui roteiro válido para dimensionamento.`,
        })
        continue
      }

      opsParaDimensionamento.push({
        numeroOp: pendencia.numeroOp,
        produtoId: produtoSelecionado.id,
        produtoNome: produtoSelecionado.nome,
        produtoReferencia: produtoSelecionado.referencia,
        quantidadePlanejada: pendencia.quantidadePlanejadaRemanescente,
        roteiro: produtoSelecionado.roteiro.map((item) => ({
          operacaoId: item.operacaoId,
          setorId: item.setorId,
          setorCodigo: item.setorCodigo,
          setorNome: item.setorNome,
          tempoPadraoMin: item.tempoPadraoMin,
        })),
      })
    }
  }

  const resumoDimensionamento = calcularDimensionamentoPessoasPorSetor({
    operadoresDisponiveis: operadoresDisponiveisNumero,
    minutosTurno: minutosTurnoNumero,
    ops: opsParaDimensionamento,
  })
  const totalSetoresDimensionados = resumoDimensionamento.setores.length
  const totalOpsDimensionadas = opsParaDimensionamento.length
  const saldoOperadores = Math.max(
    operadoresDisponiveisNumero - resumoDimensionamento.totalPessoasSugeridas,
    0
  )
  const existeDeficitDimensionamento = resumoDimensionamento.deficitOperadores > 0

  const existeTurnoAberto = planejamentoAtual?.origem === 'aberto'
  const titulo = 'Novo Turno'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              <CalendarClock size={14} />
              Abertura operacional do dia
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{titulo}</h2>
              <p className="text-sm text-slate-600">
                Data e hora automáticas. O supervisor informa operadores, minutos e as OPs do dia;
                o sistema deriva os setores automaticamente.
              </p>
            </div>
          </div>

          {!bloqueante && aoFechar ? (
            <button
              type="button"
              onClick={aoFechar}
              aria-label="Fechar modal de novo turno"
              className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={20} />
            </button>
          ) : null}
        </div>

        <form
          action={executar}
          className="flex flex-col gap-6 p-6"
          onSubmit={(event) => {
            const existeCarryOverSelecionado = carregarPendencias && turnoOpIdsPendentes.length > 0

            if (ops.length === 0 && !existeCarryOverSelecionado) {
              event.preventDefault()
              setErroLocal(
                'Adicione pelo menos uma OP nova ou carregue pendências antes de abrir o turno.'
              )
              return
            }

            const existeOpInvalida = ops.some(
              (op) =>
                !op.numeroOp.trim() ||
                !op.produtoId ||
                !Number.isInteger(Number.parseInt(op.quantidadePlanejada, 10)) ||
                Number.parseInt(op.quantidadePlanejada, 10) <= 0
            )

            if (existeOpInvalida) {
              event.preventDefault()
              setErroLocal(
                'Preencha número da OP, produto e quantidade planejada válida para todas as OPs.'
              )
              return
            }

            if (carregarPendencias && turnoOpIdsPendentes.length === 0) {
              event.preventDefault()
              setErroLocal('Selecione pelo menos uma pendência para carregar no novo turno.')
              return
            }

            const quantidadeOperadores = Number.parseInt(operadoresDisponiveis, 10)
            if (!Number.isInteger(quantidadeOperadores) || quantidadeOperadores <= 0) {
              event.preventDefault()
              setErroLocal('Informe uma quantidade válida de operadores disponíveis.')
              return
            }
          }}
        >
          <input
            type="hidden"
            name={ABRIR_TURNO_FORM_FIELDS.opsPlanejadas}
            value={payloadOps}
          />
          <input type="hidden" name={ABRIR_TURNO_FORM_FIELDS.operadorIds} value="[]" />
          <input
            type="hidden"
            name={ABRIR_TURNO_FORM_FIELDS.carregarPendenciasTurnoAnterior}
            value={carregarPendencias ? 'true' : 'false'}
          />
          <input
            type="hidden"
            name={ABRIR_TURNO_FORM_FIELDS.turnoOrigemPendenciasId}
            value={planejamentoAtual?.turno.id ?? ''}
          />
          <input
            type="hidden"
            name={ABRIR_TURNO_FORM_FIELDS.turnoOpIdsPendentes}
            value={JSON.stringify(turnoOpIdsPendentes)}
          />

          {existeTurnoAberto ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Existe um turno aberto no momento. Ao salvar este novo turno, o sistema encerrará o
              turno atual e abrirá o próximo planejamento.
            </div>
          ) : null}

          {estado.erro ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {estado.erro}
            </div>
          ) : null}

          {erroLocal ? (
            <div
              role="alert"
              className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            >
              {erroLocal}
            </div>
          ) : null}

          <section className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Data/Hora do turno
              </p>
              <p className="text-lg font-semibold text-slate-900">{formatarDataHoraAtual()}</p>
              <p className="text-xs text-slate-500">O registro usa a data/hora atual do momento da abertura.</p>
            </div>

            <div className="space-y-1">
              <label htmlFor="operadores_disponiveis" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Operadores disponíveis
              </label>
              <input
                id="operadores_disponiveis"
                name={ABRIR_TURNO_FORM_FIELDS.operadoresDisponiveis}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                value={operadoresDisponiveis}
                onChange={(event) =>
                  setOperadoresDisponiveis(manterApenasDigitos(event.target.value))
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500">
                Informe apenas a quantidade total prevista para o turno.
              </p>
            </div>

            <div className="space-y-1">
              <label htmlFor="minutos_turno" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Minutos do turno
              </label>
              <input
                id="minutos_turno"
                name={ABRIR_TURNO_FORM_FIELDS.minutosTurno}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                value={minutosTurno}
                onChange={(event) => setMinutosTurno(manterApenasDigitos(event.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500">Sugestão: 480 ou 540 minutos.</p>
            </div>
          </section>

          <section className="grid gap-4">
            {pendenciasDisponiveis.length > 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Pendências para carry-over
                    </h3>
                    <p className="text-sm text-slate-600">
                      {existeTurnoAberto
                        ? 'O turno atual será encerrado e você pode carregar o saldo remanescente para o próximo turno.'
                        : 'Você pode iniciar o novo turno reaproveitando o saldo remanescente do último turno encerrado.'}
                    </p>
                  </div>

                  <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={carregarPendencias}
                      onChange={(event) => alternarCarryOver(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Carregar pendências selecionadas
                  </label>
                </div>

                <div className="mt-4 grid gap-3">
                  {pendenciasDisponiveis.map((pendencia) => (
                    <label
                      key={pendencia.id}
                      className={`flex cursor-pointer flex-col gap-3 rounded-2xl border px-4 py-4 transition-colors ${
                        carregarPendencias && turnoOpIdsPendentes.includes(pendencia.id)
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-slate-900">
                            {pendencia.numeroOp} · {pendencia.produtoNome}
                          </div>
                          <div className="text-xs text-slate-500">
                            {pendencia.produtoReferencia}
                          </div>
                        </div>

                        <input
                          type="checkbox"
                          checked={carregarPendencias && turnoOpIdsPendentes.includes(pendencia.id)}
                          disabled={!carregarPendencias}
                          onChange={() => alternarPendencia(pendencia.id)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Selecionar pendência da ${pendencia.numeroOp}`}
                        />
                      </div>

                      <div className="grid gap-3 text-xs text-slate-600 sm:grid-cols-3">
                        <div className="rounded-xl bg-white px-3 py-2">
                          <div className="uppercase tracking-wide text-slate-400">Original</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {pendencia.quantidadePlanejadaOriginal}
                          </div>
                        </div>

                        <div className="rounded-xl bg-white px-3 py-2">
                          <div className="uppercase tracking-wide text-slate-400">Produzido</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {pendencia.quantidadeRealizada}
                          </div>
                        </div>

                        <div className="rounded-xl bg-white px-3 py-2">
                          <div className="uppercase tracking-wide text-slate-400">Saldo</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {pendencia.quantidadePlanejadaRemanescente}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Novas OPs do turno</h3>
                  <p className="text-sm text-slate-600">
                    Você pode combinar novas OPs com o carry-over carregado. Os setores serão
                    derivados ao salvar.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={adicionarOp}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  <Plus size={16} />
                  Adicionar OP
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {ops.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                    Nenhuma nova OP adicionada. Você ainda pode abrir o turno somente com carry-over
                    das pendências selecionadas.
                  </div>
                ) : null}

                {ops.map((op, index) => (
                  <article
                    key={op.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                        <PackagePlus size={14} />
                        OP {index + 1}
                      </div>

                      <button
                        type="button"
                        onClick={() => removerOp(op.id)}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white hover:text-red-600"
                        aria-label={`Remover OP ${index + 1}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[1fr_1.4fr_0.8fr]">
                      <div className="space-y-1">
                        <label
                          htmlFor={`numero-op-${op.id}`}
                          className="text-xs font-medium uppercase tracking-wide text-slate-500"
                        >
                          Número da OP
                        </label>
                        <input
                          id={`numero-op-${op.id}`}
                          type="text"
                          value={op.numeroOp}
                          onChange={(event) =>
                            atualizarOp(op.id, { numeroOp: event.target.value })
                          }
                          placeholder="Ex.: OP-2026-001"
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label
                          htmlFor={`produto-${op.id}`}
                          className="text-xs font-medium uppercase tracking-wide text-slate-500"
                        >
                          Produto
                        </label>
                        <select
                          id={`produto-${op.id}`}
                          value={op.produtoId}
                          onChange={(event) =>
                            atualizarOp(op.id, { produtoId: event.target.value })
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {produtos.map((produto) => (
                            <option key={produto.id} value={produto.id}>
                              {produto.nome} ({produto.referencia})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label
                          htmlFor={`quantidade-${op.id}`}
                          className="text-xs font-medium uppercase tracking-wide text-slate-500"
                        >
                          Quantidade planejada
                        </label>
                        <input
                          id={`quantidade-${op.id}`}
                          type="number"
                          min="1"
                          step="1"
                          value={op.quantidadePlanejada}
                          onChange={(event) =>
                            atualizarOp(op.id, { quantidadePlanejada: event.target.value })
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Prévia de pessoas por setor
                </h3>
                <p className="text-sm text-slate-600">
                  Sugestão operacional calculada em tempo real pela carga planejada das OPs válidas
                  do turno. Nesta etapa, a prévia não altera a gravação do turno.
                </p>
              </div>

              <div
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                  existeDeficitDimensionamento
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                <Users size={14} />
                {existeDeficitDimensionamento
                  ? `Déficit de ${resumoDimensionamento.deficitOperadores} operador(es)`
                  : 'Capacidade sem déficit na prévia'}
              </div>
            </div>

            {avisosPrevia.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    {avisosPrevia.map((aviso) => (
                      <p key={aviso.id}>{aviso.mensagem}</p>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {minutosTurnoNumero <= 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                Informe os minutos do turno para calcular a distribuição sugerida por setor.
              </div>
            ) : totalOpsDimensionadas === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                Adicione pelo menos uma OP válida ou selecione pendências com roteiro para gerar a
                prévia setorial.
              </div>
            ) : (
              <>
                <div className="mt-4 grid gap-4 lg:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Setores na prévia
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">
                      {totalSetoresDimensionados}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      OPs consideradas
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">
                      {totalOpsDimensionadas}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Pessoas sugeridas
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">
                      {resumoDimensionamento.totalPessoasSugeridas}
                    </p>
                  </div>

                  <div
                    className={`rounded-2xl border px-4 py-4 ${
                      existeDeficitDimensionamento
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-emerald-200 bg-emerald-50'
                    }`}
                  >
                    <p
                      className={`text-xs font-medium uppercase tracking-wide ${
                        existeDeficitDimensionamento ? 'text-amber-700' : 'text-emerald-700'
                      }`}
                    >
                      {existeDeficitDimensionamento ? 'Déficit' : 'Folga'}
                    </p>
                    <p
                      className={`mt-2 text-3xl font-semibold ${
                        existeDeficitDimensionamento ? 'text-amber-900' : 'text-emerald-900'
                      }`}
                    >
                      {existeDeficitDimensionamento
                        ? resumoDimensionamento.deficitOperadores
                        : saldoOperadores}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-2">
                  {resumoDimensionamento.setores.map((setor) => (
                    <article
                      key={setor.setorId}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">{setor.setorNome}</h4>
                          <p className="mt-1 text-xs text-slate-500">
                            Carga prevista de {formatarCargaMinutos(setor.cargaMinutos)} no turno.
                          </p>
                        </div>

                        <div className="rounded-2xl bg-blue-100 px-3 py-2 text-right text-blue-900">
                          <div className="text-[11px] font-medium uppercase tracking-wide text-blue-700">
                            Pessoas
                          </div>
                          <div className="text-2xl font-semibold">{setor.pessoasNecessarias}</div>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        {setor.contribuicoes.map((contribuicao) => (
                          <div
                            key={`${setor.setorId}-${contribuicao.numeroOp}-${contribuicao.produtoId}`}
                            className="rounded-xl border border-white bg-white px-3 py-3 text-sm text-slate-700"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-900">
                                  {contribuicao.numeroOp} · {contribuicao.produtoNome}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {contribuicao.produtoReferencia ?? 'Sem referência'} ·{' '}
                                  {contribuicao.quantidadePlanejada} peças
                                </p>
                              </div>

                              <div className="text-right text-xs text-slate-500">
                                <div>TP setor {formatarNumero(contribuicao.tpTotalSetorProduto)} min</div>
                                <div>{formatarCargaMinutos(contribuicao.cargaMinutos)}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="grid gap-4 rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50 to-blue-50 p-5 md:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Operadores</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {operadoresDisponiveis}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Carry-over
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{quantidadeTotalPendencias}</p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">OPs</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {ops.length + (carregarPendencias ? pendenciasSelecionadas.length : 0)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Quantidade total
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{quantidadeTotalPlanejada}</p>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex items-center gap-2 text-sm text-slate-500">
              <Users size={16} />
              O sistema ativa os setores necessários do turno e consolida as OPs dentro deles desde
              a abertura.
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {!bloqueante && aoFechar ? (
                <button
                  type="button"
                  onClick={aoFechar}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Cancelar
                </button>
              ) : null}

              <button
                type="submit"
                disabled={pendente || produtos.length === 0}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {pendente ? 'Abrindo turno...' : 'Salvar novo turno'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
