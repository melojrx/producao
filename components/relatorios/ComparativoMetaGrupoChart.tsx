'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ComparativoMetaGrupoItem } from '@/types'

interface ComparativoMetaGrupoChartProps {
  dados: ComparativoMetaGrupoItem[]
}

interface PontoComparativo {
  data: string
  planejado: number
  realizado: number
}

function formatarData(data: string): string {
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}`
}

function mapearDados(dados: ComparativoMetaGrupoItem[]): PontoComparativo[] {
  return dados.map((item) => ({
    data: formatarData(item.data),
    planejado: item.planejado,
    realizado: item.realizado,
  }))
}

export function ComparativoMetaGrupoChart({
  dados,
}: ComparativoMetaGrupoChartProps) {
  const dadosGrafico = mapearDados(dados)

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Planejado vs Realizado</h2>
        <p className="mt-1 text-sm text-slate-600">
          Comparativo diário do escopo filtrado sem supercontar operações internas.
        </p>
      </div>

      {dadosGrafico.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
          Não há dados suficientes para montar o comparativo no período selecionado.
        </div>
      ) : (
        <div className="mt-6 h-80 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={320}>
            <BarChart data={dadosGrafico} margin={{ top: 8, right: 12, bottom: 8, left: -12 }}>
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="data"
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
                contentStyle={{
                  borderRadius: 16,
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 16px 40px rgba(15, 23, 42, 0.12)',
                }}
              />
              <Legend />
              <Bar dataKey="planejado" name="Planejado" fill="#2563EB" radius={[8, 8, 0, 0]} />
              <Bar dataKey="realizado" name="Realizado" fill="#10B981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
