'use client'

import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartResponsiveContainer } from '@/components/ui/ChartResponsiveContainer'
import type { ComparativoMetaGrupoHoraItem } from '@/types'

interface GraficoMetaGrupoTurnoV2Props {
  dados: ComparativoMetaGrupoHoraItem[]
  estaCarregando?: boolean
  desabilitado?: boolean
  motivoDesabilitado?: string
}

interface PontoGraficoMetaGrupo {
  hora: string
  planejado: number
  realizado: number
}

function formatarHora(rotuloIso: string): string {
  const data = new Date(rotuloIso)

  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Fortaleza',
  }).format(data)
}

function mapearDados(dados: ComparativoMetaGrupoHoraItem[]): PontoGraficoMetaGrupo[] {
  return dados.map((item) => ({
    hora: formatarHora(item.hora),
    planejado: item.planejado,
    realizado: item.realizado,
  }))
}

export function GraficoMetaGrupoTurnoV2({
  dados,
  estaCarregando = false,
  desabilitado = false,
  motivoDesabilitado = 'Este gráfico é recalculado somente durante um turno aberto.',
}: GraficoMetaGrupoTurnoV2Props) {
  const dadosGrafico = mapearDados(dados)

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Projeção do planejado x alcançado por hora
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {desabilitado
              ? motivoDesabilitado
              : 'Curva acumulada da Meta do Grupo do turno versus o realizado consolidado ao longo das horas.'}
          </p>
        </div>
        {estaCarregando && !desabilitado ? (
          <span className="text-xs text-slate-500">Atualizando...</span>
        ) : null}
      </div>

      {desabilitado ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
          O comparativo por hora fica disponível novamente quando um novo turno for aberto.
        </div>
      ) : dadosGrafico.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
          Ainda não há dados suficientes para projetar a Meta do Grupo deste turno.
        </div>
      ) : (
        <div className="mt-6">
          <div className="mb-4 flex flex-wrap gap-4 text-sm text-slate-600">
            <div className="inline-flex items-center gap-2">
              <span className="h-2.5 w-8 rounded-full bg-blue-600" aria-hidden />
              Planejado
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="h-2.5 w-8 rounded-full bg-emerald-600" aria-hidden />
              Alcançado
            </div>
          </div>

          <div className="h-72 w-full min-w-0">
            <ChartResponsiveContainer minHeight={288}>
              <LineChart data={dadosGrafico} margin={{ top: 8, right: 12, bottom: 8, left: -12 }}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="hora"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ stroke: '#93C5FD', strokeWidth: 1 }}
                  contentStyle={{
                    borderRadius: 16,
                    border: '1px solid #DBEAFE',
                    boxShadow: '0 16px 40px rgba(15, 23, 42, 0.12)',
                  }}
                  formatter={(valor, nome) => [
                    typeof valor === 'number' ? valor : 0,
                    nome === 'Planejado' ? 'Planejado' : 'Alcançado',
                  ]}
                  labelFormatter={(label) => `Hora ${String(label ?? '')}`}
                />
                <Line
                  type="monotone"
                  dataKey="planejado"
                  name="Planejado"
                  stroke="#2563EB"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#2563EB', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#1D4ED8', strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="realizado"
                  name="Alcançado"
                  stroke="#059669"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#059669', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#047857', strokeWidth: 0 }}
                />
              </LineChart>
            </ChartResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  )
}
