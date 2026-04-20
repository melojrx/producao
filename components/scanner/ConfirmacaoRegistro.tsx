'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Factory,
  IdCard,
  Minus,
  Plus,
  RotateCcw,
  ScanQrCode,
} from 'lucide-react'
import type { ResultadoScannerAction } from '@/hooks'
import { resumirPlanoDiarioTurno } from '@/lib/utils/plano-diario-turno'
import type {
  OperadorScaneado,
  TurnoSetorDemandaScaneada,
  TurnoSetorOperacaoApontamentoV2,
  TurnoSetorScaneado,
} from '@/types'

interface ConfirmacaoRegistroProps {
  demandaSelecionada: TurnoSetorDemandaScaneada
  operacaoSelecionada: TurnoSetorOperacaoApontamentoV2
  operador: OperadorScaneado
  setor: TurnoSetorScaneado
  estaRegistrando: boolean
  onNovaQuantidade: () => void
  onRegistrar: (quantidade: number) => Promise<ResultadoScannerAction>
  onErro: (mensagem: string) => void
  onReiniciarTudo: () => void
  onTrocarDemanda: () => void
  onTrocarOperacao: () => void
  onTrocarOperador: () => void
}

const FORMATADOR_DATA_HORA_TURNO = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

function formatarTurno(iniciadoEm: string): string {
  return FORMATADOR_DATA_HORA_TURNO.format(new Date(iniciadoEm))
}

function limitarQuantidade(valor: number, saldoMaximo: number): number {
  if (saldoMaximo <= 0) {
    return 0
  }

  return Math.min(Math.max(0, valor), saldoMaximo)
}

function normalizarQuantidadeDigitada(valor: string, saldoMaximo: number): string {
  const apenasDigitos = valor.replace(/\D+/g, '')

  if (apenasDigitos.length === 0) {
    return ''
  }

  const quantidadeNormalizada = limitarQuantidade(Number.parseInt(apenasDigitos, 10), saldoMaximo)
  return String(quantidadeNormalizada)
}

function obterQuantidadeAtual(valor: string, saldoMaximo: number): number {
  if (valor.trim() === '') {
    return 0
  }

  const quantidade = Number.parseInt(valor, 10)

  if (Number.isNaN(quantidade)) {
    return 0
  }

  return limitarQuantidade(quantidade, saldoMaximo)
}

function calcularQuantidadeAceitaDemanda(
  demanda: Pick<
    TurnoSetorDemandaScaneada,
    | 'quantidadeAceitaTurno'
    | 'quantidadeDisponivelApontamento'
    | 'quantidadeLiberadaSetor'
    | 'quantidadePlanejada'
    | 'quantidadeRealizada'
  >
): number {
  if (typeof demanda.quantidadeDisponivelApontamento === 'number') {
    return demanda.quantidadeDisponivelApontamento
  }

  if (typeof demanda.quantidadeAceitaTurno === 'number') {
    return demanda.quantidadeAceitaTurno
  }

  if (typeof demanda.quantidadeLiberadaSetor === 'number') {
    return demanda.quantidadeLiberadaSetor
  }

  return demanda.quantidadePlanejada
}

function calcularDisponibilidadeImediataOperacao(
  demanda: TurnoSetorDemandaScaneada,
  operacao: TurnoSetorOperacaoApontamentoV2
): number {
  const quantidadeExpostaDemanda =
    demanda.quantidadeRealizada + calcularQuantidadeAceitaDemanda(demanda)

  return Math.max(
    Math.min(operacao.quantidadePlanejada, quantidadeExpostaDemanda) - operacao.quantidadeRealizada,
    0
  )
}

