'use client'

import { useState } from 'react'
import { PencilLine } from 'lucide-react'
import { ModalNovoTurnoV2 } from '@/components/dashboard/ModalNovoTurnoV2'
import type {
  ConfiguracaoTurnoComBlocos,
  PlanejamentoTurnoDashboardV2,
  ProdutoTurnoOption,
} from '@/types'

interface PainelConfiguracaoTurnoProps {
  configuracaoAtual: ConfiguracaoTurnoComBlocos | null
  planejamentoAtual: PlanejamentoTurnoDashboardV2 | null
  produtos: ProdutoTurnoOption[]
}

export function PainelConfiguracaoTurno({
  configuracaoAtual,
  planejamentoAtual,
  produtos,
}: PainelConfiguracaoTurnoProps) {
  const [modalAberto, setModalAberto] = useState(planejamentoAtual === null)
  const descricaoConfiguracao = configuracaoAtual
    ? `${configuracaoAtual.funcionariosAtivos} operadores previstos e ${configuracaoAtual.minutosTurno} minutos produtivos configurados para hoje.`
    : 'Defina operadores disponíveis, minutos produtivos e as OPs do dia para destravar a operação.'

  return (
    <>
      <section className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-cyan-50 p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              Ação principal da operação
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard em tempo real</h1>
            <p className="max-w-3xl text-sm text-slate-600">
              O novo turno define operadores disponíveis, minutos produtivos e as OPs do dia. A
              partir disso, o sistema deriva automaticamente as seções por setor e alimenta as
              próximas etapas do scanner e do acompanhamento operacional.
            </p>
            <p className="text-sm font-medium text-slate-700">{descricaoConfiguracao}</p>
          </div>

          <div className="flex flex-col gap-2 lg:min-w-64 lg:items-end">
            <button
              type="button"
              onClick={() => setModalAberto(true)}
              title="Abrir novo turno"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-blue-200 transition-colors hover:bg-blue-700"
            >
              <PencilLine size={18} />
              {planejamentoAtual ? 'Novo Turno' : 'Abrir primeiro turno'}
            </button>
            <p className="text-sm text-slate-500">
              Use este atalho para abrir um novo planejamento operacional.
            </p>
          </div>
        </div>
      </section>

      {!planejamentoAtual ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          O dashboard depende da abertura de um turno com operadores e OPs planejadas. Abra o
          primeiro turno para gerar automaticamente as seções por setor e destravar a operação do dia.
        </div>
      ) : null}

      {modalAberto ? (
        <ModalNovoTurnoV2
          planejamentoAtual={planejamentoAtual}
          produtos={produtos}
          bloqueante={planejamentoAtual === null}
          aoFechar={() => setModalAberto(false)}
        />
      ) : null}
    </>
  )
}
