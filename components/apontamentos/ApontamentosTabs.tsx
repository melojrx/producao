'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { CalendarRange, ClipboardList } from 'lucide-react'

type ApontamentosTabId = 'gestao_mensal' | 'operacao_turno'

interface ApontamentosTabsProps {
  gestaoMensal: ReactNode
  operacaoTurno: ReactNode
}

export function ApontamentosTabs({
  gestaoMensal,
  operacaoTurno,
}: ApontamentosTabsProps) {
  const [abaAtiva, setAbaAtiva] = useState<ApontamentosTabId>('gestao_mensal')

  const abas: Array<{
    id: ApontamentosTabId
    titulo: string
    descricao: string
    icone: typeof CalendarRange
  }> = [
    {
      id: 'gestao_mensal',
      titulo: 'Gestão Mensal',
      descricao: 'Cadastro, edição e navegação da meta mensal por competência.',
      icone: CalendarRange,
    },
    {
      id: 'operacao_turno',
      titulo: 'Operação do Turno',
      descricao: 'Controles do turno e lançamentos operacionais do supervisor.',
      icone: ClipboardList,
    },
  ]

  return (
    <section className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2">
          {abas.map((aba) => {
            const Icone = aba.icone
            const ativa = aba.id === abaAtiva

            return (
              <button
                key={aba.id}
                type="button"
                onClick={() => setAbaAtiva(aba.id)}
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

      {abaAtiva === 'gestao_mensal' ? gestaoMensal : operacaoTurno}
    </section>
  )
}
