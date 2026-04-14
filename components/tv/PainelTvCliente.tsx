'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, CheckCircle2, Moon, Sun, Target } from 'lucide-react'
import { GaugeMeta } from '@/components/tv/GaugeMeta'
import { CardKpiTv } from '@/components/tv/CardKpiTv'
import { TabelaEficienciaTv, badgeEficiencia } from '@/components/tv/TabelaEficienciaTv'
import type { ColunaTabelaTv } from '@/components/tv/TabelaEficienciaTv'
import { TOKENS, type TemaTV } from '@/components/tv/tema-tv'
import { useRealtimePlanejamentoTurnoV2 } from '@/hooks/useRealtimePlanejamentoTurnoV2'
import type {
  EficienciaOperacionalDiaRegistroV2,
  EficienciaOperacionalHoraRegistroV2,
  MetaMensalResumoDashboard,
  PlanejamentoTurnoDashboardV2,
} from '@/types'

interface PainelTvClienteProps {
  readonly initialPlanning: PlanejamentoTurnoDashboardV2 | null
  readonly resumoMetaMensal: MetaMensalResumoDashboard
}

const CHAVE_STORAGE = 'tv-tema'
const FUSO = 'America/Fortaleza'

function formatarHoraCompleta(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: FUSO,
  }).format(data)
}

function formatarDataCompleta(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: FUSO,
  }).format(data)
}

function formatarHora(valor: string): string {
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: FUSO,
  }).format(data)
}

function formatarData(valor: string): string {
  const [ano, mes, dia] = valor.split('-')
  if (!ano || !mes || !dia) return valor
  return `${dia}/${mes}/${ano}`
}

function formatarNumero(valor: number, decimais = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimais,
    maximumFractionDigits: decimais,
  }).format(valor)
}

function construirLinhasHora(
  registros: EficienciaOperacionalHoraRegistroV2[]
): Record<string, unknown>[] {
  return registros.map((r) => ({
    hora: formatarHora(r.hora),
    operadorNome: r.operadorNome,
    pecas: formatarNumero(r.quantidadeRealizada),
    eficiencia: r.eficienciaPct,
  }))
}

function construirLinhasDia(
  registros: EficienciaOperacionalDiaRegistroV2[]
): Record<string, unknown>[] {
  return registros.map((r) => ({
    data: formatarData(r.data),
    operadorNome: r.operadorNome,
    pecas: formatarNumero(r.quantidadeRealizada),
    eficiencia: r.eficienciaPct,
  }))
}

function classeStatusDot(status: 'ativo' | 'conectando' | 'erro'): string {
  if (status === 'ativo') return 'bg-emerald-500'
  if (status === 'conectando') return 'bg-amber-400'
  return 'bg-rose-500'
}

function lerTemaStorage(): TemaTV {
  try {
    const salvo = localStorage.getItem(CHAVE_STORAGE)
    if (salvo === 'light' || salvo === 'dark') return salvo
  } catch {
    // localStorage indisponível (SSR ou bloqueio de privacidade)
  }
  return 'dark'
}

function construirColunasHora(textoPrimario: string): ColunaTabelaTv[] {
  return [
    {
      chave: 'hora',
      titulo: 'Hora',
      largura: '72px',
      renderizar: (v) => (
        <span className={`font-mono font-semibold ${textoPrimario}`}>{String(v ?? '—')}</span>
      ),
    },
    {
      chave: 'operadorNome',
      titulo: 'Operador',
      renderizar: (v) => (
        <span className={`font-medium ${textoPrimario}`}>{String(v ?? '—')}</span>
      ),
    },
    {
      chave: 'pecas',
      titulo: 'Peças',
      largura: '72px',
      alinhar: 'right',
      renderizar: (v) => (
        <span className={`font-semibold ${textoPrimario}`}>{String(v ?? '—')}</span>
      ),
    },
    {
      chave: 'eficiencia',
      titulo: 'Eficiência %',
      largura: '130px',
      alinhar: 'right',
      renderizar: (v) => badgeEficiencia(typeof v === 'number' ? v : 0),
    },
  ]
}

function construirColunasDia(textoPrimario: string): ColunaTabelaTv[] {
  return [
    {
      chave: 'data',
      titulo: 'Data',
      largura: '90px',
      renderizar: (v) => (
        <span className={`font-mono font-semibold ${textoPrimario}`}>{String(v ?? '—')}</span>
      ),
    },
    {
      chave: 'operadorNome',
      titulo: 'Operador',
      renderizar: (v) => (
        <span className={`font-medium ${textoPrimario}`}>{String(v ?? '—')}</span>
      ),
    },
    {
      chave: 'pecas',
      titulo: 'Peças',
      largura: '72px',
      alinhar: 'right',
      renderizar: (v) => (
        <span className={`font-semibold ${textoPrimario}`}>{String(v ?? '—')}</span>
      ),
    },
    {
      chave: 'eficiencia',
      titulo: 'Eficiência %',
      largura: '130px',
      alinhar: 'right',
      renderizar: (v) => badgeEficiencia(typeof v === 'number' ? v : 0),
    },
  ]
}

