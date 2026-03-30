'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import {
  CalendarClock,
  ClipboardList,
  LoaderCircle,
  Lock,
  PackagePlus,
  PencilLine,
  Plus,
  Users,
  X,
} from 'lucide-react'
import { adicionarOpAoTurno, editarOpDoTurno } from '@/lib/actions/turnos'
import type { PlanejamentoTurnoDashboardV2, ProdutoTurnoOption, TurnoOpV2 } from '@/types'

interface ModalEditarTurnoAbertoV2Props {
  planejamento: PlanejamentoTurnoDashboardV2
  produtos: ProdutoTurnoOption[]
  aoAtualizarPlanejamento: () => Promise<void>
  aoFechar: () => void
}

interface NovaOpDraft {
  id: string
  numeroOp: string
  produtoId: string
  quantidadePlanejada: string
}

interface EdicaoOpDraft {
  turnoOpId: string
  numeroOp: string
  produtoId: string
  quantidadePlanejada: string
}

function criarIdLocal(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `nova-op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function criarNovaOpDraft(produtos: ProdutoTurnoOption[]): NovaOpDraft {
  return {
    id: criarIdLocal(),
    numeroOp: '',
    produtoId: produtos[0]?.id ?? '',
    quantidadePlanejada: '',
  }
}

function criarEdicaoOpDraft(op: TurnoOpV2): EdicaoOpDraft {
  return {
    turnoOpId: op.id,
    numeroOp: op.numeroOp,
    produtoId: op.produtoId,
    quantidadePlanejada: String(op.quantidadePlanejada),
  }
}

function formatarDataHoraAtual(dataIso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Fortaleza',
  }).format(new Date(dataIso))
}

function manterApenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

export function ModalEditarTurnoAbertoV2({
  planejamento,
  produtos,
  aoAtualizarPlanejamento,
  aoFechar,
}: ModalEditarTurnoAbertoV2Props) {
  const [salvandoNovasOps, iniciarSalvamentoNovasOps] = useTransition()
  const [salvandoEdicao, iniciarSalvamentoEdicao] = useTransition()
  const [novasOps, setNovasOps] = useState<NovaOpDraft[]>([criarNovaOpDraft(produtos)])
  const [edicaoOp, setEdicaoOp] = useState<EdicaoOpDraft | null>(null)
  const [mensagemRetorno, setMensagemRetorno] = useState<string | null>(null)
  const [tipoMensagem, setTipoMensagem] = useState<'sucesso' | 'erro'>('sucesso')

  const totalPlanejadoAtual = useMemo(
    () => planejamento.ops.reduce((soma, op) => soma + op.quantidadePlanejada, 0),
    [planejamento.ops]
  )

  const totalPlanejadoNovasOps = useMemo(
    () =>
      novasOps.reduce((soma, op) => {
        const quantidade = Number.parseInt(op.quantidadePlanejada, 10)
        return soma + (Number.isInteger(quantidade) ? quantidade : 0)
      }, 0),
    [novasOps]
  )

  const possuiProducaoPorOp = useMemo(() => {
    const mapa = new Map<string, boolean>()

    for (const op of planejamento.ops) {
      mapa.set(op.id, false)
    }

    for (const secao of planejamento.secoesSetorOp) {
      if (secao.quantidadeRealizada > 0) {
        mapa.set(secao.turnoOpId, true)
      }
    }

    return mapa
  }, [planejamento.ops, planejamento.secoesSetorOp])

  useEffect(() => {
    if (!edicaoOp) {
      return
    }

    const opAtualizada = planejamento.ops.find((op) => op.id === edicaoOp.turnoOpId)
    if (!opAtualizada) {
      setEdicaoOp(null)
      return
    }

    if (possuiProducaoPorOp.get(opAtualizada.id)) {
      setEdicaoOp(null)
    }
  }, [edicaoOp, planejamento.ops, possuiProducaoPorOp])

  function adicionarNovaOp(): void {
    setNovasOps((estadoAtual) => [...estadoAtual, criarNovaOpDraft(produtos)])
    setMensagemRetorno(null)
  }

  function atualizarNovaOp(opId: string, atualizacao: Partial<NovaOpDraft>): void {
    setNovasOps((estadoAtual) =>
      estadoAtual.map((op) => (op.id === opId ? { ...op, ...atualizacao } : op))
    )
    setMensagemRetorno(null)
  }

  function removerNovaOp(opId: string): void {
    setNovasOps((estadoAtual) => {
      if (estadoAtual.length === 1) {
        return estadoAtual
      }

      return estadoAtual.filter((op) => op.id !== opId)
    })
    setMensagemRetorno(null)
  }

  function validarNovasOps(): { valido: boolean; mensagem?: string } {
    if (novasOps.length === 0) {
      return { valido: false, mensagem: 'Adicione pelo menos uma OP antes de salvar.' }
    }

    const numeros = new Set<string>()

    for (const op of novasOps) {
      const numeroOp = op.numeroOp.trim().toUpperCase()
      const quantidadePlanejada = Number.parseInt(op.quantidadePlanejada, 10)

      if (!numeroOp || !op.produtoId || !Number.isInteger(quantidadePlanejada) || quantidadePlanejada <= 0) {
        return {
          valido: false,
          mensagem:
            'Preencha número da OP, produto e quantidade planejada válida para todas as novas OPs.',
        }
      }

      if (numeros.has(numeroOp)) {
        return {
          valido: false,
          mensagem: `A OP ${numeroOp} foi informada mais de uma vez na mesma inclusão.`,
        }
      }

      numeros.add(numeroOp)
    }

    return { valido: true }
  }

  function iniciarEdicaoOp(op: TurnoOpV2): void {
    setEdicaoOp(criarEdicaoOpDraft(op))
    setMensagemRetorno(null)
  }

  function cancelarEdicaoOp(): void {
    setEdicaoOp(null)
    setMensagemRetorno(null)
  }

  function atualizarEdicaoOp(atualizacao: Partial<EdicaoOpDraft>): void {
    setEdicaoOp((estadoAtual) => (estadoAtual ? { ...estadoAtual, ...atualizacao } : estadoAtual))
    setMensagemRetorno(null)
  }

  function validarEdicaoOp(): { valido: boolean; mensagem?: string } {
    if (!edicaoOp) {
      return { valido: false, mensagem: 'Nenhuma OP foi selecionada para edição.' }
    }

    const numeroOp = edicaoOp.numeroOp.trim().toUpperCase()
    const quantidadePlanejada = Number.parseInt(edicaoOp.quantidadePlanejada, 10)

    if (!numeroOp || !edicaoOp.produtoId || !Number.isInteger(quantidadePlanejada) || quantidadePlanejada <= 0) {
      return {
        valido: false,
        mensagem: 'Preencha número da OP, produto e quantidade planejada válida antes de salvar a edição.',
      }
    }

    return { valido: true }
  }

  function handleSalvarNovasOps(): void {
    const validacao = validarNovasOps()
    if (!validacao.valido) {
      setTipoMensagem('erro')
      setMensagemRetorno(validacao.mensagem ?? 'Não foi possível validar as novas OPs.')
      return
    }

    iniciarSalvamentoNovasOps(async () => {
      let quantidadeSalva = 0
      const draftsSalvos = new Set<string>()

      for (const op of novasOps) {
        const resultado = await adicionarOpAoTurno({
          turnoId: planejamento.turno.id,
          numeroOp: op.numeroOp.trim().toUpperCase(),
          produtoId: op.produtoId,
          quantidadePlanejada: Number.parseInt(op.quantidadePlanejada, 10),
        })

        if (!resultado.sucesso) {
          if (quantidadeSalva > 0) {
            await aoAtualizarPlanejamento()
            setNovasOps((estadoAtual) => {
              const restantes = estadoAtual.filter((item) => !draftsSalvos.has(item.id))
              return restantes.length > 0 ? restantes : [criarNovaOpDraft(produtos)]
            })
            setTipoMensagem('erro')
            setMensagemRetorno(
              `${quantidadeSalva} OP(s) foram adicionadas antes da falha. ${resultado.erro ?? 'Não foi possível concluir a inclusão restante.'}`
            )
            return
          }

          setTipoMensagem('erro')
          setMensagemRetorno(resultado.erro ?? 'Não foi possível adicionar a nova OP ao turno.')
          return
        }

        quantidadeSalva += 1
        draftsSalvos.add(op.id)
      }

      await aoAtualizarPlanejamento()
      setNovasOps([criarNovaOpDraft(produtos)])
      setTipoMensagem('sucesso')
      setMensagemRetorno(
        `${quantidadeSalva} nova(s) OP(s) adicionada(s) ao turno aberto com derivação imediata das seções e operações. Os novos QRs já ficam disponíveis na dashboard e a OP entra no scanner, em /admin/apontamentos e nos relatórios.`
      )
    })
  }

  function handleSalvarEdicaoOp(): void {
    const validacao = validarEdicaoOp()
    if (!validacao.valido || !edicaoOp) {
      setTipoMensagem('erro')
      setMensagemRetorno(validacao.mensagem ?? 'Não foi possível validar a edição da OP.')
      return
    }

    iniciarSalvamentoEdicao(async () => {
      const resultado = await editarOpDoTurno({
        turnoOpId: edicaoOp.turnoOpId,
        numeroOp: edicaoOp.numeroOp.trim().toUpperCase(),
        produtoId: edicaoOp.produtoId,
        quantidadePlanejada: Number.parseInt(edicaoOp.quantidadePlanejada, 10),
      })

      if (!resultado.sucesso) {
        setTipoMensagem('erro')
        setMensagemRetorno(resultado.erro ?? 'Não foi possível salvar a edição da OP.')
        return
      }

      await aoAtualizarPlanejamento()
      setEdicaoOp(null)
      setTipoMensagem('sucesso')
      setMensagemRetorno(
        'OP atualizada com sucesso no turno aberto. Dashboard, scanner, apontamentos e relatórios já refletem o novo planejamento.'
      )
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label="Editar turno aberto"
    >
      <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700">
              <PencilLine size={14} />
              Edição do turno aberto
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Editar turno em andamento</h2>
              <p className="text-sm text-slate-600">
                O turno segue aberto. O supervisor pode revisar o planejamento atual e adicionar
                novas OPs sem sair da dashboard.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar edição do turno aberto"
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-6 p-6">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            O turno continua aberto durante esta edição. Novas OPs entram no planejamento atual e
            passam a derivar seções, operações e QRs sem exigir encerramento do turno.
          </div>

          {mensagemRetorno ? (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                tipoMensagem === 'sucesso'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {mensagemRetorno}
            </div>
          ) : null}

          <section className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-4">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Turno iniciado em
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {formatarDataHoraAtual(planejamento.turno.iniciadoEm)}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                <Users size={14} />
                Operadores disponíveis
              </div>
              <p className="text-lg font-semibold text-slate-900">
                {planejamento.turno.operadoresDisponiveis}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                <CalendarClock size={14} />
                Minutos do turno
              </div>
              <p className="text-lg font-semibold text-slate-900">{planejamento.turno.minutosTurno}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                <ClipboardList size={14} />
                Planejado atual
              </div>
              <p className="text-lg font-semibold text-slate-900">{totalPlanejadoAtual}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-slate-900">OPs já planejadas no turno</h3>
              <p className="text-sm text-slate-600">
                O turno permanece em execução. Nesta visão, as OPs existentes ficam visíveis com
                status, realizado e saldo para orientar qualquer inclusão adicional.
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {planejamento.ops.map((op) => {
                const saldo = Math.max(op.quantidadePlanejada - op.quantidadeRealizada, 0)
                const possuiProducao = possuiProducaoPorOp.get(op.id) ?? false
                const estaEmEdicao = edicaoOp?.turnoOpId === op.id

                return (
                  <article
                    key={op.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{op.numeroOp}</p>
                        <p className="text-sm text-slate-600">
                          {op.produtoNome} ({op.produtoReferencia})
                        </p>
                      </div>
                      <span className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                        {op.status}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-xl bg-white px-3 py-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Planejado</p>
                        <p className="mt-1 font-semibold text-slate-900">{op.quantidadePlanejada}</p>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Realizado</p>
                        <p className="mt-1 font-semibold text-slate-900">{op.quantidadeRealizada}</p>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Saldo</p>
                        <p className="mt-1 font-semibold text-slate-900">{saldo}</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {possuiProducao ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                          <div className="flex items-start gap-2">
                            <Lock size={16} className="mt-0.5 shrink-0" />
                            <div>
                              <p className="font-medium">Edição estrutural bloqueada</p>
                              <p>
                                Esta OP já possui produção apontada em pelo menos uma seção. Produto,
                                quantidade planejada e número da OP não podem mais ser alterados.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {!possuiProducao && estaEmEdicao && edicaoOp ? (
                        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">Editar OP existente</p>
                              <p className="text-sm text-slate-600">
                                Esta OP ainda não possui produção. Ajustes estruturais são permitidos
                                antes do primeiro apontamento.
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-[1fr_1.4fr_0.8fr]">
                            <div className="space-y-1">
                              <label
                                htmlFor={`editar-op-numero-${op.id}`}
                                className="text-xs font-medium uppercase tracking-wide text-slate-500"
                              >
                                Número da OP
                              </label>
                              <input
                                id={`editar-op-numero-${op.id}`}
                                type="text"
                                value={edicaoOp.numeroOp}
                                onChange={(event) =>
                                  atualizarEdicaoOp({ numeroOp: event.target.value.toUpperCase() })
                                }
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            <div className="space-y-1">
                              <label
                                htmlFor={`editar-op-produto-${op.id}`}
                                className="text-xs font-medium uppercase tracking-wide text-slate-500"
                              >
                                Produto
                              </label>
                              <select
                                id={`editar-op-produto-${op.id}`}
                                value={edicaoOp.produtoId}
                                onChange={(event) =>
                                  atualizarEdicaoOp({ produtoId: event.target.value })
                                }
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                {produtos.map((produto) => (
                                  <option key={produto.id} value={produto.id}>
                                    {produto.referencia} · {produto.nome}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label
                                htmlFor={`editar-op-quantidade-${op.id}`}
                                className="text-xs font-medium uppercase tracking-wide text-slate-500"
                              >
                                Quantidade planejada
                              </label>
                              <input
                                id={`editar-op-quantidade-${op.id}`}
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={edicaoOp.quantidadePlanejada}
                                onChange={(event) =>
                                  atualizarEdicaoOp({
                                    quantidadePlanejada: manterApenasDigitos(event.target.value),
                                  })
                                }
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>

                          <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                              type="button"
                              onClick={cancelarEdicaoOp}
                              disabled={salvandoEdicao}
                              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-white"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={handleSalvarEdicaoOp}
                              disabled={salvandoEdicao}
                              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {salvandoEdicao ? (
                                <LoaderCircle size={16} className="animate-spin" />
                              ) : (
                                <PencilLine size={16} />
                              )}
                              {salvandoEdicao ? 'Salvando OP...' : 'Salvar edição'}
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {!possuiProducao && !estaEmEdicao ? (
                        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 md:flex-row md:items-center md:justify-between">
                          <p>
                            Esta OP ainda não possui produção apontada. Produto, número da OP e
                            quantidade planejada podem ser ajustados antes do primeiro registro.
                          </p>
                          <button
                            type="button"
                            onClick={() => iniciarEdicaoOp(op)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                          >
                            <PencilLine size={16} />
                            Editar OP
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Incluir nova OP</h3>
                <p className="text-sm text-slate-600">
                  O supervisor pode adicionar uma ou mais novas OPs dentro do turno atual. Cada
                  inclusão salva a OP, deriva seções, operações e disponibiliza os novos QRs sem
                  encerrar o turno.
                </p>
              </div>

              <button
                type="button"
                onClick={adicionarNovaOp}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <Plus size={16} />
                Adicionar OP
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {novasOps.map((op, index) => (
                <article key={op.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                      <PackagePlus size={14} />
                      Nova OP {index + 1}
                    </div>

                    <button
                      type="button"
                      onClick={() => removerNovaOp(op.id)}
                      disabled={novasOps.length === 1}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-white hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Remover
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[1fr_1.4fr_0.8fr]">
                    <div className="space-y-1">
                      <label
                        htmlFor={`nova-op-numero-${op.id}`}
                        className="text-xs font-medium uppercase tracking-wide text-slate-500"
                      >
                        Número da OP
                      </label>
                      <input
                        id={`nova-op-numero-${op.id}`}
                        type="text"
                        value={op.numeroOp}
                        onChange={(event) =>
                          atualizarNovaOp(op.id, { numeroOp: event.target.value.toUpperCase() })
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex.: OP-2026-015"
                      />
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor={`nova-op-produto-${op.id}`}
                        className="text-xs font-medium uppercase tracking-wide text-slate-500"
                      >
                        Produto
                      </label>
                      <select
                        id={`nova-op-produto-${op.id}`}
                        value={op.produtoId}
                        onChange={(event) => atualizarNovaOp(op.id, { produtoId: event.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {produtos.map((produto) => (
                          <option key={produto.id} value={produto.id}>
                            {produto.referencia} · {produto.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor={`nova-op-quantidade-${op.id}`}
                        className="text-xs font-medium uppercase tracking-wide text-slate-500"
                      >
                        Quantidade planejada
                      </label>
                      <input
                        id={`nova-op-quantidade-${op.id}`}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={op.quantidadePlanejada}
                        onChange={(event) =>
                          atualizarNovaOp(op.id, {
                            quantidadePlanejada: manterApenasDigitos(event.target.value),
                          })
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
              Se as novas OPs forem confirmadas na próxima task, o turno passará de {totalPlanejadoAtual}{' '}
              para {totalPlanejadoAtual + totalPlanejadoNovasOps} unidades planejadas, com geração
              imediata das novas seções, operações derivadas e QRs operacionais.
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={aoFechar}
              disabled={salvandoNovasOps || salvandoEdicao}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Fechar edição
            </button>
            <button
              type="button"
              onClick={handleSalvarNovasOps}
              disabled={salvandoNovasOps || salvandoEdicao}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {salvandoNovasOps ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <PackagePlus size={16} />
              )}
              {salvandoNovasOps ? 'Salvando novas OPs...' : 'Salvar novas OPs'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
