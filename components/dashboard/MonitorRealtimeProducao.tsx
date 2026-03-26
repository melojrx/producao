'use client'

import { useMemo } from 'react'
import { Activity, Gauge, RefreshCw, Signal, Target, Users } from 'lucide-react'
import { CardKPI } from '@/components/dashboard/CardKPI'
import { GraficoProducaoPorHora } from '@/components/dashboard/GraficoProducaoPorHora'
import { RankingOperadores } from '@/components/dashboard/RankingOperadores'
import { ResumoBlocosTurno } from '@/components/dashboard/ResumoBlocosTurno'
import { StatusMaquinas } from '@/components/dashboard/StatusMaquinas'
import { useRealtimeProducao } from '@/hooks'

function formatarUltimaAtualizacao(data: Date | null): string {
  if (!data) {
    return 'Aguardando primeira sincronização'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Fortaleza',
  }).format(data)
}

export function MonitorRealtimeProducao() {
  const {
    registros,
    totalPecas,
    eficienciaMedia,
    producaoPorHora,
    statusMaquinas,
    configuracaoTurno,
    blocosResumo,
    ultimaAtualizacao,
    statusConexao,
    estaCarregando,
    erro,
    recarregar,
  } = useRealtimeProducao()

  const corStatus = useMemo(() => {
    if (statusConexao === 'ativo') {
      return 'bg-emerald-500'
    }

    if (statusConexao === 'erro') {
      return 'bg-red-500'
    }

    return 'bg-amber-400'
  }, [statusConexao])

  const metaGrupo = configuracaoTurno?.metaGrupoTotal ?? configuracaoTurno?.metaGrupo ?? 0
  const progressoPct = metaGrupo > 0 ? Math.min((totalPecas / metaGrupo) * 100, 999.99) : 0
  const blocoAtivo = configuracaoTurno?.blocoAtivo ?? null
  const concluidos = blocosResumo.filter((bloco) => bloco.status === 'concluido').length

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <span className={`h-2.5 w-2.5 rounded-full ${corStatus}`} aria-hidden />
            Realtime {statusConexao === 'ativo' ? 'ativo' : statusConexao === 'erro' ? 'com erro' : 'conectando'}
          </div>

          <h2 className="text-xl font-semibold text-slate-900">Monitor de produção ao vivo</h2>
          <p className="max-w-2xl text-sm text-slate-600">
            Este bloco valida a atualização automática do dashboard após novos registros do scanner.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void recarregar()
          }}
          title="Recarregar dados do dashboard"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <RefreshCw size={16} />
          Atualizar agora
        </button>
      </div>

      {erro ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CardKPI
          titulo="Meta grupo"
          valor={metaGrupo}
          descricao="Meta coletiva do dia baseada na configuração atual do turno."
          icone={Target}
          destaque="blue"
        />
        <CardKPI
          titulo="Progresso"
          valor={progressoPct}
          descricao="Percentual realizado versus a meta coletiva do dia."
          icone={Gauge}
          sufixo="%"
          decimals={2}
          destaque="emerald"
        />
        <CardKPI
          titulo="Eficiência média"
          valor={eficienciaMedia}
          descricao="Média de eficiência dos operadores ativos no dia."
          icone={Users}
          sufixo="%"
          decimals={2}
          destaque="amber"
        />
        <CardKPI
          titulo="Peças produzidas"
          valor={totalPecas}
          descricao="Soma das peças registradas hoje no fluxo do scanner."
          icone={Activity}
          destaque="slate"
        />
      </div>

      <GraficoProducaoPorHora
        dados={producaoPorHora}
        estaCarregando={estaCarregando}
      />

      <ResumoBlocosTurno
        blocos={blocosResumo}
        estaCarregando={estaCarregando}
      />

      <div className="grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
        <RankingOperadores
          registros={registros}
          estaCarregando={estaCarregando}
        />

        <div className="rounded-2xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Snapshot do turno</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <span>Meta grupo</span>
              <strong className="text-slate-900">{metaGrupo || '—'}</strong>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <span>Minutos do turno</span>
              <strong className="text-slate-900">{configuracaoTurno?.minutosTurno ?? '—'}</strong>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <span>Bloco atual</span>
              <strong className="text-slate-900">
                {blocoAtivo ? `#${blocoAtivo.sequencia} ${blocoAtivo.descricaoBloco}` : '—'}
              </strong>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <span>Origem do bloco atual</span>
              <strong className="text-slate-900">
                {blocoAtivo ? (blocoAtivo.origemTp === 'produto' ? 'Produto' : 'Manual') : '—'}
              </strong>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <span>Blocos concluídos</span>
              <strong className="text-slate-900">
                {concluidos}/{blocosResumo.length}
              </strong>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <span>Pontos no gráfico por hora</span>
              <strong className="text-slate-900">{producaoPorHora.length}</strong>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <span>Última atualização</span>
              <strong className="text-slate-900">
                {formatarUltimaAtualizacao(ultimaAtualizacao)}
              </strong>
            </div>
            <div className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-xs leading-6 text-slate-500">
              Deixe esta tela aberta e registre uma produção no scanner. Se o Realtime estiver
              funcionando, a hora da última atualização e os totais mudam sem refresh manual.
            </div>
          </div>
        </div>
      </div>

      <StatusMaquinas
        maquinas={statusMaquinas}
        estaCarregando={estaCarregando}
      />
    </section>
  )
}
