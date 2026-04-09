'use client'

import { Factory, LayoutGrid, Users } from 'lucide-react'

export type DashboardTabId = 'visao_geral' | 'visao_operacional' | 'operadores'

interface DashboardTabsProps {
  abaAtiva: DashboardTabId
  onChange: (aba: DashboardTabId) => void
}

export function DashboardTabs({ abaAtiva, onChange }: DashboardTabsProps) {
  const abas: Array<{
    id: DashboardTabId
    titulo: string
    descricao: string
    icone: typeof LayoutGrid
  }> = [
    {
      id: 'visao_geral',
      titulo: 'Visão Geral',
      descricao: 'Meta mensal, alcançado, saldo e leitura gerencial da competência.',
      icone: LayoutGrid,
    },
    {
      id: 'visao_operacional',
      titulo: 'Visão Operacional',
      descricao: 'Monitor do turno, OPs, setores, capacidade e progresso operacional.',
      icone: Factory,
    },
    {
      id: 'operadores',
      titulo: 'Operadores',
      descricao:
        'Eficiência por hora, eficiência do dia por operador e detalhamento por operação.',
      icone: Users,
    },
  ]

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid gap-3 md:grid-cols-3">
        {abas.map((aba) => {
          const Icone = aba.icone
          const ativa = aba.id === abaAtiva

          return (
            <button
              key={aba.id}
              type="button"
              onClick={() => onChange(aba.id)}
              className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                ativa
                  ? 'border-blue-200 bg-blue-50 shadow-sm'
                  : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`rounded-2xl p-3 ${
                    ativa ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  <Icone size={18} />
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-sm font-semibold ${
                      ativa ? 'text-blue-950' : 'text-slate-900'
                    }`}
                  >
                    {aba.titulo}
                  </p>
                  <p className={`mt-1 text-sm ${ativa ? 'text-blue-800' : 'text-slate-600'}`}>
                    {aba.descricao}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