export function PainelTvCliente({ initialPlanning, resumoMetaMensal }: PainelTvClienteProps) {
  const [agora, setAgora] = useState<Date | null>(null)
  const [tema, setTema] = useState<TemaTV>('dark')
  const { planejamento, statusConexao } = useRealtimePlanejamentoTurnoV2(initialPlanning)
  const t = TOKENS[tema]

  // Hidrata o tema do localStorage apenas no cliente
  useEffect(() => {
    setTema(lerTemaStorage())
  }, [])

  useEffect(() => {
    setAgora(new Date())
    const id = globalThis.setInterval(() => setAgora(new Date()), 1000)
    return () => globalThis.clearInterval(id)
  }, [])

  function alternarTema() {
    setTema((anterior) => {
      const novo: TemaTV = anterior === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(CHAVE_STORAGE, novo)
      } catch {
        // silencia erros de localStorage
      }
      return novo
    })
  }

  const eficiencia = planejamento?.eficienciaOperacional
  const linhasHora = useMemo(
    () => construirLinhasHora(eficiencia?.porHora ?? []),
    [eficiencia?.porHora]
  )
  const linhasDia = useMemo(
    () => construirLinhasDia(eficiencia?.porDia ?? []),
    [eficiencia?.porDia]
  )

  const colunasHora = useMemo(() => construirColunasHora(t.textoPrimario), [t.textoPrimario])
  const colunasDia = useMemo(() => construirColunasDia(t.textoPrimario), [t.textoPrimario])

  const metaPecas = resumoMetaMensal.metaPecas
  const alcancadoMes = resumoMetaMensal.alcancadoMes
  const atingimentoPct = resumoMetaMensal.atingimentoPct
  const saldoMes = resumoMetaMensal.saldoMes
  const statusDot = classeStatusDot(statusConexao)

  return (
    <div className={`flex min-h-screen flex-col ${t.pagina} px-6 py-5 xl:px-10`}>
      {/* Header */}
      <header className="mb-6 flex items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
            <Activity size={18} className="text-white" />
          </div>
          <div>
            <p className={`text-sm font-semibold ${t.headerTitulo}`}>Produção em Tempo Real</p>
            <p className={`text-xs ${t.headerSubtitulo}`}>Painel de Acompanhamento</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Botão de tema */}
          <button
            type="button"
            aria-label={tema === 'dark' ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
            onClick={alternarTema}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${t.botaoTema}`}
          >
            {tema === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${statusDot} shrink-0`} />
            <span className={`text-xs font-medium capitalize ${t.statusTexto}`}>
              {statusConexao}
            </span>
          </div>

          <div className="text-right">
            <p className={`text-2xl font-bold tabular-nums tracking-tight ${t.headerTitulo}`}>
              {agora ? formatarHoraCompleta(agora) : '—'}
            </p>
            <p className={`text-xs capitalize ${t.headerSubtitulo}`}>
              {agora ? formatarDataCompleta(agora) : '—'}
            </p>
          </div>
        </div>
      </header>

      {/* KPIs + Gauge */}
      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CardKpiTv
          label="Meta Mensal"
          valor={metaPecas > 0 ? formatarNumero(metaPecas) : '—'}
          sublabel={`${resumoMetaMensal.diasProdutivos} dias produtivos`}
          icone={Target}
          cor="indigo"
          tema={tema}
        />

        <CardKpiTv
          label="Alcançado"
          valor={metaPecas > 0 ? formatarNumero(alcancadoMes) : '—'}
          sublabel={metaPecas > 0 ? `Saldo: ${formatarNumero(saldoMes)} peças` : 'Sem meta cadastrada'}
          icone={CheckCircle2}
          cor="emerald"
          tema={tema}
        />

        <div className={`flex items-center justify-center rounded-2xl border ${t.gaugeContainer} p-4`}>
          {metaPecas > 0 ? (
            <GaugeMeta
              atingimentoPct={atingimentoPct}
              metaPecas={metaPecas}
              alcancadoMes={alcancadoMes}
              tema={tema}
            />
          ) : (
            <p className={`text-sm ${t.textoSecundario}`}>
              Sem meta cadastrada para esta competência.
            </p>
          )}
        </div>
      </section>

      {/* Tabelas de eficiência */}
      <section className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <TabelaEficienciaTv
          titulo="Eficiência por Hora"
          colunas={colunasHora}
          linhas={linhasHora}
          tema={tema}
          semDados="Sem apontamentos suficientes para a leitura por hora."
        />

        <TabelaEficienciaTv
          titulo="Eficiência do Dia por Operador"
          colunas={colunasDia}
          linhas={linhasDia}
          tema={tema}
          semDados="O resumo diário será exibido assim que houver apontamentos válidos."
        />
      </section>
    </div>
  )
}
