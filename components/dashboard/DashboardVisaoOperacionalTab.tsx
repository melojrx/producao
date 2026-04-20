'use client'

import { Activity, Boxes, ClipboardList, PackageCheck, Target } from 'lucide-react'
import { CardKPI } from '@/components/dashboard/CardKPI'
import { GraficoMetaGrupoTurnoV2 } from '@/components/dashboard/GraficoMetaGrupoTurnoV2'
import { KanbanOperacionalTurno } from '@/components/dashboard/KanbanOperacionalTurno'
import type {
  ComparativoMetaGrupoHoraItem,
  PlanejamentoTurnoDashboardV2,
  TurnoOpV2,
} from '@/types'
import type {
  TurnoOpResumoDashboardItem,
  TurnoSetorDashboardItem,
} from '@/lib/utils/turno-setores'

interface ResumoVisaoOperacionalDashboard {
  opsEmAndamento: number
  quantidadeBacklogTotal: number
  quantidadeAceitaTurno: number
  quantidadeDisponivelAgora: number
  quantidadeExcedenteTurno: number
  totalPlanejado: number
  totalRealizado: number
  progressoOperacionalTurnoPct: number
  operadoresDisponiveis: number
  operadoresAlocadosFormais: number
  operadoresComAtividade: number
  operadoresSugeridosCapacidade: number
  operadoresEnvolvidos: number
  totalOps: number
  opsConcluidas: number
  progressoOpsPct: number
  setoresAtivosCount: number
  setoresConcluidosCount: number
  progressoSetoresPct: number
  ops: TurnoOpV2[]
  opsAbertasLista: TurnoOpResumoDashboardItem[]
  setoresCardsLista: TurnoSetorDashboardItem[]
  setoresPendentesLista: TurnoSetorDashboardItem[]
  setoresConcluidosLista: TurnoSetorDashboardItem[]
}

interface DashboardVisaoOperacionalTabProps {
  planejamento: PlanejamentoTurnoDashboardV2
  turnoAberto: boolean
  metaGrupo: number
  mediaTpProduto: number
  resumo: ResumoVisaoOperacionalDashboard
  erroMetaGrupo?: string | null
  comparativoPorHora: ComparativoMetaGrupoHoraItem[]
  estaCarregandoGrafico: boolean
  onSelecionarOp: (turnoOpId: string) => void
  onSelecionarSetor: (setorId: string) => void
}

export function DashboardVisaoOperacionalTab({
  planejamento,
  turnoAberto,
  metaGrupo,
  mediaTpProduto,
  resumo,
  erroMetaGrupo,
  comparativoPorHora,
  estaCarregandoGrafico,
  onSelecionarOp,
  onSelecionarSetor,
}: DashboardVisaoOperacionalTabProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <CardKPI
          titulo="Capacidade Produtiva"
          valor={metaGrupo}
          desabilitado={!turnoAberto}
          motivoDesabilitado="Indisponível sem turno aberto. Este KPI é recalculado na abertura do próximo turno."
          descricao={
            mediaTpProduto > 0
              ? `Meta coletiva do turno pela média simples dos T.Ps dos produtos planejados. T.P médio ${mediaTpProduto.toFixed(2)} min.`
              : 'Meta coletiva do turno baseada na média simples dos T.Ps dos produtos planejados.'
          }
          icone={Target}
          destaque="blue"
        />
        <CardKPI
          titulo="Backlog vivo"
          valor={resumo.quantidadeBacklogTotal}
          descricao="Fila real ainda presente nos setores do turno, incluindo o que já estava pendente e o que entrou pelo fluxo durante o dia."
          icone={ClipboardList}
          destaque="slate"
        />
        <CardKPI
          titulo="Plano do dia"
          valor={resumo.quantidadeAceitaTurno}
          descricao="Teto visual do dia em peças completas, derivado da capacidade global do turno e redistribuído operacionalmente pelos setores."
          icone={PackageCheck}
          destaque="blue"
        />
        <CardKPI
          titulo="Disponível Agora"
          valor={resumo.quantidadeDisponivelAgora}
          descricao="Parcela que está liberada para execução imediata neste momento, já respeitando a prioridade operacional do setor."
          icone={Activity}
          destaque="blue"
        />
        <CardKPI
          titulo="Peças completas"
          valor={resumo.totalRealizado}
          descricao="Quantidade concluida do turno na leitura administrativa de produtos completos, separada do backlog setorial."
          icone={Boxes}
          destaque="emerald"
        />
        <CardKPI
          titulo="Excedente"
          valor={resumo.quantidadeExcedenteTurno}
          descricao="Saldo que nao coube na capacidade do dia e precisa seguir como backlog real para os proximos turnos."
          icone={Boxes}
          destaque="amber"
        />
      </div>

      {turnoAberto ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Operadores disponíveis
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {resumo.operadoresDisponiveis}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Alocação formal
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {resumo.operadoresAlocadosFormais}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">Vínculo nominal no turno</p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Atividade real
            </p>
            <p className="mt-2 text-3xl font-semibold text-emerald-900">
              {resumo.operadoresComAtividade}
            </p>
            <p className="mt-1 text-xs font-medium text-emerald-800">
              Operadores com registro no setor
            </p>
          </div>

          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-violet-700">
              Sugestão setorial
            </p>
            <p className="mt-2 text-3xl font-semibold text-violet-900">
              {resumo.operadoresSugeridosCapacidade}
            </p>
            <p className="mt-1 text-xs font-medium text-violet-800">
              Pessoas sugeridas pela capacidade
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Envolvidos no turno
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {resumo.operadoresEnvolvidos}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              União de alocação formal e atividade real
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">OPs</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{resumo.totalOps}</p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
              OPs em andamento
            </p>
            <p className="mt-2 text-3xl font-semibold text-blue-900">{resumo.opsEmAndamento}</p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              OPs concluídas
            </p>
            <p className="mt-2 text-3xl font-semibold text-emerald-900">{resumo.opsConcluidas}</p>
            <p className="mt-1 text-xs font-medium text-emerald-800">
              {resumo.progressoOpsPct}% do turno
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Setores ativos
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {resumo.setoresAtivosCount}
            </p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
              Setores concluídos
            </p>
            <p className="mt-2 text-3xl font-semibold text-blue-900">
              {resumo.setoresConcluidosCount}
            </p>
            <p className="mt-1 text-xs font-medium text-blue-800">
              {resumo.progressoSetoresPct}% do turno
            </p>
          </div>
        </section>
      ) : null}

      {erroMetaGrupo ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erroMetaGrupo}
        </section>
      ) : null}

      <KanbanOperacionalTurno
        planejamento={planejamento}
        onSelecionarOp={onSelecionarOp}
        onSelecionarSetor={onSelecionarSetor}
      />

      <GraficoMetaGrupoTurnoV2
        dados={comparativoPorHora}
        estaCarregando={estaCarregandoGrafico}
        desabilitado={!turnoAberto}
        motivoDesabilitado="O gráfico horário de capacidade é dinâmico e volta a ser recalculado quando um novo turno for aberto."
      />

    </>
  )
}
