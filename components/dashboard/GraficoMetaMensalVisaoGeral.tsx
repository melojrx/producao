'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartResponsiveContainer } from '@/components/ui/ChartResponsiveContainer'
import type { MetaMensalResumoDashboard } from '@/types'

interface GraficoMetaMensalVisaoGeralProps {
  resumoMetaMensal: MetaMensalResumoDashboard
}

const formatadorNumero = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
})

function formatarValorNumerico(valor: number): string {
  return formatadorNumero.format(valor)
}

function mapearDadosAcumulados(resumoMetaMensal: MetaMensalResumoDashboard) {
  return resumoMetaMensal.evolucaoDiaria.map((item) => ({
    dia: item.diaLabel,
    metaAcumuladaReferencia: item.metaAcumuladaReferencia,
    realizadoAcumulado: item.realizadoAcumulado,
    realizadoDia: item.realizadoDia,
    atingimentoAcumuladoPct: item.atingimentoAcumuladoPct,
  }))
}

function mapearDadosDiarios(resumoMetaMensal: MetaMensalResumoDashboard) {
  return resumoMetaMensal.evolucaoDiaria.map((item) => ({
    dia: item.diaLabel,
    metaDiariaMedia: item.metaDiariaMedia,
    realizadoDia: item.realizadoDia,
  }))
}

function mapearDadosSemanais(resumoMetaMensal: MetaMensalResumoDashboard) {
  return resumoMetaMensal.resumoSemanal.map((item, indice) => ({
    semana: `S${indice + 1}`,
    periodo: item.periodo,
    metaReferenciaSemana: item.metaReferenciaSemana,
    realizadoSemana: item.realizadoSemana,
    realizadoAcumulado: item.realizadoAcumulado,
    atingimentoAcumuladoPct: item.atingimentoAcumuladoPct,
  }))
}

