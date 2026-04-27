'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  ClipboardCheck,
  Minus,
  Plus,
  RefreshCcw,
  ShieldCheck,
} from 'lucide-react'
import type { RegistroQualidadeDefeitoInput, ResultadoScannerAction } from '@/hooks'
import type { TurnoSetorDemandaScaneada, TurnoSetorOperacaoApontamentoV2, TurnoSetorScaneado } from '@/types'

interface ConfirmacaoQualidadeProps {
  demandaSelecionada: TurnoSetorDemandaScaneada
  operacaoQualidade: TurnoSetorOperacaoApontamentoV2
  operacoesOrigem: TurnoSetorOperacaoApontamentoV2[]
  setor: TurnoSetorScaneado
  revisorNome: string | null
  estaRegistrando: boolean
  onRegistrar: (input: {
    quantidadeAprovada: number
    quantidadeReprovada: number
    defeitos: RegistroQualidadeDefeitoInput[]
  }) => Promise<ResultadoScannerAction>
  onErro: (mensagem: string) => void
  onTrocarDemanda: () => void
  onReiniciarTudo: () => void
}

interface DefeitoDraft {
  id: string
  turnoSetorOperacaoIdOrigem: string
  quantidadeDefeito: string
}

function criarIdLocal(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `defeito-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function saldoRestanteOperacao(operacao: TurnoSetorOperacaoApontamentoV2): number {
  return Math.max(operacao.quantidadePlanejada - operacao.quantidadeRealizada, 0)
}

function normalizarQuantidadeNaoNegativa(valor: string): string {
  if (valor.trim() === '') {
    return ''
  }

  const quantidade = Number.parseInt(valor, 10)

  if (!Number.isFinite(quantidade) || quantidade < 0) {
    return '0'
  }

  return String(quantidade)
}

function normalizarQuantidadePositiva(valor: string): string {
  if (valor.trim() === '') {
    return ''
  }

  const quantidade = Number.parseInt(valor, 10)

  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    return '1'
  }

  return String(quantidade)
}

function quantidadeNumero(valor: string): number {
  const quantidade = Number.parseInt(valor, 10)
  return Number.isFinite(quantidade) ? quantidade : 0
}

export function ConfirmacaoQualidade({
  demandaSelecionada,
  operacaoQualidade,
  operacoesOrigem,
  setor,
  revisorNome,
  estaRegistrando,
  onRegistrar,
  onErro,
  onTrocarDemanda,
  onReiniciarTudo,
}: ConfirmacaoQualidadeProps) {
  const [quantidadeAprovada, setQuantidadeAprovada] = useState('0')
  const [quantidadeReprovada, setQuantidadeReprovada] = useState('0')
  const [defeitos, setDefeitos] = useState<DefeitoDraft[]>([])
  const [exibindoSucesso, setExibindoSucesso] = useState(false)
  const [ultimaRevisao, setUltimaRevisao] = useState<{
    aprovadas: number
    reprovadas: number
  } | null>(null)

  const saldoDisponivel = saldoRestanteOperacao(operacaoQualidade)
  const aprovadas = quantidadeNumero(quantidadeAprovada)
  const reprovadas = quantidadeNumero(quantidadeReprovada)
  const quantidadeRevisada = aprovadas + reprovadas

  useEffect(() => {
    setQuantidadeAprovada('0')
    setQuantidadeReprovada('0')
    setDefeitos([])
    setExibindoSucesso(false)
    setUltimaRevisao(null)
  }, [demandaSelecionada.id, operacaoQualidade.id, saldoDisponivel])

  useEffect(() => {
    if (reprovadas === 0 && defeitos.length > 0) {
      setDefeitos([])
    }
  }, [defeitos.length, reprovadas])

  const operacoesOrigemPorId = useMemo(
    () => new Map(operacoesOrigem.map((operacao) => [operacao.id, operacao])),
    [operacoesOrigem]
  )

  function adicionarDefeito() {
    setDefeitos((estadoAtual) => [
      ...estadoAtual,
      {
        id: criarIdLocal(),
        turnoSetorOperacaoIdOrigem: operacoesOrigem[0]?.id ?? '',
        quantidadeDefeito: '1',
      },
    ])
  }

  function removerDefeito(id: string) {
    setDefeitos((estadoAtual) => estadoAtual.filter((defeito) => defeito.id !== id))
  }

  function atualizarDefeito(id: string, atualizacao: Partial<DefeitoDraft>) {
    setDefeitos((estadoAtual) =>
      estadoAtual.map((defeito) => (defeito.id === id ? { ...defeito, ...atualizacao } : defeito))
    )
  }

  async function handleRegistrar() {
    if (quantidadeRevisada <= 0) {
      onErro('Informe ao menos uma peça aprovada ou reprovada.')
      return
    }

    if (quantidadeRevisada > saldoDisponivel) {
      onErro(`A revisão ultrapassa o saldo disponível da qualidade. Saldo atual: ${saldoDisponivel}.`)
      return
    }

    if (reprovadas > 0 && defeitos.length === 0) {
      onErro('Informe ao menos uma operação de origem para as peças reprovadas.')
      return
    }

    const ids = new Set<string>()
    const defeitosNormalizados: RegistroQualidadeDefeitoInput[] = []

    for (const defeito of defeitos) {
      if (!defeito.turnoSetorOperacaoIdOrigem) {
        onErro('Cada defeito precisa informar a operação de origem.')
        return
      }

      if (ids.has(defeito.turnoSetorOperacaoIdOrigem)) {
        onErro('Cada operação de origem pode aparecer apenas uma vez por revisão.')
        return
      }

      const quantidadeDefeito = quantidadeNumero(defeito.quantidadeDefeito)

      if (quantidadeDefeito <= 0) {
        onErro('Cada defeito precisa informar uma quantidade maior que zero.')
        return
      }

      ids.add(defeito.turnoSetorOperacaoIdOrigem)
      defeitosNormalizados.push({
        turnoSetorOperacaoIdOrigem: defeito.turnoSetorOperacaoIdOrigem,
        quantidadeDefeito,
      })
    }

    const resultado = await onRegistrar({
      quantidadeAprovada: aprovadas,
      quantidadeReprovada: reprovadas,
      defeitos: defeitosNormalizados,
    })

    if (!resultado.sucesso) {
      onErro(resultado.erro ?? 'Não foi possível registrar a revisão de qualidade.')
      return
    }

    if (navigator.vibrate) {
      navigator.vibrate(180)
    }

    setUltimaRevisao({
      aprovadas,
      reprovadas,
    })
    setQuantidadeAprovada('0')
    setQuantidadeReprovada('0')
    setDefeitos([])
    setExibindoSucesso(true)
  }

  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/60 p-5 shadow-[0_20px_48px_rgba(2,6,23,0.45)] backdrop-blur-xl">
      {exibindoSucesso ? (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="space-y-4"
        >
          <div className="rounded-[24px] border border-emerald-400/30 bg-emerald-500/15 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-emerald-400/20 p-3 text-emerald-100">
                <CheckCircle2 size={30} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-200">
                  Revisão registrada
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {ultimaRevisao?.aprovadas ?? 0} aprovadas · {ultimaRevisao?.reprovadas ?? 0} reprovadas
                </h2>
                <p className="mt-2 text-sm leading-6 text-emerald-50/90">
                  A OP foi atualizada na fila da qualidade e os defeitos por operação de origem já foram persistidos.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setExibindoSucesso(false)}
              disabled={estaRegistrando || saldoDisponivel <= 0}
              className="flex min-h-14 items-center justify-center rounded-3xl bg-emerald-500 px-4 py-4 text-base font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Nova revisão
            </button>

            <button
              type="button"
              onClick={onTrocarDemanda}
              className="flex min-h-14 items-center justify-center rounded-3xl border border-white/15 px-4 py-4 text-base font-semibold text-white transition hover:bg-white/5"
            >
              Trocar OP/produto
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-3xl border border-cyan-400/15 bg-cyan-400/8 p-4 text-sm text-cyan-50">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/80">
              <ClipboardCheck size={16} />
              Revisão de qualidade
            </div>
            <p className="mt-2 font-semibold text-white">
              {demandaSelecionada.numeroOp} · {demandaSelecionada.produtoReferencia} · {demandaSelecionada.produtoNome}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              Revisor da sessão: <strong>{revisorNome ?? 'Revisor habilitado'}</strong> · setor {setor.setorNome}.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Saldo para revisar</p>
              <p className="mt-2 text-2xl font-semibold text-white">{saldoDisponivel}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Operações de origem</p>
              <p className="mt-2 text-2xl font-semibold text-white">{operacoesOrigem.length}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="qualidade-aprovadas" className="text-sm font-medium text-slate-200">
                Aprovadas
              </label>
              <input
                id="qualidade-aprovadas"
                type="number"
                min={0}
                step={1}
                value={quantidadeAprovada}
                onChange={(event) => setQuantidadeAprovada(normalizarQuantidadeNaoNegativa(event.target.value))}
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-base text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="qualidade-reprovadas" className="text-sm font-medium text-slate-200">
                Reprovadas
              </label>
              <input
                id="qualidade-reprovadas"
                type="number"
                min={0}
                step={1}
                value={quantidadeReprovada}
                onChange={(event) => setQuantidadeReprovada(normalizarQuantidadeNaoNegativa(event.target.value))}
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-base text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            Quantidade revisada agora: <strong>{quantidadeRevisada}</strong>
          </div>

          {reprovadas > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Defeitos por operação de origem</p>
                  <p className="text-sm text-slate-400">
                    Distribua as ocorrências nas operações produtivas do roteiro.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={adicionarDefeito}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
                >
                  <Plus size={16} />
                  Nova linha
                </button>
              </div>

              {defeitos.length === 0 ? (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-50">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <p>As peças reprovadas exigem ao menos uma operação de origem com defeito.</p>
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                {defeitos.map((defeito, index) => (
                  <div key={defeito.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">Origem {index + 1}</p>
                      <button
                        type="button"
                        onClick={() => removerDefeito(defeito.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-300 transition hover:bg-white/5"
                      >
                        <Minus size={14} />
                        Remover
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-slate-200">Operação de origem</label>
                        <select
                          value={defeito.turnoSetorOperacaoIdOrigem}
                          onChange={(event) =>
                            atualizarDefeito(defeito.id, {
                              turnoSetorOperacaoIdOrigem: event.target.value,
                            })
                          }
                          className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        >
                          <option value="">Selecione</option>
                          {operacoesOrigem.map((operacao) => (
                            <option key={operacao.id} value={operacao.id}>
                              {operacao.operacaoCodigo} · {operacao.operacaoDescricao}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-slate-200">Defeitos</label>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={defeito.quantidadeDefeito}
                          onChange={(event) =>
                            atualizarDefeito(defeito.id, {
                              quantidadeDefeito: normalizarQuantidadePositiva(event.target.value),
                            })
                          }
                          className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        />
                      </div>
                    </div>

                    {defeito.turnoSetorOperacaoIdOrigem ? (
                      <p className="mt-3 text-xs text-slate-400">
                        {operacoesOrigemPorId.get(defeito.turnoSetorOperacaoIdOrigem)?.operacaoDescricao ??
                          'Operação não encontrada'}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleRegistrar}
              disabled={estaRegistrando || saldoDisponivel <= 0}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-3xl bg-emerald-500 px-4 py-4 text-base font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ShieldCheck size={18} />
              {estaRegistrando ? 'Registrando...' : 'Registrar revisão'}
            </button>

            <button
              type="button"
              onClick={onTrocarDemanda}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-3xl border border-white/15 px-4 py-4 text-base font-semibold text-white transition hover:bg-white/5"
            >
              <ArrowRightLeft size={18} />
              Trocar OP/produto
            </button>
          </div>

          <button
            type="button"
            onClick={onReiniciarTudo}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-3xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            <RefreshCcw size={16} />
            Reiniciar scanner
          </button>
        </div>
      )}
    </section>
  )
}