export function ConfirmacaoRegistro({
  demandaSelecionada,
  operacaoSelecionada,
  operador,
  setor,
  estaRegistrando,
  onNovaQuantidade,
  onRegistrar,
  onErro,
  onReiniciarTudo,
  onTrocarDemanda,
  onTrocarOperacao,
  onTrocarOperador,
}: ConfirmacaoRegistroProps) {
  const backlogVivo = demandaSelecionada.quantidadeBacklogSetor ?? demandaSelecionada.saldoRestante
  const planoDoDia = demandaSelecionada.quantidadeAceitaTurno ?? demandaSelecionada.saldoRestante
  const disponibilidadeImediataOperacao = calcularDisponibilidadeImediataOperacao(
    demandaSelecionada,
    operacaoSelecionada
  )
  const disponibilidadeImediataDemanda =
    demandaSelecionada.quantidadeDisponivelApontamento ??
    demandaSelecionada.quantidadeAceitaTurno ??
    demandaSelecionada.saldoRestante
  const [quantidadeDigitada, setQuantidadeDigitada] = useState('0')
  const [exibindoSucesso, setExibindoSucesso] = useState(false)
  const [ultimaQuantidadeRegistrada, setUltimaQuantidadeRegistrada] = useState<number | null>(null)
  const quantidadeAtual = obterQuantidadeAtual(quantidadeDigitada, disponibilidadeImediataOperacao)
  const resumoPlano = resumirPlanoDiarioTurno({
    quantidadeAceitaTurno: demandaSelecionada.quantidadeAceitaTurno,
    quantidadeConcluida: demandaSelecionada.quantidadeConcluida,
    quantidadeDisponivelApontamento: demandaSelecionada.quantidadeDisponivelApontamento,
    quantidadeSelecionada: quantidadeAtual,
  })

  useEffect(() => {
    setQuantidadeDigitada('0')
    setExibindoSucesso(false)
    setUltimaQuantidadeRegistrada(null)
  }, [demandaSelecionada.id, disponibilidadeImediataOperacao, operacaoSelecionada.id, operador.id, setor.id])

  function ajustarQuantidade(valor: number) {
    setQuantidadeDigitada((quantidadeAtualTexto) =>
      String(
        limitarQuantidade(
          obterQuantidadeAtual(quantidadeAtualTexto, disponibilidadeImediataOperacao) + valor,
          disponibilidadeImediataOperacao
        )
      )
    )
  }

  async function handleRegistrar() {
    if (quantidadeAtual <= 0) {
      onErro('Informe uma quantidade maior que zero antes de registrar.')
      return
    }

    const resultado = await onRegistrar(quantidadeAtual)

    if (!resultado.sucesso) {
      onErro(resultado.erro ?? 'Não foi possível registrar a produção.')
      return
    }

    if (navigator.vibrate) {
      navigator.vibrate(180)
    }

    setUltimaQuantidadeRegistrada(quantidadeAtual)
    setQuantidadeDigitada('0')
    setExibindoSucesso(true)
  }

  function handleNovaQuantidade() {
    setExibindoSucesso(false)
    setUltimaQuantidadeRegistrada(null)
    setQuantidadeDigitada('0')
    onNovaQuantidade()
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
                  Registro concluído
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  +{ultimaQuantidadeRegistrada ?? 0} unidade(s)
                </h2>
                <p className="mt-2 text-sm leading-6 text-emerald-50/90">
                  {operador.nome} recebeu o apontamento na operação{' '}
                  <strong>{operacaoSelecionada.operacaoCodigo}</strong>. Backlog vivo, plano do
                  dia e disponibilidade imediata já foram recalculados.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Operação</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {operacaoSelecionada.operacaoCodigo}
              </p>
              <p className="mt-1 text-xs text-slate-300">{operacaoSelecionada.operacaoDescricao}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Disponível agora
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {disponibilidadeImediataDemanda}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleNovaQuantidade}
              disabled={estaRegistrando || disponibilidadeImediataOperacao <= 0}
              className="flex min-h-14 items-center justify-center rounded-3xl bg-emerald-500 px-4 py-4 text-base font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Nova quantidade
            </button>

            <button
              type="button"
              onClick={onTrocarDemanda}
              disabled={estaRegistrando}
              className="flex min-h-14 items-center justify-center rounded-3xl border border-white/15 px-4 py-4 text-base font-semibold text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Trocar OP/produto
            </button>

            <button
              type="button"
              onClick={onTrocarOperacao}
              disabled={estaRegistrando}
              className="flex min-h-14 items-center justify-center rounded-3xl border border-white/15 px-4 py-4 text-base font-semibold text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Trocar operação
            </button>

            <button
              type="button"
              onClick={onTrocarOperador}
              disabled={estaRegistrando}
              className="flex min-h-14 items-center justify-center rounded-3xl border border-white/15 px-4 py-4 text-base font-semibold text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Trocar operador
            </button>

            <button
              type="button"
              onClick={onReiniciarTudo}
              disabled={estaRegistrando}
              className="sm:col-span-2 flex min-h-14 items-center justify-center gap-2 rounded-3xl border border-white/15 px-4 py-4 text-base font-semibold text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCcw size={18} />
              Reiniciar tudo
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-sm text-emerald-300">
            <ScanQrCode size={18} />
            Quantidade pronta para lançamento
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white">
              {demandaSelecionada.produtoReferencia} · {demandaSelecionada.produtoNome}
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Operador <strong className="text-white">{operador.nome}</strong> em{' '}
              <strong className="text-white">{setor.setorNome}</strong>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                <ClipboardList size={14} />
                Turno
              </div>
              <p className="mt-2 text-sm font-semibold text-white">
                {formatarTurno(setor.turnoIniciadoEm)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                <IdCard size={14} />
                Matrícula
              </div>
              <p className="mt-2 text-sm font-semibold text-white">{operador.matricula}</p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                <Factory size={14} />
                Setor
              </div>
              <p className="mt-2 text-sm font-semibold text-white">{setor.setorNome}</p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                <Boxes size={14} />
                OP
              </div>
              <p className="mt-2 text-sm font-semibold text-white">
                {demandaSelecionada.numeroOp}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">Operação</p>
                <p className="mt-2 text-base font-semibold text-white">
                  {operacaoSelecionada.sequencia}. {operacaoSelecionada.operacaoCodigo}
                </p>
                <p className="mt-1 text-sm text-cyan-50">{operacaoSelecionada.operacaoDescricao}</p>
              </div>
              <span className="rounded-full border border-cyan-200/20 bg-cyan-100/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
                {operacaoSelecionada.status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-cyan-50">
              <div className="rounded-2xl bg-slate-950/35 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-100/70">
                  Realizado operação
                </p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {operacaoSelecionada.quantidadeRealizada}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-950/35 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-100/70">
                  Disponível agora na operação
                </p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {disponibilidadeImediataOperacao}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-950/35 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-100/70">
                  Peças completas
                </p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {demandaSelecionada.quantidadeConcluida}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-950/35 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-100/70">
                  Backlog vivo
                </p>
                <p className="mt-2 text-xl font-semibold text-white">{backlogVivo}</p>
              </div>
              <div className="rounded-2xl bg-slate-950/35 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-100/70">
                  Plano do dia
                </p>
                <p className="mt-2 text-xl font-semibold text-white">{planoDoDia}</p>
              </div>
            </div>

            <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-cyan-100/80">
              Progresso operacional da demanda {demandaSelecionada.progressoOperacionalPct.toFixed(0)}%
            </p>
          </div>

          {resumoPlano.excedePlanoAtual || resumoPlano.excedePlanoComQuantidade ? (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-50">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <p>
                  Este registro ultrapassa o saldo visual do plano do dia para o setor. O scanner
                  continua liberado e o apontamento não será bloqueado.
                </p>
              </div>
            </div>
          ) : null}

          <div>
            <label className="text-sm font-medium text-slate-200" htmlFor="quantidade-producao">
              Quantidade executada
            </label>

            <div className="mt-3 flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 p-3">
              <button
                type="button"
                onClick={() => ajustarQuantidade(-1)}
                aria-label="Diminuir quantidade"
                disabled={estaRegistrando || disponibilidadeImediataOperacao <= 0}
                className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Minus size={22} />
              </button>

              <input
                id="quantidade-producao"
                type="number"
                min={0}
                max={disponibilidadeImediataOperacao}
                inputMode="numeric"
                pattern="[0-9]*"
                value={quantidadeDigitada}
                onChange={(event) => {
                  setQuantidadeDigitada(
                    normalizarQuantidadeDigitada(
                      event.target.value,
                      disponibilidadeImediataOperacao
                    )
                  )
                }}
                onBlur={() => {
                  setQuantidadeDigitada(
                    String(
                      obterQuantidadeAtual(quantidadeDigitada, disponibilidadeImediataOperacao)
                    )
                  )
                }}
                disabled={estaRegistrando || disponibilidadeImediataOperacao <= 0}
                className="w-full bg-transparent text-center text-4xl font-semibold text-white outline-none disabled:opacity-60"
              />

              <button
                type="button"
                onClick={() => ajustarQuantidade(1)}
                aria-label="Aumentar quantidade"
                disabled={estaRegistrando || disponibilidadeImediataOperacao <= 0}
                className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={22} />
              </button>
            </div>

            <p className="mt-2 text-xs text-slate-400">
              Digite a quantidade desejada ou ajuste pelos botões. O campo pode voltar para `0`
              antes do registro. Disponível agora para a operação: {disponibilidadeImediataOperacao}.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void handleRegistrar()
            }}
            disabled={estaRegistrando || disponibilidadeImediataOperacao <= 0 || quantidadeAtual <= 0}
            className="flex min-h-14 w-full items-center justify-center rounded-3xl bg-emerald-500 px-4 py-4 text-lg font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {estaRegistrando ? 'Registrando...' : 'Registrar quantidade'}
          </button>

          <div className="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={onTrocarDemanda}
              disabled={estaRegistrando}
              className="flex min-h-12 items-center justify-center rounded-3xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Trocar OP/produto
            </button>

            <button
              type="button"
              onClick={onTrocarOperacao}
              disabled={estaRegistrando}
              className="flex min-h-12 items-center justify-center rounded-3xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Trocar operação
            </button>

            <button
              type="button"
              onClick={onTrocarOperador}
              disabled={estaRegistrando}
              className="flex min-h-12 items-center justify-center rounded-3xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Trocar operador
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