export function GraficoMetaMensalVisaoGeral({
  resumoMetaMensal,
}: GraficoMetaMensalVisaoGeralProps) {
  if (!resumoMetaMensal.metaMensal) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">Trajetória mensal da meta</h2>
          <p className="text-sm text-slate-600">
            O acompanhamento gráfico fica disponível assim que a meta mensal da competência for
            cadastrada.
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
          Sem meta mensal cadastrada, a dashboard ainda não consegue montar a curva esperada diária
          e semanal desta competência.
        </div>
      </section>
    )
  }

  const dadosAcumulados = mapearDadosAcumulados(resumoMetaMensal)
  const dadosDiarios = mapearDadosDiarios(resumoMetaMensal)
  const dadosSemanais = mapearDadosSemanais(resumoMetaMensal)
  const semProducaoConsolidada = resumoMetaMensal.alcancadoMes === 0

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">Trajetória mensal da meta</h2>
          <p className="text-sm text-slate-600">
            A curva esperada usa a meta diária média como referência gerencial desta primeira
            versão.
          </p>
        </div>

        {semProducaoConsolidada ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Ainda não há produção consolidada nesta competência. Os gráficos exibem apenas a
            trajetória de referência da meta.
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Meta Mensal x Alcançado acumulado
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Leitura principal do mês para identificar cedo desvios acima, dentro ou abaixo da
                trajetória esperada.
              </p>
            </div>

            <div className="mt-6 h-80 w-full min-w-0">
              <ChartResponsiveContainer minHeight={320}>
                <LineChart data={dadosAcumulados} margin={{ top: 8, right: 12, bottom: 8, left: -12 }}>
                  <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="dia"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#64748B', fontSize: 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#64748B', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 16,
                      border: '1px solid #DBEAFE',
                      boxShadow: '0 16px 40px rgba(15, 23, 42, 0.12)',
                    }}
                    formatter={(valor, nome) => [
                      formatarValorNumerico(typeof valor === 'number' ? valor : 0),
                      nome === 'metaAcumuladaReferencia'
                        ? 'Meta acumulada de referência'
                        : 'Alcançado acumulado',
                    ]}
                    labelFormatter={(label, payload) => {
                      const ponto = payload?.[0]?.payload as
                        | { realizadoDia?: number; atingimentoAcumuladoPct?: number }
                        | undefined

                      if (!ponto) {
                        return `Dia ${String(label ?? '')}`
                      }

                      return `Dia ${String(label ?? '')} • Realizado no dia ${formatarValorNumerico(
                        ponto.realizadoDia ?? 0
                      )} • ${formatarValorNumerico(ponto.atingimentoAcumuladoPct ?? 0)}%`
                    }}
                  />
                  <Legend
                    formatter={(value) =>
                      value === 'metaAcumuladaReferencia'
                        ? 'Meta acumulada de referência'
                        : 'Alcançado acumulado'
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="metaAcumuladaReferencia"
                    stroke="#2563EB"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5, fill: '#1D4ED8', strokeWidth: 0 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="realizadoAcumulado"
                    stroke="#059669"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5, fill: '#047857', strokeWidth: 0 }}
                  />
                </LineChart>
              </ChartResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Evolução semanal</h3>
              <p className="mt-1 text-sm text-slate-600">
                Semanas do calendário da competência, sem blocos móveis de sete dias.
              </p>
            </div>

            {dadosSemanais.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                Ainda não há semanas consolidadas para esta competência.
              </div>
            ) : (
              <div className="mt-6 h-80 w-full min-w-0">
                <ChartResponsiveContainer minHeight={320}>
                  <BarChart data={dadosSemanais} margin={{ top: 8, right: 12, bottom: 8, left: -12 }}>
                    <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="semana"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748B', fontSize: 12 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748B', fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 16,
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 16px 40px rgba(15, 23, 42, 0.12)',
                      }}
                      formatter={(valor, nome) => [
                        formatarValorNumerico(typeof valor === 'number' ? valor : 0),
                        nome === 'metaReferenciaSemana'
                          ? 'Meta de referência da semana'
                          : 'Realizado na semana',
                      ]}
                      labelFormatter={(label, payload) => {
                        const ponto = payload?.[0]?.payload as
                          | { periodo?: string; atingimentoAcumuladoPct?: number }
                          | undefined

                        if (!ponto) {
                          return String(label ?? '')
                        }

                        return `${String(label ?? '')} • ${ponto.periodo ?? ''} • ${formatarValorNumerico(
                          ponto.atingimentoAcumuladoPct ?? 0
                        )}% acumulado`
                      }}
                    />
                    <Legend
                      formatter={(value) =>
                        value === 'metaReferenciaSemana'
                          ? 'Meta de referência'
                          : 'Realizado'
                      }
                    />
                    <Bar
                      dataKey="metaReferenciaSemana"
                      fill="#2563EB"
                      radius={[8, 8, 0, 0]}
                    />
                    <Bar dataKey="realizadoSemana" fill="#10B981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ChartResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Evolução diária</h3>
          <p className="mt-1 text-sm text-slate-600">
            Comparativo diário entre a meta média de referência e o realizado consolidado no dia.
          </p>
        </div>

        {dadosDiarios.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
            Ainda não há dados diários suficientes para a competência selecionada.
          </div>
        ) : (
          <div className="mt-6 h-80 w-full min-w-0">
            <ChartResponsiveContainer minHeight={320}>
              <BarChart data={dadosDiarios} margin={{ top: 8, right: 12, bottom: 8, left: -12 }}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="dia"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 16,
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 16px 40px rgba(15, 23, 42, 0.12)',
                  }}
                  formatter={(valor, nome) => [
                    formatarValorNumerico(typeof valor === 'number' ? valor : 0),
                    nome === 'metaDiariaMedia' ? 'Meta diária média' : 'Realizado no dia',
                  ]}
                  labelFormatter={(label) => `Dia ${String(label ?? '')}`}
                />
                <Legend
                  formatter={(value) =>
                    value === 'metaDiariaMedia' ? 'Meta diária média' : 'Realizado no dia'
                  }
                />
                <Bar dataKey="metaDiariaMedia" fill="#93C5FD" radius={[8, 8, 0, 0]} />
                <Bar dataKey="realizadoDia" fill="#10B981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ChartResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  )
}
