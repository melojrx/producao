'use client'

import { AlertTriangle, ArrowRight, ListChecks } from 'lucide-react'
import { resumirPlanoDiarioTurno } from '@/lib/utils/plano-diario-turno'
import type {
  OperadorScaneado,
  TurnoSetorDemandaScaneada,
  TurnoSetorOperacaoApontamentoV2,
  TurnoSetorScaneado,
} from '@/types'

interface SelecaoOperacaoScannerProps {
  demandaSelecionada: TurnoSetorDemandaScaneada
  operacoes: TurnoSetorOperacaoApontamentoV2[]
  operador: OperadorScaneado
  onSelecionarOperacao: (operacaoId: string) => void
  onTrocarDemanda: () => void
  onTrocarOperador: () => void
  setor: TurnoSetorScaneado
}

function statusTema(status: TurnoSetorOperacaoApontamentoV2['status']): string {
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

export function SelecaoOperacaoScanner({
  demandaSelecionada,
  operacoes,
  operador,
  onSelecionarOperacao,
  onTrocarDemanda,
  onTrocarOperador,
  setor,
}: SelecaoOperacaoScannerProps) {
  const backlogVivo = demandaSelecionada.quantidadeBacklogSetor ?? demandaSelecionada.saldoRestante
  const planoDoDia = demandaSelecionada.quantidadeAceitaTurno ?? demandaSelecionada.saldoRestante
  const disponivelAgora =
    demandaSelecionada.quantidadeDisponivelApontamento ??
    demandaSelecionada.quantidadeAceitaTurno ??
    demandaSelecionada.saldoRestante
  const resumoPlano = resumirPlanoDiarioTurno({
    quantidadeAceitaTurno: demandaSelecionada.quantidadeAceitaTurno,
    quantidadeConcluida: demandaSelecionada.quantidadeConcluida,
    quantidadeDisponivelApontamento: demandaSelecionada.quantidadeDisponivelApontamento,
  })

  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/60 p-5 shadow-[0_20px_48px_rgba(2,6,23,0.45)] backdrop-blur-xl">
      <div className="flex items-center gap-2 text-sm text-cyan-300">
        <ListChecks size={18} />
        Operações planejadas da demanda
      </div>

      <h2 className="mt-3 text-xl font-semibold text-white">
        {demandaSelecionada.produtoReferencia} · {demandaSelecionada.produtoNome}
      </h2>
      <p className="mt-2 text-sm text-slate-300">
        {demandaSelecionada.numeroOp} · {setor.setorNome} · Operador {operador.nome}
      </p>
      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
        {operacoes.length} operação(ões) elegíveis para execução agora
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-2xl bg-slate-900/60 px-3 py-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Backlog vivo</p>
          <p className="mt-1 font-semibold text-white">{backlogVivo}</p>
        </div>
        <div className="rounded-2xl bg-slate-900/60 px-3 py-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
            Plano do dia
          </p>
          <p className="mt-1 font-semibold text-white">{planoDoDia}</p>
        </div>
        <div className="rounded-2xl bg-slate-900/60 px-3 py-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
            Disponível agora
          </p>
          <p className="mt-1 font-semibold text-white">{disponivelAgora}</p>
        </div>
        <div className="rounded-2xl bg-slate-900/60 px-3 py-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
            Peças completas
          </p>
          <p className="mt-1 font-semibold text-white">{demandaSelecionada.quantidadeConcluida}</p>
        </div>
      </div>

      {resumoPlano.excedePlanoAtual ? (
        <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-50">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <p>
              A disponibilidade imediata desta demanda já ultrapassa o saldo visual do plano do
              dia. O fluxo continua liberado para apontamento.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {operacoes.map((operacao) => {
          const saldoOperacao = Math.max(
            operacao.quantidadePlanejada - operacao.quantidadeRealizada,
            0
          )
          const operacaoDisponivel = saldoOperacao > 0 && operacao.status !== 'concluida'

          return (
            <button
              key={operacao.id}
              type="button"
              onClick={() => onSelecionarOperacao(operacao.id)}
              disabled={!operacaoDisponivel}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:border-white/20 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {operacao.sequencia}. {operacao.operacaoCodigo}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">{operacao.operacaoDescricao}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    T.P {operacao.tempoPadraoMinSnapshot} min · Máquina{' '}
                    {operacao.maquinaModelo ?? operacao.maquinaCodigo ?? 'não informada'}
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusTema(operacao.status)}`}
                >
                  {operacao.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-xl bg-slate-900/60 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Planejado</p>
                  <p className="mt-1 font-semibold text-white">{operacao.quantidadePlanejada}</p>
                </div>
                <div className="rounded-xl bg-slate-900/60 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Realizado</p>
                  <p className="mt-1 font-semibold text-white">{operacao.quantidadeRealizada}</p>
                </div>
                <div className="rounded-xl bg-slate-900/60 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    Disponível agora
                  </p>
                  <p className="mt-1 font-semibold text-white">{saldoOperacao}</p>
                </div>
              </div>

              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-300">
                {operacaoDisponivel ? 'Selecionar operação' : 'Operação sem disponibilidade'}
                <ArrowRight size={16} />
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onTrocarDemanda}
          className="inline-flex min-h-12 items-center justify-center rounded-3xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
        >
          Trocar OP/produto
        </button>

        <button
          type="button"
          onClick={onTrocarOperador}
          className="inline-flex min-h-12 items-center justify-center rounded-3xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
        >
          Trocar operador
        </button>
      </div>
    </section>
  )
}
