'use client'

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ProducaoPorHoraRegistro } from '@/types'

interface GraficoProducaoPorHoraProps {
  dados: ProducaoPorHoraRegistro[]
  estaCarregando?: boolean
}

interface PontoGrafico {
  hora: string
  totalPecas: number
  totalRegistros: number
}

function formatarHora(rotuloIso: string): string {
  const data = new Date(rotuloIso)

  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Fortaleza',
  }).format(data)
}

function mapearDados(dados: ProducaoPorHoraRegistro[]): PontoGrafico[] {
  return dados.map((item) => ({
    hora: formatarHora(item.hora),
    totalPecas: item.totalPecas,
    totalRegistros: item.totalRegistros,
  }))
}

export function GraficoProducaoPorHora({
  dados,
  estaCarregando = false,
}: GraficoProducaoPorHoraProps) {
  const dadosGrafico = mapearDados(dados)

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Produção por hora</h3>
          <p className="mt-1 text-sm text-slate-600">
            Curva de peças registradas ao longo do turno atual.
          </p>
        </div>
        {estaCarregando ? (
          <span className="text-xs text-slate-500">Atualizando...</span>
        ) : null}
      </div>

      {dadosGrafico.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
          Ainda não há registros suficientes para desenhar a curva de produção.
        </div>
      ) : (
        <div className="mt-6 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={dadosGrafico}
              margin={{ top: 8, right: 12, bottom: 8, left: -12 }}
            >
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
                  nome === 'totalPecas' ? 'Peças' : 'Registros',
                ]}
                labelFormatter={(label) => `Hora ${String(label ?? '')}`}
              />
              <Line
                type="monotone"
                dataKey="totalPecas"
                name="Peças"
                stroke="#2563EB"
                strokeWidth={3}
                dot={{ r: 4, fill: '#2563EB', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#1D4ED8', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
