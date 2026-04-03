'use client'

import { useEffect, useState } from 'react'
import { Signal, TimerReset } from 'lucide-react'
import { contarOperadoresEnvolvidosNoTurno } from '@/lib/utils/turno-operadores'
import { mapearSetoresTurnoParaDashboard } from '@/lib/utils/turno-setores'
import type { StatusConexaoRealtimeTurnoV2 } from '@/hooks/useRealtimePlanejamentoTurnoV2'
import type { PlanejamentoTurnoDashboardV2 } from '@/types'

interface ResumoPlanejamentoTurnoV2Props {
  planejamento: PlanejamentoTurnoDashboardV2 | null
  statusConexao: StatusConexaoRealtimeTurnoV2
  ultimaAtualizacao: Date | null
}

function formatarDataHora(valor: string | null): string {
  if (!valor) {
    return '—'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Fortaleza',
  }).format(new Date(valor))
}

function formatarHorarioAtual(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Fortaleza',
  }).format(data)
}

export function ResumoPlanejamentoTurnoV2({
  planejamento,
  statusConexao,
  ultimaAtualizacao: _ultimaAtualizacao,
}: ResumoPlanejamentoTurnoV2Props) {
  const [agora, setAgora] = useState(() => new Date())

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setAgora(new Date())
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  if (!planejamento) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">Dashboard em tempo real</h2>
          <p className="text-sm text-slate-600">
            Nenhum turno foi encontrado. Quando um turno for aberto, a dashboard passará a usar o
            turno em aberto ou, na ausência dele, o último turno encerrado.
          </p>
        </div>
      </section>
    )
  }

  const tituloOrigem =
    planejamento.origem === 'aberto' ? 'Turno aberto atual' : 'Último turno encerrado'
  const opsConcluidas = planejamento.ops.filter((op) => op.status === 'concluida').length
  const setores = mapearSetoresTurnoParaDashboard(planejamento)
  const setoresConcluidos = setores.filter((setor) => setor.status === 'concluida').length
  const operadoresEnvolvidos = contarOperadoresEnvolvidosNoTurno(planejamento)
  const progressoOps =
    planejamento.ops.length > 0 ? Math.round((opsConcluidas / planejamento.ops.length) * 100) : 0
  const progressoSetores =
    setores.length > 0
      ? Math.round((setoresConcluidos / setores.length) * 100)
      : 0

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">Dashboard em tempo real</h2>
          <p className="text-sm text-slate-600">
            A dashboard carrega automaticamente o turno aberto atual ou, se não houver um aberto, o
            último turno encerrado.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
            <span>
              Iniciado em <strong className="font-medium text-slate-700">{formatarDataHora(planejamento.turno.iniciadoEm)}</strong>
            </span>
            {planejamento.turno.encerradoEm ? (
              <span>
                Encerrado em{' '}
                <strong className="font-medium text-slate-700">
                  {formatarDataHora(planejamento.turno.encerradoEm)}
                </strong>
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 md:max-w-[12rem] md:items-end">
          <span
            className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${
              planejamento.origem === 'aberto'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {tituloOrigem}
          </span>

          <div className="w-full text-right">
            <p className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {formatarHorarioAtual(agora)}
            </p>
            <div className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
              <Signal
                size={12}
                className={statusConexao === 'ativo' ? 'text-emerald-500' : 'text-amber-500'}
              />
              {statusConexao}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Operadores disponíveis
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {planejamento.turno.operadoresDisponiveis}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Operadores alocados
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{operadoresEnvolvidos}</p>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">OPs</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{planejamento.ops.length}</p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            OPs concluídas
          </p>
          <p className="mt-2 text-3xl font-semibold text-emerald-900">{opsConcluidas}</p>
          <p className="mt-1 text-xs font-medium text-emerald-800">{progressoOps}% do turno</p>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Setores ativos
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{setores.length}</p>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
            Setores concluídos
          </p>
          <p className="mt-2 text-3xl font-semibold text-blue-900">{setoresConcluidos}</p>
          <p className="mt-1 text-xs font-medium text-blue-800">{progressoSetores}% do turno</p>
        </div>
      </div>
    </section>
  )
}
