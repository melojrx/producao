'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, PackagePlus, Plus, Trash2, Users, X } from 'lucide-react'
import { abrirTurnoFormulario } from '@/lib/actions/turnos'
import type {
  AbrirTurnoV2ActionState,
} from '@/lib/actions/turnos'
import type { PlanejamentoTurnoDashboardV2, ProdutoTurnoOption } from '@/types'

interface ModalNovoTurnoV2Props {
  planejamentoAtual: PlanejamentoTurnoDashboardV2 | null
  produtos: ProdutoTurnoOption[]
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

function criarIdLocal(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `turno-op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function criarOpDraft(produtos: ProdutoTurnoOption[]): TurnoOpDraft {
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

export function ModalNovoTurnoV2({
  planejamentoAtual,
  produtos,
  bloqueante = false,
  aoFechar,
}: ModalNovoTurnoV2Props) {
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

  useEffect(() => {
    if (!estado.sucesso) {
      return
    }

    if (aoFechar) {
      aoFechar()
    }

    router.refresh()
  }, [aoFechar, estado.sucesso, router])

  function adicionarOp(): void {
    setOps((estadoAtual) => [...estadoAtual, criarOpDraft(produtos)])
    setErroLocal(null)
  }

  function removerOp(opId: string): void {
    setOps((estadoAtual) => {
      if (estadoAtual.length === 1) {
        return estadoAtual
      }

      return estadoAtual.filter((op) => op.id !== opId)
    })
  }

  function atualizarOp(opId: string, atualizacao: Partial<TurnoOpDraft>): void {
    setOps((estadoAtual) =>
      estadoAtual.map((op) => (op.id === opId ? { ...op, ...atualizacao } : op))
    )
  }

  const payloadOps = JSON.stringify(
    ops.map((op) => ({
      numeroOp: op.numeroOp.trim(),
      produtoId: op.produtoId,
      quantidadePlanejada: Number.parseInt(op.quantidadePlanejada, 10) || 0,
    }))
  )
  const quantidadeTotalPlanejada = ops.reduce((soma, op) => {
    const quantidade = Number.parseInt(op.quantidadePlanejada, 10)
    return soma + (Number.isInteger(quantidade) ? quantidade : 0)
  }, 0)

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
            if (ops.length === 0) {
              event.preventDefault()
              setErroLocal('Adicione pelo menos uma OP antes de abrir o turno.')
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

            const quantidadeOperadores = Number.parseInt(operadoresDisponiveis, 10)
            if (!Number.isInteger(quantidadeOperadores) || quantidadeOperadores <= 0) {
              event.preventDefault()
              setErroLocal('Informe uma quantidade válida de operadores disponíveis.')
              return
            }
          }}
        >
          <input type="hidden" name="ops_planejadas" value={payloadOps} />

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
                name="operadores_disponiveis"
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
                name="minutos_turno"
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
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">OPs do turno</h3>
                  <p className="text-sm text-slate-600">
                    Cada OP informa produto e quantidade planejada. Os setores serão derivados ao salvar.
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
                        disabled={ops.length === 1}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
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

          <section className="grid gap-4 rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50 to-blue-50 p-5 md:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Operadores</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {operadoresDisponiveis}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">OPs</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{ops.length}</p>
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
              O sistema gera automaticamente as seções por setor para cada OP salva.
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
