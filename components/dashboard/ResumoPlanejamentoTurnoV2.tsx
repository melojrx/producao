'use client'

import { useEffect, useState } from 'react'
import { Monitor, Signal } from 'lucide-react'
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
  const [agora, setAgora] = useState<Date | null>(null)

  useEffect(() => {
    setAgora(new Date())

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

        <div className="flex w-full flex-col gap-2 md:max-w-[14rem] md:items-end">
          <div className="flex w-full items-center justify-between gap-2 md:justify-end">
            <span
              className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${
                planejamento.origem === 'aberto'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {tituloOrigem}
            </span>

            <button
              type="button"
              aria-label="Abrir painel TV em nova aba"
              onClick={() => window.open('/tv', '_blank')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <Monitor size={13} />
              Painel TV
            </button>
          </div>

          <div className="w-full text-right">
            <p className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {agora ? formatarHorarioAtual(agora) : '—'}
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
    </section>
  )
}
