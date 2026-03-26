'use client'

import { useState } from 'react'
import { MonitorRealtimeProducao } from '@/components/dashboard/MonitorRealtimeProducao'
import { PencilLine } from 'lucide-react'
import { ModalConfiguracaoTurno } from '@/components/dashboard/ModalConfiguracaoTurno'
import type { ConfiguracaoTurnoComBlocos, ProdutoTurnoOption } from '@/types'

interface PainelConfiguracaoTurnoProps {
  configuracaoAtual: ConfiguracaoTurnoComBlocos | null
  produtos: ProdutoTurnoOption[]
}

export function PainelConfiguracaoTurno({
  configuracaoAtual,
  produtos,
}: PainelConfiguracaoTurnoProps) {
  const [modalAberto, setModalAberto] = useState(configuracaoAtual === null)
  const totalFuncionariosAtivos =
    configuracaoAtual?.blocos.reduce((soma, bloco) => soma + bloco.funcionariosAtivos, 0) ??
    configuracaoAtual?.funcionariosAtivos ??
    null

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">Dashboard em tempo real</h1>
            <p className="max-w-2xl text-sm text-slate-600">
              A configuração diária do turno define operadores ativos, minutos produtivos e os
              blocos planejados do dia. Esses dados alimentam a meta coletiva e as leituras do scanner.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalAberto(true)}
            title="Editar configuração do turno"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <PencilLine size={16} />
            {configuracaoAtual ? 'Editar planejamento' : 'Configurar turno'}
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Funcionários ativos
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {totalFuncionariosAtivos ?? '—'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Minutos do turno
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {configuracaoAtual?.minutosTurno ?? '—'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Blocos do dia
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {configuracaoAtual?.blocos.length ?? '—'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Meta Grupo
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {configuracaoAtual?.metaGrupo ?? '—'}
          </p>
        </div>
      </section>

      {!configuracaoAtual ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          O dashboard completo depende da configuração do turno. Defina o cabeçalho do dia e pelo
          menos um bloco de planejamento para liberar as próximas métricas do painel.
        </div>
      ) : (
        <MonitorRealtimeProducao />
      )}

      {modalAberto ? (
        <ModalConfiguracaoTurno
          produtos={produtos}
          configuracaoAtual={configuracaoAtual}
          bloqueante={configuracaoAtual === null}
          aoFechar={() => setModalAberto(false)}
        />
      ) : null}
    </>
  )
}
